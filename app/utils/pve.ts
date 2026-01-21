import { EloRank } from "../types/enum/EloRank"
import { PveDifficulty } from "../types/enum/Game"

export function mapPveDifficultyToEloRank(
  difficulty: PveDifficulty
): EloRank {
  switch (difficulty) {
    case PveDifficulty.EASY:
      return EloRank.LEVEL_BALL
    case PveDifficulty.NORMAL:
      return EloRank.POKE_BALL
    case PveDifficulty.HARD:
      return EloRank.ULTRA_BALL
    case PveDifficulty.EXTREME:
      return EloRank.MASTER_BALL
    default:
      return EloRank.POKE_BALL
  }
}

export function getPveBossDifficultyMultiplier(
  difficulty: PveDifficulty | null
): number {
  switch (difficulty) {
    case PveDifficulty.EASY:
      return 0.8
    case PveDifficulty.NORMAL:
      return 1.0
    case PveDifficulty.HARD:
      return 1.2
    case PveDifficulty.EXTREME:
      return 1.5
    default:
      return 1.0
  }
}

export function isPveBotId(id: string): boolean {
  return id.startsWith("pve_bot_")
}
