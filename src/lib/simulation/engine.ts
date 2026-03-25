import { REGIONS } from "@/data/bracket";
import {
  ROUND_POINTS,
  GameResult,
  getTeamOwner,
  getTeamInfo,
  PLAYERS,
} from "@/data/teams";
import { calculateUpsetBonus } from "@/lib/scoring";
import { BracketSlot, SimulationResult } from "./types";
import { getMatchupProbability } from "./probabilities";

// Standard NCAA bracket seeding matchups for Round of 64
const SEED_MATCHUPS: [number, number][] = [
  [1, 16], [8, 9], [5, 12], [4, 13],
  [6, 11], [3, 14], [7, 10], [2, 15],
];

/**
 * Build the 63-game bracket state from current results.
 * Game numbering:
 *   East:    0-7 (R64), 8-11 (R32), 12-13 (S16), 14 (E8)
 *   South:  15-22, 23-26, 27-28, 29
 *   Midwest: 30-37, 38-41, 42-43, 44
 *   West:   45-52, 53-56, 57-58, 59
 *   Final Four: 60 (East vs South), 61 (Midwest vs West)
 *   Championship: 62
 */
export function buildBracketState(results: GameResult[]): BracketSlot[] {
  const slots: BracketSlot[] = [];

  // Build region games (0-59): 15 games per region
  for (let regionIdx = 0; regionIdx < 4; regionIdx++) {
    const region = REGIONS[regionIdx];
    const base = regionIdx * 15;

    // R64: 8 games (indices 0-7 within region)
    for (let i = 0; i < 8; i++) {
      const [topSeed, bottomSeed] = SEED_MATCHUPS[i];
      slots.push({
        gameNumber: base + i,
        round: 1,
        region: region.name,
        feedsInto: base + 8 + Math.floor(i / 2),
        feedPosition: i % 2 === 0 ? "top" : "bottom",
        topTeam: region.teams[topSeed],
        bottomTeam: region.teams[bottomSeed],
        topSeed,
        bottomSeed,
        winner: null,
        isDecided: false,
      });
    }

    // R32: 4 games (indices 8-11)
    for (let i = 0; i < 4; i++) {
      slots.push({
        gameNumber: base + 8 + i,
        round: 2,
        region: region.name,
        feedsInto: base + 12 + Math.floor(i / 2),
        feedPosition: i % 2 === 0 ? "top" : "bottom",
        topTeam: null,
        bottomTeam: null,
        topSeed: 0,
        bottomSeed: 0,
        winner: null,
        isDecided: false,
      });
    }

    // S16: 2 games (indices 12-13)
    for (let i = 0; i < 2; i++) {
      slots.push({
        gameNumber: base + 12 + i,
        round: 3,
        region: region.name,
        feedsInto: base + 14,
        feedPosition: i === 0 ? "top" : "bottom",
        topTeam: null,
        bottomTeam: null,
        topSeed: 0,
        bottomSeed: 0,
        winner: null,
        isDecided: false,
      });
    }

    // E8: 1 game (index 14) — feeds into Final Four
    slots.push({
      gameNumber: base + 14,
      round: 4,
      region: region.name,
      feedsInto: 60 + Math.floor(regionIdx / 2),
      feedPosition: regionIdx % 2 === 0 ? "top" : "bottom",
      topTeam: null,
      bottomTeam: null,
      topSeed: 0,
      bottomSeed: 0,
      winner: null,
      isDecided: false,
    });
  }

  // Final Four: games 60-61
  // Game 60: East champ (region 0) vs South champ (region 1)
  slots.push({
    gameNumber: 60,
    round: 5,
    region: "Final Four",
    feedsInto: 62,
    feedPosition: "top",
    topTeam: null,
    bottomTeam: null,
    topSeed: 0,
    bottomSeed: 0,
    winner: null,
    isDecided: false,
  });

  // Game 61: Midwest champ (region 2) vs West champ (region 3)
  slots.push({
    gameNumber: 61,
    round: 5,
    region: "Final Four",
    feedsInto: 62,
    feedPosition: "bottom",
    topTeam: null,
    bottomTeam: null,
    topSeed: 0,
    bottomSeed: 0,
    winner: null,
    isDecided: false,
  });

  // Championship: game 62
  slots.push({
    gameNumber: 62,
    round: 6,
    region: "Championship",
    feedsInto: null,
    feedPosition: "top",
    topTeam: null,
    bottomTeam: null,
    topSeed: 0,
    bottomSeed: 0,
    winner: null,
    isDecided: false,
  });

  // Sort by game number for indexed access
  slots.sort((a, b) => a.gameNumber - b.gameNumber);

  // Apply completed results
  applyResults(slots, results);

  return slots;
}

/**
 * Apply actual game results to the bracket state.
 * Sets winners, marks games as decided, and propagates winners forward.
 */
function applyResults(slots: BracketSlot[], results: GameResult[]): void {
  // Only process tournament rounds (1-6)
  const tournamentResults = results.filter((r) => r.round >= 1);

  // Build a lookup: for each completed game, we need to find the matching slot
  for (const result of tournamentResults) {
    for (const slot of slots) {
      if (slot.round !== result.round) continue;
      if (slot.isDecided) continue;

      const teams = [slot.topTeam, slot.bottomTeam];
      if (
        teams.includes(result.winner) &&
        teams.includes(result.loser)
      ) {
        slot.winner = result.winner;
        slot.isDecided = true;

        // Propagate winner to the next game
        if (slot.feedsInto !== null) {
          const nextSlot = slots[slot.feedsInto];
          const winnerSeed = getTeamInfo(result.winner)?.seed || 0;
          if (slot.feedPosition === "top") {
            nextSlot.topTeam = result.winner;
            nextSlot.topSeed = winnerSeed;
          } else {
            nextSlot.bottomTeam = result.winner;
            nextSlot.bottomSeed = winnerSeed;
          }
        }
        break;
      }
    }
  }
}

/**
 * Compute current scores for each player from already-decided games.
 */
export function computeCurrentScores(
  slots: BracketSlot[]
): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const player of PLAYERS) {
    scores[player.name] = 0;
  }

  for (const slot of slots) {
    if (!slot.isDecided || !slot.winner) continue;

    const owner = getTeamOwner(slot.winner);
    if (!owner) continue;

    const basePoints = ROUND_POINTS[slot.round] || 0;
    const loser = slot.winner === slot.topTeam ? slot.bottomTeam : slot.topTeam;
    const winnerInfo = getTeamInfo(slot.winner);
    const loserInfo = loser ? getTeamInfo(loser) : null;

    let upsetBonus = 0;
    if (winnerInfo && loserInfo) {
      upsetBonus = calculateUpsetBonus(winnerInfo.seed, loserInfo.seed);
    }

    scores[owner] += basePoints + upsetBonus;
  }

  return scores;
}

/**
 * Run N Monte Carlo simulations of the remaining bracket.
 * Returns an array of SimulationResult objects.
 */
export function runSimulations(
  bracketState: BracketSlot[],
  vegasOdds: Map<string, number> | null,
  numSims: number
): SimulationResult[] {
  const results: SimulationResult[] = [];

  // Pre-compute current scores from decided games
  const currentScores = computeCurrentScores(bracketState);

  // Find undecided game indices for quick iteration
  const undecidedIndices: number[] = [];
  for (let i = 0; i < bracketState.length; i++) {
    if (!bracketState[i].isDecided) {
      undecidedIndices.push(i);
    }
  }

  // If no undecided games, return single result with current scores
  if (undecidedIndices.length === 0) {
    const simResult: SimulationResult = {
      scores: { ...currentScores },
      gameWinners: {},
    };
    results.push(simResult);
    return results;
  }

  for (let sim = 0; sim < numSims; sim++) {
    // Clone only the undecided slots (shallow copy the full array, deep copy undecided ones)
    const simSlots: BracketSlot[] = bracketState.map((slot, idx) => {
      if (slot.isDecided) return slot; // Immutable, safe to share
      return { ...slot };
    });

    const simScores = { ...currentScores };
    const gameWinners: Record<number, string> = {};

    // Process games in order (game number 0→62)
    for (const idx of undecidedIndices) {
      const slot = simSlots[idx];

      // Skip if both teams aren't set yet (shouldn't happen due to ordering, but safety check)
      if (!slot.topTeam || !slot.bottomTeam) continue;

      // Get win probability for topTeam
      const prob = getMatchupProbability(
        slot.topTeam,
        slot.topSeed,
        slot.bottomTeam,
        slot.bottomSeed,
        vegasOdds
      );

      // Resolve the game
      const topWins = Math.random() < prob;
      const winner = topWins ? slot.topTeam : slot.bottomTeam;
      const loser = topWins ? slot.bottomTeam : slot.topTeam;
      slot.winner = winner;
      gameWinners[slot.gameNumber] = winner;

      // Score this game for the winner's owner
      const owner = getTeamOwner(winner);
      if (owner) {
        const basePoints = ROUND_POINTS[slot.round] || 0;
        const winnerInfo = getTeamInfo(winner);
        const loserInfo = getTeamInfo(loser);
        let upsetBonus = 0;
        if (winnerInfo && loserInfo) {
          upsetBonus = calculateUpsetBonus(winnerInfo.seed, loserInfo.seed);
        }
        simScores[owner] += basePoints + upsetBonus;
      }

      // Propagate winner to the next game
      if (slot.feedsInto !== null) {
        const nextSlot = simSlots[slot.feedsInto];
        const winnerSeed = getTeamInfo(winner)?.seed || 0;
        if (slot.feedPosition === "top") {
          nextSlot.topTeam = winner;
          nextSlot.topSeed = winnerSeed;
        } else {
          nextSlot.bottomTeam = winner;
          nextSlot.bottomSeed = winnerSeed;
        }
      }
    }

    results.push({ scores: simScores, gameWinners });
  }

  return results;
}
