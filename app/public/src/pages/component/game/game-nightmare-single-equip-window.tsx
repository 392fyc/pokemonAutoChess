import React, { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Tooltip } from "react-tooltip"
import { getNightmareRewardAssetUrl } from "../../../../../models/nightmare-assets"
import { getPokemonNightmareRewards } from "../../../../../models/nightmare"
import {
  NIGHTMARE_REWARD_CONFIG,
  NightmareReward,
  NightmareRewardType,
  NightmareWindowAction
} from "../../../../../types/nightmare"
import { getGameScene } from "../../game"
import { selectConnectedPlayer, useAppDispatch, useAppSelector } from "../../../hooks"
import DraggableWindow from "../modal/draggable-window"
import {
  nightmareSingleEquipApply,
  nightmareWindowAction
} from "../../../stores/NetworkStore"
import {
  getNightmareRewardDescription,
  getNightmareRewardNameWithTier
} from "./nightmare-reward-i18n"
import "./game-nightmare-single-equip-window.css"

export default function GameNightmareSingleEquipWindow() {
  const { i18n, t } = useTranslation()
  const dispatch = useAppDispatch()
  const connectedPlayer = useAppSelector(selectConnectedPlayer)
  const [armedReward, setArmedReward] = useState<NightmareReward | null>(null)
  const initialPosition = useMemo(() => {
    const defaultWidth = 248
    const x =
      typeof window !== "undefined"
        ? Math.max(8, window.innerWidth - defaultWidth - 24)
        : 0
    return { x, y: 96 }
  }, [])

  const ownedRewards = (connectedPlayer?.nightmareRewards ??
    []) as unknown as NightmareReward[]
  const pendingRewards = (connectedPlayer?.nightmareSingleEquipRewards ??
    []) as unknown as NightmareReward[]
  const shouldHideWindow =
    !connectedPlayer ||
    (pendingRewards.length === 0 && ownedRewards.length === 0)

  const counters = connectedPlayer?.nightmareCounters as
    | Map<string, number>
    | Record<string, number>
    | undefined
  const getCounter = (key: string, fallback = 0) => {
    if (!counters) return fallback
    if (typeof (counters as Map<string, number>).get === "function") {
      return Number((counters as Map<string, number>).get(key) ?? fallback)
    }
    return Number((counters as Record<string, number>)[key] ?? fallback)
  }

  const numbersAdvantageCost = getCounter("numbers_advantage_next_cost", 25)
  const numbersAdvantageBonus = getCounter("numbers_advantage_bonus", 0)
  const boardValues = (() => {
    const board = connectedPlayer?.board as
      | Map<string, { id: string; name: string; nightmareReward: NightmareReward }>
      | Record<string, { id: string; name: string; nightmareReward: NightmareReward }>
      | undefined
    if (!board) return [] as Array<{ id: string; name: string; nightmareReward: NightmareReward }>
    if (typeof (board as Map<string, unknown>).forEach === "function") {
      return Array.from((board as Map<string, { id: string; name: string; nightmareReward: NightmareReward }>).values())
    }
    return Object.values(
      board as Record<string, { id: string; name: string; nightmareReward: NightmareReward }>
    )
  })()

  const boundRewardToPokemonNames = boardValues.reduce(
    (acc, pokemon) => {
      if (!pokemon.nightmareReward || pokemon.nightmareReward === NightmareReward.NONE) {
        return acc
      }
      const translated = t(`pkm.${pokemon.name}`)
      const rewards = getPokemonNightmareRewards(pokemon.nightmareReward)
      rewards.forEach((reward) => {
        if (!acc.has(reward)) {
          acc.set(reward, [])
        }
        acc
          .get(reward)
          ?.push(translated === `pkm.${pokemon.name}` ? pokemon.name : translated)
      })
      return acc
    },
    new Map<NightmareReward, string[]>()
  )

  useEffect(() => {
    if (!armedReward) return

    const onMouseUp = (event: MouseEvent) => {
      try {
        const scene = getGameScene()
        if (!scene?.board || !scene.game.canvas) return

        const rootEl = document.querySelector(
          ".game-nightmare-single-equip-window-draggable"
        ) as HTMLElement | null
        if (rootEl && event.target instanceof Node && rootEl.contains(event.target)) {
          return
        }

        const canvas = scene.game.canvas
        const rect = canvas.getBoundingClientRect()
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        ) {
          return
        }

        const scaleX = canvas.width / rect.width
        const scaleY = canvas.height / rect.height
        const canvasX = (event.clientX - rect.left) * scaleX
        const canvasY = (event.clientY - rect.top) * scaleY
        const worldPoint = scene.cameras.main.getWorldPoint(canvasX, canvasY)

        const ownPokemons = [...scene.board.pokemons.values()].filter(
          (pokemonSprite) => pokemonSprite.playerId === scene.uid
        )
        if (ownPokemons.length === 0) return

        const hitByBounds = ownPokemons.find((pokemonSprite: any) => {
          const sprite = pokemonSprite?.sprite
          return !!sprite?.getBounds && sprite.getBounds().contains(worldPoint.x, worldPoint.y)
        })
        if (hitByBounds?.id) {
          dispatch(
            nightmareSingleEquipApply({
              reward: armedReward,
              pokemonId: hitByBounds.id
            })
          )
          setArmedReward(null)
          return
        }

        const byDistance = ownPokemons
          .map((pokemonSprite: any) => {
            const centerX = pokemonSprite?.sprite?.x ?? pokemonSprite.x
            const centerY = pokemonSprite?.sprite?.y ?? pokemonSprite.y
            return {
              id: pokemonSprite.id as string,
              distance: Math.hypot(worldPoint.x - centerX, worldPoint.y - centerY)
            }
          })
          .sort((left, right) => left.distance - right.distance)
        if (byDistance.length === 0 || byDistance[0].distance > 52) return
        const targetPokemonId = byDistance[0].id

        if (!targetPokemonId) return

        dispatch(
          nightmareSingleEquipApply({
            reward: armedReward,
            pokemonId: targetPokemonId
          })
        )
        setArmedReward(null)
      } catch (error) {
        console.error("[NIGHTMARE_SINGLE_EQUIP_DRAG_ERROR]", error)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setArmedReward(null)
      }
    }

    window.addEventListener("mouseup", onMouseUp)
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("mouseup", onMouseUp)
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [armedReward, dispatch])

  if (shouldHideWindow) {
    return null
  }

  return (
    <DraggableWindow
      title="噩梦词条"
      className="my-container game-nightmare-single-equip-window-draggable"
      initialPosition={initialPosition}
      style={{
        width: "224px",
        maxHeight: "min(62vh, 560px)",
        zIndex: 820
      }}
      defaultMinimized={true}
    >
      <div className="window-tools">
        <p className="window-hint">待绑定 {pendingRewards.length} / 已拥有 {ownedRewards.length}</p>
      </div>

      {pendingRewards.length > 0 && armedReward && (
        <div className="window-subtitle">
          <span className="reward-armed-hint">已选择，点击棋盘宝可梦绑定</span>
        </div>
      )}
      <div className="single-equip-main pending-list">
        {pendingRewards.map((reward, index) => {
          const rewardName = getNightmareRewardNameWithTier(reward, i18n.language)
          const rewardDescription = getNightmareRewardDescription(
            reward,
            "",
            i18n.language
          )
          const tierClass = `tier-${NIGHTMARE_REWARD_CONFIG[reward]?.tier.toLowerCase()}`
          return (
            <button
              type="button"
              className={`single-equip-row pending ${tierClass} ${armedReward === reward ? "armed" : ""}`}
              key={`${reward}-${index}`}
              data-tooltip-id="nightmare-single-equip-tooltip"
              data-tooltip-content={`${rewardName}::${rewardDescription}`}
              onClick={() => setArmedReward((prev) => (prev === reward ? null : reward))}
            >
              <img
                className="reward-small-icon"
                src={getNightmareRewardAssetUrl(reward)}
                alt={rewardName}
              />
              <span className="reward-name">{rewardName}</span>
            </button>
          )
        })}
      </div>

      <div className="window-subtitle">已拥有词条</div>
      <div className="single-equip-main">
        {ownedRewards.map((reward, index) => {
          const rewardName = getNightmareRewardNameWithTier(reward, i18n.language)
          const rewardDescription = getNightmareRewardDescription(
            reward,
            NIGHTMARE_REWARD_CONFIG[reward]?.description ?? "",
            i18n.language
          )
          const rewardType = NIGHTMARE_REWARD_CONFIG[reward]?.rewardType
          const typeLabel =
            rewardType === NightmareRewardType.SINGLE_EQUIP
              ? "SINGLE"
              : rewardType === NightmareRewardType.ECONOMY
                ? "ECON"
                : "TEAM"
          const isNumbersAdvantage = reward === NightmareReward.NUMBERS_ADVANTAGE
          const canBuyNumbersAdvantage = connectedPlayer.money >= numbersAdvantageCost
          const isWuWeiRule = reward === NightmareReward.WU_WEI_RULE
          const wuWeiKills = getCounter("wu_wei_kills", 0)
          const wuWeiGoldTotal = getCounter("wu_wei_bonus_gold_total", 0)
          const wuWeiExpTotal = getCounter("wu_wei_bonus_exp_total", 0)
          const wuWeiExpToGoldTotal = getCounter("wu_wei_exp_to_gold_total", 0)
          const wuWeiUpgraded = getCounter("wu_wei_upgraded", 0) > 0
          const warDividendGoldTotal = getCounter("war_dividend_bonus_gold_total", 0)
          const financialTycoonInterestTotal = getCounter(
            "financial_tycoon_bonus_interest_total",
            0
          )
          const financialTycoonGoldTotal = getCounter(
            "financial_tycoon_bonus_gold_total",
            0
          )
          const calculatedLossRoundsLeft = getCounter("calculated_loss_rounds_left", 0)
          const calculatedLossGoldTotal = getCounter(
            "calculated_loss_bonus_gold_total",
            0
          )
          const calculatedLossExpTotal = getCounter(
            "calculated_loss_bonus_exp_total",
            0
          )
          const calculatedLossHealTotal = getCounter("calculated_loss_heal_total", 0)
          const tierClass = `tier-${NIGHTMARE_REWARD_CONFIG[reward]?.tier.toLowerCase()}`
          return (
            <div
              className={`single-equip-row owned ${tierClass}`}
              key={`owned-${reward}-${index}`}
              data-tooltip-id="nightmare-single-equip-tooltip"
              data-tooltip-content={`${rewardName}::${rewardDescription}`}
            >
              {isNumbersAdvantage ? (
                <button
                  className="reward-icon-action"
                  disabled={!canBuyNumbersAdvantage}
                  onClick={() =>
                    dispatch(
                      nightmareWindowAction({
                        action: NightmareWindowAction.NUMBERS_ADVANTAGE_BUY
                      })
                    )
                  }
                >
                  <img
                    className="reward-small-icon"
                    src={getNightmareRewardAssetUrl(reward)}
                    alt={rewardName}
                  />
                </button>
              ) : (
                <img
                  className="reward-small-icon"
                  src={getNightmareRewardAssetUrl(reward)}
                  alt={rewardName}
                />
              )}
              {isNumbersAdvantage && (
                <span className="reward-cost">{numbersAdvantageCost}G</span>
              )}
              <span className="reward-name">{rewardName}</span>
              <span className="reward-type-tag">{typeLabel}</span>
              {isNumbersAdvantage && (
                <span className="reward-inline-hint">当前+{numbersAdvantageBonus}</span>
              )}
              {isWuWeiRule && (
                <>
                  <span className="reward-inline-hint">
                    击杀：{wuWeiKills}/150（{wuWeiUpgraded ? "已升级" : "未升级"}）
                  </span>
                  <span className="reward-inline-hint">
                    累计收益：+{wuWeiGoldTotal} 金币，+{wuWeiExpTotal} 经验
                    {wuWeiExpToGoldTotal > 0
                      ? `（其中经验转金币 ${wuWeiExpToGoldTotal}）`
                      : ""}
                  </span>
                </>
              )}
              {reward === NightmareReward.WAR_DIVIDEND && (
                <span className="reward-inline-hint">
                  累计额外收益：+{warDividendGoldTotal} 金币
                </span>
              )}
              {reward === NightmareReward.FINANCIAL_TYCOON && (
                <span className="reward-inline-hint">
                  累计收益：固定+{financialTycoonGoldTotal} 金币，利息+{financialTycoonInterestTotal} 金币
                </span>
              )}
              {reward === NightmareReward.CALCULATED_LOSS && (
                <>
                  <span className="reward-inline-hint">
                    剩余回合：{calculatedLossRoundsLeft}
                  </span>
                  <span className="reward-inline-hint">
                    累计收益：+{calculatedLossGoldTotal} 金币，+{calculatedLossExpTotal} 经验，+{calculatedLossHealTotal} 生命
                  </span>
                </>
              )}
              {rewardType === NightmareRewardType.SINGLE_EQUIP && (
                <span className="reward-inline-hint">
                  绑定：{(boundRewardToPokemonNames.get(reward) ?? []).join("、") || "未绑定"}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <Tooltip
        id="nightmare-single-equip-tooltip"
        className="custom-theme-tooltip"
        positionStrategy="fixed"
        style={{ zIndex: 2000, maxWidth: 360 }}
        render={({ content }) => {
          const value = content ?? ""
          const [name, description] = value.split("::")
          return (
            <div className="single-equip-tooltip">
              <strong>{name}</strong>
              <p>{description}</p>
            </div>
          )
        }}
      />
    </DraggableWindow>
  )
}
