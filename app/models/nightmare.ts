import {
  NIGHTMARE_REWARD_CONFIG,
  NIGHTMARE_STAGE_POOL,
  NightmareReward,
  NightmareRewardTier,
  NightmareRewardType
} from "../types/nightmare"
import { randomWeighted } from "../utils/random"

const rewardsByTier: Record<NightmareRewardTier, NightmareReward[]> = {
  [NightmareRewardTier.C]: [],
  [NightmareRewardTier.B]: [],
  [NightmareRewardTier.A]: [],
  [NightmareRewardTier.S]: [],
  [NightmareRewardTier.SPECIAL]: []
}

Object.entries(NIGHTMARE_REWARD_CONFIG).forEach(([reward, config]) => {
  if (reward === NightmareReward.NONE) return
  rewardsByTier[config.tier].push(reward as NightmareReward)
})

export function getNightmareRewardsByTier(
  tier: NightmareRewardTier
): NightmareReward[] {
  return rewardsByTier[tier]
}

export function isNightmareSingleEquip(reward: NightmareReward): boolean {
  return (
    NIGHTMARE_REWARD_CONFIG[reward]?.rewardType ===
    NightmareRewardType.SINGLE_EQUIP
  )
}

export function getNightmareExtraItemSlots(reward?: NightmareReward | null): number {
  if (!reward) return 0
  const rewards = getPokemonNightmareRewards(reward)
  if (rewards.includes(NightmareReward.TOXIC_ARMORY)) {
    return 3
  }
  return 0
}

export function getNightmareItemSlotLimit(reward?: NightmareReward | null): number {
  return 3 + getNightmareExtraItemSlots(reward)
}

export function getPokemonNightmareRewards(
  encodedReward: NightmareReward | string | null | undefined
): NightmareReward[] {
  if (!encodedReward || encodedReward === NightmareReward.NONE) return []
  const tokens = String(encodedReward)
    .split("|")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  const unique = new Set<NightmareReward>()
  tokens.forEach((token) => {
    if (token in NIGHTMARE_REWARD_CONFIG && token !== NightmareReward.NONE) {
      unique.add(token as NightmareReward)
    }
  })
  return Array.from(unique)
}

export function encodePokemonNightmareRewards(
  rewards: NightmareReward[]
): NightmareReward {
  const sanitized = Array.from(
    new Set(rewards.filter((reward) => reward && reward !== NightmareReward.NONE))
  )
  if (sanitized.length === 0) {
    return NightmareReward.NONE
  }
  return sanitized.join("|") as NightmareReward
}

export function hasPokemonNightmareReward(
  encodedReward: NightmareReward | string | null | undefined,
  reward: NightmareReward
): boolean {
  return getPokemonNightmareRewards(encodedReward).includes(reward)
}

export function addPokemonNightmareReward(
  encodedReward: NightmareReward | string | null | undefined,
  reward: NightmareReward
): NightmareReward {
  const next = getPokemonNightmareRewards(encodedReward)
  if (!next.includes(reward)) {
    next.push(reward)
  }
  return encodePokemonNightmareRewards(next)
}

function pickTier(stageLevel: number): NightmareRewardTier | null {
  const pools = NIGHTMARE_STAGE_POOL[stageLevel]
  if (!pools || pools.length === 0) return null
  const weights = pools.reduce(
    (acc, pool) => {
      acc[pool.tier] = pool.weight
      return acc
    },
    {} as Record<NightmareRewardTier, number>
  )
  return randomWeighted(weights)
}

export function rollNightmareReward(
  stageLevel: number,
  excludedRewards: Set<NightmareReward>,
  preferredRewards: Set<NightmareReward> = new Set<NightmareReward>()
): NightmareReward | null {
  const tier = pickTier(stageLevel)
  if (!tier) return null

  const tierRewards = getNightmareRewardsByTier(tier).filter(
    (reward) => !excludedRewards.has(reward)
  )
  if (tierRewards.length === 0) return null

  const preferred = tierRewards.filter((reward) => preferredRewards.has(reward))
  if (preferred.length > 0) {
    return preferred[Math.floor(Math.random() * preferred.length)]
  }

  return tierRewards[Math.floor(Math.random() * tierRewards.length)]
}

export function rollNightmareRewardFromTier(
  tier: NightmareRewardTier,
  excludedRewards: Set<NightmareReward>,
  preferredRewards: Set<NightmareReward> = new Set<NightmareReward>()
): NightmareReward | null {
  const tierRewards = getNightmareRewardsByTier(tier).filter(
    (reward) => !excludedRewards.has(reward)
  )
  if (tierRewards.length === 0) return null

  const preferred = tierRewards.filter((reward) => preferredRewards.has(reward))
  if (preferred.length > 0) {
    return preferred[Math.floor(Math.random() * preferred.length)]
  }

  return tierRewards[Math.floor(Math.random() * tierRewards.length)]
}
