import { Ability } from "../types/enum/Ability"
import { Emotion } from "../types/enum/Emotion"
import { BossTrait } from "../types/enum/Game"
import { Item } from "../types/enum/Item"
import { Pkm } from "../types/enum/Pokemon"

export interface PVEBossStage {
  name: string
  avatar: Pkm
  emotion?: Emotion
  stageLevel: number
  board: [pkm: Pkm, x: number, y: number][] // Boss board layout
  baseStats: {
    hp: number
    atk: number
    def: number
    ap: number
    speDef?: number
    speed?: number
    critChance?: number
    critPower?: number
    luck?: number
    range?: number
    maxPP?: number
    pp?: number
  }
  statMultipliers: {
    hp: number
    atk: number
    def: number
    ap: number
  }
  abilities: Ability[] // Boss-specific abilities
  bossTraits?: BossTrait[] // Boss专属特性
  initialItems?: Item[]
  bossAbilityConfigs?: {
    ability: Ability
    triggerType: "periodic" | "hpThreshold" | "mpControl" | "passive"
    triggerValue: number // 时间间隔(ms) / 血量阈值(%) / MP阈值
    cooldown?: number // 冷却时间(ms)
    delay?: number // 顺延时间(ms)
    priority?: number // 触发优先级
  }[]
  rewards: {
    itemId: Item
    chance: number // Probability of dropping this item (0 to 1)
    quantity: number
  }[]
  triggerCondition: {
    minWave: number
    playerLevel?: number // Optional player level condition
  }
}

export const pikachuBossStage: PVEBossStage = {
  name: "Boss Pikachu",
  avatar: Pkm.PIKACHU,
  emotion: Emotion.ANGRY,
  stageLevel: 1,
  board: [
    [Pkm.PIKACHU, 3, 2] // Center position for the boss Pikachu
  ],
  baseStats: {
    hp: 1000,
    atk: 50,
    def: 20,
    ap: 30
  },
  statMultipliers: {
    hp: 1.1,
    atk: 1.05,
    def: 1.02,
    ap: 1.08
  },
  abilities: [Ability.THUNDER_SHOCK, Ability.QUICK_ATTACK],
  rewards: [
    { itemId: Item.THUNDER_STONE, chance: 0.5, quantity: 1 },
    { itemId: Item.COIN, chance: 1.0, quantity: 100 },
    { itemId: Item.EXP_SHARE, chance: 0.3, quantity: 1 }
  ],
  triggerCondition: {
    minWave: 5,
    playerLevel: 5
  }
}

// Export as PVEBossStages object to match the import in game-commands.ts
export const mewtwoBossStage: PVEBossStage = {
  name: "Boss Mewtwo",
  avatar: Pkm.MEWTWO,
  emotion: Emotion.ANGRY,
  stageLevel: 49,
  board: [[Pkm.MEWTWO, 3, 2]], // 中心位置，实际占用2x2区域
  baseStats: {
    hp: 20000,
    atk: 50,
    def: 10,
    ap: 0,
    speDef: 10,
    speed: 67,
    critChance: 10,
    critPower: 2,
    luck: 0,
    range: 3,
    maxPP: 110,
    pp: 110
  },
  statMultipliers: {
    hp: 1,
    atk: 1,
    def: 1,
    ap: 1
  },
  abilities: [
    Ability.BOSS_TELEPORT,
    Ability.BOSS_MEDITATE,
    Ability.BOSS_AURASPHERE,
    Ability.BOSS_PSYCHIC
  ],
  bossTraits: [
    BossTrait.LEGENDARY_POKEMON,
    BossTrait.SIZE_2X2,
    BossTrait.IGNORE_SYNERGIES,
    BossTrait.LEGENDARY_RESISTANCE,
    BossTrait.INCREASED_RANGE
  ],
  initialItems: [
    Item.HEAVY_DUTY_BOOTS,
    Item.MEWTWO_HEART,
    Item.SHINY_CHARM
  ],
  bossAbilityConfigs: [
    {
      ability: Ability.BOSS_TELEPORT,
      triggerType: "periodic",
      triggerValue: 8000, // 每8秒触发
      cooldown: 8000,
      priority: 1
    },
    {
      ability: Ability.BOSS_MEDITATE,
      triggerType: "periodic",
      triggerValue: 5000, // 每5秒触发
      cooldown: 5000,
      priority: 2
    },
    {
      ability: Ability.BOSS_AURASPHERE,
      triggerType: "mpControl",
      triggerValue: 110, // MP满时触发
      cooldown: 3000,
      priority: 3
    },
    {
      ability: Ability.BOSS_PSYCHIC,
      triggerType: "hpThreshold",
      triggerValue: 100, // 100%血量触发
      delay: 5000, // 5秒顺延
      priority: 4
    },
    {
      ability: Ability.BOSS_PSYCHIC,
      triggerType: "hpThreshold",
      triggerValue: 75, // 75%血量触发
      delay: 5000,
      priority: 4
    },
    {
      ability: Ability.BOSS_PSYCHIC,
      triggerType: "hpThreshold",
      triggerValue: 50, // 50%血量触发
      delay: 5000,
      priority: 4
    },
    {
      ability: Ability.BOSS_PSYCHIC,
      triggerType: "hpThreshold",
      triggerValue: 25, // 25%血量触发
      delay: 5000,
      priority: 4
    }
  ],
  rewards: [
    { itemId: Item.MASTER_BALL, chance: 0.1, quantity: 1 },
    { itemId: Item.COIN, chance: 1.0, quantity: 500 },
    { itemId: Item.RARE_CANDY, chance: 0.5, quantity: 3 }
  ],
  triggerCondition: {
    minWave: 20,
    playerLevel: 15
  }
}

export const PVEBossStages = {
  1: pikachuBossStage,
  49: mewtwoBossStage
}
