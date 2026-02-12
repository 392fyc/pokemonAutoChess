import { NightmareReward } from "../types/nightmare"

const NIGHTMARE_REWARD_ASSET_FILE: Partial<Record<NightmareReward, string>> = {
  [NightmareReward.FINANCIAL_TYCOON]: "nightmare_financial_tycoon.png",
  [NightmareReward.WAR_DIVIDEND]: "nightmare_war_bonus.png",
  [NightmareReward.SOLO_LEVELING]: "nightmare_solo_leveling.png",
  [NightmareReward.WU_WEI_RULE]: "nightmare_let_it_go.png",
  [NightmareReward.LETHAL_TEMPO]: "nightmare_lethal_tempo.png",
  [NightmareReward.CALCULATED_LOSS]: "nightmare_intentional_loss.png",
  [NightmareReward.TARGETED_SEARCH]: "nightmare_targeted_search.png",
  [NightmareReward.QUALITY_A]: "nightmare_quality_a.png",
  [NightmareReward.UNYIELDING_DEATH]: "nightmare_unyielding_soul.png",
  [NightmareReward.BERSERKER]: "nightmare_berserker.png",
  [NightmareReward.RESONANCE_EXPERT]: "nightmare_resonance_expert.png",
  [NightmareReward.MAGICAL_FEEDBACK]: "nightmare_magic_feedback.png",
  [NightmareReward.DEEP_PLANNING]: "nightmare_deep_planning.png",
  [NightmareReward.NUMBERS_ADVANTAGE]: "nightmare_strength_in_numbers.png",
  [NightmareReward.INFINITE_GROWTH]: "nightmare_infinite_growth.png",
  [NightmareReward.OGRE]: "nightmare_ogre.png",
  [NightmareReward.SHINRA_TENSEI]: "nightmare_shinra_tensei.png",
  [NightmareReward.ASSIST_MASTER]: "nightmare_assist_master.png",
  [NightmareReward.DRAGON_DANCE]: "nightmare_dragon_dance_team.png",
  [NightmareReward.FATE_OBSERVATION]: "nightmare_fate_observation.png",
  [NightmareReward.LOYAL_CASTER]: "nightmare_loyal_caster.png",
  [NightmareReward.REFRACTION]: "nightmare_refraction.png",
  [NightmareReward.TOXIC_ARMORY]: "nightmare_quality_a.png",
  [NightmareReward.SOUL_LINK]: "nightmare_soul_link_pair_complete.png",
  [NightmareReward.TRINITY_CLONES]: "nightmare_one_split_three_pure.png"
}

export function getNightmareRewardAssetFile(reward: NightmareReward): string {
  return NIGHTMARE_REWARD_ASSET_FILE[reward] ?? "nightmare_quality_a.png"
}

export function getNightmareRewardAssetUrl(reward: NightmareReward): string {
  return `/assets/nightmare-rewards/${getNightmareRewardAssetFile(reward)}`
}

export function getNightmareRewardTextureKey(reward: NightmareReward): string {
  return `nightmare-reward-${reward}`
}
