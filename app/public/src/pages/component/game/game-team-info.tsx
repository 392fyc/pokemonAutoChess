import React from "react"
import { useTranslation } from "react-i18next"
import { Tooltip } from "react-tooltip"
import { getMaxTeamSize } from "../../../../../utils/board"
import { selectCurrentPlayer, useAppSelector } from "../../../hooks"

export function GameTeamInfo() {
  const { t } = useTranslation()
  const currentPlayer = useAppSelector(selectCurrentPlayer)
  const specialGameRule = useAppSelector((state) => state.game.specialGameRule)

  if (!currentPlayer) return null

  const maxTeamSize = getMaxTeamSize(
    currentPlayer.experienceManager.level,
    specialGameRule
  )
  const nightmareCounters = currentPlayer.nightmareCounters as
    | Map<string, number>
    | Record<string, number>
    | undefined
  const numbersAdvantageBonus =
    nightmareCounters && typeof (nightmareCounters as Map<string, number>).get === "function"
      ? Number(
          (nightmareCounters as Map<string, number>).get("numbers_advantage_bonus") ??
            0
        )
      : Number(
          (nightmareCounters as Record<string, number> | undefined)?.[
            "numbers_advantage_bonus"
          ] ?? 0
        )
  const teamCapLabel =
    numbersAdvantageBonus > 0
      ? `${maxTeamSize}+${numbersAdvantageBonus}`
      : `${maxTeamSize}`

  return (
    <div id="game-team-info" className="my-container team-size information">
      <div data-tooltip-id="detail-team-size">
        <Tooltip
          id="detail-team-size"
          className="custom-theme-tooltip"
          place="top"
        >
          <p className="help">
            {t("place_up_to")} <output>{maxTeamSize + numbersAdvantageBonus}</output>{" "}
            {t("pokemons_on_your_board")}
          </p>
          <p className="help">{t("team_size_hint")}</p>
        </Tooltip>
        <span>
          {currentPlayer.boardSize}/{teamCapLabel}
        </span>
        <img className="icon" src="/assets/ui/pokeball.svg" />
      </div>
    </div>
  )
}
