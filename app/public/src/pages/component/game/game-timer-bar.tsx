import React from "react"
import { useTranslation } from "react-i18next"
import { Tooltip } from "react-tooltip"
import {
  NIGHTMARE_SPREAD_BUDGET_AUDIT_FREE_REFRESHES,
  NIGHTMARE_SPREAD_BUDGET_AUDIT_REFRESH_COUNT_KEY,
  NightmareSpread,
  getNightmareSpreadActiveCounterKey
} from "../../../../../types/nightmare"
import { selectConnectedPlayer, useAppSelector } from "../../../hooks"
import {
  getNightmareSpreadDescription,
  getNightmareSpreadName
} from "./nightmare-spread-i18n"
import "./game-timer-bar.css"

type NightmareSpreadSlot = {
  key: string
  spread?: NightmareSpread
  stage: number
}

const SPREAD_SLOTS: NightmareSpreadSlot[] = [
  { key: "spread-11", spread: NightmareSpread.BUDGET_AUDIT, stage: 11 },
  { key: "spread-21", spread: NightmareSpread.SUPPLY_SHORTAGE, stage: 21 },
  { key: "spread-31", spread: NightmareSpread.DEADLY_PURSUIT, stage: 31 },
  { key: "spread-41", stage: 41 }
]

function getCounter(
  counters: Map<string, number> | Record<string, number> | undefined,
  key: string
) {
  if (!counters) return 0
  if (typeof (counters as Map<string, number>).get === "function") {
    return (counters as Map<string, number>).get(key) ?? 0
  }
  return (counters as Record<string, number>)[key] ?? 0
}

export default function TimerBar() {
  const { i18n } = useTranslation()
  const totalTime = useAppSelector((state) => state.game.phaseDuration)
  const time = useAppSelector((state) => state.game.roundTime)
  const connectedPlayer = useAppSelector(selectConnectedPlayer)
  const counters = connectedPlayer?.nightmareCounters as
    | Map<string, number>
    | Record<string, number>
    | undefined
  const pc = Math.min(Math.max((100 * time) / totalTime, 0), 100)
  const budgetRefreshCount = getCounter(
    counters,
    NIGHTMARE_SPREAD_BUDGET_AUDIT_REFRESH_COUNT_KEY
  )

  return (
    <>
      <div className="timer-bar">
        <div className="timer-bar-inner" style={{ width: `${pc}%` }}></div>
      </div>
      <div className="nightmare-spread-bar">
        <div className="nightmare-spread-grid">
          {SPREAD_SLOTS.map((slot, index) => {
            const spread = slot.spread
            const isActive =
              !!spread &&
              getCounter(counters, getNightmareSpreadActiveCounterKey(spread)) > 0

            if (!spread || !isActive) {
              return (
                <div
                  key={slot.key}
                  className="nightmare-spread-slot empty"
                  aria-label={`第${slot.stage}回合噩梦蔓延槽位`}
                >
                  <span>{slot.stage}</span>
                </div>
              )
            }

            const name = getNightmareSpreadName(spread, i18n.language)
            const desc = getNightmareSpreadDescription(spread, i18n.language)
            const tooltipId = `nightmare-spread-tooltip-${index}`
            const displayText =
              spread === NightmareSpread.BUDGET_AUDIT
                ? `${name} (${budgetRefreshCount}/${NIGHTMARE_SPREAD_BUDGET_AUDIT_FREE_REFRESHES})`
                : name

            return (
              <div key={slot.key} className="nightmare-spread-slot-wrapper">
                <div
                  className="nightmare-spread-slot filled"
                  data-tooltip-id={tooltipId}
                >
                  <span className="nightmare-spread-slot-text">{name}</span>
                </div>
                <Tooltip id={tooltipId} className="custom-theme-tooltip" place="bottom">
                  <strong>{displayText}</strong>
                  <p>{desc}</p>
                </Tooltip>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
