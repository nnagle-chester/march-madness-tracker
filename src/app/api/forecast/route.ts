import { NextResponse } from "next/server";
import { runForecast } from "@/lib/simulation/forecast";
import { fetchAllTournamentResults } from "@/lib/fetchResults";
import { ForecastResponse } from "@/lib/simulation/types";

// Module-level cache
let cachedResponse: ForecastResponse | null = null;
let cachedAt = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const model = searchParams.get("model") as "seed" | "vegas" | null;
  const forceRefresh = searchParams.get("refresh") === "true";

  const now = Date.now();

  // Return cached result if fresh (unless force refresh)
  if (
    !forceRefresh &&
    cachedResponse &&
    now - cachedAt < CACHE_DURATION_MS
  ) {
    return NextResponse.json(cachedResponse);
  }

  try {
    // Fetch current tournament results
    const { results } = await fetchAllTournamentResults();

    // Run simulation
    const forecast = await runForecast(
      results,
      10000,
      model || undefined
    );

    cachedResponse = forecast;
    cachedAt = now;

    return NextResponse.json(forecast);
  } catch (error) {
    console.error("Forecast API error:", error);

    // Return stale cache if available
    if (cachedResponse) {
      return NextResponse.json(cachedResponse);
    }

    return NextResponse.json(
      { error: "Failed to run forecast simulation" },
      { status: 500 }
    );
  }
}
