import { Dispatcher } from "@colyseus/command"
import { MapSchema, SetSchema } from "@colyseus/schema"
import { Client, Room } from "colyseus"
import admin from "firebase-admin"
import { nanoid } from "nanoid"
import {
  AdditionalPicksStages,
  ALLOWED_GAME_RECONNECTION_TIME,
  BOARD_SIDE_HEIGHT,
  BOARD_WIDTH,
  EloRankThreshold,
  EventPointsPerRank,
  ExpPlace,
  LegendaryPool,
  MAX_EVENT_POINTS,
  MAX_SIMULATION_DELTA_TIME,
  MinStageForGameToCount,
  PortalCarouselStages,
  SHARDS_PER_SHINY_UNOWN_WANDERER,
  SHARDS_PER_UNOWN_WANDERER,
  SHINY_UNOWN_ENCOUNTER_CHANCE,
  UNOWN_ENCOUNTER_CHANCE,
  UniquePool
} from "../config"
import { giveRandomEgg } from "../core/eggs"
import { computeElo } from "../core/elo"
import { CountEvolutionRule, ItemEvolutionRule } from "../core/evolution-rules"
import { selectMatchups } from "../core/matchmaking"
import { MiniGame } from "../core/mini-game"
import {
  clearPendingGame,
  clearPendingGamesOnRoomDispose,
  getPendingGame,
  givePlayerTimeout,
  setPendingGame
} from "../core/pending-game-manager"
import Simulation from "../core/simulation"
import { IGameUser } from "../models/colyseus-models/game-user"
import Player from "../models/colyseus-models/player"
import { Pokemon, PokemonClasses } from "../models/colyseus-models/pokemon"
import { Wanderer } from "../models/colyseus-models/wanderer"
import { BotV2, IBot, IDetailledPokemon } from "../models/mongo-models/bot-v2"
import DetailledStatistic from "../models/mongo-models/detailled-statistic-v2"
import UserMetadata from "../models/mongo-models/user-metadata"
import PokemonFactory from "../models/pokemon-factory"
import {
  getPokemonData,
  PRECOMPUTED_REGIONAL_MONS
} from "../models/precomputed/precomputed-pokemon-data"
import { PRECOMPUTED_POKEMONS_PER_RARITY } from "../models/precomputed/precomputed-rarity"
import { PVEBossStages } from "../models/pve-boss-stages"
import { PVEStages } from "../models/pve-stages"
import { getAdditionalsTier1, getSellPrice } from "../models/shop"
import { fetchEventLeaderboard } from "../services/leaderboard"
import {
  IDragDropCombineMessage,
  IDragDropItemMessage,
  IDragDropMessage,
  IGameHistoryPokemonRecord,
  IGameHistorySimplePlayer,
  IGameMetadata,
  IPokemon,
  IPokemonEntity,
  ISimplePlayer,
  Role,
  Title,
  Transfer
} from "../types"
import { CloseCodes } from "../types/enum/CloseCodes"
import { EffectEnum } from "../types/enum/Effect"
import { EloRank } from "../types/enum/EloRank"
import {
  BattleResult,
  GameMode,
  GamePhaseState,
  PokemonActionState,
  PveDifficulty,
  Team
} from "../types/enum/Game"
import {
  CraftableItems,
  Item,
  MissionOrders,
  ShinyItems,
  SynergyStones,
  TownItems
} from "../types/enum/Item"
import { Passive } from "../types/enum/Passive"
import {
  NonPkm,
  Pkm,
  PkmDuos,
  PkmIndex,
  PkmProposition,
  PkmRegionalVariants,
  Unowns
} from "../types/enum/Pokemon"
import { SpecialGameRule } from "../types/enum/SpecialGameRule"
import { Synergy } from "../types/enum/Synergy"
import { WandererBehavior, WandererType } from "../types/enum/Wanderer"
import { IPokemonCollectionItemMongo } from "../types/interfaces/UserMetadata"
import { removeInArray } from "../utils/array"
import { getAvatarString } from "../utils/avatar"
import {
  getFirstAvailablePositionInBench,
  getFreeSpaceOnBench,
  isOnBench
} from "../utils/board"
import { isValidDate } from "../utils/date"
import { formatMinMaxRanks } from "../utils/elo"
import { logger } from "../utils/logger"
import { clamp } from "../utils/number"
import {
  chance,
  pickNRandomIn,
  pickRandomIn,
  randomWeighted,
  shuffleArray
} from "../utils/random"
import { resetArraySchema, values } from "../utils/schemas"
import { getWeather } from "../utils/weather"
import { getPveBossDifficultyMultiplier } from "../utils/pve"
import {
  OnBuyPokemonCommand,
  OnDragDropCombineCommand,
  OnDragDropItemCommand,
  OnDragDropPokemonCommand,
  OnJoinCommand,
  OnLevelUpCommand,
  OnLockCommand,
  OnOverwriteBoardCommand,
  OnPickBerryCommand,
  OnPokemonCatchCommand,
  OnRemoveFromShopCommand,
  OnSellPokemonCommand,
  OnShopRerollCommand,
  OnSpectateCommand,
  OnSwitchBenchAndBoardCommand,
  OnUpdateCommand
} from "./commands/game-commands"
import GameState from "./states/game-state"

export default class GameRoom extends Room<GameState> {
  dispatcher: Dispatcher<this>
  additionalUncommonPool: Array<Pkm>
  additionalRarePool: Array<Pkm>
  additionalEpicPool: Array<Pkm>
  miniGame: MiniGame
  constructor() {
    super()
    this.dispatcher = new Dispatcher(this)
    this.additionalUncommonPool = new Array<Pkm>()
    this.additionalRarePool = new Array<Pkm>()
    this.additionalEpicPool = new Array<Pkm>()
    this.miniGame = new MiniGame(this)
  }

  // When room is initialized
  async onCreate({
    users,
    preparationId,
    name,
    ownerName,
    noElo,
    gameMode,
    specialGameRule,
    minRank,
    maxRank,
    tournamentId,
    bracketId,
    pveDifficulty = null,
    pveDifficultyTier = null,
    debugBossTest
  }: {
    users: Record<string, IGameUser>
    preparationId: string
    name: string
    ownerName: string
    noElo: boolean
    gameMode: GameMode
    specialGameRule: SpecialGameRule | null
    minRank: EloRank | null
    maxRank: EloRank | null
    tournamentId: string | null
    bracketId: string | null
    pveDifficulty?: EloRank | null
    pveDifficultyTier?: PveDifficulty | null
    debugBossTest?: {
      ownerId: string
      lineup: IDetailledPokemon[]
      stageLevel?: number
    }
  }) {
    logger.info("Create Game ", this.roomId)

    this.onRoomDeleted = this.onRoomDeleted.bind(this)
    this.presence.subscribe("room-deleted", this.onRoomDeleted)

    if (gameMode === GameMode.RANKED) {
      // add the elo range in the game room name
      // see https://discord.com/channels/737230355039387749/1019939174691905556/threads/1404518859184013422
      name = `${formatMinMaxRanks(minRank, maxRank)} ${name}`
    }

    this.setMetadata(<IGameMetadata>{
      name,
      ownerName,
      gameMode,
      playerIds: Object.keys(users).filter((id) => users[id].isBot === false),
      playersInfo: Object.keys(users).map(
        (u) => `${users[u].name} [${users[u].elo}]`
      ),
      stageLevel: 0,
      type: "game",
      tournamentId,
      bracketId
    })
    // logger.debug(options);
    this.state = new GameState(
      preparationId,
      name,
      noElo,
      gameMode,
      minRank,
      maxRank,
      specialGameRule,
      pveDifficulty,
      pveDifficultyTier
    )
    this.miniGame.create(
      this.state.avatars,
      this.state.floatingItems,
      this.state.portals,
      this.state.symbols
    )

    this.additionalUncommonPool = getAdditionalsTier1(
      PRECOMPUTED_POKEMONS_PER_RARITY.UNCOMMON
    )
    this.additionalRarePool = getAdditionalsTier1(
      PRECOMPUTED_POKEMONS_PER_RARITY.RARE
    )
    this.additionalEpicPool = getAdditionalsTier1(
      PRECOMPUTED_POKEMONS_PER_RARITY.EPIC
    )

    if (this.state.specialGameRule !== SpecialGameRule.EVERYONE_IS_HERE) {
      /* based on the season, we remove the Deerling seasonal forms to only keep the current season's form */
      // Determine season based on precise date, not just month
      const now = new Date()
      const year = now.getFullYear()
      const date = new Date(year, now.getMonth(), now.getDate())

      // seasons (Northern Hemisphere)
      // Spring: Mar 20 - June 21
      // Summer: Jun 22 - Sep 22
      // Autumn: Sep 23 - Dec 20
      // Winter: Dec 21 - Mar 19

      let season: "spring" | "summer" | "autumn" | "winter"
      const springStart = new Date(year, 2, 20) // Mar 20
      const summerStart = new Date(year, 5, 22) // Jun 22
      const autumnStart = new Date(year, 8, 23) // Sep 23
      const winterStart = new Date(year, 11, 21) // Dec 21

      if (date >= springStart && date < summerStart) {
        season = "spring"
      } else if (date >= summerStart && date < autumnStart) {
        season = "summer"
      } else if (date >= autumnStart && date < winterStart) {
        season = "autumn"
      } else {
        season = "winter"
      }

      // Remove all Deerling forms except the current season's
      this.additionalRarePool = this.additionalRarePool.filter((p) => {
        if (
          (p === Pkm.DEERLING_SPRING && season !== "spring") ||
          (p === Pkm.DEERLING_SUMMER && season !== "summer") ||
          (p === Pkm.DEERLING_AUTUMN && season !== "autumn") ||
          (p === Pkm.DEERLING_WINTER && season !== "winter")
        ) {
          return false
        }
        return true
      })
    }

    shuffleArray(this.additionalUncommonPool)
    shuffleArray(this.additionalRarePool)
    shuffleArray(this.additionalEpicPool)

    if (this.state.specialGameRule === SpecialGameRule.EVERYONE_IS_HERE) {
      this.additionalUncommonPool.forEach((p) =>
        this.state.shop.addAdditionalPokemon(p, this.state)
      )
      this.additionalRarePool.forEach((p) =>
        this.state.shop.addAdditionalPokemon(p, this.state)
      )
      this.additionalEpicPool.forEach((p) =>
        this.state.shop.addAdditionalPokemon(p, this.state)
      )
    }

    // Add PVE bots if in PVE mode
    if (this.state.gameMode === GameMode.PVE_MODE && this.state.pveDifficulty) {
      await this.addPveBots()
    }

    await Promise.all(
      Object.keys(users).map(async (id) => {
        const user = users[id]
        //logger.debug(`init player`, user)
        if (user.isBot) {
          // Skip adding bots from initial users list in PVE mode
          if (this.state.gameMode === GameMode.PVE_MODE) {
            return
          }
          const player = new Player(
            user.uid,
            user.name,
            user.elo,
            user.games + 1, // already counting this new game
            user.avatar,
            true,
            this.state.players.size + 1,
            new Map<string, IPokemonCollectionItemMongo>(),
            "",
            Role.BOT,
            this.state
          )
          this.state.players.set(user.uid, player)
          this.state.botManager.addBot(player)
        } else {
          const user = await UserMetadata.findOne({ uid: id })
          if (user) {
            // init player
            const player = new Player(
              user.uid,
              user.displayName,
              user.elo,
              user.games + 1, // already counting this new game
              user.avatar,
              false,
              this.state.players.size + 1,
              user.pokemonCollection,
              user.title,
              user.role,
              this.state
            )

            this.state.players.set(user.uid, player)
            this.state.shop.assignShop(player, false, this.state)

            if (
              this.state.specialGameRule === SpecialGameRule.EVERYONE_IS_HERE
            ) {
              PRECOMPUTED_REGIONAL_MONS.forEach((p) => {
                if (getPokemonData(p).stars === 1) {
                  this.state.shop.addRegionalPokemon(p, player)
                }
              })
            }
          }
        }
      })
    )

    if (debugBossTest) {
      this.state.isBossTest = true
      this.applyBossTestSetup(debugBossTest)
    }

    this.clock.setTimeout(
      () => {
        if (this.state.gameLoaded) return // already started
        this.broadcast(Transfer.LOADING_COMPLETE)
        this.state.players.forEach((player) => {
          clearPendingGame(this.presence, player.id)
        })
        this.startGame()
      },
      5 * 60 * 1000
    ) // maximum 5 minutes of loading game, game will start no matter what after that

    this.onMessage(Transfer.ITEM, (client, item: Item) => {
      if (!this.state.gameFinished && client.auth) {
        try {
          this.pickItemProposition(client.auth.uid, item)
        } catch (error) {
          logger.error(error)
        }
      }
    })

    this.onMessage(Transfer.CHAMELEON_SHOP_REFRESH, (client) => {
      if (!this.state.gameFinished && client.auth) {
        try {
          this.refreshChameleonShopForPlayer(client.auth.uid, true)
        } catch (error) {
          logger.error("chameleon shop refresh error", error)
        }
      }
    })

    this.onMessage(
      Transfer.CHAMELEON_SHOP_BUY,
      (client, message: { index: number }) => {
        if (!this.state.gameFinished && client.auth) {
          try {
            this.buyChameleonShopItem(client.auth.uid, message.index)
          } catch (error) {
            logger.error("chameleon shop buy error", message, error)
          }
        }
      }
    )

    this.onMessage(Transfer.SHOP, (client, message) => {
      if (!this.state.gameFinished && client.auth) {
        try {
          this.dispatcher.dispatch(new OnBuyPokemonCommand(), {
            playerId: client.auth.uid,
            index: message.id
          })
          clearPendingGame(this.presence, client.auth.uid) // tryfix for reconnection leading to eject bug
        } catch (error) {
          logger.error("shop error", message, error)
        }
      }
    })

    this.onMessage(Transfer.REMOVE_FROM_SHOP, (client, index) => {
      if (!this.state.gameFinished && client.auth) {
        try {
          this.dispatcher.dispatch(new OnRemoveFromShopCommand(), {
            playerId: client.auth.uid,
            index
          })
        } catch (error) {
          logger.error("remove from shop error", index, error)
        }
      }
    })

    this.onMessage(Transfer.POKEMON_PROPOSITION, (client, pkm: Pkm) => {
      if (!this.state.gameFinished && client.auth) {
        try {
          this.pickPokemonProposition(client.auth.uid, pkm)
        } catch (error) {
          logger.error(error)
        }
      }
    })

    this.onMessage(Transfer.DRAG_DROP, (client, message: IDragDropMessage) => {
      if (!this.state.gameFinished) {
        try {
          this.dispatcher.dispatch(new OnDragDropPokemonCommand(), {
            client: client,
            detail: message
          })
          clearPendingGame(this.presence, client.auth.uid) // tryfix for reconnection leading to eject bug
        } catch (error) {
          const errorInformation = {
            updateBoard: true,
            updateItems: true
          }
          client.send(Transfer.DRAG_DROP_CANCEL, errorInformation)
          logger.error("drag drop error", error)
        }
      }
    })

    this.onMessage(
      Transfer.DRAG_DROP_ITEM,
      (client, message: IDragDropItemMessage) => {
        if (!this.state.gameFinished) {
          try {
            this.dispatcher.dispatch(new OnDragDropItemCommand(), {
              client: client,
              detail: message
            })
          } catch (error) {
            const errorInformation = {
              updateBoard: true,
              updateItems: true
            }
            client.send(Transfer.DRAG_DROP_CANCEL, errorInformation)
            logger.error("drag drop error", error)
          }
        }
      }
    )

    this.onMessage(
      Transfer.DRAG_DROP_COMBINE,
      (client, message: IDragDropCombineMessage) => {
        if (!this.state.gameFinished) {
          try {
            this.dispatcher.dispatch(new OnDragDropCombineCommand(), {
              client: client,
              detail: message
            })
          } catch (error) {
            const errorInformation = {
              updateBoard: true,
              updateItems: true
            }
            client.send(Transfer.DRAG_DROP_CANCEL, errorInformation)
            logger.error("drag drop error", error)
          }
        }
      }
    )

    this.onMessage(
      Transfer.VECTOR,
      (client, message: { x: number; y: number }) => {
        try {
          if (client.auth) {
            this.miniGame.applyVector(client.auth.uid, message.x, message.y)
          }
        } catch (error) {
          logger.error(error)
        }
      }
    )

    this.onMessage(Transfer.SELL_POKEMON, (client, pokemonId: string) => {
      if (!this.state.gameFinished && client.auth) {
        try {
          this.dispatcher.dispatch(new OnSellPokemonCommand(), {
            client,
            pokemonId
          })
        } catch (error) {
          logger.error("sell drop error", pokemonId)
        }
      }
    })

    this.onMessage(Transfer.REFRESH, (client, message) => {
      if (!this.state.gameFinished && client.auth) {
        try {
          this.dispatcher.dispatch(new OnShopRerollCommand(), client.auth.uid)
        } catch (error) {
          logger.error("refresh error", message)
        }
      }
    })

    this.onMessage(Transfer.LOCK, (client, message) => {
      if (!this.state.gameFinished && client.auth) {
        try {
          this.dispatcher.dispatch(new OnLockCommand(), client.auth.uid)
        } catch (error) {
          logger.error("lock error", message)
        }
      }
    })

    this.onMessage(
      Transfer.SWITCH_BENCH_AND_BOARD,
      (client, pokemonId: string) => {
        if (!this.state.gameFinished && client.auth) {
          try {
            this.dispatcher.dispatch(new OnSwitchBenchAndBoardCommand(), {
              client,
              pokemonId
            })
          } catch (error) {
            logger.error("sell drop error", pokemonId)
          }
        }
      }
    )

    this.onMessage(Transfer.SPECTATE, (client, spectatedPlayerId: string) => {
      if (client.auth) {
        try {
          if (!client.userData) client.userData = {}
          client.userData.spectatedPlayerId = spectatedPlayerId
          this.dispatcher.dispatch(new OnSpectateCommand(), {
            id: client.auth.uid,
            spectatedPlayerId
          })
        } catch (error) {
          logger.error("spectate error", client.auth.uid, spectatedPlayerId)
        }
      }
    })

    this.onMessage(Transfer.LEVEL_UP, (client, message) => {
      if (!this.state.gameFinished && client.auth) {
        try {
          this.dispatcher.dispatch(new OnLevelUpCommand(), client.auth.uid)
        } catch (error) {
          logger.error("level up error", message)
        }
      }
    })

    this.onMessage(Transfer.SHOW_EMOTE, (client: Client, message?: string) => {
      if (client.auth) {
        this.broadcast(Transfer.SHOW_EMOTE, {
          id: client.auth.uid,
          emote: message
        })
      }
    })

    this.onMessage(
      Transfer.WANDERER_CLICKED,
      async (client, msg: { id: string }) => {
        if (client.auth) {
          try {
            this.dispatcher.dispatch(new OnPokemonCatchCommand(), {
              client,
              playerId: client.auth.uid,
              id: msg.id
            })
          } catch (e) {
            logger.error("catch wandering error", e)
          }
        }
      }
    )

    this.onMessage(Transfer.PICK_BERRY, async (client, index) => {
      if (!this.state.gameFinished && client.auth) {
        try {
          this.dispatcher.dispatch(new OnPickBerryCommand(), {
            playerId: client.auth.uid,
            berryIndex: index
          })
        } catch (error) {
          logger.error("error picking berry", error)
        }
      }
    })

    this.onMessage(Transfer.LOADING_PROGRESS, (client, progress: number) => {
      if (client.auth) {
        const player = this.state.players.get(client.auth.uid)
        if (player) {
          player.loadingProgress = progress
        }
      }
    })

    this.onMessage(Transfer.LOADING_COMPLETE, (client) => {
      if (client.auth) {
        const player = this.state.players.get(client.auth.uid)
        if (player) {
          player.loadingProgress = 100
          clearPendingGame(this.presence, client.auth.uid)
        }
        if (this.state.gameLoaded) {
          // already started, presumably a user refreshed page and wants to reconnect to game
          client.send(Transfer.LOADING_COMPLETE)
        } else if (
          values(this.state.players).every((p) => p.loadingProgress === 100)
        ) {
          this.broadcast(Transfer.LOADING_COMPLETE)
          this.startGame()
        }
      }
    })

    this.onMessage(
      Transfer.OVERWRITE_BOARD,
      (client, board: IDetailledPokemon[]) => {
        if (client.auth) {
          const player = this.state.players.get(client.auth.uid)
          if (player?.role !== Role.ADMIN) return

          try {
            this.dispatcher.dispatch(new OnOverwriteBoardCommand(), {
              playerId: client.auth.uid,
              board
            })
          } catch (error) {
            logger.error("overwrite board error", error)
          }
        }
      }
    )

    // 在所有其他 onMessage 之后添加准备按钮处理
    this.onMessage(Transfer.TOGGLE_READY, (client) => {
      if (!this.state.gameFinished && client.auth) {
        try {
          const player = this.state.players.get(client.auth.uid)
          if (!player || player.isBot) return

          // 只在PICK阶段允许切换准备状态
          if (this.state.phase === GamePhaseState.PICK) {
            player.isReady = !player.isReady

            logger.debug(
              `Player ${player.name} ready status: ${player.isReady}`
            )

            // 检查是否所有真人玩家都准备好
            this.checkAllPlayersReady()
          }
        } catch (error) {
          logger.error("toggle ready error", error)
        }
      }
    })
  }

  // 新增方法: 检查所有玩家是否准备好
  checkAllPlayersReady() {
    const humanPlayers = values(this.state.players).filter(
      (p) => !p.isBot && p.alive
    )

    if (humanPlayers.length === 0) return

    const readyPlayers = humanPlayers.filter((p) => p.isReady)
    const allReady = readyPlayers.length === humanPlayers.length

    logger.debug(
      `Ready check: ${readyPlayers.length}/${humanPlayers.length} players ready`
    )

    if (allReady && this.state.phase === GamePhaseState.PICK) {
      // 所有真人玩家都准备好,立即跳过准备阶段
      logger.info("All players ready, skipping to fight phase")
      this.state.time = 0 // 直接将时间设为0,触发阶段切换
    }
  }

  startGame() {
    if (this.state.gameLoaded) return // already started
    this.state.gameLoaded = true
    this.setSimulationInterval((deltaTime: number) => {
      /* in case of lag spikes, the game should feel slower,
      but this max simulation dt helps preserving the correctness of simulation result */
      deltaTime = Math.min(MAX_SIMULATION_DELTA_TIME, deltaTime)
      if (!this.state.gameFinished && !this.state.simulationPaused) {
        try {
          this.dispatcher.dispatch(new OnUpdateCommand(), { deltaTime })
        } catch (error) {
          logger.error("update error", error)
        }
      }
    })
    this.state.botManager.updateBots()
    this.miniGame.initialize(this.state, this)
  }

  async onAuth(client: Client, options, context) {
    try {
      super.onAuth(client, options, context)
      const token = await admin.auth().verifyIdToken(options.idToken)
      const user = await admin.auth().getUser(token.uid)

      if (!user.displayName) {
        logger.error("No display name for this account", user.uid)
        throw new Error(
          "No display name for this account. Please report this error."
        )
      }

      return user
    } catch (error) {
      logger.error(error)
    }
  }

  async onJoin(client: Client) {
    const userProfile = await UserMetadata.findOne({ uid: client.auth.uid })
    if (userProfile?.banned) {
      throw "Account banned"
    }
    this.dispatcher.dispatch(new OnJoinCommand(), { client })
    const pendingGame = await getPendingGame(this.presence, client.auth.uid)
    if (pendingGame?.gameId === this.roomId) {
      // user reconnected without reconnection token (new browser/machine/session)
      clearPendingGame(this.presence, client.auth.uid)
    } else if (pendingGame != null && !pendingGame.isExpired) {
      client.leave(CloseCodes.USER_IN_ANOTHER_GAME)
    }
  }

  async onLeave(client: Client, consented: boolean) {
    try {
      /*if (client && client.auth && client.auth.displayName) {
        logger.info(`${client.auth.displayName} has been disconnected`)
      }*/
      if (consented) {
        throw new Error("consented leave")
      }

      // allow disconnected client to reconnect into this room until 5 minutes
      setPendingGame(this.presence, client.auth.uid, this.roomId)
      await this.allowReconnection(client, ALLOWED_GAME_RECONNECTION_TIME)
      // if the user reconnects, we clear the pending game and recall the OnJoinCommand
      clearPendingGame(this.presence, client.auth.uid)
      this.dispatcher.dispatch(new OnJoinCommand(), { client })
    } catch (e) {
      if (client && client.auth && client.auth.displayName) {
        const pendingGame = await getPendingGame(this.presence, client.auth.uid)
        if (!pendingGame && !consented)
          return // user has reconnected through other ways (new browser/machine/session)
        else if (
          pendingGame &&
          isValidDate(pendingGame.reconnectionDeadline) &&
          pendingGame.reconnectionDeadline.getTime() > Date.now()
        ) {
          // user has reconnected through other ways (new browser/machine/session) but has left or lost connection again
          // so we have a new allowed reconnection time. Ignoring this leave and relying on the onLeave call that followed
          return
        }
        clearPendingGame(this.presence, client.auth.uid)

        //logger.info(`${client.auth.displayName} left game`)
        const player = this.state.players.get(client.auth.uid)
        const hasLeftGameBeforeTheEnd =
          player && player.life > 0 && !this.state.gameFinished
        const otherHumans = values(this.state.players).filter(
          (p) => !p.isBot && p.id !== client.auth.uid
        )
        if (
          hasLeftGameBeforeTheEnd &&
          otherHumans.length >= 1 &&
          player.role !== Role.ADMIN
        ) {
          /* if a user leaves a game before the end,
          they cannot join another in the next 5 minutes */
          // givePlayerTimeout(this.presence, client.auth.uid)
        }

        if (player && this.state.stageLevel <= 5 && !consented) {
          /*
          if player left game during the loading screen or before stage 6,
          we consider they didn't play the game and presume a technical issue
          we remove it from the players and don't give them any rewards
          */
          this.state.players.delete(client.auth.uid)
          this.setMetadata({
            playerIds: removeInArray(this.metadata.playerIds, client.auth.uid)
          })

          /*logger.info(
            `${client.auth.displayName} has been removed from players list`
          )*/
        } else if (player && !player.hasLeftGame) {
          player.hasLeftGame = true
          player.spectatedPlayerId = player.id

          const hasLeftBeforeEnd = player.life > 0 && !this.state.gameFinished
          if (hasLeftBeforeEnd) {
            // player left before being eliminated, in that case we consider this a surrender and give them the worst possible rank
            player.life = -99
            this.rankPlayers()
          }

          this.updatePlayerAfterGame(player, hasLeftBeforeEnd)
        }
      }
      if (
        !this.state.gameLoaded &&
        values(this.state.players).every((p) => p.loadingProgress === 100)
      ) {
        this.broadcast(Transfer.LOADING_COMPLETE)
        this.startGame()
      }
    }
  }

  async onDispose() {
    logger.info("Dispose Game ", this.roomId)
    this.presence.unsubscribe("room-deleted", this.onRoomDeleted)
    const players = values(this.state.players)
    players.forEach((player) => {
      clearPendingGamesOnRoomDispose(this.presence, player.id, this.roomId)
    })
    const playersAlive = players.filter((p) => p.alive)
    const humansAlive = playersAlive.filter((p) => !p.isBot)

    // we skip elo compute/game history if game is not finished
    // that is at least two players including one human are still alive
    if (playersAlive.length >= 2 && humansAlive.length >= 1) {
      if (humansAlive.length > 1) {
        // this can happen if all players disconnect before the end
        // or if there's another technical issue
        // adding a log just in case
        logger.warn(
          `Game room has been disposed while they were still ${humansAlive.length} players alive.`
        )
      }
      return // game not finished before being disposed, we skip elo compute/game history
    }

    try {
      this.state.endTime = Date.now()

      const humans: Player[] = []
      const bots: Player[] = []

      this.state.players.forEach((player) => {
        if (player.isBot) {
          bots.push(player)
        } else {
          humans.push(player)
        }
      })

      const players: ISimplePlayer[] = [...humans, ...bots].map((p) =>
        this.transformToSimplePlayer(p)
      )

      if (this.state.stageLevel >= MinStageForGameToCount) {
        const eligibleToXP = this.state.players.size >= 2
        if (eligibleToXP) {
          for (let i = 0; i < bots.length; i++) {
            const botPlayer = bots[i]
            const bot = await BotV2.findOne({ id: botPlayer.id })
            if (bot) {
              bot.elo = computeElo(
                this.transformToSimplePlayer(botPlayer),
                botPlayer.rank,
                bot.elo,
                players,
                this.state.gameMode,
                true
              )
              bot.save()
            }
          }

          for (let i = 0; i < humans.length; i++) {
            const player = humans[i]
            if (!player.hasLeftGame) {
              player.hasLeftGame = true
              this.updatePlayerAfterGame(player, false)
            }
          }
        }
      }

      if (this.state.gameMode === GameMode.TOURNAMENT) {
        this.presence.publish("tournament-match-end", {
          tournamentId: this.metadata?.tournamentId,
          bracketId: this.metadata?.bracketId,
          players: humans
        })
      }

      this.dispatcher.stop()
    } catch (error) {
      logger.error(error)
    }
  }

  // when a player leaves the game
  async updatePlayerAfterGame(player: Player, hasLeftBeforeEnd: boolean) {
    // if player left before stage 10, they do not earn experience to prevent xp farming abuse
    const eligibleToXP =
      this.state.players.size >= 2 &&
      this.state.stageLevel >= MinStageForGameToCount

    const humans: Player[] = []
    const bots: Player[] = []

    this.state.players.forEach((player) => {
      if (player.isBot) {
        bots.push(player)
      } else {
        humans.push(player)
      }
    })

    const eligibleToELO =
      !this.state.noElo &&
      (this.state.stageLevel >= MinStageForGameToCount || hasLeftBeforeEnd) &&
      humans.length >= 2

    const { rank } = player
    const exp = ExpPlace[rank - 1]

    const usr = await UserMetadata.findOne({ uid: player.id })
    if (usr) {
      if (eligibleToXP) {
        const expThreshold = 1000
        if (usr.exp + exp >= expThreshold) {
          usr.level += 1
          usr.booster += 1
          usr.exp += exp - expThreshold
        } else {
          usr.exp += exp
        }
        usr.exp = isNaN(usr.exp) ? 0 : usr.exp
      }

      usr.games += 1

      if (rank === 1) {
        usr.wins += 1
        if (this.state.gameMode === GameMode.RANKED) {
          player.titles.add(Title.VANQUISHER)
          const minElo = Math.min(
            ...values(this.state.players).map((p) => p.elo)
          )
          if (usr.elo === minElo && humans.length >= 8) {
            player.titles.add(Title.OUTSIDER)
          }
        }
      }

      if (usr.level >= 10) {
        player.titles.add(Title.ROOKIE)
      }
      if (usr.level >= 20) {
        player.titles.add(Title.AMATEUR)
        player.titles.add(Title.BOT_BUILDER)
      }
      if (usr.level >= 30) {
        player.titles.add(Title.VETERAN)
      }
      if (usr.level >= 50) {
        player.titles.add(Title.PRO)
      }
      if (usr.level >= 100) {
        player.titles.add(Title.EXPERT)
      }
      if (usr.level >= 150) {
        player.titles.add(Title.ELITE)
      }
      if (usr.level >= 200) {
        player.titles.add(Title.MASTER)
      }
      if (usr.level >= 300) {
        player.titles.add(Title.GRAND_MASTER)
      }

      if (usr.elo != null && eligibleToELO) {
        let elo = computeElo(
          this.transformToSimplePlayer(player),
          rank,
          usr.elo,
          humans.map((p) => this.transformToSimplePlayer(p)),
          this.state.gameMode,
          false
        )

        if (!elo || isNaN(elo)) {
          logger.error(
            `Elo compute failed for player ${player.name} (${player.id}) ; value: ${elo}`
          )
          elo = usr.elo
        }
        if (elo >= 1100) {
          player.titles.add(Title.GYM_TRAINER)
        }
        if (elo >= 1200) {
          player.titles.add(Title.GYM_CHALLENGER)
        }
        if (elo >= 1400) {
          player.titles.add(Title.GYM_LEADER)
        }
        usr.elo = elo
        usr.maxElo = Math.max(usr.maxElo, elo)

        const dbrecord = this.transformToSimplePlayer(player)
        const synergiesMap = new Map<Synergy, number>()
        player.synergies.forEach((v, k) => {
          v > 0 && synergiesMap.set(k, v)
        })
        DetailledStatistic.create({
          time: Date.now(),
          name: dbrecord.name,
          pokemons: dbrecord.pokemons,
          rank: dbrecord.rank,
          nbplayers: humans.length + bots.length,
          avatar: dbrecord.avatar,
          playerId: dbrecord.id,
          elo: elo,
          synergies: synergiesMap,
          gameMode: this.state.gameMode,
          regions: player.regions
        })

        if (usr.eventFinishTime == null) {
          const eventPointsGained = EventPointsPerRank[clamp(rank - 1, 0, 7)]
          usr.eventPoints = clamp(
            usr.eventPoints + eventPointsGained,
            0,
            MAX_EVENT_POINTS
          )
          usr.maxEventPoints = Math.max(usr.maxEventPoints, usr.eventPoints)
          if (usr.maxEventPoints >= MAX_EVENT_POINTS) {
            usr.eventFinishTime = new Date()

            const finisher = await UserMetadata.findOne({
              eventFinishTime: { $ne: null }
            })
            if (!finisher) {
              player.titles.add(Title.VICTORIOUS)
              this.presence.publish(
                "announcement",
                `${player.name} won the Victory Road race !`
              )
            }
            player.titles.add(Title.FINISHER)
            fetchEventLeaderboard() // a new finisher is enough to justify fetching the leaderboard again immediately
          }

          if (usr.maxEventPoints >= 100) {
            player.titles.add(Title.RUNNER)
          }
        }
      }

      if (player.life >= 100 && rank === 1) {
        player.titles.add(Title.TYRANT)
      }
      if (player.life === 1 && rank === 1) {
        player.titles.add(Title.SURVIVOR)
      }

      if (player.rerollCount > 60) {
        player.titles.add(Title.GAMBLER)
      } else if (player.rerollCount < 20 && rank === 1) {
        player.titles.add(Title.NATURAL)
      }

      // update all pokemons played count
      player.pokemonsPlayed.forEach((pkm) => {
        const index = PkmIndex[pkm]
        const pokemonCollectionItem = usr.pokemonCollection.get(index)
        if (pokemonCollectionItem) {
          pokemonCollectionItem.played += 1
          usr.markModified(`pokemonCollection.${index}.played`)
        } else {
          const newConfig: IPokemonCollectionItemMongo = {
            dust: 0,
            id: index,
            unlocked: Buffer.alloc(5, 0),
            selectedEmotion: null,
            selectedShiny: false,
            played: 1
          }
          usr.pokemonCollection.set(index, newConfig)
        }
      })

      if (
        player.titles.has(Title.COLLECTOR) === false &&
        Object.values(Pkm)
          .filter((p) => NonPkm.includes(p) === false)
          .every((pkm) => {
            const pokemonCollectionItem = usr.pokemonCollection.get(
              PkmIndex[pkm]
            )
            return pokemonCollectionItem && pokemonCollectionItem.played > 0
          })
      ) {
        player.titles.add(Title.COLLECTOR)
      }

      if (usr.titles === undefined) {
        usr.titles = []
      }

      player.titles.forEach((t) => {
        if (!usr.titles.includes(t)) {
          //logger.info("title added ", t)
          usr.titles.push(t)
        }
      })

      //logger.debug(usr);
      //usr.markModified('metadata');
      usr.save()
    }
  }

  transformToSimplePlayer(player: Player): IGameHistorySimplePlayer {
    const simplePlayer: IGameHistorySimplePlayer = {
      name: player.name,
      id: player.id,
      rank: player.rank,
      avatar: player.avatar,
      pokemons: new Array<{
        name: Pkm
        avatar: string
        items: Item[]
        inventory: Item[]
      }>(),
      elo: player.elo,
      games: player.games,
      synergies: [],
      title: player.title,
      role: player.role
    }

    player.synergies.forEach((v, k) => {
      simplePlayer.synergies.push({ name: k as Synergy, value: v })
    })

    player.board.forEach((pokemon: IPokemon) => {
      if (pokemon.positionY != 0 && pokemon.passive !== Passive.INANIMATE) {
        const avatar = getAvatarString(
          pokemon.index,
          pokemon.shiny,
          pokemon.emotion
        )
        const s: IGameHistoryPokemonRecord = {
          name: pokemon.name,
          avatar: avatar,
          items: new Array<Item>(),
          inventory: new Array<Item>()
        }
        pokemon.items.forEach((i) => {
          s.items.push(i)
          s.inventory.push(i)
        })
        simplePlayer.pokemons.push(s)
      }
    })
    return simplePlayer
  }

  spawnOnBench(player: Player, pkm: Pkm, anim: "fishing" | "spawn" = "spawn") {
    const pokemon = PokemonFactory.createPokemonFromName(pkm, player)
    const x = getFirstAvailablePositionInBench(player.board)
    if (x !== null) {
      pokemon.positionX = x
      pokemon.positionY = 0
      if (anim === "fishing") {
        pokemon.action = PokemonActionState.FISH
      }

      player.board.set(pokemon.id, pokemon)
      this.clock.setTimeout(() => {
        pokemon.action = PokemonActionState.IDLE
        this.checkEvolutionsAfterPokemonAcquired(player.id)
      }, 1000)
    }
  }

  checkEvolutionsAfterPokemonAcquired(playerId: string): boolean {
    const player = this.state.players.get(playerId)
    if (!player) return false
    let hasEvolved = false

    player.board.forEach((pokemon) => {
      if (
        pokemon.hasEvolution &&
        pokemon.evolutionRule instanceof CountEvolutionRule
      ) {
        const pokemonEvolved = pokemon.evolutionRule.tryEvolve(
          pokemon,
          player,
          this.state.stageLevel
        )
        if (pokemonEvolved) {
          hasEvolved = true
        }
      }
    })

    player.boardSize = this.getTeamSize(player.board)
    return hasEvolved
  }

  checkEvolutionsAfterItemAcquired(
    playerId: string,
    pokemon: Pokemon
  ): Pokemon | void {
    const player = this.state.players.get(playerId)
    if (!player) return

    if (
      pokemon.evolutionRule &&
      pokemon.evolutionRule instanceof ItemEvolutionRule
    ) {
      return pokemon.evolutionRule.tryEvolve(
        pokemon,
        player,
        this.state.stageLevel
      )
    }
  }

  getNumberOfPlayersAlive(players: MapSchema<Player>) {
    let numberOfPlayersAlive = 0
    players.forEach((player, key) => {
      if (player.alive) {
        numberOfPlayersAlive++
      }
    })
    return numberOfPlayersAlive
  }

  getTeamSize(board: MapSchema<Pokemon>) {
    let size = 0

    board.forEach((pokemon, key) => {
      if (pokemon.positionY != 0 && pokemon.doesCountForTeamSize) {
        size++
      }
    })

    return size
  }

  pickPokemonProposition(
    playerId: string,
    pkm: PkmProposition,
    bypassLackOfSpace = false
  ) {
    const player = this.state.players.get(playerId)
    if (!player || player.pokemonsProposition.length === 0) return
    if (
      this.state.additionalPokemons.includes(pkm as Pkm) &&
      this.state.specialGameRule !== SpecialGameRule.EVERYONE_IS_HERE
    )
      return // already picked, probably a double click
    if (
      UniquePool.includes(pkm) &&
      this.state.stageLevel !== PortalCarouselStages[1] &&
      !(
        this.state.specialGameRule === SpecialGameRule.UNIQUE_STARTER &&
        this.state.stageLevel <= 1
      )
    )
      return // should not be pickable at this stage
    if (
      LegendaryPool.includes(pkm) &&
      this.state.stageLevel !== PortalCarouselStages[2]
    )
      return // should not be pickable at this stage

    const pokemonsObtained: Pokemon[] = (
      pkm in PkmDuos ? PkmDuos[pkm] : [pkm]
    ).map((p) => PokemonFactory.createPokemonFromName(p, player))

    const pokemon = pokemonsObtained[0]
    const isEvolution =
      pokemon.evolutionRule &&
      pokemon.evolutionRule instanceof CountEvolutionRule &&
      pokemon.evolutionRule.canEvolveIfGettingOne(pokemon, player)

    const freeSpace = getFreeSpaceOnBench(player.board)

    if (
      freeSpace < pokemonsObtained.length &&
      !bypassLackOfSpace &&
      !isEvolution
    )
      return // prevent picking if not enough space on bench

    // at this point, the player is allowed to pick a proposition
    const selectedIndex = player.pokemonsProposition.indexOf(pkm)
    player.pokemonsProposition.clear()

    if (AdditionalPicksStages.includes(this.state.stageLevel)) {
      // If player picked their regional variant, we need to add the base pokemon to the shop pool
      if (pokemonsObtained[0]?.regional) {
        const basePkm = (Object.keys(PkmRegionalVariants).find((p) =>
          PkmRegionalVariants[p].includes(pokemonsObtained[0].name)
        ) ?? pokemonsObtained[0].name) as Pkm
        this.state.shop.addAdditionalPokemon(basePkm, this.state)
        player.regionalPokemons.push(pkm as Pkm)
      } else {
        this.state.shop.addAdditionalPokemon(pkm, this.state)
      }

      // update regional pokemons in case some regional variants of add picks are now available
      this.state.players.forEach((p) => p.updateRegionalPool(this.state, false))
    }

    if (
      AdditionalPicksStages.includes(this.state.stageLevel) ||
      this.state.stageLevel <= 1
    ) {
      const selectedItem = player.itemsProposition[selectedIndex]
      if (player.itemsProposition.length > 0 && selectedItem != null) {
        player.items.push(selectedItem)
        player.itemsProposition.clear()
      }
    }

    if (this.state.stageLevel <= 1) {
      player.firstPartner = pokemonsObtained[0].name
    }

    pokemonsObtained.forEach((pokemon) => {
      const freeCellX = getFirstAvailablePositionInBench(player.board)
      if (isEvolution) {
        pokemon.positionX = freeCellX ?? -1 // temporary position off the board just to handle evolution
        pokemon.positionY = 0
        player.board.set(pokemon.id, pokemon)
        pokemon.onAcquired(player)
        this.checkEvolutionsAfterPokemonAcquired(playerId)
      } else if (freeCellX !== null) {
        pokemon.positionX = freeCellX
        pokemon.positionY = 0
        player.board.set(pokemon.id, pokemon)
        pokemon.onAcquired(player)
      } else {
        // sell picked pokemon if no more space on bench and bypassLackOfSpace is true
        const sellPrice = getSellPrice(pokemon, this.state.specialGameRule)
        player.addMoney(sellPrice, true, null)
      }
    })
  }

  pickItemProposition(playerId: string, item: Item) {
    const player = this.state.players.get(playerId)
    if (player && player.itemsProposition.includes(item)) {
      player.items.push(item)
      player.itemsProposition.clear()
    }
  }

  computeRoundDamage(
    opponentTeam: MapSchema<IPokemonEntity>,
    stageLevel: number,
    isBossBattle?: boolean
  ) {
    let damage = Math.ceil(stageLevel / 2)
    if (opponentTeam.size > 0) {
      opponentTeam.forEach((pokemon) => {
        if (!pokemon.isSpawn && pokemon.passive !== Passive.INANIMATE) {
          damage += 1
        }
      })
    }

    // Apply additional multiplier for sudden death phase
    if (
      this.state.pveSuddenDeathActive &&
      stageLevel >= 41 &&
      stageLevel <= 48
    ) {
      damage *= 2
    }

    return damage
  }

  async addPveBots() {
    if (!this.state.pveDifficulty) return

    // Get bots with appropriate Elo range for the selected difficulty
    const minElo = EloRankThreshold[this.state.pveDifficulty]
    const maxElo = minElo + 100 // Allow some variation

    try {
      // Find bots with Elo in the appropriate range and with preset lineups
      const bots = await BotV2.find({
        elo: { $gte: minElo, $lte: maxElo },
        presetLineup: { $exists: true, $ne: [] },
        approved: true
      }).limit(20) // Get more than we need to have variety
      const usableBots = bots.filter((bot) => this.isPveBotUsable(bot))

      if (usableBots.length === 0) {
        // Fallback to any bots with appropriate Elo
        const fallbackBots = await BotV2.find({
          elo: { $gte: minElo, $lte: maxElo },
          approved: true
        }).limit(20)
        const usableFallbackBots = fallbackBots.filter((bot) =>
          this.isPveBotUsable(bot)
        )

        if (usableFallbackBots.length === 0) {
          // Create basic bots as last resort
          this.createBasicPveBots()
          return
        }

        // Use fallback bots
        this.assignPveBots(usableFallbackBots)
      } else {
        // Use bots with preset lineups
        this.assignPveBots(usableBots)
      }
    } catch (error) {
      logger.error("Error loading PVE bots:", error)
      // Create basic bots as fallback
      this.createBasicPveBots()
    }
  }

  assignPveBots(bots: IBot[]) {
    const usableBots = bots.filter((bot) => this.isPveBotUsable(bot))
    // Shuffle bots to get random selection
    const shuffledBots = [...usableBots].sort(() => Math.random() - 0.5)

    // Take first 8 bots or all available if less than 8
    const selectedBots = shuffledBots.slice(0, 8)

    for (let i = 0; i < selectedBots.length; i++) {
      const botData = selectedBots[i]
      const botId = `pve_bot_${i}`
      const botName = botData.name || `PVE Bot ${i + 1}`

      const pveBot = new Player(
        botId,
        botName,
        botData.elo,
        0,
        botData.avatar,
        true,
        this.state.players.size + 1,
        new Map<string, IPokemonCollectionItemMongo>(),
        "",
        Role.BOT,
        this.state
      )

      // Store bot data for later use in creating board
      pveBot.botData = botData

      this.state.players.set(botId, pveBot)
      this.state.botManager.addBot(pveBot)
    }

    // If we have less than 8 bots, fill remaining slots with basic bots
    if (selectedBots.length < 8) {
      for (let i = selectedBots.length; i < 8; i++) {
        this.createBasicPveBot(i)
      }
    }
  }

  createBasicPveBots() {
    for (let i = 0; i < 8; i++) {
      this.createBasicPveBot(i)
    }
  }

  createBasicPveBot(index: number) {
    const botId = `pve_bot_${index}`
    const botName = `PVE Bot ${index + 1}`
    const botElo = EloRankThreshold[this.state.pveDifficulty!]

    const pveBot = new Player(
      botId,
      botName,
      botElo,
      0,
      "bot_avatar",
      true,
      this.state.players.size + 1,
      new Map<string, IPokemonCollectionItemMongo>(),
      "",
      Role.BOT,
      this.state
    )

    this.state.players.set(botId, pveBot)
    this.state.botManager.addBot(pveBot)
  }

  rankPlayers() {
    const rankArray = new Array<{ id: string; life: number; level: number }>()
    this.state.players.forEach((player) => {
      if (
        this.state.gameMode === GameMode.PVE_MODE &&
        player.isBot &&
        player.id.startsWith("pve_bot_")
      ) {
        return
      }
      if (!player.alive) {
        return
      }

      rankArray.push({
        id: player.id,
        life: player.life,
        level: player.experienceManager.level
      })
    })

    const sortPlayers = (
      a: { id: string; life: number; level: number },
      b: { id: string; life: number; level: number }
    ) => {
      let diff = b.life - a.life
      if (diff == 0) {
        diff = b.level - a.level
      }
      return diff
    }

    rankArray.sort(sortPlayers)

    rankArray.forEach((rankPlayer, index) => {
      const player = this.state.players.get(rankPlayer.id)
      if (player) {
        player.rank = index + 1
      }
    })
  }

  onRoomDeleted(roomId) {
    if (this.roomId === roomId) {
      this.disconnect(CloseCodes.ROOM_DELETED)
    }
  }

  spawnWanderingPokemon({
    pkm,
    type,
    behavior,
    player
  }: {
    pkm: Pkm
    type: WandererType
    behavior: WandererBehavior
    player: Player
  }) {
    const client = this.clients.find((cli) => cli.auth.uid === player.id)
    if (!client) return
    const id = nanoid()
    const wanderer = new Wanderer({
      id,
      pkm,
      type,
      behavior,
      shiny: chance(0.01)
    })
    player.wanderers.set(id, wanderer)
  }

  handlePveMatchups() {
    this.state.simulationPaused = true // 2 seconds pause for portal transition animation

    // Get all alive human players
    const humanPlayers: Player[] = []
    this.state.players.forEach((player: Player) => {
      if (player.alive && !player.isBot) {
        humanPlayers.push(player)
      }
    })

    if (humanPlayers.length === 0) return

    // Get all PVE bots
    const pveBots: Player[] = []
    this.state.players.forEach((player: Player) => {
      if (player.alive && player.isBot && player.id.startsWith("pve_bot_")) {
        pveBots.push(player)
      }
    })

    if (pveBots.length === 0) return

    if (this.state.stageLevel >= 49) {
      return
    }

    const isSuddenDeath =
      this.state.stageLevel > 40 && this.state.stageLevel <= 48
    if (isSuddenDeath && !this.state.pveSuddenDeathActive) {
      this.state.pveSuddenDeathActive = true
      this.state.pveBotOrderIndex = 0
      this.refreshPveBotOrder(pveBots, true)
    } else if (this.state.pveBotOrder.length === 0) {
      this.refreshPveBotOrder(pveBots, true)
    }

    const botOrder = values(this.state.pveBotOrder)
    const fallbackBot = pveBots[0]
    if (!fallbackBot) return

    let selectedBotId = botOrder[0] ?? fallbackBot.id
    if (this.state.pveSuddenDeathActive) {
      const orderIndex = Math.min(
        this.state.pveBotOrderIndex,
        botOrder.length - 1
      )
      selectedBotId = botOrder[orderIndex] ?? fallbackBot.id
      if (this.state.pveBotOrderIndex < botOrder.length - 1) {
        this.state.pveBotOrderIndex += 1
      }
    } else {
      const rotationIndex =
        (this.state.stageLevel - 1) % (botOrder.length || 1)
      selectedBotId = botOrder[rotationIndex] ?? fallbackBot.id
    }

    const botPlayer = this.state.players.get(selectedBotId) ?? fallbackBot
    const botData = botPlayer.botData as IBot | undefined
    const opponentName = botData?.name ?? botPlayer.name
    const opponentAvatar = botData?.avatar ?? botPlayer.avatar
    const opponentTitle = botPlayer.title ?? ""

    humanPlayers.forEach((humanPlayer) => {
      const botLineup = this.getPveBotLineup(botData, this.state.stageLevel)
      const botBoard = botLineup
        ? PokemonFactory.makePveBoard(botLineup, false, null)
        : PokemonFactory.makePveBoard([], false, null)
      if (
        this.state.pveDifficultyTier === PveDifficulty.EXTREME &&
        this.state.pveSuddenDeathActive &&
        this.state.stageLevel >= 41 &&
        this.state.stageLevel <= 48
      ) {
        this.addExtremeSuddenDeathLegendary(botBoard, botLineup ?? [])
      }

      const weather = getWeather(humanPlayer, null, botBoard, false)
      const simulationId = nanoid()

      humanPlayer.simulationId = simulationId
      humanPlayer.team = Team.BLUE_TEAM
      humanPlayer.opponentId = botPlayer.id
      humanPlayer.opponentName = opponentName
      humanPlayer.opponentAvatar = opponentAvatar
      humanPlayer.opponentTitle = opponentTitle

      const simulation = new Simulation(
        simulationId,
        this,
        humanPlayer.board,
        botBoard,
        humanPlayer,
        undefined,
        this.state.stageLevel,
        weather,
        false,
        false // isBossBattle
      )

      this.state.simulations.set(simulation.id, simulation)
      this.clock.setTimeout(() => {
        if (this.state) this.state.simulationPaused = false
        simulation.start()
      }, 2500)
    })
  }

  private addExtremeSuddenDeathLegendary(
    botBoard: MapSchema<Pokemon>,
    botLineup: IDetailledPokemon[]
  ) {
    if (botLineup.length === 0) return

    const weightedSynergies = this.getTopSynergyWeights(botLineup, 3)
    const pickedSynergies = this.pickWeightedSynergies(weightedSynergies, 2)
    const existing = new Set<Pkm>(botLineup.map((p) => p.name))
    const legendaryPool = this.pickLegendaryBySynergy(pickedSynergies, existing)
    if (legendaryPool.length === 0) return

    const legendary = pickRandomIn(legendaryPool)
    const position = this.getRandomEnemyBoardPosition(botBoard)
    if (!position) return

    const pokemon = PokemonFactory.createPokemonFromName(legendary)
    pokemon.positionX = position.x
    pokemon.positionY = position.y
    pokemon.modelScale = 1.15

    const difficultyMultiplier = getPveBossDifficultyMultiplier(
      this.state.pveDifficultyTier
    )
    if (difficultyMultiplier !== 1) {
      pokemon.hp = Math.round(pokemon.hp * difficultyMultiplier)
      pokemon.maxHP = pokemon.hp
      pokemon.atk = Math.round(pokemon.atk * difficultyMultiplier)
      pokemon.def = Math.round(pokemon.def * difficultyMultiplier)
      pokemon.ap = Math.round(pokemon.ap * difficultyMultiplier)
      if (pokemon.speDef !== undefined) {
        pokemon.speDef = Math.round(pokemon.speDef * difficultyMultiplier)
      }
    }

    const itemsPool = CraftableItems.filter((item) => item !== Item.WONDER_BOX)
    pickNRandomIn(itemsPool, 3).forEach((item) => pokemon.items.add(item))
    botBoard.set(pokemon.id, pokemon)
  }

  refreshChameleonShopForPlayer(
    playerId: string,
    manualRefresh = false
  ) {
    const player = this.state.players.get(playerId)
    if (!player || player.isBot) return
    if (this.state.stageLevel < 31) {
      player.chameleonShop.clear()
      return
    }
    if (manualRefresh) {
      const refreshCost = 5
      if (player.money < refreshCost) return
      player.addMoney(-refreshCost, false, null)
    }
    const items = this.rollChameleonShopItems(player)
    resetArraySchema(player.chameleonShop, items)
  }

  private buyChameleonShopItem(playerId: string, index: number) {
    const player = this.state.players.get(playerId)
    if (!player || player.isBot) return
    if (this.state.stageLevel < 31) return
    const items = values(player.chameleonShop)
    const item = items[index]
    if (!item) return

    if (TownItems.includes(item) && player.chameleonTownPurchases >= 3) return
    if (ShinyItems.includes(item) && player.chameleonShinyPurchased) return

    const price = this.getChameleonShopPrice(item)
    if (player.money < price) return

    player.addMoney(-price, false, null)
    player.items.push(item)
    if (TownItems.includes(item)) {
      player.chameleonTownPurchases += 1
    }
    if (ShinyItems.includes(item)) {
      player.chameleonShinyPurchased = true
    }

    items.splice(index, 1)
    resetArraySchema(player.chameleonShop, items)
  }

  private rollChameleonShopItems(player: Player): Item[] {
    const stageLevel = this.state.stageLevel
    const craftablePool = CraftableItems.filter(
      (item) => item !== Item.WONDER_BOX && !this.isChameleonEggItem(item)
    )
    const allowTownItems = player.chameleonTownPurchases < 3
    const allowShinyItems = !player.chameleonShinyPurchased
    const townPool = allowTownItems
      ? TownItems.filter(
          (item) =>
            item !== Item.TREASURE_BOX &&
            item !== Item.WANTED_NOTICE &&
            !this.isChameleonEggItem(item) &&
            !(stageLevel >= 41 && MissionOrders.includes(item))
        )
      : []
    const shinyPool = allowShinyItems
      ? ShinyItems.filter((item) => !this.isChameleonEggItem(item))
      : []

    const results: Item[] = []
    let specialPicked = false
    const mutableCraftable = [...craftablePool]
    const mutableSpecial = [...townPool, ...shinyPool]

    for (let i = 0; i < 3; i++) {
      const pool = specialPicked
        ? [...mutableCraftable]
        : [...mutableCraftable, ...mutableSpecial]
      if (pool.length === 0) break

      const item = this.pickChameleonItem(pool)
      results.push(item)
      if (mutableCraftable.includes(item)) {
        removeInArray(mutableCraftable, item)
      }
      if (mutableSpecial.includes(item)) {
        removeInArray(mutableSpecial, item)
        specialPicked = true
      }
    }

    return results
  }

  private pickChameleonItem(pool: Item[]): Item {
    const weights = pool.reduce(
      (acc, item) => {
        acc[item] = this.getChameleonItemWeight(item)
        return acc
      },
      {} as Record<Item, number>
    )
    const totalWeight = pool.reduce(
      (sum, item) => sum + this.getChameleonItemWeight(item),
      0
    )
    return randomWeighted(weights, totalWeight) ?? pool[0]
  }

  private getChameleonItemWeight(item: Item): number {
    return SynergyStones.includes(item) ? 0.2 : 1
  }

  private getChameleonShopPrice(item: Item): number {
    if (ShinyItems.includes(item)) return 40
    if (TownItems.includes(item)) return 10
    return 20
  }

  private isChameleonEggItem(item: Item): boolean {
    return (
      item === Item.EGG_FOR_SELL ||
      item === Item.AQUA_EGG ||
      item === Item.NUTRITIOUS_EGG
    )
  }

  private getTopSynergyWeights(
    botLineup: IDetailledPokemon[],
    limit: number
  ) {
    const counts = new Map<Synergy, number>()
    botLineup.forEach((pokemon) => {
      const types = getPokemonData(pokemon.name).types
      types.forEach((type) => {
        counts.set(type, (counts.get(type) ?? 0) + 1)
      })
    })

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
  }

  private pickWeightedSynergies(
    weights: Array<[Synergy, number]>,
    draws: number
  ) {
    if (weights.length === 0) return []
    const weightMap = weights.reduce((acc, [synergy, weight]) => {
      acc[synergy] = weight
      return acc
    }, {} as Record<Synergy, number>)
    const totalWeight = weights.reduce((sum, [, weight]) => sum + weight, 0)

    const picked: Synergy[] = []
    for (let i = 0; i < draws; i++) {
      const selection = randomWeighted(weightMap, totalWeight)
      if (selection) picked.push(selection)
    }
    return picked
  }

  private pickLegendaryBySynergy(
    pickedSynergies: Synergy[],
    existing: Set<Pkm>
  ) {
    const synergySet = new Set(pickedSynergies)
    const matching = LegendaryPool.filter((pkm) => {
      if (pkm === Pkm.ARCEUS) return true
      const types = getPokemonData(pkm as Pkm).types
      return types.some((type) => synergySet.has(type))
    }) as Pkm[]

    const candidates = matching.length > 0 ? matching : (LegendaryPool as Pkm[])
    const uniqueCandidates = candidates.filter((pkm) => !existing.has(pkm))
    return uniqueCandidates.length > 0 ? uniqueCandidates : candidates
  }

  private getRandomEnemyBoardPosition(botBoard: MapSchema<Pokemon>) {
    const occupied = new Set<string>()
    botBoard.forEach((pokemon) => {
      if (pokemon.positionY > 0) {
        occupied.add(`${pokemon.positionX},${pokemon.positionY}`)
      }
    })

    const candidates: Array<{ x: number; y: number }> = []
    for (let y = 1; y < BOARD_SIDE_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        if (!occupied.has(`${x},${y}`)) {
          candidates.push({ x, y })
        }
      }
    }

    return candidates.length > 0 ? pickRandomIn(candidates) : null
  }

  private applyBossTestSetup(test: {
    ownerId: string
    lineup: IDetailledPokemon[]
    stageLevel?: number
  }) {
    const player = this.state.players.get(test.ownerId)
    if (!player) {
      logger.warn(`Boss test player not found: ${test.ownerId}`)
      return
    }

    if (!test.lineup || test.lineup.length === 0) {
      logger.warn("Boss test lineup is empty")
      return
    }

    this.applyCustomBoard(player, test.lineup)

    this.state.stageLevel = test.stageLevel ?? 49
    this.setMetadata({ stageLevel: this.state.stageLevel })
    this.state.phase = GamePhaseState.TOWN
    this.state.time = 0
  }

  private applyCustomBoard(player: Player, board: IDetailledPokemon[]) {
    player.board.clear()
    board.forEach((p) => {
      const pokemon = PokemonFactory.createPokemonFromName(p.name, p)
      pokemon.positionX = p.x
      pokemon.positionY = p.y
      p.items.forEach((item) => pokemon.items.add(item))
      player.board.set(pokemon.id, pokemon)
    })
    player.updateSynergies()
    player.boardSize = this.getTeamSize(player.board)
  }

  refreshPveBotOrder(pveBots: Player[], shuffle = false) {
    const botIds = pveBots.map((bot) => bot.id)
    if (shuffle) shuffleArray(botIds)
    resetArraySchema(this.state.pveBotOrder, botIds)
  }

  getPveBotLineup(botData: IBot | undefined, stageLevel: number) {
    if (!botData) return null
    if (botData.presetLineup && botData.presetLineup.length > 0) {
      return botData.presetLineup
    }
    if (!botData.steps || botData.steps.length === 0) return null

    let remainingRounds = Math.max(stageLevel, 1)
    let lastNonEmptyBoard: IDetailledPokemon[] | null = null
    for (const step of botData.steps) {
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
  }

  private isPveBotUsable(botData: IBot): boolean {
    if (botData.presetLineup && botData.presetLineup.length > 0) {
      return true
    }
    if (!botData.steps || botData.steps.length === 0) return false
    return botData.steps.some(
      (step) => step.board && step.board.length > 0
    )
  }

  triggerBossBattle(humanPlayers: Player[]) {
    // Find boss stage for current stage level
    const bossStage = PVEBossStages[this.state.stageLevel]

    if (!bossStage) {
      // No boss stage defined for this level, use regular matchups
      const matchups = selectMatchups(this.state)
      this.handleRegularMatchups(matchups)
      return
    }

    const difficultyMultiplier = getPveBossDifficultyMultiplier(
      this.state.pveDifficultyTier
    )

    // Create boss battle for each human player
    humanPlayers.forEach((humanPlayer) => {
      const bossBoard = PokemonFactory.makePveBoard(
        bossStage,
        this.state.shinyEncounter,
        this.state.townEncounter,
        difficultyMultiplier
      )

      const weather = getWeather(humanPlayer, null, bossBoard)
      const simulationId = nanoid()

      humanPlayer.simulationId = simulationId
      humanPlayer.team = Team.BLUE_TEAM
      humanPlayer.opponentId = "boss"
      humanPlayer.opponentName = bossStage.name
      humanPlayer.opponentAvatar = getAvatarString(
        PkmIndex[bossStage.avatar],
        this.state.shinyEncounter,
        bossStage.emotion
      )
      humanPlayer.opponentTitle = "BOSS"

      const simulation = new Simulation(
        simulationId,
        this,
        humanPlayer.board,
        bossBoard,
        humanPlayer,
        undefined,
        this.state.stageLevel,
        weather,
        false,
        true // isBossBattle
      )

      this.state.simulations.set(simulation.id, simulation)
      this.clock.setTimeout(() => {
        if (this.state) this.state.simulationPaused = false
        simulation.start()
      }, 2500)
    })
  }

  handlePveBossBattle() {
    const humanPlayers: Player[] = []
    this.state.players.forEach((player: Player) => {
      if (player.alive && !player.isBot) {
        humanPlayers.push(player)
      }
    })

    if (humanPlayers.length === 0) return
    this.triggerBossBattle(humanPlayers)
  }

  handleRegularMatchups(matchups: any[]) {
    matchups.forEach((matchup) => {
      const { bluePlayer, redPlayer, ghost } = matchup
      const weather = getWeather(bluePlayer, redPlayer, redPlayer.board, ghost)
      const simulationId = nanoid()

      bluePlayer.simulationId = simulationId
      bluePlayer.team = Team.BLUE_TEAM
      bluePlayer.opponents.set(
        redPlayer.id,
        (bluePlayer.opponents.get(redPlayer.id) ?? 0) + 1
      )
      bluePlayer.opponentId = redPlayer.id
      bluePlayer.opponentName = matchup.ghost
        ? `Ghost of ${redPlayer.name}`
        : redPlayer.name
      bluePlayer.opponentAvatar = redPlayer.avatar
      bluePlayer.opponentTitle = redPlayer.title ?? ""

      if (!matchup.ghost) {
        redPlayer.simulationId = simulationId
        redPlayer.team = Team.RED_TEAM
        redPlayer.opponents.set(
          bluePlayer.id,
          (redPlayer.opponents.get(bluePlayer.id) ?? 0) + 1
        )
        redPlayer.opponentId = bluePlayer.id
        redPlayer.opponentName = bluePlayer.name
        redPlayer.opponentAvatar = bluePlayer.avatar
        redPlayer.opponentTitle = bluePlayer.title ?? ""
      }

      const simulation = new Simulation(
        simulationId,
        this,
        bluePlayer.board,
        redPlayer.board,
        bluePlayer,
        redPlayer,
        this.state.stageLevel,
        weather,
        matchup.ghost,
        false // isBossBattle
      )

      this.state.simulations.set(simulation.id, simulation)
      this.clock.setTimeout(() => {
        if (this.state) this.state.simulationPaused = false
        simulation.start()
      }, 2500)
    })
  }

  spawnWanderingPokemons() {
    const isPVE = this.state.stageLevel in PVEStages

    this.state.players.forEach((player: Player) => {
      if (player.alive && !player.isBot) {
        const client = this.clients.find((cli) => cli.auth.uid === player.id)
        if (!client) return

        if (chance(UNOWN_ENCOUNTER_CHANCE)) {
          const pkm = pickRandomIn(Unowns)
          const shiny = chance(SHINY_UNOWN_ENCOUNTER_CHANCE)
          const id = nanoid()
          const wanderer = new Wanderer({
            id,
            pkm,
            shiny,
            type: WandererType.UNOWN,
            behavior: WandererBehavior.RUN_THROUGH
          })

          this.clock.setTimeout(
            () => player.wanderers.set(id, wanderer),
            Math.round((5 + 15 * Math.random()) * 1000)
          )
        }

        if (
          isPVE &&
          this.state.specialGameRule === SpecialGameRule.GOTTA_CATCH_EM_ALL
        ) {
          const nbPokemonsToSpawn = Math.ceil(this.state.stageLevel / 2)
          for (let i = 0; i < nbPokemonsToSpawn; i++) {
            const id = nanoid()
            const pkm = this.state.shop.pickPokemon(
              player,
              this.state,
              -1,
              true
            )
            const wanderer = new Wanderer({
              id,
              pkm,
              shiny: chance(0.01),
              type: WandererType.CATCHABLE,
              behavior: WandererBehavior.RUN_THROUGH
            })

            this.clock.setTimeout(
              () => player.wanderers.set(id, wanderer),
              4000 + i * 400
            )
          }
        }
      }
    })
  }

  spawnBabyEggs(player: Player, isPVE: boolean) {
    const hasBabyActive =
      player.effects.has(EffectEnum.HATCHER) ||
      player.effects.has(EffectEnum.BREEDER) ||
      player.effects.has(EffectEnum.GOLDEN_EGGS)
    const hasLostLastBattle =
      player.history.at(-1)?.result === BattleResult.DEFEAT
    const eggsOnBench = values(player.board).filter((p) => p.name === Pkm.EGG)
    const nbOfGoldenEggsOnBench = eggsOnBench.filter((p) => p.shiny).length
    let nbEggsFound = 0
    let goldenEggFound = false

    if (hasLostLastBattle && hasBabyActive) {
      const EGG_CHANCE = 0.1
      const GOLDEN_EGG_CHANCE = 0.05
      const playerEggChanceStacked = player.eggChance
      const playerGoldenEggChanceStacked = player.goldenEggChance
      const babies = values(player.board).filter(
        (p) => !isOnBench(p) && p.types.has(Synergy.BABY)
      )

      for (const baby of babies) {
        if (
          player.effects.has(EffectEnum.GOLDEN_EGGS) &&
          nbOfGoldenEggsOnBench === 0 &&
          chance(GOLDEN_EGG_CHANCE, baby)
        ) {
          nbEggsFound++
          goldenEggFound = true
        } else if (chance(EGG_CHANCE, baby)) {
          nbEggsFound++
        }
        if (player.effects.has(EffectEnum.GOLDEN_EGGS) && !goldenEggFound) {
          player.goldenEggChance += Math.max(
            0.1,
            Math.pow(GOLDEN_EGG_CHANCE, 1 - baby.luck / 200)
          )
        } else if (
          player.effects.has(EffectEnum.HATCHER) &&
          nbEggsFound === 0
        ) {
          player.eggChance += Math.max(
            0.2,
            Math.pow(EGG_CHANCE, 1 - baby.luck / 100)
          )
        }
      }

      // Second chance with chance stacked after lose streaks
      if (
        nbEggsFound === 0 &&
        (player.effects.has(EffectEnum.BREEDER) ||
          player.effects.has(EffectEnum.GOLDEN_EGGS) ||
          chance(playerEggChanceStacked))
      ) {
        nbEggsFound = 1 // baby >= 5 guarantees at least 1 egg after a defeat
      }
      if (
        goldenEggFound === false &&
        player.effects.has(EffectEnum.GOLDEN_EGGS) &&
        nbOfGoldenEggsOnBench === 0 &&
        chance(playerGoldenEggChanceStacked)
      ) {
        goldenEggFound = true
      }
    } else if (!isPVE) {
      // winning a PvP fight resets the stacked egg chance
      player.eggChance = 0
      player.goldenEggChance = 0
    }

    if (
      this.state.specialGameRule === SpecialGameRule.OMELETTE_COOK &&
      [2, 3, 4].includes(this.state.stageLevel)
    ) {
      nbEggsFound = 1
    }

    for (let i = 0; i < nbEggsFound; i++) {
      if (getFreeSpaceOnBench(player.board) === 0) continue
      const isGoldenEgg =
        goldenEggFound && i === 0 && nbOfGoldenEggsOnBench === 0
      giveRandomEgg(player, isGoldenEgg)
      if (player.effects.has(EffectEnum.HATCHER)) {
        player.eggChance = 0 // getting an egg resets the stacked egg chance
      }
      if (player.effects.has(EffectEnum.GOLDEN_EGGS) && isGoldenEgg) {
        player.goldenEggChance = 0 // getting a golden egg resets the stacked egg chance
      }
    }
  }
}
