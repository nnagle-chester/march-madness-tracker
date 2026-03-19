import { GameResult, ROUND_NAMES, getTeamOwner, getTeamInfo } from "@/data/teams";
import { calculateGamePoints } from "@/lib/scoring";

export interface FeedItem {
  type: "win" | "elimination";
  team: string;
  opponent: string;
  owner: string | null;
  opponentOwner: string | null;
  round: number;
  roundName: string;
  points: number;
  upsetBonus: number;
  message: string;
  seed: number;
  opponentSeed: number;
}

export function generateFeed(results: GameResult[], limit: number = 10): FeedItem[] {
  const scoringResults = results.filter((r) => r.round >= 1);
  const items: FeedItem[] = [];

  for (const result of scoringResults) {
    const winnerOwner = getTeamOwner(result.winner);
    const loserOwner = getTeamOwner(result.loser);
    const winnerInfo = getTeamInfo(result.winner);
    const loserInfo = getTeamInfo(result.loser);
    const { basePoints, upsetBonus, totalPoints } = calculateGamePoints(
      result.round,
      result.winner,
      result.loser
    );

    // Win item
    if (winnerOwner) {
      items.push({
        type: "win",
        team: result.winner,
        opponent: result.loser,
        owner: winnerOwner,
        opponentOwner: loserOwner,
        round: result.round,
        roundName: ROUND_NAMES[result.round] || `Round ${result.round}`,
        points: totalPoints,
        upsetBonus,
        message: `${result.winner} beat ${result.loser} in the ${ROUND_NAMES[result.round]}`,
        seed: winnerInfo?.seed || 0,
        opponentSeed: loserInfo?.seed || 0,
      });
    }

    // Elimination item
    if (loserOwner) {
      items.push({
        type: "elimination",
        team: result.loser,
        opponent: result.winner,
        owner: loserOwner,
        opponentOwner: winnerOwner,
        round: result.round,
        roundName: ROUND_NAMES[result.round] || `Round ${result.round}`,
        points: 0,
        upsetBonus: 0,
        message: `${result.loser} eliminated by ${result.winner} in the ${ROUND_NAMES[result.round]}`,
        seed: loserInfo?.seed || 0,
        opponentSeed: winnerInfo?.seed || 0,
      });
    }
  }

  // Sort by round descending, then eliminations first within same round
  items.sort((a, b) => {
    if (b.round !== a.round) return b.round - a.round;
    if (a.type !== b.type) return a.type === "elimination" ? -1 : 1;
    return 0;
  });

  return items.slice(0, limit);
}
