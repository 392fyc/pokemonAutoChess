import React from "react"
import { useAppSelector } from "../../../hooks"
import "./game-pause-overlay.css"

export default function GamePauseOverlay() {
  const paused = useAppSelector((state) => state.game.gamePaused)

  if (!paused) return null

  return (
    <div className="game-pause-overlay">
      <div className="my-box game-pause-overlay-card">
        <h2>游戏已暂停</h2>
        <p>房主已暂停游戏，当前不可进行任何操作。</p>
      </div>
    </div>
  )
}
