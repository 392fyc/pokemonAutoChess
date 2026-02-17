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

export const mewtwoBossStage: PVEBossStage = {
  name: "Boss Mewtwo",
  avatar: Pkm.MEWTWO,
  emotion: Emotion.ANGRY,
  stageLevel: 49,
  board: [[Pkm.MEWTWO, 3, 2]], // 中心位置
  baseStats: {
    hp: 4000,
    atk: 50,
    def: 40,
    ap: 0,
    speDef: 30,
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
    Ability.BOSS_PSYSTRIKE,
    Ability.BOSS_PSYCHIC
  ],
  bossTraits: [
    BossTrait.LEGENDARY_POKEMON,
    BossTrait.IGNORE_SYNERGIES,
    BossTrait.LEGENDARY_RESISTANCE,
    BossTrait.INCREASED_RANGE,
    BossTrait.MEWTWO_HEART
  ],
  initialItems: [
    Item.HEAVY_DUTY_BOOTS,
    Item.PROTECTIVE_PADS,
    Item.MUSCLE_BAND
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
      triggerValue: 10000, // 每10秒触发
      cooldown: 10000,
      priority: 2
    },
    {
      ability: Ability.BOSS_PSYSTRIKE,
      triggerType: "mpControl",
      triggerValue: 110, // MP满时触发
      cooldown: 3000,
      priority: 3
    },
    {
      ability: Ability.BOSS_PSYCHIC,
      triggerType: "hpThreshold",
      triggerValue: 100, // 100%血量触发
      delay: 5000, // Max defer window (ms) if silenced or locked
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
  49: mewtwoBossStage
}
