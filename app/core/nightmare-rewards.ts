import PokemonFactory from "../models/pokemon-factory"
import {
  getPokemonNightmareRewards,
  hasPokemonNightmareReward
} from "../models/nightmare"
import { NightmareReward } from "../types/nightmare"
import { AttackType, Team } from "../types/enum/Game"
import { Pkm } from "../types/enum/Pokemon"
import { pickRandomIn } from "../utils/random"
import { values } from "../utils/schemas"
import Simulation from "./simulation"
import { castAbility } from "./abilities/abilities"
import {
  OnAbilityCastEffect,
  OnAttackEffect,
  OnDamageDealtEffect,
  OnDamageReceivedEffect,
  OnKillEffect,
  PeriodicEffect
} from "./effects/effect"
import Player from "../models/colyseus-models/player"
import { MapSchema } from "@colyseus/schema"
import { PokemonEntity } from "./pokemon-entity"
import { IPokemonEntity } from "../types"

const fateDebuffs = [
  (target: PokemonEntity, source: PokemonEntity) =>
    target.status.triggerWound(3000, target, source),
  (target: PokemonEntity, source: PokemonEntity) =>
    target.status.triggerSilence(3000, target, source),
  (target: PokemonEntity, source: PokemonEntity) =>
    target.status.triggerBurn(3000, target, source),
  (target: PokemonEntity, source: PokemonEntity) =>
    target.status.triggerConfusion(3000, target, source),
  (target: PokemonEntity, source: PokemonEntity) =>
    target.status.triggerParalysis(3000, target, source)
]

export function applyNightmareEffectsOnSimulationStart(
  simulation: Simulation,
  player: Player,
  team: MapSchema<IPokemonEntity>
) {
  const teamEntities = values(team).filter(
    (entity) => entity.hp > 0
  ) as PokemonEntity[]
  const rewards = new Set(values(player.nightmareRewards).map((reward) => reward))

  if (rewards.has(NightmareReward.DRAGON_DANCE)) {
    teamEntities.forEach((entity) => {
      entity.pp = entity.maxPP
    })
  }

  if (rewards.has(NightmareReward.RESONANCE_EXPERT)) {
    let activeResonances = 0
    player.synergies.forEach((value) => {
      if (value > 0) activeResonances += 1
    })
    if (activeResonances > 0) {
      teamEntities.forEach((entity) => {
        entity.addSpeed(activeResonances * 10, entity, 0, false)
      })
    }
  }

  if (rewards.has(NightmareReward.LETHAL_TEMPO)) {
    const speedBonus = player.nightmareCounters.get("lethal_tempo_bonus") ?? 0
    if (speedBonus > 0) {
      teamEntities
        .filter((entity) => entity.range >= 2)
        .forEach((entity) => {
          entity.addSpeed(speedBonus, entity, 0, false)
        })
    }

    teamEntities
      .filter((entity) => entity.range >= 2)
      .forEach((entity) => {
        entity.effectsSet.add(
          new OnAttackEffect(({ totalDamage }) => {
            const owner = entity.player
            if (totalDamage <= 0 || !owner) return
            const current = owner.nightmareCounters.get("lethal_tempo_attacks") ?? 0
            const next = current + 1
            owner.nightmareCounters.set("lethal_tempo_attacks", next)
            if (next >= 150) {
              const bonus = owner.nightmareCounters.get("lethal_tempo_bonus") ?? 0
              owner.nightmareCounters.set("lethal_tempo_bonus", bonus + 8)
              owner.nightmareCounters.set("lethal_tempo_attacks", next - 150)
            }
          }, NightmareReward.LETHAL_TEMPO as any)
        )
      })
  }

  if (rewards.has(NightmareReward.SOLO_LEVELING)) {
    const rounds = player.nightmareCounters.get("solo_leveling_rounds_left") ?? 0
    if (rounds > 0) {
      const soloTarget =
        teamEntities.find(
          (entity) => entity.refToBoardPokemon.id === player.nightmareSoloLevelingTargetId
        ) ?? teamEntities[0]
      if (soloTarget) {
        if (player.nightmareSoloLevelingTargetId !== soloTarget.refToBoardPokemon.id) {
          player.nightmareSoloLevelingTargetId = soloTarget.refToBoardPokemon.id
        }
        soloTarget.addAttack(soloTarget.baseAtk * 2, soloTarget, 0, false)
        soloTarget.addAbilityPower(200, soloTarget, 0, false)
        soloTarget.addDefense(soloTarget.baseDef * 2, soloTarget, 0, false)
        soloTarget.addSpecialDefense(soloTarget.baseSpeDef * 2, soloTarget, 0, false)
        soloTarget.addMaxHP(soloTarget.baseHP * 2, soloTarget, 0, false)
        soloTarget.effectsSet.add(
          new OnKillEffect(({ attacker }) => {
            attacker.player?.addMoney(3, true, attacker)
          }, NightmareReward.SOLO_LEVELING as any)
        )
      }
    }
  }

  if (rewards.has(NightmareReward.UNYIELDING_DEATH)) {
    teamEntities.forEach((entity) => {
      entity.nightmareUnyieldingTriggered = false
      entity.nightmareHasUnyielding = true
    })
  }

  teamEntities.forEach((entity) => {
    if (entity.refToBoardPokemon.name === Pkm.SUBSTITUTE) return
    const rewards = getPokemonNightmareRewards(entity.refToBoardPokemon.nightmareReward)
    if (rewards.length === 0) return

    if (rewards.includes(NightmareReward.QUALITY_A)) {
      entity.nightmareQualityAKills = 0
      entity.addAttack(-Math.round(entity.baseAtk * 0.5), entity, 0, false)
      entity.addAbilityPower(-50, entity, 0, false)
      entity.addMaxHP(-Math.round(entity.baseHP * 0.3), entity, 0, false)
      entity.effectsSet.add(
        new OnKillEffect(({ attacker }) => {
          const current = attacker.nightmareQualityAKills ?? 0
          if (current >= 10) return
          attacker.nightmareQualityAKills = current + 1
          attacker.addMaxHP(2, attacker, 0, false, true)
          attacker.addAttack(1, attacker, 0, false, true)
          attacker.addAbilityPower(1, attacker, 0, false, true)
          const totalKey = `quality_a_total_${attacker.id}`
          const total = attacker.player?.nightmareCounters.get(totalKey) ?? 0
          const nextTotal = total + 1
          attacker.player?.nightmareCounters.set(totalKey, nextTotal)
          if (nextTotal % 10 === 0) {
            attacker.addDefense(1, attacker, 0, false, true)
            attacker.addSpecialDefense(1, attacker, 0, false, true)
          }
        }, NightmareReward.QUALITY_A as any)
      )
    }

    if (rewards.includes(NightmareReward.BERSERKER)) {
      entity.nightmareBerserkerStacks = 0
      entity.effectsSet.add(
        new OnDamageReceivedEffect(({ pokemon }) => {
          const lostRatio = 1 - pokemon.hp / Math.max(1, pokemon.maxHP)
          const expectedStacks = Math.floor(lostRatio / 0.2)
          const currentStacks = pokemon.nightmareBerserkerStacks ?? 0
          if (expectedStacks > currentStacks) {
            const delta = expectedStacks - currentStacks
            pokemon.nightmareBerserkerStacks = expectedStacks
            pokemon.addAttack(pokemon.baseAtk * 0.1 * delta, pokemon, 0, false)
            pokemon.addAbilityPower(10 * delta, pokemon, 0, false)
            pokemon.addSpeed(10 * delta, pokemon, 0, false)
          }
        }, NightmareReward.BERSERKER as any)
      )
    }

    if (rewards.includes(NightmareReward.FATE_OBSERVATION)) {
      entity.nightmareFateCooldownByTarget = new Map()
      entity.effectsSet.add(
        new OnDamageDealtEffect(({ pokemon, target }) => {
          const now = Date.now()
          const cooldownMap = pokemon.nightmareFateCooldownByTarget
          const nextAllowedAt = cooldownMap.get(target.id) ?? 0
          if (now < nextAllowedAt) return
          cooldownMap.set(target.id, now + 3000)
          pickRandomIn(fateDebuffs)(target, pokemon)
        }, NightmareReward.FATE_OBSERVATION as any)
      )
    }

    if (rewards.includes(NightmareReward.LOYAL_CASTER)) {
      entity.nightmareLoyalCaster = true
      entity.effectsSet.add(
        new PeriodicEffect((caster) => {
          const enemies = values(
            caster.team === Team.BLUE_TEAM ? simulation.redTeam : simulation.blueTeam
          ).filter((target) => target.hp > 0)
          if (enemies.length === 0) return
          const target = pickRandomIn(enemies)
          const prevPP = caster.pp
          castAbility(
            caster.skill,
            caster,
            simulation.board,
            target as PokemonEntity,
            true
          )
          caster.pp = prevPP
        }, NightmareReward.LOYAL_CASTER as any, 2000)
      )
    }

    if (rewards.includes(NightmareReward.MAGICAL_FEEDBACK)) {
      const enemyTeam =
        entity.team === Team.BLUE_TEAM ? simulation.redTeam : simulation.blueTeam
      let nextRetaliationAt = 0
      values(enemyTeam).forEach((enemy) => {
        ;(enemy as PokemonEntity).effectsSet.add(
          new OnAbilityCastEffect((enemyCaster, board) => {
            const now = Date.now()
            if (now < nextRetaliationAt) return
            if (entity.hp <= 0 || entity.status.resurrecting) return
            if (!enemyCaster || enemyCaster.hp <= 0 || enemyCaster.status.resurrecting)
              return
            nextRetaliationAt = now + 500
            enemyCaster.handleDamage({
              damage: entity.atk,
              board,
              attackType: AttackType.PHYSICAL,
              attacker: entity,
              shouldTargetGainMana: true,
              isRetaliation: true
            })
          }, NightmareReward.MAGICAL_FEEDBACK as any)
        )
      })
    }

    if (rewards.includes(NightmareReward.ASSIST_MASTER)) {
      entity.nightmareAssistMaster = true
      let allyCasts = 0
      values(entity.team === Team.BLUE_TEAM ? simulation.blueTeam : simulation.redTeam)
        .filter((ally) => ally.id !== entity.id)
        .forEach((ally) => {
          ally.effectsSet.add(
            new OnAbilityCastEffect(() => {
              if (entity.hp <= 0 || entity.status.resurrecting) return
              allyCasts += 1
              if (allyCasts < 3) return
              allyCasts = 0
              const enemies = values(
                entity.team === Team.BLUE_TEAM ? simulation.redTeam : simulation.blueTeam
              ).filter((enemy) => enemy.hp > 0)
              if (enemies.length === 0) return
              const target = pickRandomIn(enemies)
              castAbility(
                entity.skill,
                entity,
                simulation.board,
                target as PokemonEntity,
                true
              )
            }, NightmareReward.ASSIST_MASTER as any)
          )
        })
    }

    if (rewards.includes(NightmareReward.SHINRA_TENSEI)) {
      entity.effectsSet.add(
        new PeriodicEffect((caster) => {
          const targets = simulation.board
            .getCellsInRange(caster.positionX, caster.positionY, 3)
            .map((cell) => cell.value)
            .filter(
              (target) =>
                !!target &&
                target.id !== caster.id &&
                target.team !== caster.team
            ) as PokemonEntity[]
          targets.forEach((target) => {
            const candidateCells: { x: number; y: number; score: number }[] = []
            simulation.board.forEach((x, y, value) => {
              if (value) return
              const chebyshev = Math.max(
                Math.abs(x - caster.positionX),
                Math.abs(y - caster.positionY)
              )
              if (chebyshev <= 3) return
              const score =
                Math.abs(x - target.positionX) + Math.abs(y - target.positionY)
              candidateCells.push({ x, y, score })
            })
            candidateCells.sort((a, b) => a.score - b.score)
            const pushTarget = candidateCells[0]
            if (!pushTarget) return
            target.moveTo(pushTarget.x, pushTarget.y, simulation.board, true)
            target.cooldown = 500
          })
        }, NightmareReward.SHINRA_TENSEI as any, 5000)
      )
    }

    if (rewards.includes(NightmareReward.OGRE)) {
      const adjacentAllies = simulation.board
        .getAdjacentCells(entity.positionX, entity.positionY)
        .map((cell) => cell.value)
        .filter((ally) => ally && ally.team === entity.team && ally.id !== entity.id) as PokemonEntity[]

      let sumHP = 0
      let sumAtk = 0
      let sumDef = 0
      let sumSpeDef = 0
      let sumSpeed = 0
      adjacentAllies.forEach((ally) => {
        sumHP += ally.baseHP
        sumAtk += ally.baseAtk
        sumDef += ally.baseDef
        sumSpeDef += ally.baseSpeDef
        sumSpeed += ally.speed
        ally.handleDamage({
          damage: ally.hp + ally.shield + 9999,
          board: simulation.board,
          attackType: AttackType.TRUE,
          attacker: entity,
          shouldTargetGainMana: false
        })
      })
      entity.addMaxHP(sumHP * 0.5, entity, 0, false)
      entity.addAttack(sumAtk * 0.5, entity, 0, false)
      entity.addDefense(sumDef * 0.5, entity, 0, false)
      entity.addSpecialDefense(sumSpeDef * 0.5, entity, 0, false)
      entity.addSpeed(sumSpeed * 0.5, entity, 0, false)
    }

    if (rewards.includes(NightmareReward.TRINITY_CLONES)) {
      const originAtk = entity.atk
      const originDef = entity.def
      const originSpeDef = entity.speDef
      const originMaxHp = entity.maxHP

      entity.atk = Math.max(1, Math.floor(originAtk * 0.3))
      entity.def = Math.max(1, Math.floor(originDef * 0.3))
      entity.speDef = Math.max(1, Math.floor(originSpeDef * 0.3))
      entity.maxHP = Math.max(1, Math.floor(originMaxHp * 0.3))
      entity.hp = Math.min(entity.hp, entity.maxHP)

      const spawnOffsets = [-1, 1]
      spawnOffsets.forEach((dx) => {
        const x = entity.positionX + dx
        const y = entity.positionY
        const fallback = simulation.getClosestFreeCellTo(
          entity.positionX,
          entity.positionY,
          entity.team
        )
        const coord =
          x >= 0 &&
          x < simulation.board.columns &&
          !simulation.board.getEntityOnCell(x, y)
            ? { x, y }
            : fallback
        if (!coord) return
        const clone = PokemonFactory.createPokemonFromName(entity.refToBoardPokemon.name)
        clone.stars = entity.refToBoardPokemon.stars
        clone.items.clear()
        entity.refToBoardPokemon.items.forEach((item) => clone.items.add(item))
        clone.hp = Math.max(1, Math.floor(originMaxHp * 0.3))
        clone.maxHP = clone.hp
        clone.atk = Math.max(1, Math.floor(originAtk * 0.3))
        clone.def = Math.max(1, Math.floor(originDef * 0.3))
        clone.speDef = Math.max(1, Math.floor(originSpeDef * 0.3))
        clone.ap = entity.refToBoardPokemon.ap
        clone.speed = entity.refToBoardPokemon.speed
        clone.critChance = entity.refToBoardPokemon.critChance
        clone.critPower = entity.refToBoardPokemon.critPower
        clone.nightmareReward = NightmareReward.NONE
        simulation.addPokemon(clone, coord.x, coord.y, entity.team, true)
      })
    }

    if (rewards.includes(NightmareReward.REFRACTION)) {
      entity.effectsSet.add(
        new OnDamageReceivedEffect(
          ({ pokemon, board, damageBeforeReduction, isRetaliation }) => {
            if (isRetaliation) return
            if (damageBeforeReduction <= 0) return
            const enemies = board
              .getCellsInRange(pokemon.positionX, pokemon.positionY, 2)
              .map((cell) => cell.value)
              .filter((target) => target && target.team !== pokemon.team) as PokemonEntity[]
            if (enemies.length === 0) return
            const reflectedTotal = Math.max(
              1,
              Math.floor(damageBeforeReduction * 0.3)
            )
            const perTarget = Math.max(
              1,
              Math.floor(reflectedTotal / enemies.length)
            )
            enemies.forEach((enemy) => {
              enemy.handleDamage({
                damage: perTarget,
                board,
                attackType: AttackType.TRUE,
                attacker: pokemon,
                shouldTargetGainMana: false,
                isRetaliation: true
              })
            })
          },
          NightmareReward.REFRACTION as any
        )
      )
    }

    if (rewards.includes(NightmareReward.TOXIC_ARMORY)) {
      entity.effectsSet.add(
        new PeriodicEffect((pokemon) => {
          while (pokemon.status.poisonStacks < 3) {
            pokemon.status.triggerPoison(1000, pokemon, pokemon)
          }
          if (pokemon.status.poisonCooldown < 1000) {
            pokemon.status.poisonCooldown = 1000
          }
        }, NightmareReward.TOXIC_ARMORY as any, 1000)
      )
    }
  })

  const soulLinkTargets = teamEntities.filter(
    (entity) =>
      entity.hp > 0 &&
      hasPokemonNightmareReward(
        entity.refToBoardPokemon.nightmareReward,
        NightmareReward.SOUL_LINK
      )
  )
  if (soulLinkTargets.length >= 2) {
    const [first, second] = soulLinkTargets
    first.nightmareSoulLinkTargetId = second.id
    second.nightmareSoulLinkTargetId = first.id
  }
}
