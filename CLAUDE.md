# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Project: Smart Insights

## Architecture Overview
- Frontend: React + TypeScript (with Esbuild for bundling) + Ant Design
- Backend: FastAPI + LangGraph for general services, with Colyseus (Node.js) for real-time game logic and state synchronization.
- Database: PostgreSQL + Redis
- Core Game Logic (`app/core/`): Handles Pokemon entities, game mechanics (abilities, effects, items, board, collection), game flow, state management, and AI/bot logic.
- Data Models (`app/models/`): Includes Colyseus models for real-time player and game state synchronization.
- Networking and Game Rooms (`app/rooms/`): `game-room.ts` manages game instances; `commands/game-commands.ts` implements the Command pattern for in-game actions.
- Frontend State Management (`app/public/src/stores/`): `GameStore.ts` manages client-side UI state.

## Development Guidelines
- Use pnpm instead of npm
- TypeScript strict mode
- Functional components + Hooks
- API routes follow RESTful naming
- Run `pnpm format` regularly to ensure consistent code style.

## Common Mistakes (Continuously Updated)
- ❌ Do not call async functions directly in useEffect
- ❌ Do not use any type
- ❌ Do not create new objects/functions in render
- ✅ Use useMemo/useCallback to optimize performance

## Common Development Commands
- `pnpm dev` - Start client and server in development mode.
- `pnpm build` - Build both client and server for production.
- `pnpm lint` - Perform code linting.
- `pnpm typecheck` - Perform TypeScript type checking.

## Testing Commands
- `pnpm test` - Run unit tests

## Verification Methods
- After frontend changes, run `pnpm build` to confirm no compilation errors
- After API changes, run `pytest tests/` to confirm tests pass