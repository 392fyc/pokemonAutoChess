import {
  NIGHTMARE_ASSIST_MASTER_ALLY_CASTS,
  NIGHTMARE_DRAGON_DANCE_INTERVAL_MS,
  NIGHTMARE_FATE_OBSERVATION_DEBUFF_DURATION_MS,
  NIGHTMARE_FATE_OBSERVATION_TARGET_CD_MS,
  NIGHTMARE_INFINITE_GROWTH_BONUS_RATIO,
  NIGHTMARE_LOYAL_CASTER_INTERVAL_MS,
  NIGHTMARE_SOLO_LEVELING_ATTR_MULTIPLIER,
  NIGHTMARE_SOLO_LEVELING_DURATION_ROUNDS,
  NIGHTMARE_SOLO_LEVELING_KILL_EXP,
  NIGHTMARE_SOLO_LEVELING_KILL_GOLD,
  NIGHTMARE_REWARD_CONFIG,
  NightmareReward,
  NightmareRewardTier
} from "../../../../../types/nightmare"

const zhNameMap: Record<NightmareReward, string> = {
  [NightmareReward.NONE]: "无",
  [NightmareReward.FINANCIAL_TYCOON]: "金融大亨",
  [NightmareReward.WAR_DIVIDEND]: "战争红利",
  [NightmareReward.SOLO_LEVELING]: "独自升级",
  [NightmareReward.WU_WEI_RULE]: "无为而治",
  [NightmareReward.LETHAL_TEMPO]: "致命节奏",
  [NightmareReward.CALCULATED_LOSS]: "存心失利",
  [NightmareReward.TARGETED_SEARCH]: "定向检索",
  [NightmareReward.QUALITY_A]: "素质A",
  [NightmareReward.UNYIELDING_DEATH]: "死而不僵",
  [NightmareReward.BERSERKER]: "狂战士",
  [NightmareReward.RESONANCE_EXPERT]: "共鸣专家",
  [NightmareReward.MAGICAL_FEEDBACK]: "魔法反馈",
  [NightmareReward.DEEP_PLANNING]: "深思远虑",
  [NightmareReward.NUMBERS_ADVANTAGE]: "人多势众",
  [NightmareReward.INFINITE_GROWTH]: "无限成长",
  [NightmareReward.OGRE]: "食人魔",
  [NightmareReward.SHINRA_TENSEI]: "神罗天征",
  [NightmareReward.ASSIST_MASTER]: "助攻高手",
  [NightmareReward.DRAGON_DANCE]: "龙之舞",
  [NightmareReward.FATE_OBSERVATION]: "命运观测",
  [NightmareReward.LOYAL_CASTER]: "忠实施法者",
  [NightmareReward.REFRACTION]: "折射",
  [NightmareReward.TOXIC_ARMORY]: "苦痛装甲",
  [NightmareReward.SOUL_LINK]: "灵魂链接",
  [NightmareReward.TRINITY_CLONES]: "一气化三清"
}

const enNameMap: Partial<Record<NightmareReward, string>> = {
  [NightmareReward.TOXIC_ARMORY]: "Pain Armor"
}

const zhDescriptionMap: Partial<Record<NightmareReward, string>> = {
  [NightmareReward.FINANCIAL_TYCOON]:
    "最大利息 +2；第25回合后提升为 +3。当前 GOLD 小于可获得最大利息所需 GOLD 时，利息变为 x1.5。",
  [NightmareReward.WAR_DIVIDEND]:
    "连胜时额外获得随机1~2金币（25回合前50%/50%，25回合后10%/90%）；当连胜≥5时该奖励翻倍。",
  [NightmareReward.SOLO_LEVELING]:
    `获得后${NIGHTMARE_SOLO_LEVELING_DURATION_ROUNDS}回合内人口锁定为1。上场宝可梦获得${
      NIGHTMARE_SOLO_LEVELING_ATTR_MULTIPLIER * 100
    }%额外属性；击杀敌方宝可梦时获得${NIGHTMARE_SOLO_LEVELING_KILL_GOLD}金币和${NIGHTMARE_SOLO_LEVELING_KILL_EXP}经验。${NIGHTMARE_SOLO_LEVELING_DURATION_ROUNDS}回合结束后人口恢复。`,
  [NightmareReward.WU_WEI_RULE]:
    "取消利息，改为固定每回合+2金币与+2经验；累计击杀150个宝可梦后提升为+3金币与+3经验。当达到等级9后，超出的经验将转化为金币。",
  [NightmareReward.LETHAL_TEMPO]:
    "我方所有远程单位累计攻击150次后永久+8攻速。",
  [NightmareReward.CALCULATED_LOSS]:
    "接下来5回合失败时额外获得+8金币与+4经验，且玩家损失生命值时回复2HP。",
  [NightmareReward.TARGETED_SEARCH]:
    "商店刷新更偏向已触发共鸣的属性池。",
  [NightmareReward.QUALITY_A]:
    "绑定宝可梦基础物攻/AP各-50%，最大HP-30%（永久且升星不消除）；每击杀1个单位永久+2最大HP、+1物攻/AP，每回合最多触发10次；每累计触发10次额外永久+1物防与+1特防。",
  [NightmareReward.UNYIELDING_DEATH]:
    "我方全体宝可梦每回合首次致死后维持1HP继续5秒。",
  [NightmareReward.BERSERKER]:
    "我方全体宝可梦血量越低，ATK/AP/SPEED 加成越高。",
  [NightmareReward.RESONANCE_EXPERT]:
    "每触发一级共鸣，全队+10攻速（按共鸣级数累积）。",
  [NightmareReward.MAGICAL_FEEDBACK]:
    "敌方施法时触发一次无视距离普攻。",
  [NightmareReward.DEEP_PLANNING]:
    "立刻获得1个随机B词条；5回合后额外触发一次第15回合的里程碑。",
  [NightmareReward.NUMBERS_ADVANTAGE]:
    "该词条第21回合自动获得；在词条窗口内花费金币可使人口上限永久+1（费用翻倍递增）。",
  [NightmareReward.INFINITE_GROWTH]:
    `购买1星宝可梦时，若场上已有3星则吸收，永久+${
      NIGHTMARE_INFINITE_GROWTH_BONUS_RATIO * 100
    }%基础属性。`,
  [NightmareReward.OGRE]:
    "开战吞噬半径1格内的所有友军，获得其50%基础属性。",
  [NightmareReward.SHINRA_TENSEI]:
    "每5秒推开自身半径3格范围内所有敌方单位，且自身射程永久+3。",
  [NightmareReward.ASSIST_MASTER]:
    `自身不主动施法，队友施法累计${NIGHTMARE_ASSIST_MASTER_ALLY_CASTS}次后触发自身施法；自身施法时为全队添加自身PP最大值的护盾。`,
  [NightmareReward.DRAGON_DANCE]:
    `战斗开始时全队满PP，且每${NIGHTMARE_DRAGON_DANCE_INTERVAL_MS / 1000}秒再次触发。`,
  [NightmareReward.FATE_OBSERVATION]:
    `造成伤害时附加随机debuff（持续${
      NIGHTMARE_FATE_OBSERVATION_DEBUFF_DURATION_MS / 1000
    }秒，同一目标${NIGHTMARE_FATE_OBSERVATION_TARGET_CD_MS / 1000}秒内置CD）。`,
  [NightmareReward.LOYAL_CASTER]:
    `无法普攻，每${NIGHTMARE_LOYAL_CASTER_INTERVAL_MS / 1000}秒自动施法且不消耗PP。`,
  [NightmareReward.REFRACTION]:
    "减免30%受到的伤害，且将这部分伤害以真伤分摊给自身半径2格内的所有敌方。",
  [NightmareReward.TOXIC_ARMORY]:
    "绑定单位额外获得3个装备栏位；战斗中永久处于3层中毒（被净化后会重新施加）。",
  [NightmareReward.SOUL_LINK]:
    "两名绑定单位分担伤害且享受对方属性成长的一部分。当一方死亡时，另一方也会立刻死亡。",
  [NightmareReward.TRINITY_CLONES]:
    "自身基础降为30%，开战召唤左右分身协同作战。"
}

const tierPrefixMap: Record<NightmareRewardTier, string> = {
  [NightmareRewardTier.C]: "C",
  [NightmareRewardTier.B]: "B",
  [NightmareRewardTier.A]: "A",
  [NightmareRewardTier.S]: "S",
  [NightmareRewardTier.SPECIAL]: "特"
}

export function getNightmareRewardName(
  reward: NightmareReward,
  language: string
): string {
  if (language.startsWith("zh")) {
    return zhNameMap[reward] ?? reward
  }
  return enNameMap[reward] ?? reward
}

export function getNightmareRewardTierPrefix(reward: NightmareReward): string {
  const tier = NIGHTMARE_REWARD_CONFIG[reward]?.tier
  if (!tier) return ""
  return tierPrefixMap[tier] ?? ""
}

export function getNightmareRewardNameWithTier(
  reward: NightmareReward,
  language: string
): string {
  const name = getNightmareRewardName(reward, language)
  const tierPrefix = getNightmareRewardTierPrefix(reward)
  return tierPrefix ? `[${tierPrefix}] ${name}` : name
}

export function getNightmareRewardDescription(
  reward: NightmareReward,
  fallback: string,
  language: string
): string {
  if (language.startsWith("zh")) {
    return zhDescriptionMap[reward] ?? fallback
  }
  return fallback
}
