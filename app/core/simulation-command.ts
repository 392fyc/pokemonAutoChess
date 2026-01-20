import { ISimulationCommand } from "../types"
import type { Board } from "./board"
import { PokemonEntity } from "./pokemon-entity"
import { EffectEnum } from "../types/enum/Effect"
import { logger } from "../utils/logger"

export abstract class SimulationCommand implements ISimulationCommand {
  delay: number
  executed = false

  constructor(delay: number) {
    this.delay = delay
  }
  execute() {}
  update(dt: number) {
    this.delay -= dt
    if (this.delay < 0) {
      this.execute()
      this.executed = true
    }
  }
}

export class DelayedCommand extends SimulationCommand {
  delayedFunction: () => void
  constructor(delayedFunction: () => void, delay: number) {
    super(delay)
    this.delayedFunction = delayedFunction
  }
  execute() {
    super.execute()
    this.delayedFunction()
  }
}

export class AttackCommand extends SimulationCommand {
  pokemon: PokemonEntity
  target: PokemonEntity
  board: Board

  constructor(
    delay: number,
    pokemon: PokemonEntity,
    target: PokemonEntity,
    board: Board
  ) {
    super(delay)
    this.pokemon = pokemon
    this.board = board
    this.target = target
  }

  execute(): void {
    this.pokemon.state.attack(this.pokemon, this.board, this.target)
  }
}

export class RemoveEffectCommand extends SimulationCommand {
  targetId: string
  effect: EffectEnum
  simulation: any // To avoid circular dependency with Simulation class

  constructor(targetId: string, effect: EffectEnum, delay: number, simulation: any) {
    super(delay)
    this.targetId = targetId
    this.effect = effect
    this.simulation = simulation
  }

  execute(): void {
    const targetEntity = this.simulation.board.getEntityById(this.targetId) as PokemonEntity
    if (targetEntity) {
      targetEntity.effects.delete(this.effect)
      logger.debug(`RemoveEffectCommand: Removed effect ${this.effect} from ${targetEntity.name}`)
    }
  }
}

export class StatChangeCommand extends SimulationCommand {
  targetId: string
  stat: "ap" | "speDef" | "atk" | "def" | "hp" | "maxHP"
  value: number
  simulation: any // To avoid circular dependency with Simulation class

  constructor(
    targetId: string,
    stat: "ap" | "speDef" | "atk" | "def" | "hp" | "maxHP",
    value: number,
    delay: number,
    simulation: any
  ) {
    super(delay)
    this.targetId = targetId
    this.stat = stat
    this.value = value
    this.simulation = simulation
  }

  execute(): void {
    const targetEntity = this.simulation.board.getEntityById(this.targetId) as PokemonEntity
    if (targetEntity) {
      switch (this.stat) {
        case "ap":
          targetEntity.ap += this.value
          break
        case "speDef":
          targetEntity.speDef += this.value
          break
        case "atk":
          targetEntity.atk += this.value
          break
        case "def":
          targetEntity.def += this.value
          break
        case "hp":
          targetEntity.hp += this.value
          break
        case "maxHP":
          targetEntity.maxHP += this.value
          break
      }
      logger.debug(`StatChangeCommand: Changed ${this.stat} of ${targetEntity.name} by ${this.value}. New value: ${targetEntity[this.stat]}`)
    }
  }
}
