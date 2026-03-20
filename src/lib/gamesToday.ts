import { LiveGame } from "@/lib/espn";
import { ROUND_POINTS, getTeamOwner, getTeamInfo, PLAYER_COLORS } from "@/data/teams";

export interface GameTodayInfo {
  game: LiveGame;
  team1Owner: string | null;
  team2Owner: string | null;
  team1Seed: number;
  team2Seed: number;
  team1Color: string;
  team2Color: string;
  team1PointsIfWin: number;
  team2PointsIfWin: number;
  tipTime: string;
  statusLabel: "SCHEDULED" | "LIVE" | "FINAL";
}

/** Return YYYY-MM-DD for a Date in the user's local timezone. */
export function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Convert a UTC timestamp to an ET date string (YYYY-MM-DD).
 * Subtracts 4 hours (EDT) so a game at 2am UTC is bucketed to the previous ET day.
 */
export function toETDateStr(utcTimestamp: string): string {
  const etMs = new Date(utcTimestamp).getTime() - 4 * 60 * 60 * 1000;
  const d = new Date(etMs);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/** Get today's date in ET (UTC-4) as YYYY-MM-DD. */
export function getTodayET(): string {
  const etMs = Date.now() - 4 * 60 * 60 * 1000;
  const d = new Date(etMs);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function getGamesToday(allGames: LiveGame[], targetDateET?: string): GameTodayInfo[] {
  const dateStr = targetDateET ?? getTodayET();

  // Filter games by ET date (a game at 2am UTC belongs to the previous ET day)
  const dateGames = allGames.filter((g) => {
    if (!g.startTime) return false;
    return toETDateStr(g.startTime) === dateStr;
  });

  const enriched: GameTodayInfo[] = dateGames.map((game) => {
    const team1Owner = getTeamOwner(game.team1);
    const team2Owner = getTeamOwner(game.team2);
    const team1Info = getTeamInfo(game.team1);
    const team2Info = getTeamInfo(game.team2);

    const round = game.round || 1;
    const basePoints = ROUND_POINTS[round] || 0;

    // Calculate points if each team wins
    const team1Seed = team1Info?.seed || 0;
    const team2Seed = team2Info?.seed || 0;
    const team1UpsetBonus = team1Seed > team2Seed ? team1Seed - team2Seed : 0;
    const team2UpsetBonus = team2Seed > team1Seed ? team2Seed - team1Seed : 0;

    let statusLabel: "SCHEDULED" | "LIVE" | "FINAL" = "SCHEDULED";
    if (game.isLive) statusLabel = "LIVE";
    else if (game.isComplete) statusLabel = "FINAL";

    const tipTime = game.startTime
      ? new Date(game.startTime).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
      : "";

    return {
      game,
      team1Owner,
      team2Owner,
      team1Seed,
      team2Seed,
      team1Color: team1Owner ? PLAYER_COLORS[team1Owner] : "#d1d5db",
      team2Color: team2Owner ? PLAYER_COLORS[team2Owner] : "#d1d5db",
      team1PointsIfWin: basePoints + team1UpsetBonus,
      team2PointsIfWin: basePoints + team2UpsetBonus,
      tipTime,
      statusLabel,
    };
  });

  // Filter: only show games where at least one team is drafted
  const relevant = enriched.filter((g) => g.team1Owner || g.team2Owner);

  // Sort: live first, then scheduled by time, then final
  relevant.sort((a, b) => {
    const order = { LIVE: 0, SCHEDULED: 1, FINAL: 2 };
    if (order[a.statusLabel] !== order[b.statusLabel]) {
      return order[a.statusLabel] - order[b.statusLabel];
    }
    // Within same status, sort by tip time
    if (a.game.startTime && b.game.startTime) {
      return new Date(a.game.startTime).getTime() - new Date(b.game.startTime).getTime();
    }
    return 0;
  });

  return relevant;
}
