import React from "react"
import { useTranslation } from "react-i18next"
import {
  NightmareSpread,
  NIGHTMARE_SPREAD_VOTE_OPEN_KEY,
  NIGHTMARE_SPREAD_VOTE_OPTION_KEY,
  NIGHTMARE_SPREAD_VOTE_REMAINING_MS_KEY,
  NIGHTMARE_SPREAD_VOTE_SELECTED_KEY,
  NIGHTMARE_SPREAD_VOTE_STAGE_KEY,
  getNightmareSpreadById,
  getNightmareSpreadId
} from "../../../../../types/nightmare"
import { DEPTH } from "../../../game/depths"
import { selectConnectedPlayer, useAppDispatch, useAppSelector } from "../../../hooks"
import { nightmareSpreadVote } from "../../../stores/NetworkStore"
import {
  getNightmareSpreadDescription,
  getNightmareSpreadName
} from "./nightmare-spread-i18n"
import "./game-nightmare-spread-picker.css"

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

export default function GameNightmareSpreadPicker() {
  const { i18n } = useTranslation()
  const dispatch = useAppDispatch()
  const connectedPlayer = useAppSelector(selectConnectedPlayer)
  const counters = connectedPlayer?.nightmareCounters as
    | Map<string, number>
    | Record<string, number>
    | undefined

  const isOpen = getCounter(counters, NIGHTMARE_SPREAD_VOTE_OPEN_KEY) > 0
  if (!isOpen) return null

  const stage = getCounter(counters, NIGHTMARE_SPREAD_VOTE_STAGE_KEY)
  const remainingMs = getCounter(counters, NIGHTMARE_SPREAD_VOTE_REMAINING_MS_KEY)
  const selectedId = getCounter(counters, NIGHTMARE_SPREAD_VOTE_SELECTED_KEY)
  const optionId = getCounter(counters, NIGHTMARE_SPREAD_VOTE_OPTION_KEY)
  const option = getNightmareSpreadById(optionId)
  if (!option) return null

  const selected = selectedId === getNightmareSpreadId(option)
  const title = getNightmareSpreadName(option, i18n.language)
  const desc = getNightmareSpreadDescription(option, i18n.language)

  return (
    <div className="game-nightmare-spread-picker" style={{ zIndex: DEPTH.MODAL }}>
      <div className="my-container nightmare-spread-shop">
        <h2>噩梦蔓延投票（第{stage}回合）</h2>
        <p className="spread-vote-timer">剩余 {Math.ceil(remainingMs / 1000)} 秒</p>
        <div className="game-nightmare-spread-list">
          <button
            type="button"
            className="my-box spread-card spread-card-action"
            disabled={selected}
            onClick={() => dispatch(nightmareSpreadVote({ spread: option }))}
          >
            <h3>{title}</h3>
            <p>{desc}</p>
            <div className="spread-card-footer">{selected ? "已投票" : "投票"}</div>
          </button>
          <div className="my-box spread-card spread-card-empty">
            <h3>测试占位</h3>
            <p>本轮试用版仅投放1个噩梦蔓延词条。</p>
          </div>
          <div className="my-box spread-card spread-card-empty">
            <h3>测试占位</h3>
            <p>投票流程保持不变，后续可恢复3选1。</p>
          </div>
        </div>
      </div>
    </div>
  )
}
