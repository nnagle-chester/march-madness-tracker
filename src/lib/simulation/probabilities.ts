import { TEAM_ALIAS_MAP, normalizeTeamName } from "@/lib/espn";

// Implied strength of each seed (historical win rate against the field)
// Used as input to the log5 formula for uncommon matchups
const SEED_STRENGTH: Record<number, number> = {
  1: 0.85, 2: 0.72, 3: 0.65, 4: 0.57,
  5: 0.50, 6: 0.48, 7: 0.45, 8: 0.42,
  9: 0.38, 10: 0.35, 11: 0.33, 12: 0.30,
  13: 0.22, 14: 0.17, 15: 0.10, 16: 0.02,
};

// Historical win rates for common NCAA tournament seed matchups
// Key format: "lowerSeed-higherSeed", value = probability the lower seed wins
const HISTORICAL_MATCHUP_PROBS: Record<string, number> = {
  // R64 matchups
  "1-16": 0.99,
  "2-15": 0.94,
  "3-14": 0.85,
  "4-13": 0.79,
  "5-12": 0.64,
  "6-11": 0.62,
  "7-10": 0.61,
  "8-9": 0.52,
  // Common R32 matchups
  "1-8": 0.72,
  "1-9": 0.72,
  "1-5": 0.67,
  "1-12": 0.67,
  "2-7": 0.63,
  "2-10": 0.61,
  "3-6": 0.64,
  "3-11": 0.62,
  "4-5": 0.54,
  "4-12": 0.60,
  // Sweet 16 / later common matchups
  "1-4": 0.62,
  "1-3": 0.58,
  "1-2": 0.55,
  "2-3": 0.53,
  "2-4": 0.56,
  "3-4": 0.52,
};

/**
 * Log5 formula — estimates head-to-head probability from two teams' general win rates.
 * pA = team A's win rate against the field, pB = team B's.
 * Returns probability team A beats team B.
 */
function log5(pA: number, pB: number): number {
  const numerator = pA * (1 - pB);
  const denominator = pA * (1 - pB) + pB * (1 - pA);
  if (denominator === 0) return 0.5;
  return numerator / denominator;
}

/**
 * Get win probability for seed1 vs seed2 using historical data or log5 fallback.
 * Returns probability that the team with seed1 wins.
 */
export function getSeedBasedProbability(seed1: number, seed2: number): number {
  if (seed1 === seed2) return 0.5;

  const lower = Math.min(seed1, seed2);
  const higher = Math.max(seed1, seed2);
  const key = `${lower}-${higher}`;

  if (HISTORICAL_MATCHUP_PROBS[key] !== undefined) {
    const lowerSeedWinProb = HISTORICAL_MATCHUP_PROBS[key];
    return seed1 <= seed2 ? lowerSeedWinProb : 1 - lowerSeedWinProb;
  }

  // Fallback: log5 formula using implied seed strength
  const strength1 = SEED_STRENGTH[seed1] ?? 0.5;
  const strength2 = SEED_STRENGTH[seed2] ?? 0.5;
  return log5(strength1, strength2);
}

/**
 * Convert American odds to implied probability.
 */
function americanToProb(odds: number): number {
  if (odds < 0) return (-odds) / (-odds + 100);
  return 100 / (odds + 100);
}

/**
 * Fetch current moneyline odds from the-odds-api.com.
 * Returns a map of "TeamA vs TeamB" (alphabetical) → probability TeamA wins.
 * Returns null if ODDS_API_KEY is not set or the fetch fails.
 */
export async function fetchVegasOdds(): Promise<Map<string, number> | null> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://api.the-odds-api.com/v4/sports/basketball_ncaab/odds?apiKey=${apiKey}&regions=us&markets=h2h&oddsFormat=american`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) {
      console.error("Odds API error:", res.status);
      return null;
    }

    const events = await res.json();
    const probMap = new Map<string, number>();

    for (const event of events) {
      const bookmaker = event.bookmakers?.[0];
      if (!bookmaker) continue;

      const market = bookmaker.markets?.find(
        (m: { key: string }) => m.key === "h2h"
      );
      if (!market || !market.outcomes || market.outcomes.length < 2) continue;

      const team1 = normalizeTeamName(market.outcomes[0].name);
      const team2 = normalizeTeamName(market.outcomes[1].name);

      const rawProb1 = americanToProb(market.outcomes[0].price);
      const rawProb2 = americanToProb(market.outcomes[1].price);

      // Remove vig: normalize probabilities to sum to 1.0
      const total = rawProb1 + rawProb2;
      const prob1 = rawProb1 / total;

      // Store with alphabetical key so lookup is consistent
      const [a, b] = [team1, team2].sort();
      const probA = team1 === a ? prob1 : 1 - prob1;
      probMap.set(`${a} vs ${b}`, probA);
    }

    return probMap.size > 0 ? probMap : null;
  } catch (err) {
    console.error("Failed to fetch Vegas odds:", err);
    return null;
  }
}

/**
 * Look up the win probability for team1 vs team2.
 * First checks Vegas odds map, then falls back to seed-based.
 */
export function getMatchupProbability(
  team1: string,
  seed1: number,
  team2: string,
  seed2: number,
  vegasOdds: Map<string, number> | null
): number {
  if (vegasOdds) {
    const [a, b] = [team1, team2].sort();
    const key = `${a} vs ${b}`;
    const probA = vegasOdds.get(key);
    if (probA !== undefined) {
      return team1 === a ? probA : 1 - probA;
    }
  }

  // Fallback to seed-based probability
  return getSeedBasedProbability(seed1, seed2);
}
