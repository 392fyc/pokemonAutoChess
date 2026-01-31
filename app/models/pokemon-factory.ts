import { MapSchema } from "@colyseus/schema"
import { Emotion, IPlayer, PkmCustom } from "../types"
import { Stat } from "../types/enum/Game"
import { Pkm, PkmFamily, PkmIndex } from "../types/enum/Pokemon"
import { TownEncounter, TownEncounters } from "../types/enum/TownEncounter"

import { logger } from "../utils/logger"
import Player from "./colyseus-models/player"
import { Pokemon, PokemonClasses } from "./colyseus-models/pokemon"
import { getPkmWithCustom } from "./colyseus-models/pokemon-customs"
import { IDetailledPokemon } from "./mongo-models/bot-v2"
import { PVEBossStage } from "./pve-boss-stages"
import { PVEStage } from "./pve-stages"

export default class PokemonFactory {
  static makePveBoard(
    pveStage: PVEStage,
    shinyEncounter: boolean,
    townEncounter: TownEncounter | null,
    difficultyMultiplier?: number
  ): MapSchema<Pokemon>
  static makePveBoard(
    bossStage: PVEBossStage,
    shinyEncounter: boolean,
    townEncounter: TownEncounter | null,
    difficultyMultiplier?: number
  ): MapSchema<Pokemon>
  static makePveBoard(
    stage: PVEStage | PVEBossStage,
    shinyEncounter: boolean,
    townEncounter: TownEncounter | null,
    difficultyMultiplier?: number
  ): MapSchema<Pokemon>
  static makePveBoard(
    presetLineup: IDetailledPokemon[],
    shinyEncounter: boolean,
    townEncounter: TownEncounter | null,
    difficultyMultiplier?: number
  ): MapSchema<Pokemon>
  static makePveBoard(
    stage: PVEStage | PVEBossStage | IDetailledPokemon[],
    shinyEncounter: boolean,
    townEncounter: TownEncounter | null,
    difficultyMultiplier = 1
  ): MapSchema<Pokemon> {
    const pokemons = new MapSchema<Pokemon>()

    // Handle different input types
    if (Array.isArray(stage)) {
      // Handle preset lineup array
      stage.forEach((pokemonData, index) => {
        const pokemon = PokemonFactory.createPokemonFromName(pokemonData.name, {
          emotion: pokemonData.emotion ?? Emotion.NORMAL,
          shiny: (shinyEncounter || pokemonData.shiny) ?? false
        })
        pokemon.positionX = pokemonData.x
        pokemon.positionY = pokemonData.y
        // Note: IDetailledPokemon doesn't have stars property, default to 1 star
        pokemon.stars = 1

        // Apply items if present
        if (pokemonData.items && pokemonData.items.length > 0) {
          pokemonData.items.forEach((item) => pokemon.items.add(item))
        }

        pokemons.set(pokemon.id, pokemon)
      })
    } else {
      // Handle PVEStage or PVEBossStage
      stage.board.forEach(([pkm, x, y], index) => {
        const pokemon = PokemonFactory.createPokemonFromName(pkm, {
          emotion: stage.emotion ?? Emotion.NORMAL,
          shiny: shinyEncounter
        })
        pokemon.positionX = x
        pokemon.positionY = y

        // Apply difficulty scaling to PVE stages (base stats only)
        if (!("statMultipliers" in stage) && difficultyMultiplier !== 1) {
          pokemon.hp = Math.round(pokemon.hp * difficultyMultiplier)
          pokemon.maxHP = pokemon.hp
          pokemon.atk = Math.round(pokemon.atk * difficultyMultiplier)
          pokemon.def = Math.round(pokemon.def * difficultyMultiplier)
          pokemon.ap = Math.round(pokemon.ap * difficultyMultiplier)
          if (pokemon.speDef !== undefined) {
            pokemon.speDef = Math.round(
              pokemon.speDef * difficultyMultiplier
            )
          }
        }

        // Apply stat boosts for regular PVE stages
        if ("statBoosts" in stage && stage.statBoosts) {
          for (const stat in stage.statBoosts) {
            pokemon.applyStat(stat as Stat, stage.statBoosts[stat], undefined)
          }
        }

        // Apply boss stat multipliers
        if ("statMultipliers" in stage && stage.statMultipliers) {
          const baseHp = pokemon.hp
          const baseAtk = pokemon.atk
          const baseDef = pokemon.def
          const baseSpAtk = pokemon.ap

          const scaledBaseHp = stage.baseStats.hp * difficultyMultiplier
          const scaledBaseAtk = stage.baseStats.atk * difficultyMultiplier
          const scaledBaseDef = stage.baseStats.def * difficultyMultiplier
          const scaledBaseSpAtk = stage.baseStats.ap * difficultyMultiplier

          pokemon.hp = Math.floor(scaledBaseHp * stage.statMultipliers.hp)
          pokemon.atk = Math.floor(scaledBaseAtk * stage.statMultipliers.atk)
          pokemon.def = Math.floor(scaledBaseDef * stage.statMultipliers.def)
          pokemon.ap = Math.floor(scaledBaseSpAtk * stage.statMultipliers.ap)
          pokemon.maxHP = pokemon.hp

          if (stage.baseStats.speDef !== undefined) {
            pokemon.speDef = Math.round(
              stage.baseStats.speDef * difficultyMultiplier
            )
          }
          if (pkm === Pkm.MEWTWO) {
            pokemon.shield = Math.round(8000 * difficultyMultiplier)
          }
          if (pkm === Pkm.MEWTWO) {
            pokemon.ap = Math.round(100 * difficultyMultiplier)
          }
          if (pkm === Pkm.MEWTWO && pokemon.speDef !== undefined) {
            const maxSpeDef = Math.round(50 * difficultyMultiplier)
            if (pokemon.speDef > maxSpeDef) {
              pokemon.speDef = maxSpeDef
            }
          }
          if (stage.baseStats.speed !== undefined) {
            pokemon.speed = Math.round(stage.baseStats.speed)
          }
          if (stage.baseStats.critChance !== undefined) {
            pokemon.critChance = Math.round(stage.baseStats.critChance)
          }
          if (stage.baseStats.critPower !== undefined) {
            pokemon.critPower = stage.baseStats.critPower
          }
          if (stage.baseStats.luck !== undefined) {
            pokemon.luck = Math.round(stage.baseStats.luck)
          }
          if (stage.baseStats.range !== undefined) {
            pokemon.range = Math.round(stage.baseStats.range)
          }
          if (stage.baseStats.maxPP !== undefined) {
            pokemon.maxPP = Math.round(stage.baseStats.maxPP)
          }
          if (stage.baseStats.pp !== undefined) {
            pokemon.pp = Math.round(stage.baseStats.pp)
          }

          if (difficultyMultiplier !== 1) {
            pokemon.bossDifficultyMultiplier = difficultyMultiplier
          }

          // Apply boss abilities if present
          if ("abilities" in stage && stage.abilities) {
            pokemon.skill = stage.abilities[0] // 使用第一个技能作为主要技能
          }
        }

        if (
          townEncounter === TownEncounters.MAROWAK &&
          "marowakItems" in stage &&
          stage.marowakItems &&
          index in stage.marowakItems
        ) {
          stage.marowakItems[index]!.forEach((item) => pokemon.items.add(item))
        }
        if ("initialItems" in stage && stage.initialItems) {
          stage.initialItems.forEach((item) => pokemon.items.add(item))
        }
        pokemons.set(pokemon.id, pokemon)
      })
    }
    return pokemons
  }

  static createPokemonFromName(
    name: Pkm,
    custom?: PkmCustom | Player
  ): Pokemon {
    let shiny = false
    let emotion = Emotion.NORMAL
    if (custom && "pokemonCustoms" in custom) {
      const pkmWithCustom = getPkmWithCustom(
        PkmIndex[name],
        (custom as IPlayer).pokemonCustoms
      )
      shiny = pkmWithCustom.shiny ?? false
      emotion = pkmWithCustom.emotion ?? Emotion.NORMAL
    } else if (custom) {
      shiny = custom.shiny ?? false
      emotion = custom.emotion ?? Emotion.NORMAL
    }
    if (name in PokemonClasses) {
      const PokemonClass = PokemonClasses[name]
      const pokemon = new PokemonClass(name, shiny, emotion)
      pokemon.maxHP = pokemon.hp
      return pokemon
    } else {
      logger.warn(`No pokemon with name "${name}" found, return MissingNo`)
      return new Pokemon(Pkm.DEFAULT, shiny, emotion)
    }
  }
}

export function getPokemonBaseline(name: Pkm) {
  switch (name) {
    case Pkm.VAPOREON:
    case Pkm.JOLTEON:
    case Pkm.FLAREON:
    case Pkm.ESPEON:
    case Pkm.UMBREON:
    case Pkm.LEAFEON:
    case Pkm.SYLVEON:
    case Pkm.GLACEON:
      return Pkm.EEVEE
    case Pkm.SHEDINJA:
      return Pkm.NINCADA
    case Pkm.WORMADAM_PLANT:
      return Pkm.BURMY_PLANT
    case Pkm.WORMADAM_SANDY:
      return Pkm.BURMY_SANDY
    case Pkm.WORMADAM_TRASH:
      return Pkm.BURMY_TRASH
    case Pkm.FLABEBE_BLUE:
    case Pkm.FLABEBE_ORANGE:
    case Pkm.FLABEBE_YELLOW:
    case Pkm.FLABEBE_WHITE:
    case Pkm.FLOETTE_BLUE:
    case Pkm.FLOETTE_ORANGE:
    case Pkm.FLOETTE_YELLOW:
    case Pkm.FLOETTE_WHITE:
    case Pkm.FLORGES_BLUE:
    case Pkm.FLORGES_ORANGE:
    case Pkm.FLORGES_YELLOW:
    case Pkm.FLORGES_WHITE:
      return Pkm.FLABEBE

    default:
      if (PkmFamily[name] === Pkm.UNOWN_A) {
        return name
      }
      return PkmFamily[name]
  }
}

export function isSameFamily(pkm1: Pkm, pkm2: Pkm): boolean {
  return getPokemonBaseline(pkm1) === getPokemonBaseline(pkm2)
}
