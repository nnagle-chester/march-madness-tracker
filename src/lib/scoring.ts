import {
  PLAYERS,
  ROUND_POINTS,
  GameResult,
  getTeamOwner,
  getTeamInfo,
  Player,
} from "@/data/teams";

export interface TeamScore {
  teamName: string;
  seed: number;
  region: string;
  eliminated: boolean;
  eliminatedRound?: number;
  pointsByRound: Record<number, number>;
  totalPoints: number;
}

export interface PlayerScore {
  playerName: string;
  color: string;
  totalPoints: number;
  pointsByRound: Record<number, number>;
  teamsAlive: number;
  teamScores: TeamScore[];
  rank: number;
  previousRank?: number;
}

export function calculateUpsetBonus(winnerSeed: number, loserSeed: number): number {
  if (winnerSeed > loserSeed) {
    return winnerSeed - loserSeed;
  }
  return 0;
}

export function calculateGamePoints(
  round: number,
  winnerName: string,
  loserName: string
): { basePoints: number; upsetBonus: number; totalPoints: number } {
  const basePoints = ROUND_POINTS[round] || 0;
  const winnerInfo = getTeamInfo(winnerName);
  const loserInfo = getTeamInfo(loserName);

  let upsetBonus = 0;
  if (winnerInfo && loserInfo) {
    upsetBonus = calculateUpsetBonus(winnerInfo.seed, loserInfo.seed);
  }

  return {
    basePoints,
    upsetBonus,
    totalPoints: basePoints + upsetBonus,
  };
}

export function calculateScores(results: GameResult[]): PlayerScore[] {
  // Filter out First Four / round 0 games — they don't count for scoring
  const scoringResults = results.filter((r) => r.round >= 1);

  // Track eliminated teams (only from actual tournament rounds)
  const eliminatedTeams = new Set<string>();
  const eliminatedRound: Record<string, number> = {};

  for (const result of scoringResults) {
    if (result.loser) {
      eliminatedTeams.add(result.loser);
      eliminatedRound[result.loser] = result.round;
    }
  }

  const playerScores: PlayerScore[] = PLAYERS.map((player: Player) => {
    const teamScores: TeamScore[] = player.teams.map((team) => {
      const isEliminated = eliminatedTeams.has(team.name);
      const pointsByRound: Record<number, number> = {};
      let totalPoints = 0;

      // Calculate points for each game this team won
      for (const result of scoringResults) {
        if (result.winner === team.name) {
          const { totalPoints: gamePoints } = calculateGamePoints(
            result.round,
            result.winner,
            result.loser
          );
          pointsByRound[result.round] = (pointsByRound[result.round] || 0) + gamePoints;
          totalPoints += gamePoints;
        }
      }

      return {
        teamName: team.name,
        seed: team.seed,
        region: team.region,
        eliminated: isEliminated,
        eliminatedRound: isEliminated ? eliminatedRound[team.name] : undefined,
        pointsByRound,
        totalPoints,
      };
    });

    const pointsByRound: Record<number, number> = {};
    let totalPoints = 0;
    let teamsAlive = 0;

    for (const ts of teamScores) {
      totalPoints += ts.totalPoints;
      if (!ts.eliminated) teamsAlive++;
      for (const [round, pts] of Object.entries(ts.pointsByRound)) {
        const r = parseInt(round);
        pointsByRound[r] = (pointsByRound[r] || 0) + pts;
      }
    }

    return {
      playerName: player.name,
      color: player.color,
      totalPoints,
      pointsByRound,
      teamsAlive,
      teamScores,
      rank: 0,
    };
  });

  // Sort by total points desc, then teams alive desc
  playerScores.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    return b.teamsAlive - a.teamsAlive;
  });

  // Assign ranks
  playerScores.forEach((ps, i) => {
    ps.rank = i + 1;
  });

  return playerScores;
}

export function getCurrentRound(results: GameResult[]): number {
  // Only consider valid tournament rounds (1-6), ignore any round 0 / First Four
  const validRounds = results.filter((r) => r.round >= 1).map((r) => r.round);
  if (validRounds.length === 0) return 1;
  return Math.max(...validRounds);
}

// Tournament schedule: round number → date range (YYYY-MM-DD in ET)
const ROUND_SCHEDULE: { round: number; startDate: string; endDate: string }[] = [
  { round: 1, startDate: "2026-03-19", endDate: "2026-03-20" },
  { round: 2, startDate: "2026-03-21", endDate: "2026-03-22" },
  { round: 3, startDate: "2026-03-27", endDate: "2026-03-28" },
  { round: 4, startDate: "2026-03-29", endDate: "2026-03-30" },
  { round: 5, startDate: "2026-04-04", endDate: "2026-04-04" },
  { round: 6, startDate: "2026-04-06", endDate: "2026-04-06" },
];

const GAMES_IN_ROUND: Record<number, number> = {
  1: 32, 2: 16, 3: 8, 4: 4, 5: 2, 6: 1,
};

/** Get today's date in ET as YYYY-MM-DD. */
function getTodayETStr(): string {
  const etMs = Date.now() - 4 * 60 * 60 * 1000;
  const d = new Date(etMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface RoundProgress {
  currentRound: number;
  gamesCompleted: number;
  totalGamesInRound: number;
  betweenRounds: boolean;
  nextRoundStartDate: string | null; // "Thu, Mar 27" format
}

export function getRoundProgress(results: GameResult[]): RoundProgress {
  const today = getTodayETStr();

  // Count completed games per round
  const completedByRound: Record<number, number> = {};
  for (const r of results) {
    if (r.round >= 1) {
      completedByRound[r.round] = (completedByRound[r.round] || 0) + 1;
    }
  }

  // Find which round we're in based on date + completion
  for (const sched of ROUND_SCHEDULE) {
    const total = GAMES_IN_ROUND[sched.round] || 0;
    const completed = completedByRound[sched.round] || 0;
    const roundComplete = completed >= total;

    // If this round is fully complete, move to next
    if (roundComplete) continue;

    // This round is not complete
    const isWithinDates = today >= sched.startDate && today <= sched.endDate;
    const isBeforeDates = today < sched.startDate;

    if (isWithinDates) {
      // We're in the middle of this round
      return {
        currentRound: sched.round,
        gamesCompleted: completed,
        totalGamesInRound: total,
        betweenRounds: false,
        nextRoundStartDate: null,
      };
    }

    if (isBeforeDates) {
      // We're between rounds — this round hasn't started yet
      const startDate = new Date(sched.startDate + "T12:00:00");
      const formatted = startDate.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      return {
        currentRound: sched.round,
        gamesCompleted: 0,
        totalGamesInRound: total,
        betweenRounds: true,
        nextRoundStartDate: formatted,
      };
    }

    // Past the dates but not complete — round is still active (late results)
    return {
      currentRound: sched.round,
      gamesCompleted: completed,
      totalGamesInRound: total,
      betweenRounds: false,
      nextRoundStartDate: null,
    };
  }

  // All rounds complete — tournament is over
  return {
    currentRound: 6,
    gamesCompleted: completedByRound[6] || 0,
    totalGamesInRound: 1,
    betweenRounds: false,
    nextRoundStartDate: null,
  };
}

export function formatPts(n: number): string {
  return n === 1 ? "1pt" : `${n}pts`;
}

export { getTeamOwner };
