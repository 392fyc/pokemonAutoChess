import React from "react"
import { useTranslation } from "react-i18next"
import { cc } from "../../utils/jsx"
import "./game-ready-button.css"

interface GameReadyButtonProps {
  isReady: boolean
  onClick: () => void
  readyCount: number
  totalCount: number
}

export default function GameReadyButton({
  isReady,
  onClick,
  readyCount,
  totalCount
}: GameReadyButtonProps) {
  const { t } = useTranslation()
  
  return (
    <div className="game-ready-container">
      <button
        className={cc("game-ready-button", { ready: isReady })}
        onClick={onClick}
      >
        {isReady ? t("cancel_ready") : t("ready")}
      </button>
      <div className="ready-status">
        {t("ready_players")}: {readyCount}/{totalCount}
      </div>
    </div>
  )
}