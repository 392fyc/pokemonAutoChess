import { Room } from "colyseus";
import GameRoom from "../rooms/game-room";
import GameState from "../rooms/states/game-state";
import { GameMode, GamePhaseState } from "../types/enum/Game";
import { EloRank } from "../types/enum/EloRank";
import { Role } from "../types";
import Player from "../models/colyseus-models/player";
import { EloRankThreshold } from "../config/game/elo";
import BotManager from "../core/bot-manager";
import { OnUpdateCommand, OnUpdatePhaseCommand } from "../rooms/commands/game-commands";
import Simulation from "../core/simulation";

jest.mock("../core/simulation");

// Mock external dependencies
jest.mock("../rooms/states/game-state");
jest.mock("../models/colyseus-models/player");
jest.mock("../core/bot-manager");
jest.mock("../models/mongo-models/bot-v2", () => ({
  BotV2: {
    findOne: jest.fn(),
  },
}));
jest.mock("../core/bot", () => {
  const mockUpdateProgress = jest.fn();
  return jest.fn().mockImplementation((player) => {
    return {
      player,
      step: 0,
      progress: 0,
      scenario: {
        steps: [
          {
            board: [],
            roundsRequired: 1,
          },
        ],
      },
      initialize: jest.fn().mockResolvedValue(undefined),
      updateProgress: mockUpdateProgress,
      updatePlayerTeam: jest.fn(),
      updateFlowerPots: jest.fn(),
    };
  });
});

import { BotV2 } from "../models/mongo-models/bot-v2";
import Bot from "../core/bot";
import { Pkm } from "../types/enum/Pokemon";
import { PVEBossStages } from "../models/pve-boss-stages";

describe("GameRoom PVE Mode", () => {
  let room: GameRoom;
  let mockGameState: jest.Mocked<GameState>;
  let mockBotManager: jest.Mocked<BotManager>;

  beforeEach(() => {
    // Reset mocks before each test
    jest.mocked(GameState).mockClear();
    jest.mocked(Player).mockClear();
    (BotManager as jest.Mock).mockClear();

    // Create a mock BotManager instance
    mockBotManager = {
      addBot: jest.fn(),
      updateBots: jest.fn(),
      removeBot: jest.fn(),
      clearBots: jest.fn(),
      bots: [] as any[], // Add the missing 'bots' property
      // Add any other methods/properties that BotManager might have
    } as jest.Mocked<BotManager>;

    // Mock GameRoom's dispatcher
    room = new GameRoom();
    room.dispatcher = {
      dispatch: jest.fn(),
    } as any; // Mock dispatcher

    jest.mock("../rooms/commands/game-commands", () => ({
      OnUpdateCommand: jest.fn(),
      OnUpdatePhaseCommand: jest.fn(),
    }));

    // Mock the GameState constructor to return a controlled instance
    jest.mocked(GameState).mockImplementation(() => ({
      preparationId: "test_prep_id",
      name: "Test Room",
      noElo: false,
      gameMode: GameMode.PVE_MODE,
      minRank: null,
      maxRank: null,
      specialGameRule: null,
      pveDifficulty: EloRank.LEVEL_BALL,
      players: new Map(), // Mock players map
      botManager: mockBotManager, // Inject mock BotManager
      // Mock other GameState properties as needed
      avatars: new Map(),
      floatingItems: new Map(),
      portals: new Map(),
      symbols: new Map(),
      gameLoaded: false,
      shop: { addAdditionalPokemon: jest.fn(), assignShop: jest.fn(), addRegionalPokemon: jest.fn() },
      additionalPokemons: [],
    } as unknown as GameState));

    room = new GameRoom();
    room.presence = {
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
    } as any; // Mock presence
    room.clock = {
        setTimeout: jest.fn(),
        clearTimeout: jest.fn(),
    } as any; // Mock clock
    room.setMetadata = jest.fn(); // Mock setMetadata
    room.setSimulationInterval = jest.fn(); // Mock setSimulationInterval
    room.dispatcher = {
      dispatch: jest.fn(),
    } as any; // Mock dispatcher

    jest.mock("../rooms/commands/game-commands", () => ({
      OnUpdateCommand: jest.fn(),
      OnUpdatePhaseCommand: jest.fn(),
    }));
  });

  it("should initialize GameState with PVE_MODE and pveDifficulty", async () => {
    const pveDifficulty = EloRank.LEVEL_BALL;
    const users = {}; // No initial human users for PVE setup

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
      pveDifficulty,
    });

    expect(GameState).toHaveBeenCalledTimes(1);
    expect(GameState).toHaveBeenCalledWith(
      "prep123",
      "PVE Game",
      false,
      GameMode.PVE_MODE,
      null,
      null,
      pveDifficulty,
      null
    );
  });

  it("should add 8 PVE bots when in PVE_MODE", async () => {
    const pveDifficulty = EloRank.LEVEL_BALL;
    const users = {};

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
      pveDifficulty,
    });

    // Access the mocked GameState instance
    const gameStateInstance = jest.mocked(GameState).mock.results[0].value;

    expect(Player).toHaveBeenCalledTimes(8); // 8 bots should be created
    expect(mockBotManager.addBot).toHaveBeenCalledTimes(8); // 8 bots should be added to botManager
    expect(gameStateInstance.players.size).toBe(8); // 8 bots should be in players map

    // Verify properties of created bots
    for (let i = 0; i < 8; i++) {
      expect(Player).toHaveBeenCalledWith(
        `pve_bot_${i}`,
        `PVE Bot ${i + 1}`,
        EloRankThreshold[pveDifficulty], // EloRankThreshold[pveDifficulty]
        1,
        expect.any(String), // Random avatar
        true, // isBot should be true
        expect.any(Number), // Player size
        expect.any(Map), // Empty collection
        "",
        Role.BOT, // Role.BOT
        gameStateInstance
      );
    }
  });

  it("should not initialize additional Pokemon pools in PVE_MODE", async () => {
    const pveDifficulty = EloRank.LEVEL_BALL;
    const users = {};

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
      pveDifficulty,
    });

    // In PVE_MODE, these pools should remain empty or not be touched
    expect(room.additionalUncommonPool).toEqual([]);
    expect(room.additionalRarePool).toEqual([]);
    expect(room.additionalEpicPool).toEqual([]);
  });

  it("should not add bots from initial users list if gameMode is PVE_MODE", async () => {
    const pveDifficulty = EloRank.LEVEL_BALL;
    const users = {
      "bot1_id": { uid: "bot1_id", name: "Bot1", elo: 1000, games: 0, avatar: "bot_avatar", isBot: true, ready: false, title: "", role: Role.BOT, anonymous: false },
    };

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
      pveDifficulty,
    });

    // Access the mocked GameState instance
    const gameStateInstance = jest.mocked(GameState).mock.results[0].value;

    // The bot from the initial 'users' list should NOT be added
    // Only the 8 PVE-specific bots should be added
    expect(Player).toHaveBeenCalledTimes(8);
    expect(mockBotManager.addBot).toHaveBeenCalledTimes(8);
    expect(gameStateInstance.players.size).toBe(8);
    expect(gameStateInstance.players.get("bot1_id")).toBeUndefined();
  it("should handle PVE game progression and stage transitions", async () => {
    const pveDifficulty = EloRank.LEVEL_BALL;
    const users = {};

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
      pveDifficulty,
    });

    // Mock initial phase and stage
    room.state.phase = GamePhaseState.PICK;
    room.state.stageLevel = 0;
    room.state.roundTime = 10; // Set a short round time for testing

    // Access the mocked GameState instance
    const gameStateInstance = jest.mocked(GameState).mock.results[0].value;
    gameStateInstance.players.set('pve_bot_0', {} as Player); // Add a mock player to avoid errors

    // Mock dispatch calls
    const mockDispatch = room.dispatcher.dispatch as jest.Mock;

    // Simulate initial phase and time
    room.state.phase = GamePhaseState.TOWN;
    room.state.stageLevel = 0;
    room.state.time = 0; // Simulate time running out to trigger phase transition

    // Simulate first update (triggers TOWN -> PICK transition)
    await mockDispatch(new OnUpdateCommand(), { deltaTime: 1000 });
    expect(mockDispatch).toHaveBeenCalledWith(new OnUpdatePhaseCommand());
    expect(room.state.phase).toBe(GamePhaseState.PICK);
    expect(room.state.stageLevel).toBe(0); // Stage level doesn't advance yet

    mockDispatch.mockClear(); // Clear mock calls for the next phase

    // Simulate second update (triggers PICK -> FIGHT transition)
    room.state.time = 0; // Time runs out for PICK phase
    await mockDispatch(new OnUpdateCommand(), { deltaTime: 1000 });
    expect(mockDispatch).toHaveBeenCalledWith(new OnUpdatePhaseCommand());
    expect(room.state.phase).toBe(GamePhaseState.FIGHT);
    expect(room.state.stageLevel).toBe(1); // Stage level advances

    mockDispatch.mockClear(); // Clear mock calls for the next phase

    // Simulate third update (triggers FIGHT -> TOWN transition)
    room.state.time = 0; // Time runs out for FIGHT phase
    await mockDispatch(new OnUpdateCommand(), { deltaTime: 1000 });
    expect(mockDispatch).toHaveBeenCalledWith(new OnUpdatePhaseCommand());
    expect(room.state.phase).toBe(GamePhaseState.TOWN);
    expect(room.state.stageLevel).toBe(1); // Stage level remains the same until all fights are done

  });

  it("should set isBossBattle to true in Simulation constructor for a boss stage", async () => {
    const pveDifficulty = EloRank.LEVEL_BALL;
    const users = {};

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
      pveDifficulty,
    });

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
          roundsRequired: 1,
        },
        {
          board: PVEBossStages[1].board.map(([pkm, x, y]) => ({ name: pkm, x, y, items: [] })),
          roundsRequired: 1, // Boss battle at this step
        },
      ],
    });

    // Access the mocked GameState instance
    const gameStateInstance = jest.mocked(GameState).mock.results[0].value;
    gameStateInstance.players.set('pve_bot_0', {} as Player); // Add a mock player to avoid errors

    // Mock the Bot class to control its updateProgress
    const mockBotInstance = new Bot(new Player("test_id", "test_name", 0, 0, "avatar"));
    mockBotInstance.scenario = {
      steps: [
        {
          board: [], roundsRequired: 1
        },
        {
          board: PVEBossStages[1].board.map(([pkm, x, y]) => ({ name: pkm, x, y, items: [] })),
          roundsRequired: 1,
        },
      ],
    };
    mockBotInstance.step = 1; // Manually set to the boss stage step

    // Manually set stageLevel to simulate reaching the boss stage
    gameStateInstance.stageLevel = 40; // Assuming stage 40 is a boss stage
    gameStateInstance.phase = GamePhaseState.FIGHT; // Set phase to fight to trigger simulation

    // Need to mock the player on the simulation as well
    const mockPlayer = new Player("player_id", "Player 1", 1000, 1, "avatar", false, 1, new Map(), "", Role.PLAYER, gameStateInstance);
    gameStateInstance.players.set("player_id", mockPlayer);

    // Simulate triggering the simulation for the boss battle
    // This typically happens in initializeFightingPhase, which is part of OnUpdateCommand
    // We'll directly call update on the room's state, and ensure Simulation is called
    await room.dispatcher.dispatch(new OnUpdateCommand(), { deltaTime: 1000 });

    expect(Simulation).toHaveBeenCalledTimes(1);
    // Check that the last argument to the Simulation constructor is isBossBattle: true
    const lastCallArgs = jest.mocked(Simulation).mock.calls[0];
    expect(lastCallArgs[lastCallArgs.length - 1]).toBe(true);
  });
});
