import { Ability } from "../types/enum/Ability"
import { BossTrait } from "../types/enum/Game"
import { chance } from "../utils/random"
import { AbilityStrategies } from "./abilities/abilities"
import { Board } from "./board"
import { PokemonEntity } from "./pokemon-entity"

export interface BossAbilityConfig {
  ability: Ability
  triggerType: "periodic" | "hpThreshold" | "mpControl" | "passive"
  triggerValue: number // 时间间隔(ms) / 血量阈值(%) / MP阈值
  cooldown?: number // 冷却时间(ms)
  delay?: number // 顺延时间(ms)
  priority?: number // 触发优先级
}

export class BossAbilityManager {
  private boss: PokemonEntity
  private board: Board
  private abilityConfigs: BossAbilityConfig[]
  private cooldowns: Map<Ability, number> = new Map()
  private lastTriggerTimes: Map<Ability, number> = new Map()
  private elapsedMs = 0
  private pendingAbilities: Array<{
    ability: Ability
    triggerTime: number
    priority: number
  }> = []
  private hpThresholdsTriggered: Set<number> = new Set()

  constructor(
    boss: PokemonEntity,
    board: Board,
    abilityConfigs: BossAbilityConfig[]
  ) {
    this.boss = boss
    this.board = board
    this.abilityConfigs = abilityConfigs
    this.initializeCooldowns()
  }

  private initializeCooldowns(): void {
    this.abilityConfigs.forEach((config) => {
      if (config.cooldown) {
        this.cooldowns.set(config.ability, 0)
      }
    })
  }

  update(deltaTime: number): void {
    this.elapsedMs += deltaTime
    // 更新冷却时间
    this.updateCooldowns(deltaTime)

    // 检查所有技能触发条件
    this.checkTriggers(deltaTime)

    // 处理待触发的技能
    this.processPendingAbilities(deltaTime)
  }

  private updateCooldowns(deltaTime: number): void {
    for (const [ability, cooldown] of this.cooldowns.entries()) {
      if (cooldown > 0) {
        this.cooldowns.set(ability, Math.max(0, cooldown - deltaTime))
      }
    }
  }

  private checkTriggers(deltaTime: number): void {
    const currentTime = this.elapsedMs
    const currentHpPercent = (this.boss.hp / this.boss.maxHP) * 100
    const currentMp = this.boss.pp

    for (const config of this.abilityConfigs) {
      // 检查冷却
      if ((this.cooldowns.get(config.ability) ?? 0) > 0) {
        continue
      }

      let shouldTrigger = false
      let triggerTime = currentTime

      switch (config.triggerType) {
        case "periodic": {
          // 周期性触发：检查时间间隔
          const lastTriggerTime = this.lastTriggerTimes.get(config.ability) || 0
          if (currentTime - lastTriggerTime >= config.triggerValue) {
            shouldTrigger = true
          }
          break
        }

        case "hpThreshold":
          // 血量阈值触发
          if (
            !this.hpThresholdsTriggered.has(config.triggerValue) &&
            currentHpPercent <= config.triggerValue
          ) {
            shouldTrigger = true
            this.hpThresholdsTriggered.add(config.triggerValue)
            // 如果有顺延时间，设置延迟触发
            if (config.delay) {
              triggerTime = currentTime + config.delay
            }
          }
          break

        case "mpControl":
          // MP控制触发
          if (currentMp >= config.triggerValue) {
            shouldTrigger = true
          }
          break

        case "passive":
          // 被动技能，不需要主动触发
          continue
      }

      if (shouldTrigger) {
        this.addPendingAbility(
          config.ability,
          triggerTime,
          config.priority || 0
        )
        if (config.cooldown) {
          this.cooldowns.set(config.ability, config.cooldown)
        }
        if (config.triggerType === "periodic") {
          this.lastTriggerTimes.set(config.ability, currentTime)
        }
      }
    }
  }

  private addPendingAbility(
    ability: Ability,
    triggerTime: number,
    priority: number
  ): void {
    this.pendingAbilities.push({
      ability,
      triggerTime,
      priority
    })

    // 按触发时间和优先级排序
    this.pendingAbilities.sort((a, b) => {
      if (a.triggerTime !== b.triggerTime) {
        return a.triggerTime - b.triggerTime
      }
      return b.priority - a.priority
    })
  }

  private processPendingAbilities(deltaTime: number): void {
    const currentTime = this.elapsedMs

    // 执行所有已到触发时间的技能
    while (
      this.pendingAbilities.length > 0 &&
      this.pendingAbilities[0].triggerTime <= currentTime
    ) {
      const pendingAbility = this.pendingAbilities.shift()
      if (pendingAbility) {
        this.executeAbility(pendingAbility.ability)
      }
    }
  }

  private executeAbility(ability: Ability): void {
    const abilityStrategy = AbilityStrategies[ability]
    if (!abilityStrategy) return

    const target =
      this.boss.state.getFarthestTarget(this.boss, this.board) ?? this.boss
    const crit = abilityStrategy.canCritByDefault
      ? chance(this.boss.critChance / 100, this.boss)
      : false

    const previousSkill = this.boss.skill
    const previousPp = this.boss.pp

    this.boss.skill = ability
    abilityStrategy.process(this.boss, this.board, target, crit, true)

    const config = this.abilityConfigs.find((c) => c.ability === ability)
    if (config?.triggerType != "mpControl") {
      this.boss.pp = previousPp
    }
    this.boss.skill = previousSkill
  }

  // 重置血量阈值触发状态（用于Boss复活或重置战斗）
  resetHpThresholds(): void {
    this.hpThresholdsTriggered.clear()
  }

  // 获取Boss特性
  hasTrait(trait: BossTrait): boolean {
    return this.boss.bossTraits?.has(trait) || false
  }

  // 获取技能配置
  getAbilityConfig(ability: Ability): BossAbilityConfig | undefined {
    return this.abilityConfigs.find((config) => config.ability === ability)
  }

  // 获取所有激活的技能配置
  getActiveAbilityConfigs(): BossAbilityConfig[] {
    return this.abilityConfigs.filter(
      (config) => config.triggerType !== "passive"
    )
  }
}
