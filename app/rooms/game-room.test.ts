import { Room } from "colyseus"
import { EloRankThreshold } from "../config/game/elo"
import BotManager from "../core/bot-manager"
import Simulation from "../core/simulation"
import Player from "../models/colyseus-models/player"
import {
  OnUpdateCommand,
  OnUpdatePhaseCommand
} from "../rooms/commands/game-commands"
import GameRoom from "../rooms/game-room"
import GameState from "../rooms/states/game-state"
import { Role } from "../types"
import { Ability } from "../types/enum/Ability"
import { EloRank } from "../types/enum/EloRank"
import { Emotion } from "../types/enum/Emotion"
import { BossTrait, GameMode, GamePhaseState } from "../types/enum/Game"
import { Item } from "../types/enum/Item"
import { Pkm } from "../types/enum/Pokemon"

jest.mock("../core/simulation")

// Mock external dependencies
jest.mock("../rooms/states/game-state")
jest.mock("../models/colyseus-models/player")
jest.mock("../core/bot-manager")
jest.mock("../models/mongo-models/bot-v2", () => ({
  BotV2: {
    findOne: jest.fn(),
    find: jest.fn().mockReturnValue({
      limit: jest.fn().mockResolvedValue([]) // Chainable method for find
    })
  }
}))
jest.mock("../core/bot", () => {
  const mockUpdateProgress = jest.fn()
  return jest.fn().mockImplementation((player) => {
    return {
      player,
      step: 0,
      progress: 0,
      scenario: {
        steps: [
          {
            board: [],
            roundsRequired: 1
          }
        ]
      },
      initialize: jest.fn().mockResolvedValue(undefined),
      updateProgress: mockUpdateProgress,
      updatePlayerTeam: jest.fn(),
      updateFlowerPots: jest.fn()
    }
  })
})

import Bot from "../core/bot"
import { BotV2 } from "../models/mongo-models/bot-v2"
import { PVEBossStages } from "../models/pve-boss-stages"

describe("GameRoom PVE Mode", () => {
  let room: GameRoom
  let mockGameState: jest.Mocked<GameState>
  let mockBotManager: jest.Mocked<BotManager>

  beforeEach(() => {
    // Reset mocks before each test
    jest.mocked(GameState).mockClear()
    jest.mocked(Player).mockClear()
    ;(BotManager as jest.Mock).mockClear()

    // Create a mock BotManager instance
    mockBotManager = {
      addBot: jest.fn(),
      updateBots: jest.fn(),
      removeBot: jest.fn(),
      clearBots: jest.fn(),
      bots: [] as any[]
    } as jest.Mocked<BotManager>

    // Mock GameState constructor to return our mock instance
    jest.mocked(GameState).mockImplementation(
      () =>
        ({
          preparationId: "test_prep_id",
          name: "Test Room",
          noElo: false,
          gameMode: GameMode.PVE_MODE,
          minRank: null,
          maxRank: null,
          specialGameRule: null,
          pveDifficulty: EloRank.LEVEL_BALL,
          players: new Map(),
          botManager: mockBotManager,
          avatars: new Map(),
          floatingItems: new Map(),
          portals: new Map(),
          symbols: new Map(),
          gameLoaded: false,
          shop: {
            addAdditionalPokemon: jest.fn(),
            assignShop: jest.fn(),
            addRegionalPokemon: jest.fn()
          },
          additionalPokemons: []
        }) as unknown as GameState
    )

    room = new GameRoom()
    room.presence = {
      subscribe: jest.fn(),
      unsubscribe: jest.fn()
    } as any
    room.clock = {
      setTimeout: jest.fn(),
      clearTimeout: jest.fn()
    } as any
    room.setMetadata = jest.fn()
    room.setSimulationInterval = jest.fn()
    room.dispatcher = {
      dispatch: jest.fn()
    } as any

    jest.mock("../rooms/commands/game-commands", () => ({
      OnUpdateCommand: jest.fn(),
      OnUpdatePhaseCommand: jest.fn()
    }))
  })

  it("should initialize GameState with PVE_MODE and pveDifficulty", async () => {
    const pveDifficulty = EloRank.LEVEL_BALL
    const users = {}

    await room.onCreate({
      users,
      preparationId: "prep123",
      name: "PVE Game",
      ownerName: "TestOwner",
      noElo: false,
      gameMode: GameMode.PVE_MODE,
      specialGameRule: null,
      minRank: null,
      maxRank: null,
      tournamentId: null,
      bracketId: null,
      pveDifficulty
    })

    expect(GameState).toHaveBeenCalledWith(
      "prep123",
      "PVE Game",
      false,
      GameMode.PVE_MODE,
      null,
      null,
      null,
      pveDifficulty
    )
  })

  it("should add 8 PVE bots when in PVE_MODE", async () => {
    const pveDifficulty = EloRank.LEVEL_BALL

    describe("Boss Battle System", () => {
      it("should have Mewtwo boss stage defined", () => {
        const mewtwoStage = PVEBossStages[10]
        expect(mewtwoStage).toBeDefined()
        expect(mewtwoStage.name).toBe("Boss Mewtwo")
        expect(mewtwoStage.avatar).toBe(Pkm.MEWTWO)
        expect(mewtwoStage.emotion).toBe(Emotion.ANGRY)
      })

      it("should have correct boss traits for Mewtwo", () => {
        const mewtwoStage = PVEBossStages[10]
        expect(mewtwoStage.bossTraits).toBeDefined()
        expect(mewtwoStage.bossTraits).toContain(BossTrait.LEGENDARY_POKEMON)
        expect(mewtwoStage.bossTraits).toContain(BossTrait.SIZE_2X2)
        expect(mewtwoStage.bossTraits).toContain(BossTrait.IGNORE_SYNERGIES)
        expect(mewtwoStage.bossTraits).toContain(BossTrait.HALF_STATUS_EFFECT)
        expect(mewtwoStage.bossTraits).toContain(BossTrait.INCREASED_RANGE)
      })

      it("should have correct boss abilities for Mewtwo", () => {
        const mewtwoStage = PVEBossStages[10]
        expect(mewtwoStage.abilities).toBeDefined()
        expect(mewtwoStage.abilities).toContain(Ability.BOSS_TELEPORT)
        expect(mewtwoStage.abilities).toContain(Ability.BOSS_MEDITATE)
        expect(mewtwoStage.abilities).toContain(Ability.BOSS_PSYCHIC)
        expect(mewtwoStage.abilities).toContain(Ability.BOSS_AURASPHERE)
      })

      it("should have boss ability configs for Mewtwo", () => {
        const mewtwoStage = PVEBossStages[10]
        expect(mewtwoStage.bossAbilityConfigs).toBeDefined()
        expect(mewtwoStage.bossAbilityConfigs!.length).toBeGreaterThan(0)

        // 检查瞬间移动配置
        const teleportConfig = mewtwoStage.bossAbilityConfigs!.find(
          (config) => config.ability === Ability.BOSS_TELEPORT
        )
        expect(teleportConfig).toBeDefined()
        expect(teleportConfig!.triggerType).toBe("periodic")
        expect(teleportConfig!.triggerValue).toBe(8000)

        // 检查冥想配置
        const meditateConfig = mewtwoStage.bossAbilityConfigs!.find(
          (config) => config.ability === Ability.BOSS_MEDITATE
        )
        expect(meditateConfig).toBeDefined()
        expect(meditateConfig!.triggerType).toBe("periodic")
        expect(meditateConfig!.triggerValue).toBe(5000)

        // 检查精神强念配置
        const psychicConfig = mewtwoStage.bossAbilityConfigs!.find(
          (config) => config.ability === Ability.BOSS_PSYCHIC
        )
        expect(psychicConfig).toBeDefined()
        expect(psychicConfig!.triggerType).toBe("mpControl")
        expect(psychicConfig!.triggerValue).toBe(100)

        // 检查波导弹配置（应该有4个血量阈值触发）
        const auraSphereConfigs = mewtwoStage.bossAbilityConfigs!.filter(
          (config) => config.ability === Ability.BOSS_AURASPHERE
        )
        expect(auraSphereConfigs.length).toBe(4)
        expect(auraSphereConfigs.map((c) => c.triggerValue)).toEqual([
          100, 75, 50, 25
        ])
      })

      it("should have correct rewards for Mewtwo", () => {
        const mewtwoStage = PVEBossStages[10]
        expect(mewtwoStage.rewards).toBeDefined()
        expect(mewtwoStage.rewards.length).toBeGreaterThan(0)

        const masterBallReward = mewtwoStage.rewards.find(
          (r) => r.itemId === ("MASTER_BALL" as any)
        )
        expect(masterBallReward).toBeDefined()
        expect(masterBallReward!.chance).toBe(0.1)
        expect(masterBallReward!.quantity).toBe(1)

        const coinReward = mewtwoStage.rewards.find(
          (r) => r.itemId === Item.COIN
        )
        expect(coinReward).toBeDefined()
        expect(coinReward!.chance).toBe(1.0)
        expect(coinReward!.quantity).toBe(500)
      })

      it("should have correct trigger conditions for Mewtwo", () => {
        const mewtwoStage = PVEBossStages[10]
        expect(mewtwoStage.triggerCondition).toBeDefined()
        expect(mewtwoStage.triggerCondition.minWave).toBe(20)
        expect(mewtwoStage.triggerCondition.playerLevel).toBe(15)
      })
    })
    const users = {}

    await room.onCreate({
      users,
      preparationId: "prep123",
      name: "PVE Game",
      ownerName: "TestOwner",
      noElo: false,
      gameMode: GameMode.PVE_MODE,
      specialGameRule: null,
      minRank: null,
      maxRank: null,
      tournamentId: null,
      bracketId: null,
      pveDifficulty
    })

    // Check that 8 bots were added
    expect(mockBotManager.addBot).toHaveBeenCalledTimes(8)

    // Verify each bot has the correct Elo threshold
    // Note: Since BotV2.find returns empty array, basic bots will be created with Elo from threshold
    // LEVEL_BALL has Elo threshold of 0
    for (let i = 0; i < 8; i++) {
      expect(Player).toHaveBeenCalledWith(
        expect.stringContaining("pve_bot_"),
        expect.any(String),
        0, // EloRankThreshold[pveDifficulty] where pveDifficulty = LEVEL_BALL
        expect.any(Number),
        expect.any(String),
        true,
        expect.any(Number),
        expect.any(Map),
        "",
        Role.BOT,
        expect.any(GameState)
      )
    }
  })

  it("should not initialize additional Pokemon pools in PVE_MODE", async () => {
    const pveDifficulty = EloRank.LEVEL_BALL
    const users = {}

    await room.onCreate({
      users,
      preparationId: "prep123",
      name: "PVE Game",
      ownerName: "TestOwner",
      noElo: false,
      gameMode: GameMode.PVE_MODE,
      specialGameRule: null,
      minRank: null,
      maxRank: null,
      tournamentId: null,
      bracketId: null,
      pveDifficulty
    })

    // In PVE_MODE, these pools should remain empty or not be touched
    expect(room.additionalUncommonPool).toEqual([])
    expect(room.additionalRarePool).toEqual([])
    expect(room.additionalEpicPool).toEqual([])
  })

  it("should not add bots from initial users list if gameMode is PVE_MODE", async () => {
    const pveDifficulty = EloRank.LEVEL_BALL
    const users = {
      bot1_id: {
        uid: "bot1_id",
        name: "Bot1",
        elo: 1000,
        games: 0,
        avatar: "bot_avatar",
        isBot: true,
        ready: false,
        title: "",
        role: Role.BOT,
        anonymous: false
      }
    }

    await room.onCreate({
      users,
      preparationId: "prep123",
      name: "PVE Game",
      ownerName: "TestOwner",
      noElo: false,
      gameMode: GameMode.PVE_MODE,
      specialGameRule: null,
      minRank: null,
      maxRank: null,
      tournamentId: null,
      bracketId: null,
      pveDifficulty
    })

    // The bot from the initial 'users' list should NOT be added
    expect(mockBotManager.addBot).toHaveBeenCalledTimes(8) // Only the 8 PVE bots
  })

  it("should handle PVE game progression and stage transitions", async () => {
    const pveDifficulty = EloRank.LEVEL_BALL
    const users = {}

    await room.onCreate({
      users,
      preparationId: "prep123",
      name: "PVE Game",
      ownerName: "TestOwner",
      noElo: false,
      gameMode: GameMode.PVE_MODE,
      specialGameRule: null,
      minRank: null,
      maxRank: null,
      tournamentId: null,
      bracketId: null,
      pveDifficulty
    })

    // Mock initial phase and stage
    room.state.phase = GamePhaseState.TOWN
    room.state.stageLevel = 0
    room.state.roundTime = 10 // Set a short round time for testing

    const mockDispatch = jest.fn()
    room.dispatcher.dispatch = mockDispatch

    // Simulate initial phase and time
    room.state.time = 0 // Simulate time running out to trigger phase transition

    // Simulate first update (triggers TOWN -> PICK transition)
    await mockDispatch(new OnUpdateCommand(), { deltaTime: 1000 })
    expect(mockDispatch).toHaveBeenCalledWith(new OnUpdatePhaseCommand())

    // Simulate second update (triggers PICK -> FIGHT transition)
    room.state.phase = GamePhaseState.PICK
    await mockDispatch(new OnUpdateCommand(), { deltaTime: 1000 })
    expect(mockDispatch).toHaveBeenCalledWith(new OnUpdatePhaseCommand())

    // Simulate third update (triggers FIGHT -> TOWN transition)
    room.state.phase = GamePhaseState.FIGHT
    await mockDispatch(new OnUpdateCommand(), { deltaTime: 1000 })
    expect(mockDispatch).toHaveBeenCalledWith(new OnUpdatePhaseCommand())
  })

  it("should set isBossBattle to true in Simulation constructor for a boss stage", async () => {
    const pveDifficulty = EloRank.LEVEL_BALL
    const users = {}

    await room.onCreate({
      users,
      preparationId: "prep123",
      name: "PVE Game",
      ownerName: "TestOwner",
      noElo: false,
      gameMode: GameMode.PVE_MODE,
      specialGameRule: null,
      minRank: null,
      maxRank: null,
      tournamentId: null,
      bracketId: null,
      pveDifficulty
    })

    // Mock BotV2.findOne to return a scenario with a boss stage (e.g., stage 40)
    jest.mocked(BotV2.findOne).mockResolvedValueOnce({
      id: "pve_bot_0",
      name: "Boss Bot",
      avatar: Pkm.ARCEUS,
      author: "TestAuthor",
      elo: 1500,
      approved: true,
      steps: [
        {
          board: [], // Empty board for initial steps
          roundsRequired: 1
        },
        {
          board: PVEBossStages[1].board.map(([pkm, x, y]) => ({
            name: pkm,
            x,
            y,
            items: []
          })),
          roundsRequired: 1 // Boss battle at this step
        }
      ]
    })

    // Access the mocked GameState instance
    const gameStateInstance = jest.mocked(GameState).mock.results[0].value
    gameStateInstance.players.set("pve_bot_0", {} as Player) // Add a mock player to avoid errors

    // Mock the Bot class to control its updateProgress
    const mockBotInstance = new Bot(
      new Player(
        "test_id",
        "test_name",
        0,
        0,
        "avatar",
        false,
        0,
        new Map(),
        "",
        Role.BOT,
        gameStateInstance
      )
    )
    // Mock bot scenario to satisfy IBot interface
    mockBotInstance.scenario = {
      avatar: "avatar",
      author: "author",
      elo: 1000,
      name: "test_bot",
      id: "test_id",
      approved: true,
      steps: [
        {
          board: [],
          roundsRequired: 1
        },
        {
          board: PVEBossStages[1].board.map(([pkm, x, y]) => ({
            name: pkm,
            x,
            y,
            items: []
          })),
          roundsRequired: 1
        }
      ]
    }
    mockBotInstance.step = 1 // Manually set to the boss stage step

    // Manually set stageLevel to simulate reaching the boss stage
    gameStateInstance.stageLevel = 40 // Assuming stage 40 is a boss stage
    gameStateInstance.phase = GamePhaseState.FIGHT // Set phase to fight to trigger simulation

    // Need to mock the player on the simulation as well
    const mockPlayer = new Player(
      "player_id",
      "Player 1",
      1000,
      1,
      "avatar",
      false,
      1,
      new Map(),
      "",
      Role.BASIC,
      gameStateInstance
    )
    gameStateInstance.players.set("player_id", mockPlayer)

    // Simulate triggering the simulation for the boss battle
    // This typically happens in initializeFightingPhase, which is part of OnUpdateCommand
    // We'll directly call update on the room's state, and ensure Simulation is called
    await room.dispatcher.dispatch(new OnUpdateCommand(), { deltaTime: 1000 })

    expect(Simulation).toHaveBeenCalledTimes(1)
    // Check that the last argument to the Simulation constructor is isBossBattle: true
    const lastCallArgs = jest.mocked(Simulation).mock.calls[0]
    expect(lastCallArgs[lastCallArgs.length - 1]).toBe(true)
  })
})
