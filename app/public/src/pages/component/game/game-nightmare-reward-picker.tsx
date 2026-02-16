import React from "react"
import { useTranslation } from "react-i18next"
import { getNightmareRewardAssetUrl } from "../../../../../models/nightmare-assets"
import {
  NIGHTMARE_REWARD_CONFIG,
  NightmareReward
} from "../../../../../types/nightmare"
import { DEPTH } from "../../../game/depths"
import { selectConnectedPlayer, useAppDispatch, useAppSelector } from "../../../hooks"
import {
  nightmareRewardRefresh,
  nightmareRewardSelect
} from "../../../stores/NetworkStore"
import {
  getNightmareRewardDescription,
  getNightmareRewardNameWithTier
} from "./nightmare-reward-i18n"
import { addIconsToDescription } from "../../utils/descriptions"
import "./game-nightmare-reward-picker.css"

export default function GameNightmareRewardPicker() {
  const { i18n } = useTranslation()
  const dispatch = useAppDispatch()
  const connectedPlayer = useAppSelector(selectConnectedPlayer)

  const rewards = (connectedPlayer?.nightmareRewardProposition ??
    []) as unknown as NightmareReward[]
  const refreshCounts = (connectedPlayer?.nightmareRewardRefreshCountPerSlot ??
    []) as unknown as number[]

  if (rewards.length === 0) return null

  const slots: Array<NightmareReward | null> = [...rewards]
  while (slots.length < 3) slots.push(null)

  return (
    <div
      className="game-nightmare-reward-picker"
      style={{ zIndex: DEPTH.MODAL }}
    >
      <div className="my-container nightmare-reward-shop">
        <h2>噩梦词条选择</h2>
        <div className="game-nightmare-reward-list">
          {slots.map((reward, index) => {
            if (!reward) {
              return (
                <div className="reward-slot" key={`empty-${index}`}>
                  <div className="my-box reward-card reward-card-empty" />
                  <button className="bubbly blue reward-refresh" disabled>
                    已刷新
                  </button>
                </div>
              )
            }

            const cfg = NIGHTMARE_REWARD_CONFIG[reward]
            if (!cfg) return null
            const refreshUsedCount = Math.min(1, refreshCounts[index] ?? 0)
            const refreshRemainingCount = Math.max(0, 1 - refreshUsedCount)
            const usedRefresh = refreshRemainingCount <= 0
            const rewardName = getNightmareRewardNameWithTier(
              reward,
              i18n.language
            )
            const rewardDescription = getNightmareRewardDescription(
              reward,
              cfg.description,
              i18n.language
            )
            const tierClass = `tier-${cfg.tier.toLowerCase()}`

            return (
              <div className="reward-slot" key={`${reward}-${index}`}>
                <button
                  type="button"
                  className={`my-box reward-card reward-card-action ${tierClass}`}
                  onClick={() => dispatch(nightmareRewardSelect({ reward }))}
                >
                  <h3>{rewardName}</h3>
                  <img
                    className="reward-card-image"
                    src={getNightmareRewardAssetUrl(reward)}
                    alt={rewardName}
                  />
                  <p>{addIconsToDescription(rewardDescription)}</p>
                </button>
                <button
                  className="bubbly blue reward-refresh"
                  disabled={usedRefresh}
                  onClick={() =>
                    dispatch(nightmareRewardRefresh({ slotIndex: index }))
                  }
                >
                  {usedRefresh ? "已刷新" : "刷新"}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
