import { Room } from "colyseus.js"
import firebase from "firebase/compat/app"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"
import { useLocation } from "react-router-dom"
import {
  IBot,
  IBotLight,
  IDetailledPokemon
} from "../../../../../models/mongo-models/bot-v2"
import GameState from "../../../../../rooms/states/game-state"
import { Role } from "../../../../../types"
import { PveDifficulty } from "../../../../../types/enum/Game"
import { useAppDispatch, useAppSelector } from "../../../hooks"
import { joinLobbyRoom } from "../../../game/lobby-logic"
import { setErrorAlertMessage } from "../../../stores/NetworkStore"
import TeamBuilder from "../bot-builder/team-builder"
import { LocalStoreKeys, localStore } from "../../utils/store"
import "./boss-test.css"

export default function BossTest() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAppSelector((state) => state.network.profile)
  const client = useAppSelector((state) => state.network.client)
  const lobby = useAppSelector((state) => state.network.lobby)
  const isBotManager =
    user?.role === Role.BOT_MANAGER || user?.role === Role.ADMIN

  const [bossTestBots, setBossTestBots] = useState<IBotLight[]>([])
  const [bossStages, setBossStages] = useState<
    { stageLevel: number; name: string }[]
  >([])
  const [bossTestBotId, setBossTestBotId] = useState<string>("")
  const [bossTestStageLevel, setBossTestStageLevel] = useState<number | "">("")
  const [bossTestDifficulty, setBossTestDifficulty] = useState<PveDifficulty>(
    PveDifficulty.NORMAL
  )
  const [bossTestLoading, setBossTestLoading] = useState<boolean>(false)
  const [bossTestError, setBossTestError] = useState<string>("")
  const [bossTestBotData, setBossTestBotData] = useState<IBot | null>(null)
  const [bossTestPreviewBoard, setBossTestPreviewBoard] = useState<
    IDetailledPokemon[]
  >([])

  const resolveBotLineupForStage = useCallback(
    (sourceBot: IBot, stageLevel: number): IDetailledPokemon[] | null => {
      if (sourceBot.presetLineup && sourceBot.presetLineup.length > 0) {
        return sourceBot.presetLineup
      }
      if (!sourceBot.steps || sourceBot.steps.length === 0) return null

      let remainingRounds = Math.max(stageLevel, 1)
      let lastNonEmptyBoard: IDetailledPokemon[] | null = null
      for (const step of sourceBot.steps) {
        if (step.board && step.board.length > 0) {
          lastNonEmptyBoard = step.board
        }
        const roundsRequired = Math.max(1, step.roundsRequired || 1)
        if (remainingRounds <= roundsRequired) {
          return step.board && step.board.length > 0
            ? step.board
            : lastNonEmptyBoard
        }
        remainingRounds -= roundsRequired
      }

      return lastNonEmptyBoard
    },
    []
  )

  const lobbyJoined = useRef<boolean>(false)
  useEffect(() => {
    if (!lobbyJoined.current) {
      joinLobbyRoom(dispatch, navigate)
      lobbyJoined.current = true
    }
  }, [lobbyJoined])

  useEffect(() => {
    if (!isBotManager) return

    let cancelled = false
    const loadBossTestData = async () => {
      try {
        const token = await firebase.auth().currentUser?.getIdToken()
        const [botsRes, stagesRes] = await Promise.all([
          fetch(`/bots?t=${Date.now()}`),
          fetch("/pve/boss-stages", {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })
        ])

        if (!botsRes.ok) {
          throw new Error(botsRes.statusText || "Failed to load bots")
        }
        if (!stagesRes.ok) {
          throw new Error(stagesRes.statusText || "Failed to load boss stages")
        }

        const botsData: IBotLight[] = await botsRes.json()
        const stagesData = await stagesRes.json()
        if (cancelled) return

        setBossTestBots(botsData)
        setBossStages(stagesData?.stages ?? [])
        setBossTestError("")

        if (!bossTestBotId && botsData.length > 0) {
          setBossTestBotId(botsData[0].id)
        }
        if (bossTestStageLevel === "" && stagesData?.stages?.length > 0) {
          setBossTestStageLevel(stagesData.stages[0].stageLevel)
        }
      } catch (error: any) {
        if (!cancelled) {
          setBossTestError(error?.message ?? "Failed to load boss test data")
        }
      }
    }

    loadBossTestData()
    return () => {
      cancelled = true
    }
  }, [isBotManager])

  useEffect(() => {
    if (!isBotManager || !bossTestBotId) {
      setBossTestBotData(null)
      setBossTestPreviewBoard([])
      return
    }

    let cancelled = false
    const loadBotData = async () => {
      try {
        const res = await fetch(`/bots/${bossTestBotId}`)
        if (!res.ok) {
          throw new Error(res.statusText || "Failed to load bot")
        }
        const data = (await res.json()) as IBot
        if (cancelled) return
        setBossTestBotData(data)
      } catch (error: any) {
        if (!cancelled) {
          setBossTestError(error?.message ?? "Failed to load bot")
          setBossTestBotData(null)
          setBossTestPreviewBoard([])
        }
      }
    }

    loadBotData()
    return () => {
      cancelled = true
    }
  }, [bossTestBotId, isBotManager])

  useEffect(() => {
    if (!bossTestBotData || bossTestStageLevel === "") {
      setBossTestPreviewBoard([])
      return
    }

    const lineup = resolveBotLineupForStage(
      bossTestBotData,
      bossTestStageLevel
    )
    setBossTestPreviewBoard(lineup ? structuredClone(lineup) : [])
  }, [bossTestBotData, bossTestStageLevel, resolveBotLineupForStage])

  async function startBossTest() {
    if (!bossTestBotId || bossTestStageLevel === "") return
    if (bossTestLoading) return

    setBossTestLoading(true)
    setBossTestError("")
    try {
      const token = await firebase.auth().currentUser?.getIdToken()
      if (!token) {
        throw new Error(t("errors.USER_NOT_AUTHENTICATED"))
      }

      localStore.set(
        LocalStoreKeys.BOSS_TEST_RETURN,
        { path: `${location.pathname}${location.search}` },
        5 * 60
      )

      const res = await fetch("/pve/boss-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          botId: bossTestBotId,
          stageLevel: bossTestStageLevel,
          difficulty: bossTestDifficulty
        })
      })

      if (!res.ok) {
        const message = await res.text()
        throw new Error(message || res.statusText)
      }

      const data = await res.json()
      if (!data?.roomId) {
        throw new Error("Missing room id")
      }

      const game: Room<GameState> = await client.joinById(data.roomId, {
        idToken: token
      })
      localStore.set(
        LocalStoreKeys.RECONNECTION_GAME,
        { reconnectionToken: game.reconnectionToken, roomId: game.roomId },
        5 * 60
      )
      await Promise.allSettled([
        lobby?.connection.isOpen && lobby.leave(false),
        game.connection.isOpen && game.leave(false)
      ])
      navigate("/game")
    } catch (error: any) {
      const message = error?.message ?? t("errors.UNKNOWN_ERROR", { error })
      setBossTestError(message)
      dispatch(setErrorAlertMessage(message))
    } finally {
      setBossTestLoading(false)
    }
  }

  if (!isBotManager) {
    return (
      <div id="boss-test">
        <header>
          <button onClick={() => navigate("/lobby")} className="bubbly blue">
            {t("back_to_lobby")}
          </button>
        </header>
        <p className="boss-test-error">Unauthorized</p>
      </div>
    )
  }

  return (
    <div id="boss-test">
      <header>
        <button onClick={() => navigate("/lobby")} className="bubbly blue">
          {t("back_to_lobby")}
        </button>
      </header>
      <TeamBuilder
        board={bossTestPreviewBoard}
        readOnly
        showEditorTools={false}
      />
      <section className="boss-test-panel my-container">
        <h2>{t("boss_test_title")}</h2>
        <p>{t("boss_test_description")}</p>
        <div className="boss-test-controls">
          <label>
            {t("boss_test_select_bot")}
            <select
              value={bossTestBotId}
              onChange={(event) => setBossTestBotId(event.target.value)}
            >
              {bossTestBots.map((bot) => (
                <option key={bot.id} value={bot.id}>
                  {t(`pkm.${bot.name}`)} ({bot.author})
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("pve_difficulty")}
            <select
              value={bossTestDifficulty}
              onChange={(event) =>
                setBossTestDifficulty(event.target.value as PveDifficulty)
              }
            >
              <option value={PveDifficulty.EASY}>
                {t("pve_difficulty_easy")}
              </option>
              <option value={PveDifficulty.NORMAL}>
                {t("pve_difficulty_normal")}
              </option>
              <option value={PveDifficulty.HARD}>
                {t("pve_difficulty_hard")}
              </option>
              <option value={PveDifficulty.EXTREME}>
                {t("pve_difficulty_extreme")}
              </option>
            </select>
          </label>
          <label>
            {t("boss_test_select_stage")}
            <select
              value={bossTestStageLevel}
              onChange={(event) =>
                setBossTestStageLevel(Number(event.target.value))
              }
            >
              {bossStages.map((stage) => (
                <option key={stage.stageLevel} value={stage.stageLevel}>
                  {stage.stageLevel} - {stage.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="bubbly red"
            onClick={startBossTest}
            disabled={
              bossTestLoading ||
              bossTestBotId.length === 0 ||
              bossTestStageLevel === ""
            }
          >
            {bossTestLoading ? t("boss_test_loading") : t("boss_test_start")}
          </button>
        </div>
        {bossTestError && <p className="boss-test-error">{bossTestError}</p>}
      </section>
    </div>
  )
}
