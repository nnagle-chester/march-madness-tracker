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
  // Track eliminated teams
  const eliminatedTeams = new Set<string>();
  const eliminatedRound: Record<string, number> = {};

  for (const result of results) {
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
      for (const result of results) {
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
  if (results.length === 0) return 1;
  return Math.max(...results.map((r) => r.round));
}

export function getRoundProgress(results: GameResult[]): {
  currentRound: number;
  gamesCompleted: number;
  totalGamesInRound: number;
} {
  const currentRound = getCurrentRound(results);
  const gamesInRound: Record<number, number> = {
    1: 32,
    2: 16,
    3: 8,
    4: 4,
    5: 2,
    6: 1,
  };

  const gamesCompleted = results.filter((r) => r.round === currentRound).length;
  const totalGamesInRound = gamesInRound[currentRound] || 32;

  return { currentRound, gamesCompleted, totalGamesInRound };
}

export { getTeamOwner };
