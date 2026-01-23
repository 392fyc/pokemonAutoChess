import { Room } from "colyseus.js"
import firebase from "firebase/compat/app"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"
import { useLocation, useSearchParams } from "react-router-dom"
import {
  DEFAULT_BOT_STATE,
  estimateElo,
  getMaxItemComponents,
  getNbComponentsOnBoard,
  getPowerEvaluation,
  getPowerScore,
  MAX_BOTS_STAGE,
  rewriteBotRoundsRequiredto1,
  validateBoard
} from "../../../../../core/bot-logic"
import {
  IBot,
  IBotLight,
  IDetailledPokemon
} from "../../../../../models/mongo-models/bot-v2"
import { PkmWithCustom, Role } from "../../../../../types"
import { PkmIndex } from "../../../../../types/enum/Pokemon"
import { getAvatarString } from "../../../../../utils/avatar"
import { logger } from "../../../../../utils/logger"
import { max, min } from "../../../../../utils/number"
import { joinLobbyRoom } from "../../../game/lobby-logic"
import { useAppDispatch, useAppSelector } from "../../../hooks"
import GameState from "../../../../../rooms/states/game-state"
import { setErrorAlertMessage } from "../../../stores/NetworkStore"
import DiscordButton from "../buttons/discord-button"
import { Modal } from "../modal/modal"
import ImportBotModal from "./import-bot-modal"
import ScoreIndicator from "./score-indicator"
import TeamBuilder from "./team-builder"
import "./bot-builder.css"
import { LocalStoreKeys, localStore } from "../../utils/store"

export default function BotBuilder() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const [queryParams, setQueryParams] = useSearchParams()
  const [currentStage, setStage] = useState<number>(1)
  const [bot, setBot] = useState<IBot>(DEFAULT_BOT_STATE)
  const [currentModal, setCurrentModal] = useState<"import" | "export" | null>(
    null
  )
  const [violation, setViolation] = useState<string>()
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
  const [bossTestLoading, setBossTestLoading] = useState<boolean>(false)
  const [bossTestError, setBossTestError] = useState<string>("")
  const [bossTestBotData, setBossTestBotData] = useState<IBot | null>(null)
  const [bossTestPreviewBoard, setBossTestPreviewBoard] = useState<
    IDetailledPokemon[] | null
  >(null)

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

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "ArrowRight") nextStep()
      if (ev.key === "ArrowLeft") prevStep()
    }
    window.addEventListener("keydown", onKey, false)
    return () => {
      window.removeEventListener("keydown", onKey, false)
    }
  })

  const lobbyJoined = useRef<boolean>(false)
  useEffect(() => {
    if (!lobbyJoined.current) {
      joinLobbyRoom(dispatch, navigate)
      lobbyJoined.current = true
    }
  }, [lobbyJoined])

  useEffect(() => {
    const botId = queryParams.get("bot")
    if (botId && (!bot || bot.id !== botId)) {
      logger.debug(`loading bot ${botId}`)
      // query param but no matching bot data, so we request it
      fetch(`/bots/${botId}`)
        .then((r) => r.json())
        .then((botData) => {
          setBot(rewriteBotRoundsRequiredto1(structuredClone(botData)))
          logger.debug(`bot ${botId} imported`)
        })
    }
  }, [queryParams])

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
      setBossTestPreviewBoard(null)
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
          setBossTestPreviewBoard(null)
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
      setBossTestPreviewBoard(null)
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
          stageLevel: bossTestStageLevel
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

  const prevStep = useCallback(
    () => setStage(min(1)(currentStage - 1)),
    [currentStage]
  )
  const nextStep = useCallback(
    () => setStage(max(MAX_BOTS_STAGE)(currentStage + 1)),
    [currentStage]
  )

  useEffect(() => {
    if (
      currentStage >= 1 &&
      currentStage in bot.steps &&
      bot.steps[currentStage].board.length === 0
    ) {
      // automatically copy from last step
      updateStep(structuredClone(bot.steps[currentStage - 1].board))
    }
  }, [currentStage, bot.steps])

  function importBot(text: string) {
    try {
      const b: IBot = JSON.parse(text)
      setBot(rewriteBotRoundsRequiredto1(b))
      setCurrentModal(null)
      setQueryParams({ bot: b.id })
    } catch (e) {
      alert(e)
    }
  }

  function changeAvatar(pkm: PkmWithCustom) {
    bot.name = pkm.name.toUpperCase()
    bot.avatar = getAvatarString(PkmIndex[pkm.name], pkm.shiny, pkm.emotion)
    completeBotInfo()
  }

  function completeBotInfo() {
    if (bot.id && !isBotManager) {
      // fork existing bot
      setQueryParams({})
      bot.id = ""
    }
    setBot({
      ...bot,
      author: user?.displayName ?? "Anonymous",
      elo: estimateElo(bot)
    })
  }

  function updateStep(board: IDetailledPokemon[]) {
    bot.steps[currentStage].board = board
    completeBotInfo()
  }

  function saveFile() {
    // save board to local JSON file
    const blob = new Blob([JSON.stringify(bot)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "bot.json"
    a.click()
    URL.revokeObjectURL(url)
  }

  function loadFile() {
    // load from local JSON file
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "application/json"
    input.addEventListener("change", async (e) => {
      if (!input.files) return
      const file = input.files![0]
      const reader = new FileReader()
      reader.onload = async (e) => {
        if (!e.target) return
        try {
          const data: IBot = JSON.parse(e.target.result as string)
          if (!data) {
            throw new Error("Invalid file content")
          } else {
            setBot(rewriteBotRoundsRequiredto1(data))
          }
        } catch (e) {
          console.error("Failed to load bot from file:", e)
          alert("Invalid file")
        }
      }
      reader.readAsText(file)
    })
    input.click()
  }

  const board = useMemo(
    () => bot.steps[currentStage]?.board ?? [],
    [bot, currentStage]
  )
  const nbComponentsOnBoard = useMemo(
    () => getNbComponentsOnBoard(board),
    [board]
  )
  const nbMaxComponentsOnBoard = useMemo(
    () => getMaxItemComponents(currentStage),
    [currentStage]
  )
  const powerScore = useMemo(() => getPowerScore(board), [board])
  const powerEvaluation = useMemo(
    () => getPowerEvaluation(powerScore, currentStage),
    [powerScore, currentStage]
  )

  useEffect(() => {
    setViolation(undefined)
    try {
      validateBoard(board, currentStage)
    } catch (err: any) {
      if (err instanceof Error) {
        setViolation(err.message)
      }
    }
  }, [board, currentStage])

  return (
    <div id="bot-builder">
      <header>
        <button onClick={() => navigate("/lobby")} className="bubbly blue">
          {t("back_to_lobby")}
        </button>
        <div className="spacer"></div>
        {isBotManager && (
          <button onClick={() => navigate("/bot-admin")} className="bubbly red">
            <img src="/assets/ui/bot.svg" />
            {t("bot_admin")}
          </button>
        )}
        <button className="bubbly dark" onClick={saveFile}>
          <img src="/assets/ui/save.svg" /> {t("save")}
        </button>
        <button className="bubbly dark" onClick={loadFile}>
          <img src="/assets/ui/load.svg" /> {t("load")}
        </button>
        <button
          onClick={() => {
            setCurrentModal("import")
          }}
          className="bubbly orange"
        >
          {t("import")}
        </button>
        <button
          onClick={() => {
            completeBotInfo()
            setCurrentModal("export")
          }}
          className="bubbly green"
        >
          {t("submit")}
        </button>
        <DiscordButton
          url={
            "https://discord.com/channels/737230355039387749/914503292875325461"
          }
        />
      </header>
      <div className="step-info my-container">
        <div className="step-control">
          <button onClick={prevStep} disabled={currentStage <= 0}>
            <img src="/assets/ui/arrow-left.svg" alt="←" />
          </button>
          <span>
            {t("stage")} {currentStage}
          </span>
          <button onClick={nextStep} disabled={currentStage >= MAX_BOTS_STAGE}>
            <img src="/assets/ui/arrow-right.svg" alt="→" />
          </button>
        </div>
        <span
          className={
            nbComponentsOnBoard > nbMaxComponentsOnBoard ? "invalid" : "valid"
          }
        >
          {t("item_components")}: {nbComponentsOnBoard} /{" "}
          {nbMaxComponentsOnBoard}
        </span>
        <span>
          {t("board_power")}: {powerScore}
        </span>
        <div>
          <ScoreIndicator value={powerEvaluation} />
        </div>
      </div>
      <TeamBuilder
        bot={bot}
        onChangeAvatar={changeAvatar}
        board={bossTestPreviewBoard ?? board}
        updateBoard={bossTestPreviewBoard ? undefined : updateStep}
        error={bossTestPreviewBoard ? undefined : violation}
        readOnly={bossTestPreviewBoard !== null}
      />
      {isBotManager && (
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
          {bossTestError && (
            <p className="boss-test-error">{bossTestError}</p>
          )}
        </section>
      )}

      <ImportBotModal
        visible={currentModal === "import"}
        bot={bot}
        hideModal={() => {
          setCurrentModal(null)
        }}
        importBot={importBot}
      />

      <SubmitBotModal
        visible={currentModal === "export"}
        bot={bot}
        hideModal={() => {
          setCurrentModal(null)
        }}
      />
    </div>
  )
}

export function SubmitBotModal(props: {
  bot: IBot
  hideModal: () => void
  visible: boolean
}) {
  const { t } = useTranslation()

  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<boolean>(false)

  async function submitBot() {
    if (loading) return
    setLoading(true)
    setError("")
    setSuccess(false)
    try {
      const token = await firebase.auth().currentUser?.getIdToken()
      const res = await fetch("/bots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(props.bot)
      })
      if (res.ok) {
        setSuccess(true)
      } else {
        setError(res.statusText)
      }
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <Modal
      show={props.visible}
      onClose={props.hideModal}
      className="bot-export-modal"
      header={t("submit_your_bot")}
      body={
        <>
          <p>{t("bot_ready_submission")}</p>
        </>
      }
      footer={
        <>
          {!success && !loading && !error && (
            <button className="bubbly green" onClick={submitBot}>
              {t("submit_your_bot")}
            </button>
          )}
          {loading && <p>{t("loading")}</p>}
          {!loading && error && (
            <p className="error">{t("bot_submission_failed", { error })}</p>
          )}
          {success && <p>{t("bot_submitted_success")}</p>}
        </>
      }
    />
  )
}
