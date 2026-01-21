import CSS from "csstype"
import React from "react"
import { useAppSelector } from "../../../hooks"
import { GameMode } from "../../../../../types/enum/Game"
import { isPveBotId } from "../../../../../utils/pve"
import GamePlayer from "./game-player"

const style: CSS.Properties = {
  position: "absolute",
  height: "100%",
  width: "70px",
  right: "0.5%",
  top: "4px"
}

export default function GamePlayers(props: { click: (id: string) => void }) {
  const players = useAppSelector((state) => state.game.players)
  const gameMode = useAppSelector((state) => state.network.game?.state.gameMode)
  const sortedPlayers = [...players]
  const visiblePlayers =
    gameMode === GameMode.PVE_MODE
      ? sortedPlayers.filter((player) => !isPveBotId(player.id))
      : sortedPlayers
  return (
    <div style={style}>
      {visiblePlayers
        .sort((a, b) => {
          return a.rank - b.rank
        })
        .map((p, i) => {
          return (
            <GamePlayer
              key={p.id}
              player={p}
              click={(id: string) => props.click(id)}
              index={i}
            />
          )
        })}
    </div>
  )
}
