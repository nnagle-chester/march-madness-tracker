import { NextResponse } from "next/server";
import { fetchESPNScores, espnGamesToResults, LiveGame } from "@/lib/espn";
import { GameResult } from "@/data/teams";
import manualResults from "@/data/gameResults.json";

// Store for manual results (in-memory for serverless, backed by JSON file)
let cachedManualResults: GameResult[] = manualResults.results as GameResult[];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dates = searchParams.get("dates") || undefined;

  // Fetch ESPN scores
  let espnGames: LiveGame[] = [];
  let espnResults: GameResult[] = [];

  try {
    espnGames = await fetchESPNScores(dates);
    espnResults = espnGamesToResults(espnGames);
  } catch {
    console.error("ESPN API failed, using manual results only");
  }

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
    liveGames: espnGames.filter((g) => g.isLive),
    lastUpdated: new Date().toISOString(),
  });
}
