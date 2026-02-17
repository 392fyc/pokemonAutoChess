import React from "react"
import { Tooltip } from "react-tooltip"
import { selectConnectedPlayer, useAppSelector } from "../../../hooks"
import "./game-timer-bar.css"

type NightmareSpreadEntry = {
  id: string
  name: string
  description: string
  icon?: string
}

function normalizeNightmareSpreadEntries(
  rawEntries: unknown
): NightmareSpreadEntry[] {
  if (!Array.isArray(rawEntries)) return []
  return rawEntries
    .map((entry, index) => {
      if (typeof entry === "string") {
        return {
          id: `spread-${index}`,
          name: entry,
          description: "噩梦蔓延词条效果"
        }
      }
      if (!entry || typeof entry !== "object") return null
      const payload = entry as Record<string, unknown>
      const name = String(payload.name ?? payload.title ?? "").trim()
      if (!name) return null
      return {
        id: String(payload.id ?? `spread-${index}`),
        name,
        description: String(payload.description ?? payload.desc ?? "噩梦蔓延词条效果"),
        icon:
          typeof payload.icon === "string" && payload.icon.length > 0
            ? payload.icon
            : undefined
      }
    })
    .filter((entry): entry is NightmareSpreadEntry => entry !== null)
}

export default function TimerBar() {
  const totalTime = useAppSelector((state) => state.game.phaseDuration)
  const time = useAppSelector((state) => state.game.roundTime)
  const connectedPlayer = useAppSelector(selectConnectedPlayer)
  const pc = Math.min(Math.max((100 * time) / totalTime, 0), 100)
  const spreadEntries = normalizeNightmareSpreadEntries(
    (connectedPlayer as Record<string, unknown> | undefined)?.nightmareSpreadEntries
  ).slice(0, 4)

  const slots: Array<NightmareSpreadEntry | null> = [...spreadEntries]
  while (slots.length < 4) slots.push(null)

  return (
    <>
      <div className="timer-bar">
        <div className="timer-bar-inner" style={{ width: `${pc}%` }}></div>
      </div>
      <div className="nightmare-spread-bar">
        <div className="nightmare-spread-grid">
          {slots.map((entry, index) => {
            if (!entry) {
              return (
                <div
                  key={`spread-empty-${index}`}
                  className="nightmare-spread-slot empty"
                  aria-label="空的噩梦蔓延词条槽位"
                >
                  <span>+</span>
                </div>
              )
            }

            const tooltipId = `nightmare-spread-tooltip-${index}`
            return (
              <div key={entry.id} className="nightmare-spread-slot-wrapper">
                <div
                  className="nightmare-spread-slot filled"
                  data-tooltip-id={tooltipId}
                >
                  {entry.icon ? (
                    <img
                      className="nightmare-spread-slot-icon"
                      src={entry.icon}
                      alt={entry.name}
                    />
                  ) : (
                    <span className="nightmare-spread-slot-text">
                      {entry.name.slice(0, 2)}
                    </span>
                  )}
                </div>
                <Tooltip
                  id={tooltipId}
                  className="custom-theme-tooltip"
                  place="bottom"
                >
                  <strong>{entry.name}</strong>
                  <p>{entry.description}</p>
                </Tooltip>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
