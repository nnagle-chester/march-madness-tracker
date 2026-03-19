import { GameResult, ROUND_NAMES, getTeamOwner, getTeamInfo, PLAYERS } from "@/data/teams";
import { calculateGamePoints } from "@/lib/scoring";

export interface CinderellaInfo {
  teamName: string;
  seed: number;
  region: string;
  owner: string;
  ownerColor: string;
  wins: {
    round: number;
    roundName: string;
    opponent: string;
    opponentSeed: number;
    basePoints: number;
    upsetBonus: number;
    totalPoints: number;
  }[];
  totalUpsetBonus: number;
  totalPoints: number;
}

export function findCinderella(results: GameResult[]): CinderellaInfo | null {
  const scoringResults = results.filter((r) => r.round >= 1);
  const eliminatedTeams = new Set(scoringResults.map((r) => r.loser));

  // Find all alive teams with seed >= 9
  let bestCinderella: CinderellaInfo | null = null;

  for (const player of PLAYERS) {
    for (const team of player.teams) {
      if (team.seed < 9) continue;
      if (eliminatedTeams.has(team.name)) continue;

      // This team is alive and is a 9+ seed
      const teamWins = scoringResults.filter((r) => r.winner === team.name);
      const wins = teamWins.map((w) => {
        const { basePoints, upsetBonus, totalPoints } = calculateGamePoints(
          w.round,
          w.winner,
          w.loser
        );
        const opponentInfo = getTeamInfo(w.loser);
        return {
          round: w.round,
          roundName: ROUND_NAMES[w.round] || `Round ${w.round}`,
          opponent: w.loser,
          opponentSeed: opponentInfo?.seed || 0,
          basePoints,
          upsetBonus,
          totalPoints,
        };
      });

      const totalUpsetBonus = wins.reduce((sum, w) => sum + w.upsetBonus, 0);
      const totalPoints = wins.reduce((sum, w) => sum + w.totalPoints, 0);

      const candidate: CinderellaInfo = {
        teamName: team.name,
        seed: team.seed,
        region: team.region,
        owner: player.name,
        ownerColor: player.color,
        wins,
        totalUpsetBonus,
        totalPoints,
      };

      // Prefer highest seed number, then most wins, then most points
      if (
        !bestCinderella ||
        candidate.seed > bestCinderella.seed ||
        (candidate.seed === bestCinderella.seed &&
          candidate.wins.length > bestCinderella.wins.length) ||
        (candidate.seed === bestCinderella.seed &&
          candidate.wins.length === bestCinderella.wins.length &&
          candidate.totalPoints > bestCinderella.totalPoints)
      ) {
        bestCinderella = candidate;
      }
    }
  }

  return bestCinderella;
}
