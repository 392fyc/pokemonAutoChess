import {
  NIGHTMARE_SPREAD_BUDGET_AUDIT_FREE_REFRESHES,
  NIGHTMARE_SPREAD_BUDGET_AUDIT_HP_COST_PER_EXTRA_REFRESH,
  NIGHTMARE_SPREAD_DEADLY_PURSUIT_DURATION_MS,
  NIGHTMARE_SPREAD_DEADLY_PURSUIT_MAX_STACKS,
  NIGHTMARE_SPREAD_DEADLY_PURSUIT_SPEED_BONUS,
  NightmareSpread
} from "../../../../../types/nightmare"

const zhNameMap: Record<NightmareSpread, string> = {
  [NightmareSpread.BUDGET_AUDIT]: "预算审计",
  [NightmareSpread.SUPPLY_SHORTAGE]: "兵粮寸断",
  [NightmareSpread.DEADLY_PURSUIT]: "致命追击"
}

const zhDescMap: Record<NightmareSpread, string> = {
  [NightmareSpread.BUDGET_AUDIT]:
    `每回合前${NIGHTMARE_SPREAD_BUDGET_AUDIT_FREE_REFRESHES}次普通商店刷新无代价；超出后每次刷新-` +
    `${NIGHTMARE_SPREAD_BUDGET_AUDIT_HP_COST_PER_EXTRA_REFRESH}玩家HP。`,
  [NightmareSpread.SUPPLY_SHORTAGE]:
    "战斗开始时，我方每触发一级共鸣，全体失去最大生命值N%的生命值（N为共鸣级数总和）。",
  [NightmareSpread.DEADLY_PURSUIT]:
    `战斗中我方每个宝可梦死亡时，敌方全体获得+${NIGHTMARE_SPREAD_DEADLY_PURSUIT_SPEED_BONUS}攻速，持续` +
    `${NIGHTMARE_SPREAD_DEADLY_PURSUIT_DURATION_MS / 1000}秒；独立叠层，最多` +
    `${NIGHTMARE_SPREAD_DEADLY_PURSUIT_MAX_STACKS}层。`
}

export function getNightmareSpreadName(
  spread: NightmareSpread,
  language: string
): string {
  if (language.startsWith("zh")) {
    return zhNameMap[spread] ?? spread
  }
  return spread
}

export function getNightmareSpreadDescription(
  spread: NightmareSpread,
  language: string
): string {
  if (language.startsWith("zh")) {
    return zhDescMap[spread] ?? spread
  }
  return spread
}
