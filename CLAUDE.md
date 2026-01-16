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

## Windows Environment Notes

### Path Handling
- **Use forward slashes** in paths: `E:/PokeAutoChess/` instead of `E:\PokeAutoChess\`
- **Bash commands may fail** with Windows paths; use MCP filesystem tools instead:
  - `mcp__filesystem__list_directory` instead of `ls`
  - `mcp__filesystem__read_file` instead of `cat`
- When Bash path errors occur, switch to MCP filesystem tools immediately

### Command Execution Priority
1. Try `pnpm <command>` first
2. If pnpm unavailable, try `npm run <command>`
3. If npm script missing, try `npx <tool>` directly
4. For directory listing, prefer MCP filesystem over Bash `ls`

## Common Development Commands
- `pnpm dev` - Start client and server in development mode.
- `pnpm build` - Build both client and server for production.
- `pnpm lint` - Perform code linting.
- `pnpm typecheck` - Perform TypeScript type checking.

### Fallback Commands (if pnpm unavailable)
- `pnpm typecheck` → `npx tsc --noEmit`
- `pnpm lint` → `npx eslint .` or `npx @biomejs/biome lint .`
- `pnpm test` → `npm test` or `npx jest`
- `pnpm build` → `npm run build`

## Testing Commands
- `pnpm test` - Run unit tests

## Verification Methods
- After frontend changes, run `pnpm build` to confirm no compilation errors
- After API changes, run `pytest tests/` to confirm tests pass

## Code Modification Guidelines

### CRITICAL: When Merging Nested If Statements
When merging nested `if` statements into a single condition:
1. **Count the closing braces** before and after modification
2. **Remove exactly one `}`** for each `if` removed
3. **Verify indentation** matches the new structure
4. **Run typecheck immediately** after the change

Example - WRONG:
```typescript
// Before: 2 if statements = 2 closing braces
if (a) {
  if (b) {
    doSomething()
  }
}

// After merge - WRONG (kept both braces)
if (a && b) {
  doSomething()
}
}  // <- Extra brace causes error!
```

Example - CORRECT:
```typescript
// After merge - CORRECT (removed one brace)
if (a && b) {
  doSomething()
}
```

### Before Modifying Code
1. **Check file/directory exists** before importing or referencing
2. **Verify module types are installed** (check for @types/* packages)
3. **Read the full context** around the lines being modified

### After Modifying Code
1. **Run typecheck immediately**: `npx tsc --noEmit`
2. **If errors occur**, fix them before proceeding to next change
3. **Do not accumulate multiple changes** without verification

## Git Workflow

### Commit Message Convention
- feat: New feature
- fix: Bug fix
- chore: Miscellaneous (build, config, etc.)
- docs: Documentation update
- refactor: Code refactoring
- test: Test related
- style: Code formatting (no functional change)

### Merge Conflict Resolution
1. **Business code conflicts**: Analyze carefully, preserve valuable changes from both sides
2. **Lock file conflicts** (package-lock.json, pnpm-lock.yaml):
   - Use `git checkout --theirs <file>` or `git checkout --ours <file>`
   - Then run `pnpm install` to regenerate
3. **Generated file conflicts** (dist/, build/, *.meta.json):
   - Usually accept upstream version
   - Or delete and rebuild

### Pre-commit Checklist
After completing a task, always verify:
1. `git status` - Confirm no uncommitted changes
2. `git log -3` - Confirm commit history is correct
3. If untracked files exist, decide whether to add to .gitignore

## Large File Handling

**Do NOT attempt to read these files directly:**
- package-lock.json
- pnpm-lock.yaml
- yarn.lock
- *.min.js
- Files under dist/ directory
- Anything under node_modules/

**Handling strategy:**
- Use git commands instead of reading content
- Use `head -100 <file>` to view partial content if needed

## Dependency Management

### When Type Errors Occur for External Modules
1. Check if the module is in `dependencies` in package.json
2. Check if `@types/<module>` exists in `devDependencies`
3. If types missing, install: `npm install -D @types/<module>`
4. If no @types package exists, create a `.d.ts` declaration file

### Common Type Packages
- `@types/react`
- `@types/node`
- `@types/html2canvas`
- Check https://www.npmjs.com/~types for available type packages

## Task Execution Principles

1. **Autonomous execution**: Complete all steps independently unless encountering destructive operations or uncertainty
2. **Error recovery**: Attempt self-repair when errors occur, rather than stopping to ask
3. **Incremental verification**: Run typecheck after EACH code change, not at the end
4. **Minimize interruptions**: Follow user's overall requirements, reduce mid-task confirmations
5. **Completeness check**: Verify all steps are completed before ending task

## Common Mistakes (Continuously Updated)

### TypeScript/React
- ❌ Do not call async functions directly in useEffect
- ❌ Do not use any type
- ❌ Do not create new objects/functions in render
- ❌ Do not merge if statements without removing corresponding braces
- ✅ Use useMemo/useCallback to optimize performance
- ✅ Count braces before and after refactoring

### Git
- ❌ Do not force push to shared branches
- ❌ Do not commit .env files
- ✅ Check git status before committing
- ✅ Verify final state after merge operations

### Windows Environment
- ❌ Do not use backslash paths in Bash commands
- ❌ Do not rely on `ls` command for directory listing
- ✅ Use MCP filesystem tools for file operations
- ✅ Use forward slashes in all paths