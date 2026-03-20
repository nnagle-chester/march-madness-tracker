import { NextResponse } from "next/server";
import { fetchESPNScores, espnGamesToResults, LiveGame } from "@/lib/espn";
import { GameResult } from "@/data/teams";
import manualResults from "@/data/gameResults.json";

// Store for manual results (in-memory for serverless, backed by JSON file)
let cachedManualResults: GameResult[] = manualResults.results as GameResult[];

// All tournament dates in YYYYMMDD format (ESPN API format)
const TOURNAMENT_DATES = [
  "20260319", "20260320", // Round of 64
  "20260321", "20260322", // Round of 32
  "20260327", "20260328", // Sweet 16
  "20260329", "20260330", // Elite 8
  "20260404",             // Final Four
  "20260406",             // Championship
];

// Server-side cache for past dates — completed games never change
const dateCache = new Map<string, LiveGame[]>();

/** Get today's date in ET (UTC-4) as YYYYMMDD for ESPN API. */
function getTodayESPN(): string {
  const etMs = Date.now() - 4 * 60 * 60 * 1000;
  const d = new Date(etMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dates = searchParams.get("dates") || undefined;

  // If a specific date is requested (GamesToday historical view),
  // just fetch that date — simple passthrough
  if (dates) {
    let espnGames: LiveGame[] = [];
    let espnResults: GameResult[] = [];

    try {
      espnGames = await fetchESPNScores(dates);
      espnResults = espnGamesToResults(espnGames);
    } catch {
      console.error("ESPN API failed for date", dates);
    }

    return NextResponse.json({
      results: espnResults,
      liveGames: espnGames.filter((g) => g.isLive),
      allGames: espnGames,
      lastUpdated: new Date().toISOString(),
    });
  }

  // Default: fetch ALL tournament dates up to and including today
  // This ensures scoring includes completed games from past days
  const todayESPN = getTodayESPN();
  const datesToFetch = TOURNAMENT_DATES.filter((d) => d <= todayESPN);

  const allEspnGames: LiveGame[] = [];

  // Fetch each tournament date in parallel, using cache for past dates
  const fetchPromises = datesToFetch.map(async (dateStr) => {
    const isToday = dateStr === todayESPN;

    // Use cache for past dates (completed games don't change)
    if (!isToday && dateCache.has(dateStr)) {
      return dateCache.get(dateStr)!;
    }

    try {
      const games = await fetchESPNScores(dateStr);

      // Cache past dates — they won't change
      if (!isToday) {
        dateCache.set(dateStr, games);
      }

      return games;
    } catch {
      console.error("ESPN API failed for date", dateStr);
      // Return cached data if available, otherwise empty
      return dateCache.get(dateStr) || [];
    }
  });

  const dateResults = await Promise.all(fetchPromises);
  for (const games of dateResults) {
    allEspnGames.push(...games);
  }

  const espnResults = espnGamesToResults(allEspnGames);

  // Merge: ESPN results take priority, manual results fill gaps
  const allGameIds = new Set(espnResults.map((r) => r.gameId).filter(Boolean));
  const mergedResults = [
    ...espnResults,
    ...cachedManualResults.filter((r) => !r.gameId || !allGameIds.has(r.gameId)),
  ];

  // Deduplicate by winner+loser+round
  const seen = new Set<string>();
  const deduped = mergedResults.filter((r) => {
    const key = `${r.round}-${r.winner}-${r.loser}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json({
    results: deduped,
    liveGames: allEspnGames.filter((g) => g.isLive),
    allGames: allEspnGames,
    lastUpdated: new Date().toISOString(),
  });
}
