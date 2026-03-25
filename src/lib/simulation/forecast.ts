import { PLAYERS, PLAYER_COLORS, getTeamOwner, getTeamInfo } from "@/data/teams";
import { GameResult } from "@/data/teams";
import { calculateScores } from "@/lib/scoring";
import { buildBracketState, runSimulations } from "./engine";
import { fetchVegasOdds } from "./probabilities";
import { ForecastResult, ForecastResponse, SimulationResult } from "./types";

const ROUND_LABELS: Record<number, string> = {
  1: "Round of 64",
  2: "Round of 32",
  3: "Sweet 16",
  4: "Elite 8",
  5: "Final Four",
  6: "Championship",
};

/**
 * Run the full forecast pipeline:
 * 1. Build bracket state from results
 * 2. Fetch odds (or null)
 * 3. Run Monte Carlo simulations
 * 4. Aggregate and return forecast
 */
export async function runForecast(
  results: GameResult[],
  numSims: number = 10000,
  forceModel?: "seed" | "vegas"
): Promise<ForecastResponse> {
  // Build bracket state
  const bracketState = buildBracketState(results);
  const gamesRemaining = bracketState.filter((s) => !s.isDecided).length;

  // Fetch Vegas odds if not forcing seed-based
  let vegasOdds: Map<string, number> | null = null;
  if (forceModel !== "seed") {
    vegasOdds = await fetchVegasOdds();
  }

  // Run simulations
  const simResults = runSimulations(bracketState, vegasOdds, numSims);

  // Get current player scores for reference
  const playerScores = calculateScores(results);
  const leaderPoints = playerScores.length > 0 ? playerScores[0].totalPoints : 0;

  // Aggregate results
  const forecasts = aggregateResults(simResults, playerScores, leaderPoints);

  // Generate paths to victory
  for (const forecast of forecasts) {
    forecast.pathsToVictory = generatePathsToVictory(
      forecast.playerName,
      simResults,
      bracketState
    );
  }

  // Sort by winPct descending
  forecasts.sort((a, b) => b.winPct - a.winPct);

  return {
    forecasts,
    simulatedAt: new Date().toISOString(),
    oddsAvailable: vegasOdds !== null,
    simulationCount: numSims,
    gamesRemaining,
  };
}

/**
 * Aggregate simulation results into per-player forecasts.
 */
function aggregateResults(
  simResults: SimulationResult[],
  playerScores: ReturnType<typeof calculateScores>,
  leaderPoints: number
): ForecastResult[] {
  const playerNames = PLAYERS.map((p) => p.name);
  const numSims = simResults.length;

  // Collect per-player stats
  const allScores: Record<string, number[]> = {};
  const winCounts: Record<string, number> = {};
  const top3Counts: Record<string, number> = {};

  for (const name of playerNames) {
    allScores[name] = [];
    winCounts[name] = 0;
    top3Counts[name] = 0;
  }

  for (const sim of simResults) {
    // Record scores
    for (const name of playerNames) {
      allScores[name].push(sim.scores[name] || 0);
    }

    // Find rankings for this simulation
    const ranked = playerNames
      .map((name) => ({ name, score: sim.scores[name] || 0 }))
      .sort((a, b) => b.score - a.score);

    // Winner (handle ties — all tied at #1 count as wins)
    const topScore = ranked[0].score;
    for (const r of ranked) {
      if (r.score === topScore) {
        winCounts[r.name]++;
      } else {
        break;
      }
    }

    // Top 3 (handle ties at 3rd place)
    const thirdScore = ranked[2]?.score || 0;
    for (const r of ranked) {
      if (r.score >= thirdScore && r.score > 0) {
        top3Counts[r.name]++;
      }
    }
  }

  // Build forecast results
  return playerNames.map((name) => {
    const scores = allScores[name].sort((a, b) => a - b);
    const medianScore = scores[Math.floor(scores.length / 2)] || 0;
    const maxPossible = scores.length > 0 ? scores[scores.length - 1] : 0;
    const ps = playerScores.find((p) => p.playerName === name);
    const currentPoints = ps?.totalPoints || 0;

    return {
      playerName: name,
      color: PLAYER_COLORS[name] || "#999",
      currentPoints,
      maxPossible,
      winPct: numSims > 0 ? (winCounts[name] / numSims) * 100 : 0,
      top3Pct: numSims > 0 ? (top3Counts[name] / numSims) * 100 : 0,
      medianScore,
      isContender: maxPossible >= leaderPoints,
      pathsToVictory: [],
    };
  });
}

/**
 * Generate "path to victory" narrative strings for a player.
 * Analyzes winning simulations to find common patterns.
 */
function generatePathsToVictory(
  playerName: string,
  simResults: SimulationResult[],
  bracketState: ReturnType<typeof buildBracketState>
): string[] {
  // Find simulations where this player won
  const winningSims = simResults.filter((sim) => {
    const scores = Object.entries(sim.scores).sort(
      ([, a], [, b]) => b - a
    );
    return scores[0]?.[0] === playerName;
  });

  if (winningSims.length === 0) {
    return ["No winning scenarios found in simulations"];
  }

  // Get this player's teams
  const player = PLAYERS.find((p) => p.name === playerName);
  if (!player) return [];

  const aliveTeams = player.teams
    .map((t) => t.name)
    .filter((name) => {
      // Check if eliminated
      for (const slot of bracketState) {
        if (slot.isDecided && slot.winner) {
          const loser =
            slot.winner === slot.topTeam ? slot.bottomTeam : slot.topTeam;
          if (loser === name) return false;
        }
      }
      return true;
    });

  // For each winning simulation, track the deepest round each alive team reached
  const patternCounts = new Map<string, number>();

  for (const sim of winningSims) {
    // Find deepest round each team reached in this sim
    const teamRounds: Record<string, number> = {};
    for (const team of aliveTeams) {
      teamRounds[team] = 0;
      for (const slot of bracketState) {
        if (slot.isDecided) {
          if (slot.winner === team) {
            teamRounds[team] = Math.max(teamRounds[team], slot.round);
          }
        }
      }
      // Check undecided games won in this sim
      for (const [gameNum, winner] of Object.entries(sim.gameWinners)) {
        if (winner === team) {
          const slot = bracketState[parseInt(gameNum)];
          if (slot) {
            teamRounds[team] = Math.max(teamRounds[team], slot.round);
          }
        }
      }
    }

    // Build pattern string: teams that reached S16 or deeper (rounds 3+)
    const keyTeams = Object.entries(teamRounds)
      .filter(([, round]) => round >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3); // Top 3 deepest teams

    if (keyTeams.length === 0) continue;

    const pattern = keyTeams
      .map(([team, round]) => `${team}→${ROUND_LABELS[round] || `R${round}`}`)
      .join(" + ");

    patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
  }

  // Sort patterns by frequency and take top 3
  const sortedPatterns = [...patternCounts.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return sortedPatterns.map(([pattern, count]) => {
    const pct = ((count / winningSims.length) * 100).toFixed(0);
    // Convert "Duke→Championship + Ohio State→Sweet 16" to readable form
    const parts = pattern.split(" + ").map((p) => {
      const [team, round] = p.split("→");
      if (round === "Championship") return `${team} wins the Championship`;
      return `${team} reaches the ${round}`;
    });
    return `${parts.join(" and ")} (${pct}% of wins)`;
  });
}
