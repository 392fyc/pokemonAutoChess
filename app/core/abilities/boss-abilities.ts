import { AbilityStrategy } from "./ability-strategy"
import type { Board } from "../board"
import { PokemonEntity } from "../pokemon-entity"
import { DelayedCommand, RemoveEffectCommand, StatChangeCommand } from "../simulation-command"
import { Ability } from "../../types/enum/Ability"
import { EffectEnum } from "../../types/enum/Effect"
import { AttackType, BossTrait } from "../../types/enum/Game"
import { distanceC, distanceM } from "../../utils/distance"
import { pickRandomIn } from "../../utils/random"
import { logger } from "../../utils/logger"

// 瞬间移动技能
export class BossTeleportStrategy extends AbilityStrategy {
  copyable = false // Boss专属技能不可复制
  canCritByDefault = false

  process(
    pokemon: PokemonEntity,
    board: Board,
    target: PokemonEntity,
    crit: boolean,
    preventDefaultAnim?: boolean
  ) {
    super.process(pokemon, board, target, crit, preventDefaultAnim)

    // 找到离自己最远的敌方宝可梦
    const farthestEnemy = this.findFarthestEnemy(pokemon, board)
    if (!farthestEnemy) {
      logger.warn("BossTeleportStrategy: No enemy found for teleport")
      return
    }

    // 找到最远敌方宝可梦旁边的可用格子
    const teleportCell = this.findTeleportCell(pokemon, board, farthestEnemy)
    if (!teleportCell) {
      logger.warn("BossTeleportStrategy: No available cell for teleport")
      return
    }

    // 执行瞬移
    this.performTeleport(pokemon, board, teleportCell)

    // 强化下一次普通攻击
    this.enhanceNextAttack(pokemon)

    // 记录瞬移目标，用于下一次攻击
    pokemon.targetEntityId = farthestEnemy.id
  }

  private findFarthestEnemy(pokemon: PokemonEntity, board: Board): PokemonEntity | null {
    let farthestEnemy: PokemonEntity | null = null
    let maxDistance = 0

    board.forEach((x, y, entity) => {
      if (entity && entity.team !== pokemon.team && entity.isTargettableBy(pokemon, true, false)) {
        const distance = distanceM(pokemon.positionX, pokemon.positionY, x, y)
        if (distance > maxDistance) {
          maxDistance = distance
          farthestEnemy = entity
        }
      }
    })

    return farthestEnemy
  }

  private findTeleportCell(
    pokemon: PokemonEntity,
    board: Board,
    target: PokemonEntity
  ): { x: number; y: number } | null {
    // 获取目标周围的可用格子
    const adjacentCells = board.getAdjacentCells(target.positionX, target.positionY)
    const availableCells = adjacentCells.filter(cell => !cell.value)

    if (availableCells.length === 0) {
      return null
    }

    // 随机选择一个可用格子
    const randomCell = pickRandomIn(availableCells)
    return { x: randomCell.x, y: randomCell.y }
  }

  private performTeleport(
    pokemon: PokemonEntity,
    board: Board,
    teleportCell: { x: number; y: number }
  ): void {
    // 检查2x2实体是否可以移动到目标位置
    if (pokemon.size === "SIZE_2X2") {
      const canMove = this.check2x2Movement(pokemon, board, teleportCell.x, teleportCell.y)
      if (!canMove) {
        logger.warn("BossTeleportStrategy: 2x2 entity cannot move to target cell")
        return
      }
    }

    // 移动到目标位置
    board.setEntityOnCell(teleportCell.x, teleportCell.y, pokemon)
    logger.debug(`BossTeleportStrategy: ${pokemon.name} teleported to (${teleportCell.x}, ${teleportCell.y})`)
  }

  private check2x2Movement(
    pokemon: PokemonEntity,
    board: Board,
    targetX: number,
    targetY: number
  ): boolean {
    // 检查2x2区域是否可用
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const x = targetX + dx
        const y = targetY + dy
        if (!board.isOnBoard(x, y) || board.getEntityOnCell(x, y)) {
          return false
        }
      }
    }
    return true
  }

  private enhanceNextAttack(pokemon: PokemonEntity): void {
    // 添加强化效果
    pokemon.effects.add(EffectEnum.TELEPORT_ENHANCEMENT)

    // 设置强化持续时间（例如2秒）
    pokemon.simulation.addDelayedCommand(
      new RemoveEffectCommand(pokemon.id, EffectEnum.TELEPORT_ENHANCEMENT, 2000, pokemon.simulation)
    )
  }
}

// 冥想技能
export class BossMeditateStrategy extends AbilityStrategy {
  copyable = false
  canCritByDefault = false

  process(
    pokemon: PokemonEntity,
    board: Board,
    target: PokemonEntity,
    crit: boolean,
    preventDefaultAnim?: boolean
  ) {
    super.process(pokemon, board, target, crit, preventDefaultAnim)

    // 提高特攻和特防
    const spAtkIncrease = 10
    const spDefIncrease = 10

    pokemon.ap += spAtkIncrease
    pokemon.speDef += spDefIncrease

    // 添加冥想效果
    pokemon.effects.add(EffectEnum.MEDITATE)

    // 设置效果持续时间（例如5秒）
    pokemon.simulation.addDelayedCommand(
      new RemoveEffectCommand(pokemon.id, EffectEnum.MEDITATE, 5000, pokemon.simulation)
    )

    // 5秒后移除加成
    pokemon.simulation.addDelayedCommand(
      new StatChangeCommand(pokemon.id, "ap", -spAtkIncrease, 5000, pokemon.simulation)
    )

    pokemon.simulation.addDelayedCommand(
      new StatChangeCommand(pokemon.id, "speDef", -spDefIncrease, 5000, pokemon.simulation)
    )

    logger.debug(`BossMeditateStrategy: ${pokemon.name} increased AP by ${spAtkIncrease} and SpDef by ${spDefIncrease}`)
  }
}

// 精神强念技能（Boss专属）
export class BossPsychicStrategy extends AbilityStrategy {
  copyable = false
  canCritByDefault = true

  process(
    pokemon: PokemonEntity,
    board: Board,
    target: PokemonEntity,
    crit: boolean,
    preventDefaultAnim?: boolean
  ) {
    super.process(pokemon, board, target, crit, preventDefaultAnim)

    // 获取自身周围1格内的所有敌方宝可梦
    const targets = this.getTargetsInRange(pokemon, board)
    if (targets.length === 0) {
      logger.warn("PsychicStrategy: No targets in range")
      return
    }

    // 计算总伤害（特攻的固定倍数）
    const damageMultiplier = 2.0 // 可以根据平衡性调整
    const totalDamage = pokemon.ap * damageMultiplier

    // 分摊伤害
    const damagePerTarget = totalDamage / targets.length

    // 对每个目标造成伤害
    targets.forEach(targetEntity => {
      this.dealDamage(pokemon, targetEntity, damagePerTarget, crit)
    })

    logger.debug(`PsychicStrategy: ${pokemon.name} dealt ${totalDamage} total damage to ${targets.length} targets`)
  }

  private getTargetsInRange(pokemon: PokemonEntity, board: Board): PokemonEntity[] {
    const targets: PokemonEntity[] = []

    // 获取周围1格内的所有格子
    const range = 1
    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        const x = pokemon.positionX + dx
        const y = pokemon.positionY + dy

        if (dx === 0 && dy === 0) continue // 跳过自己

        const entity = board.getEntityOnCell(x, y)
        if (entity && entity.team !== pokemon.team && entity.isTargettableBy(pokemon, true, false)) {
          targets.push(entity)
        }
      }
    }

    return targets
  }

  private dealDamage(
    attacker: PokemonEntity,
    target: PokemonEntity,
    damage: number,
    crit: boolean
  ): void {
    const finalDamage = crit ? damage * attacker.critPower : damage

    target.handleSpecialDamage(
      finalDamage,
      board,
      AttackType.SPECIAL,
      attacker,
      crit,
      true
    )
  }
}

// 波导弹技能（Boss专属）
export class BossAuraSphereStrategy extends AbilityStrategy {
  copyable = false
  canCritByDefault = true

  process(
    pokemon: PokemonEntity,
    board: Board,
    target: PokemonEntity,
    crit: boolean,
    preventDefaultAnim?: boolean
  ) {
    super.process(pokemon, board, target, crit, preventDefaultAnim)

    // 对全体敌方宝可梦造成伤害
    const targets = this.getAllEnemies(pokemon, board)
    if (targets.length === 0) {
      logger.warn("AuraSphereStrategy: No enemies found")
      return
    }

    // 计算伤害（特攻的固定倍数）
    const damageMultiplier = 1.5 // 可以根据平衡性调整
    const baseDamage = pokemon.ap * damageMultiplier

    // 对每个目标造成伤害
    targets.forEach(targetEntity => {
      this.dealAuraSphereDamage(pokemon, targetEntity, baseDamage, crit)
    })

    logger.debug(`AuraSphereStrategy: ${pokemon.name} dealt ${baseDamage} damage to ${targets.length} enemies`)
  }

  private getAllEnemies(pokemon: PokemonEntity, board: Board): PokemonEntity[] {
    const enemies: PokemonEntity[] = []

    board.forEach((x, y, entity) => {
      if (entity && entity.team !== pokemon.team && entity.isTargettableBy(pokemon, true, false)) {
        enemies.push(entity)
      }
    })

    return enemies
  }

  private dealAuraSphereDamage(
    attacker: PokemonEntity,
    target: PokemonEntity,
    damage: number,
    crit: boolean
  ): void {
    const finalDamage = crit ? damage * attacker.critPower : damage

    target.handleSpecialDamage(
      finalDamage,
      board,
      AttackType.SPECIAL,
      attacker,
      crit,
      true
    )
  }
}

// 传说中的宝可梦被动效果
export class LegendaryPokemonPassive {
  static apply(pokemon: PokemonEntity): void {
    // 检查是否具有传说中的宝可梦特性
    if (!pokemon.bossTraits?.has(BossTrait.LEGENDARY_POKEMON)) {
      return
    }

    // 应用2x2体型
    if (pokemon.bossTraits.has(BossTrait.SIZE_2X2)) {
      pokemon.size = "SIZE_2X2"
    }

    // 提高攻击距离
    if (pokemon.bossTraits.has(BossTrait.INCREASED_RANGE)) {
      pokemon.range = Math.min(pokemon.range + 1, 8) // 限制最大范围
    }

    // 异常效果减半（在状态效果应用时处理）
    // 羁绊禁用（在属性计算时处理）

    logger.debug(`LegendaryPokemonPassive applied to ${pokemon.name}`)
  }

  static handleStatusEffect(pokemon: PokemonEntity, effectValue: number): number {
    // 异常效果减半
    if (pokemon.bossTraits?.has(BossTrait.HALF_STATUS_EFFECT)) {
      return effectValue * 0.5
    }
    return effectValue
  }

  static shouldIgnoreSynergies(pokemon: PokemonEntity): boolean {
    // 检查是否禁用羁绊
    return pokemon.bossTraits?.has(BossTrait.IGNORE_SYNERGIES) || false
  }
}