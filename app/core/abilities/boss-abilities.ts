import { Ability } from "../../types/enum/Ability"
import { EffectEnum } from "../../types/enum/Effect"
import { AttackType, BossTrait } from "../../types/enum/Game"
import { distanceC, distanceM } from "../../utils/distance"
import { logger } from "../../utils/logger"
import { pickRandomIn } from "../../utils/random"
import type { Board } from "../board"
import { PokemonEntity } from "../pokemon-entity"
import { RemoveEffectCommand } from "../simulation-command"
import { AbilityStrategy } from "./ability-strategy"

// 瞬间移动技能
export class BossTeleportStrategy extends AbilityStrategy {
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

    if (!pokemon.canMove) {
      return
    }

    const farthestEnemy = this.findFarthestEnemy(pokemon, board)
    if (!farthestEnemy) {
      logger.warn("BossTeleportStrategy: No enemy found for teleport")
      return
    }

    const teleportCell = this.findTeleportCell(pokemon, board, farthestEnemy)
    if (!teleportCell) {
      logger.warn("BossTeleportStrategy: No available cell for teleport")
      return
    }

    this.performTeleport(pokemon, board, teleportCell)
    this.enhanceNextAttack(pokemon)
    pokemon.targetEntityId = farthestEnemy.id
  }

  private findFarthestEnemy(
    pokemon: PokemonEntity,
    board: Board
  ): PokemonEntity | null {
    let farthestEnemy: PokemonEntity | null = null
    let maxDistance = 0

    board.forEach((x, y, entity) => {
      if (
        entity &&
        entity.team !== pokemon.team &&
        entity.isTargettableBy(pokemon, true, false)
      ) {
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
    const adjacentCells = board.getAdjacentCells(
      target.positionX,
      target.positionY
    )
    const availableCells = adjacentCells.filter((cell) => !cell.value)

    if (availableCells.length == 0) {
      return null
    }

    const randomCell = pickRandomIn(availableCells)
    return { x: randomCell.x, y: randomCell.y }
  }

  private performTeleport(
    pokemon: PokemonEntity,
    board: Board,
    teleportCell: { x: number; y: number }
  ): void {
    if (pokemon.size == "SIZE_2X2") {
      const canMove = this.check2x2Movement(
        pokemon,
        board,
        teleportCell.x,
        teleportCell.y
      )
      if (!canMove) {
        logger.warn(
          "BossTeleportStrategy: 2x2 entity cannot move to target cell"
        )
        return
      }
    }

    board.setEntityOnCell(teleportCell.x, teleportCell.y, pokemon)
    logger.debug(
      `BossTeleportStrategy: ${pokemon.name} teleported to (${teleportCell.x}, ${teleportCell.y})`
    )
  }

  private check2x2Movement(
    pokemon: PokemonEntity,
    board: Board,
    targetX: number,
    targetY: number
  ): boolean {
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
    pokemon.effects.add(EffectEnum.TELEPORT_ENHANCEMENT)
    pokemon.simulation.addDelayedCommand(
      new RemoveEffectCommand(
        pokemon.id,
        EffectEnum.TELEPORT_ENHANCEMENT,
        2000,
        pokemon.simulation
      )
    )
  }
}

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

    const spAtkIncrease = 10
    const spDefIncrease = 10

    pokemon.ap += spAtkIncrease
    pokemon.speDef += spDefIncrease

    pokemon.effects.add(EffectEnum.MEDITATE)
    pokemon.simulation.addDelayedCommand(
      new RemoveEffectCommand(
        pokemon.id,
        EffectEnum.MEDITATE,
        5000,
        pokemon.simulation
      )
    )

    logger.debug(
      `BossMeditateStrategy: ${pokemon.name} increased AP by ${spAtkIncrease} and SpDef by ${spDefIncrease}`
    )
  }
}

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

    const targets = this.getTargetsInRange(pokemon, board, 2)
    if (targets.length == 0) {
      logger.warn("BossPsychicStrategy: No targets in range")
      return
    }

    const baseDamage = 150 + pokemon.ap
    const damagePerTarget =
      targets.length == 1 ? baseDamage * 2 : baseDamage / targets.length

    targets.forEach((targetEntity) => {
      this.dealDamage(pokemon, targetEntity, board, damagePerTarget, crit)
    })

    logger.debug(
      `BossPsychicStrategy: ${pokemon.name} dealt ${baseDamage} base damage to ${targets.length} targets`
    )
  }

  private getTargetsInRange(
    pokemon: PokemonEntity,
    board: Board,
    range: number
  ): PokemonEntity[] {
    const targets: PokemonEntity[] = []

    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        const x = pokemon.positionX + dx
        const y = pokemon.positionY + dy

        if (dx == 0 && dy == 0) {
          continue
        }

        const entity = board.getEntityOnCell(x, y)
        if (
          entity &&
          entity.team !== pokemon.team &&
          entity.isTargettableBy(pokemon, true, false)
        ) {
          targets.push(entity)
        }
      }
    }

    return targets
  }

  private dealDamage(
    attacker: PokemonEntity,
    target: PokemonEntity,
    board: Board,
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

    const farthestTarget =
      pokemon.state.getFarthestTarget(pokemon, board) ?? target

    const targetsHit: Set<PokemonEntity> = new Set()
    pokemon.broadcastAbility({
      targetX: farthestTarget.positionX,
      targetY: farthestTarget.positionY
    })

    const cells = board.getCellsBetween(
      pokemon.positionX,
      pokemon.positionY,
      farthestTarget.positionX,
      farthestTarget.positionY
    )
    cells.forEach((cell) => {
      if (cell.value && cell.value.team !== pokemon.team) {
        targetsHit.add(cell.value)
      }
    })

    if (targetsHit.size == 0) {
      targetsHit.add(farthestTarget)
    }

    const baseDamage = 80 + pokemon.ap
    targetsHit.forEach((enemy) => {
      this.dealAuraSphereDamage(pokemon, enemy, board, baseDamage, crit)

      const teleportationCell = board.getTeleportationCell(
        enemy.positionX,
        enemy.positionY,
        enemy.team,
        enemy.size ?? "SIZE_1X1"
      )
      if (teleportationCell) {
        enemy.moveTo(teleportationCell.x, teleportationCell.y, board, true)
      }
    })

    logger.debug(
      `BossAuraSphereStrategy: ${pokemon.name} dealt ${baseDamage} base damage to ${targetsHit.size} enemies`
    )
  }

  private dealAuraSphereDamage(
    attacker: PokemonEntity,
    target: PokemonEntity,
    board: Board,
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

  static handleStatusEffect(
    pokemon: PokemonEntity,
    effectValue: number
  ): number {
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
