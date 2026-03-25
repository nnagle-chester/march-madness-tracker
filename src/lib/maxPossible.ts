import { PLAYERS, ROUND_POINTS, GameResult, getTeamInfo } from "@/data/teams";
import { PlayerScore } from "@/lib/scoring";
import { ForecastResult } from "@/lib/simulation/types";

export interface MaxPossibleResult {
  playerName: string;
  currentPoints: number;
  maxRemaining: number;
  maxPossible: number;
  isContender: boolean;
}

export function calculateMaxPossible(
  playerScores: PlayerScore[],
  results: GameResult[]
): MaxPossibleResult[] {
  const leaderPoints = playerScores.length > 0 ? playerScores[0].totalPoints : 0;

  // Determine the highest round completed
  const completedRounds = new Set(results.filter((r) => r.round >= 1).map((r) => r.round));
  const eliminatedTeams = new Set(results.filter((r) => r.round >= 1).map((r) => r.loser));

  return playerScores.map((ps) => {
    let maxRemaining = 0;

    for (const ts of ps.teamScores) {
      if (ts.eliminated) continue;

      // For each alive team, assume they win every remaining game through championship
      const teamInfo = getTeamInfo(ts.teamName);
      if (!teamInfo) continue;

      // Determine which round this team is currently in
      // A team that hasn't been eliminated and has won in round N is now in round N+1
      const teamWins = results.filter(
        (r) => r.winner === ts.teamName && r.round >= 1
      );
      const highestWinRound = teamWins.length > 0
        ? Math.max(...teamWins.map((r) => r.round))
        : 0;
      const nextRound = highestWinRound + 1;

      // Calculate max remaining points: win every game from nextRound through championship (round 6)
      for (let round = nextRound; round <= 6; round++) {
        const basePoints = ROUND_POINTS[round] || 0;
        // Max upset bonus: assume opponent is seed 1, so bonus = teamSeed - 1
        const maxUpsetBonus = teamInfo.seed > 1 ? teamInfo.seed - 1 : 0;
        maxRemaining += basePoints + maxUpsetBonus;
      }
    }

    const maxPossible = ps.totalPoints + maxRemaining;

    return {
      playerName: ps.playerName,
      currentPoints: ps.totalPoints,
      maxRemaining,
      maxPossible,
      isContender: maxPossible >= leaderPoints,
    };
  });
}

/**
 * Create MaxPossibleResult[] from simulation-backed forecast data.
 * This replaces the broken rough max with accurate simulation results.
 */
export function mergeSimulationMax(
  playerScores: PlayerScore[],
  forecasts: ForecastResult[]
): MaxPossibleResult[] {
  const leaderPoints = playerScores.length > 0 ? playerScores[0].totalPoints : 0;
  const forecastMap = new Map<string, ForecastResult>();
  for (const f of forecasts) {
    forecastMap.set(f.playerName, f);
  }

  return playerScores.map((ps) => {
    const f = forecastMap.get(ps.playerName);
    const maxPossible = f?.maxPossible ?? ps.totalPoints;
    return {
      playerName: ps.playerName,
      currentPoints: ps.totalPoints,
      maxRemaining: maxPossible - ps.totalPoints,
      maxPossible,
      isContender: maxPossible >= leaderPoints,
    };
  });
}
