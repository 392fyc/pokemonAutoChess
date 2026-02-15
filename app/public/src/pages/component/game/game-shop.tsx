import React from "react"
import { ToastContainer } from "react-toastify"
import { GameAdditionalPokemonsIcon } from "./game-additional-pokemons"
import GameExperience from "./game-experience"
import { GameLifeInfo } from "./game-life-info"
import GameLock from "./game-lock"
import { GameMoneyInfo } from "./game-money-info"
import GameRarityPercentage from "./game-rarity-percentage"
import GameRefresh from "./game-refresh"
import { GameRegionalPokemonsIcon } from "./game-regional-pokemons"
import GameStore from "./game-store"
import { GameTeamInfo } from "./game-team-info"
import "./game-shop.css"

export default function GameShop() {
  return (
    <>
      <div className="game-shop my-container">
        <div id="game-shop-info">
          <div className="shop-info-left">
            <GameLifeInfo />
            <GameMoneyInfo />
          </div>
          <GameTeamInfo />
        </div>
        <div className="game-shop-actions">
          <GameRarityPercentage />
          <GameLock />
          <GameRefresh />
        </div>
        <div className="game-additional-pools">
          <GameAdditionalPokemonsIcon />
          <GameRegionalPokemonsIcon />
        </div>
        <GameStore />
        <GameExperience />
      </div>
      <ToastContainer
        className="toast"
        containerId="toast-money"
        position="bottom-center"
        autoClose={2000}
        hideProgressBar
        newestOnTop
        closeOnClick
        limit={1}
        closeButton={false}
        style={{ left: `calc(15.8vw + 160px)`, bottom: `128px` }}
      />
      <ToastContainer
        className="toast"
        containerId="toast-life"
        position="bottom-center"
        autoClose={2000}
        hideProgressBar
        newestOnTop
        closeOnClick
        limit={1}
        closeButton={false}
        style={{ left: `calc(var(--sidebar-width) + 11.5vw)`, bottom: `9vw` }}
      />
    </>
  )
}
