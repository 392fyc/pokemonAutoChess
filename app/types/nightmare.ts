export enum NightmareRewardTier {
  C = "C",
  B = "B",
  A = "A",
  S = "S"
}

export enum NightmareRewardType {
  TEAM_PASSIVE = "TEAM_PASSIVE",
  SINGLE_EQUIP = "SINGLE_EQUIP",
  ECONOMY = "ECONOMY"
}

export enum NightmareReward {
  NONE = "NONE",
  FINANCIAL_TYCOON = "FINANCIAL_TYCOON",
  WAR_DIVIDEND = "WAR_DIVIDEND",
  SOLO_LEVELING = "SOLO_LEVELING",
  WU_WEI_RULE = "WU_WEI_RULE",
  LETHAL_TEMPO = "LETHAL_TEMPO",
  CALCULATED_LOSS = "CALCULATED_LOSS",
  TARGETED_SEARCH = "TARGETED_SEARCH",
  QUALITY_A = "QUALITY_A",
  UNYIELDING_DEATH = "UNYIELDING_DEATH",
  BERSERKER = "BERSERKER",
  RESONANCE_EXPERT = "RESONANCE_EXPERT",
  MAGICAL_FEEDBACK = "MAGICAL_FEEDBACK",
  DEEP_PLANNING = "DEEP_PLANNING",
  NUMBERS_ADVANTAGE = "NUMBERS_ADVANTAGE",
  INFINITE_GROWTH = "INFINITE_GROWTH",
  OGRE = "OGRE",
  SHINRA_TENSEI = "SHINRA_TENSEI",
  ASSIST_MASTER = "ASSIST_MASTER",
  DRAGON_DANCE = "DRAGON_DANCE",
  FATE_OBSERVATION = "FATE_OBSERVATION",
  LOYAL_CASTER = "LOYAL_CASTER",
  REFRACTION = "REFRACTION",
  TOXIC_ARMORY = "TOXIC_ARMORY",
  SOUL_LINK = "SOUL_LINK",
  TRINITY_CLONES = "TRINITY_CLONES"
}

export interface NightmareRewardConfig {
  tier: NightmareRewardTier
  rewardType: NightmareRewardType
  description: string
  v1Implemented: boolean
}

export enum NightmareWindowAction {
  NUMBERS_ADVANTAGE_BUY = "NUMBERS_ADVANTAGE_BUY"
}

export const NIGHTMARE_MILESTONES = [5, 15, 25, 35] as const

export const NIGHTMARE_REWARD_CONFIG: Record<
  NightmareReward,
  NightmareRewardConfig
> = {
  [NightmareReward.NONE]: {
    tier: NightmareRewardTier.C,
    rewardType: NightmareRewardType.TEAM_PASSIVE,
    description: "None",
    v1Implemented: false
  },
  [NightmareReward.FINANCIAL_TYCOON]: {
    tier: NightmareRewardTier.C,
    rewardType: NightmareRewardType.ECONOMY,
    description: "Gain +1 gold each round. Max interest +1, and +2 after stage 25.",
    v1Implemented: true
  },
  [NightmareReward.WAR_DIVIDEND]: {
    tier: NightmareRewardTier.C,
    rewardType: NightmareRewardType.ECONOMY,
    description: "Extra 1~2 gold rewards while win streaking.",
    v1Implemented: true
  },
  [NightmareReward.SOLO_LEVELING]: {
    tier: NightmareRewardTier.C,
    rewardType: NightmareRewardType.TEAM_PASSIVE,
    description: "Single unit challenge and growth.",
    v1Implemented: true
  },
  [NightmareReward.WU_WEI_RULE]: {
    tier: NightmareRewardTier.C,
    rewardType: NightmareRewardType.ECONOMY,
    description: "Replace interest with fixed gold/exp gains.",
    v1Implemented: true
  },
  [NightmareReward.LETHAL_TEMPO]: {
    tier: NightmareRewardTier.B,
    rewardType: NightmareRewardType.TEAM_PASSIVE,
    description: "Ranged attacks accumulate permanent speed boosts.",
    v1Implemented: true
  },
  [NightmareReward.CALCULATED_LOSS]: {
    tier: NightmareRewardTier.C,
    rewardType: NightmareRewardType.ECONOMY,
    description: "Loss rounds grant extra gold/exp and heal.",
    v1Implemented: true
  },
  [NightmareReward.TARGETED_SEARCH]: {
    tier: NightmareRewardTier.B,
    rewardType: NightmareRewardType.ECONOMY,
    description: "Shop refresh prefers activated synergies.",
    v1Implemented: true
  },
  [NightmareReward.QUALITY_A]: {
    tier: NightmareRewardTier.B,
    rewardType: NightmareRewardType.SINGLE_EQUIP,
    description: "Start weaker, scale through kills.",
    v1Implemented: true
  },
  [NightmareReward.UNYIELDING_DEATH]: {
    tier: NightmareRewardTier.B,
    rewardType: NightmareRewardType.TEAM_PASSIVE,
    description: "First lethal hit delays death for 5s.",
    v1Implemented: true
  },
  [NightmareReward.BERSERKER]: {
    tier: NightmareRewardTier.B,
    rewardType: NightmareRewardType.SINGLE_EQUIP,
    description: "Lower HP grants stronger combat stats.",
    v1Implemented: true
  },
  [NightmareReward.RESONANCE_EXPERT]: {
    tier: NightmareRewardTier.B,
    rewardType: NightmareRewardType.TEAM_PASSIVE,
    description: "Each active synergy level grants team speed.",
    v1Implemented: true
  },
  [NightmareReward.MAGICAL_FEEDBACK]: {
    tier: NightmareRewardTier.B,
    rewardType: NightmareRewardType.SINGLE_EQUIP,
    description: "Enemy cast triggers retaliatory attack.",
    v1Implemented: true
  },
  [NightmareReward.DEEP_PLANNING]: {
    tier: NightmareRewardTier.A,
    rewardType: NightmareRewardType.TEAM_PASSIVE,
    description: "Gain a random B reward and delayed extra pick.",
    v1Implemented: true
  },
  [NightmareReward.NUMBERS_ADVANTAGE]: {
    tier: NightmareRewardTier.A,
    rewardType: NightmareRewardType.ECONOMY,
    description:
      "Auto-granted at stage 21. Spend gold in nightmare window to permanently increase team size cap.",
    v1Implemented: true
  },
  [NightmareReward.INFINITE_GROWTH]: {
    tier: NightmareRewardTier.A,
    rewardType: NightmareRewardType.TEAM_PASSIVE,
    description: "Absorb 1-star copies into 3-star for growth.",
    v1Implemented: true
  },
  [NightmareReward.OGRE]: {
    tier: NightmareRewardTier.A,
    rewardType: NightmareRewardType.SINGLE_EQUIP,
    description: "Start-of-fight ally consume for temporary stats.",
    v1Implemented: true
  },
  [NightmareReward.SHINRA_TENSEI]: {
    tier: NightmareRewardTier.A,
    rewardType: NightmareRewardType.SINGLE_EQUIP,
    description: "Periodic knockback around bound unit.",
    v1Implemented: true
  },
  [NightmareReward.ASSIST_MASTER]: {
    tier: NightmareRewardTier.A,
    rewardType: NightmareRewardType.SINGLE_EQUIP,
    description: "Cast cadence driven by ally casts.",
    v1Implemented: true
  },
  [NightmareReward.DRAGON_DANCE]: {
    tier: NightmareRewardTier.A,
    rewardType: NightmareRewardType.TEAM_PASSIVE,
    description: "All allies start with full PP.",
    v1Implemented: true
  },
  [NightmareReward.FATE_OBSERVATION]: {
    tier: NightmareRewardTier.S,
    rewardType: NightmareRewardType.SINGLE_EQUIP,
    description: "Damage applies random debuffs.",
    v1Implemented: true
  },
  [NightmareReward.LOYAL_CASTER]: {
    tier: NightmareRewardTier.S,
    rewardType: NightmareRewardType.SINGLE_EQUIP,
    description: "Cannot basic attack; auto-cast periodically.",
    v1Implemented: true
  },
  [NightmareReward.REFRACTION]: {
    tier: NightmareRewardTier.S,
    rewardType: NightmareRewardType.SINGLE_EQUIP,
    description: "Damage reduction and reflected true damage.",
    v1Implemented: true
  },
  [NightmareReward.TOXIC_ARMORY]: {
    tier: NightmareRewardTier.A,
    rewardType: NightmareRewardType.SINGLE_EQUIP,
    description:
      "Pain Armor: bound unit gains +3 item slots, but is permanently forced to 3 poison stacks in battle.",
    v1Implemented: true
  },
  [NightmareReward.SOUL_LINK]: {
    tier: NightmareRewardTier.S,
    rewardType: NightmareRewardType.SINGLE_EQUIP,
    description: "Two bound units share incoming damage.",
    v1Implemented: true
  },
  [NightmareReward.TRINITY_CLONES]: {
    tier: NightmareRewardTier.S,
    rewardType: NightmareRewardType.SINGLE_EQUIP,
    description: "Summon two clones with inherited bonuses.",
    v1Implemented: true
  }
}

export const NIGHTMARE_STAGE_POOL: Record<
  number,
  Array<{ tier: NightmareRewardTier; weight: number }>
> = {
  5: [
    { tier: NightmareRewardTier.C, weight: 80 },
    { tier: NightmareRewardTier.B, weight: 20 }
  ],
  15: [
    { tier: NightmareRewardTier.C, weight: 20 },
    { tier: NightmareRewardTier.B, weight: 75 },
    { tier: NightmareRewardTier.A, weight: 5 }
  ],
  25: [{ tier: NightmareRewardTier.A, weight: 100 }],
  35: [
    { tier: NightmareRewardTier.A, weight: 50 },
    { tier: NightmareRewardTier.S, weight: 50 }
  ]
}
