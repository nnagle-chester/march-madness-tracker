import { fetchESPNScores, espnGamesToResults, LiveGame } from "@/lib/espn";
import { GameResult } from "@/data/teams";

// All tournament dates in YYYYMMDD format (ESPN API format)
export const TOURNAMENT_DATES = [
  "20260319", "20260320", // Round of 64
  "20260321", "20260322", // Round of 32
  "20260326", "20260327", // Sweet 16
  "20260328", "20260329", // Elite 8
  "20260404",             // Final Four
  "20260406",             // Championship
];

// Server-side cache for past dates — completed games never change
const dateCache = new Map<string, LiveGame[]>();

/** Get today's date in ET (UTC-4) as YYYYMMDD for ESPN API. */
export function getTodayESPN(): string {
  const etMs = Date.now() - 4 * 60 * 60 * 1000;
  const d = new Date(etMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/**
 * Fetch all tournament game results up to today.
 * Returns deduplicated GameResult[] from ESPN + manual results.
 */
export async function fetchAllTournamentResults(
  manualResults?: GameResult[]
): Promise<{ results: GameResult[]; allGames: LiveGame[]; liveGames: LiveGame[] }> {
  const todayESPN = getTodayESPN();
  const datesToFetch = TOURNAMENT_DATES.filter((d) => d <= todayESPN);

  const allEspnGames: LiveGame[] = [];

  const fetchPromises = datesToFetch.map(async (dateStr) => {
    const isToday = dateStr === todayESPN;

    if (!isToday && dateCache.has(dateStr)) {
      return dateCache.get(dateStr)!;
    }

    try {
      const games = await fetchESPNScores(dateStr);
      if (!isToday) {
        dateCache.set(dateStr, games);
      }
      return games;
    } catch {
      console.error("ESPN API failed for date", dateStr);
      return dateCache.get(dateStr) || [];
    }
  });

  const dateResults = await Promise.all(fetchPromises);
  for (const games of dateResults) {
    allEspnGames.push(...games);
  }

  const espnResults = espnGamesToResults(allEspnGames);

  // Merge with manual results if provided
  let mergedResults = [...espnResults];
  if (manualResults && manualResults.length > 0) {
    const allGameIds = new Set(espnResults.map((r) => r.gameId).filter(Boolean));
    mergedResults.push(
      ...manualResults.filter((r) => !r.gameId || !allGameIds.has(r.gameId))
    );
  }

  // Deduplicate by winner+loser+round
  const seen = new Set<string>();
  const deduped = mergedResults.filter((r) => {
    const key = `${r.round}-${r.winner}-${r.loser}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    results: deduped,
    liveGames: allEspnGames.filter((g) => g.isLive),
    allGames: allEspnGames,
  };
}
