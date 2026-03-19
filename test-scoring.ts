// Test cases for the scoring model
// Run with: npx tsx test-scoring.ts

import { calculateScores, calculateGamePoints, getCurrentRound, getRoundProgress } from "./src/lib/scoring";
import { GameResult, ROUND_POINTS } from "./src/data/teams";

let passed = 0;
let failed = 0;

function assert(label: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}`);
    console.log(`    Expected: ${JSON.stringify(expected)}`);
    console.log(`    Actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

// ─────────────────────────────────────────────
console.log("\n═══ TEST 1: Round-to-Points Mapping ═══");
// Verify the base points for each round
assert("R64 base points = 1", ROUND_POINTS[1], 1);
assert("R32 base points = 2", ROUND_POINTS[2], 2);
assert("S16 base points = 5", ROUND_POINTS[3], 5);
assert("E8 base points = 10", ROUND_POINTS[4], 10);
assert("F4 base points = 15", ROUND_POINTS[5], 15);
assert("Championship base points = 25", ROUND_POINTS[6], 25);

// ─────────────────────────────────────────────
console.log("\n═══ TEST 2: No Upset Bonus (Higher Seed Wins) ═══");
// Duke (1) beats LIU (16) in R64 → 1pt base, 0 upset bonus
const duke_liu = calculateGamePoints(1, "Duke", "LIU");
assert("Duke(1) vs LIU(16) R64: base = 1", duke_liu.basePoints, 1);
assert("Duke(1) vs LIU(16) R64: upset bonus = 0", duke_liu.upsetBonus, 0);
assert("Duke(1) vs LIU(16) R64: total = 1", duke_liu.totalPoints, 1);

// ─────────────────────────────────────────────
console.log("\n═══ TEST 3: Upset Bonus (Lower Seed Wins) ═══");
// High Point (12) beats Wisconsin (5) in R64 → 1 + (12-5) = 8 pts
const hp_wisc = calculateGamePoints(1, "High Point", "Wisconsin");
assert("High Point(12) vs Wisconsin(5) R64: base = 1", hp_wisc.basePoints, 1);
assert("High Point(12) vs Wisconsin(5) R64: upset bonus = 7", hp_wisc.upsetBonus, 7);
assert("High Point(12) vs Wisconsin(5) R64: total = 8", hp_wisc.totalPoints, 8);

// ─────────────────────────────────────────────
console.log("\n═══ TEST 4: Upset Bonus in Later Rounds ═══");
// McNeese (12) beats Arizona (1) in Sweet 16 → 5 + (12-1) = 16 pts
const mcn_az = calculateGamePoints(3, "McNeese", "Arizona");
assert("McNeese(12) vs Arizona(1) S16: base = 5", mcn_az.basePoints, 5);
assert("McNeese(12) vs Arizona(1) S16: upset bonus = 11", mcn_az.upsetBonus, 11);
assert("McNeese(12) vs Arizona(1) S16: total = 16", mcn_az.totalPoints, 16);

// ─────────────────────────────────────────────
console.log("\n═══ TEST 5: Same Seed Matchup (No Bonus) ═══");
// Ohio State (8) beats Clemson (8) in R64 → 1 + 0 = 1pt
const osu_clem = calculateGamePoints(1, "Ohio State", "Clemson");
assert("Ohio State(8) vs Clemson(8) R64: upset bonus = 0", osu_clem.upsetBonus, 0);
assert("Ohio State(8) vs Clemson(8) R64: total = 1", osu_clem.totalPoints, 1);

// ─────────────────────────────────────────────
console.log("\n═══ TEST 6: Championship Game with Upset ═══");
// Siena (16) beats Duke (1) in Championship → 25 + (16-1) = 40 pts
const dream = calculateGamePoints(6, "Siena", "Duke");
assert("Siena(16) vs Duke(1) Champ: base = 25", dream.basePoints, 25);
assert("Siena(16) vs Duke(1) Champ: upset bonus = 15", dream.upsetBonus, 15);
assert("Siena(16) vs Duke(1) Champ: total = 40", dream.totalPoints, 40);

// ─────────────────────────────────────────────
console.log("\n═══ TEST 7: First Four Games Score Zero ═══");
// Simulate First Four results with round = 0 (how ESPN integration now tags them)
const firstFourResults: GameResult[] = [
  { round: 0, winner: "Prairie View A&M", loser: "Lehigh", region: "South" },
  { round: 0, winner: "Miami (OH)", loser: "SMU", region: "Midwest" },
  { round: 0, winner: "Howard", loser: "SomeTeam1", region: "West" },
  { round: 0, winner: "Texas", loser: "SomeTeam2", region: "West" },
];
const ffScores = calculateScores(firstFourResults);
const noahFF = ffScores.find((p) => p.playerName === "Noah")!;
const phillFF = ffScores.find((p) => p.playerName === "Phill")!;
const willFF = ffScores.find((p) => p.playerName === "Will")!;
const mikeFF = ffScores.find((p) => p.playerName === "Mike")!;

assert("Noah total = 0 (Prairie View A&M First Four win)", noahFF.totalPoints, 0);
assert("Phill total = 0 (Miami OH First Four win)", phillFF.totalPoints, 0);
assert("Will total = 0 (Howard First Four win)", willFF.totalPoints, 0);
assert("Mike total = 0 (Texas First Four win)", mikeFF.totalPoints, 0);
assert("All 8 players at 0 points with only First Four results", ffScores.every((p) => p.totalPoints === 0), true);

// ─────────────────────────────────────────────
console.log("\n═══ TEST 8: Teams Alive Count ═══");
// No results → everyone has 8 teams alive
const noResults = calculateScores([]);
assert("No results: all players have 8 teams alive", noResults.every((p) => p.teamsAlive === 8), true);

// One R64 loss → owner of losing team drops to 7
const oneElim: GameResult[] = [
  { round: 1, winner: "Duke", loser: "LIU", region: "East" },
];
const oneElimScores = calculateScores(oneElim);
const brett1 = oneElimScores.find((p) => p.playerName === "Brett")!; // owns LIU
const mike1 = oneElimScores.find((p) => p.playerName === "Mike")!;   // owns Duke
assert("Brett has 7 alive after LIU eliminated", brett1.teamsAlive, 7);
assert("Mike has 8 alive (Duke won)", mike1.teamsAlive, 8);
assert("Mike gets 1pt for Duke R64 win", mike1.totalPoints, 1);

// ─────────────────────────────────────────────
console.log("\n═══ TEST 9: Current Round Detection ═══");
assert("No results → Round 1", getCurrentRound([]), 1);
assert("Only round-0 results → Round 1", getCurrentRound(firstFourResults), 1);
assert("R64 results → Round 1", getCurrentRound([{ round: 1, winner: "Duke", loser: "LIU", region: "East" }]), 1);
assert("Mix of R1+R2 → Round 2", getCurrentRound([
  { round: 1, winner: "Duke", loser: "LIU", region: "East" },
  { round: 2, winner: "Duke", loser: "Purdue", region: "East" },
]), 2);
assert("Round 0 + Round 1 → Round 1 (not 0)", getCurrentRound([
  { round: 0, winner: "Texas", loser: "SomeTeam", region: "West" },
  { round: 1, winner: "Duke", loser: "LIU", region: "East" },
]), 1);

// ─────────────────────────────────────────────
console.log("\n═══ TEST 10: Round Progress ═══");
const r64Half: GameResult[] = Array.from({ length: 16 }, (_, i) => ({
  round: 1,
  winner: `Team${i}`,
  loser: `Team${i + 100}`,
  region: "East",
}));
const prog = getRoundProgress(r64Half);
assert("16 R64 games: currentRound = 1", prog.currentRound, 1);
assert("16 R64 games: gamesCompleted = 16", prog.gamesCompleted, 16);
assert("16 R64 games: totalGamesInRound = 32", prog.totalGamesInRound, 32);

// ─────────────────────────────────────────────
console.log("\n═══ TEST 11: Multi-Round Full Scoring ═══");
// Simulate Mike's Duke going on a run
const dukeRun: GameResult[] = [
  { round: 1, winner: "Duke", loser: "LIU", region: "East" },           // 1 + 0 = 1
  { round: 2, winner: "Duke", loser: "Iowa", region: "East" },          // 2 + 0 = 2 (1 beat 9? duke is 1, iowa is 9 → no upset)
  { round: 3, winner: "Duke", loser: "Alabama", region: "East" },       // 5 + 0 = 5
  { round: 4, winner: "Duke", loser: "High Point", region: "East" },    // 10 + 0 = 10 (1 beat 12 → no upset since 1 < 12... wait, Duke is seed 1, HP is seed 12. Winner seed 1 < loser seed 12 → no upset)
];
const dukeScores = calculateScores(dukeRun);
const mikeDuke = dukeScores.find((p) => p.playerName === "Mike")!;
assert("Mike: Duke R64 = 1pt", mikeDuke.teamScores.find(t => t.teamName === "Duke")!.pointsByRound[1], 1);
assert("Mike: Duke R32 = 2pts", mikeDuke.teamScores.find(t => t.teamName === "Duke")!.pointsByRound[2], 2);
assert("Mike: Duke S16 = 5pts", mikeDuke.teamScores.find(t => t.teamName === "Duke")!.pointsByRound[3], 5);
assert("Mike: Duke E8 = 10pts", mikeDuke.teamScores.find(t => t.teamName === "Duke")!.pointsByRound[4], 10);
assert("Mike: Duke total = 18pts", mikeDuke.teamScores.find(t => t.teamName === "Duke")!.totalPoints, 18);
assert("Mike total = 18pts (only Duke scored)", mikeDuke.totalPoints, 18);

// Brett owns LIU → eliminated R1, Nolan owns Iowa → eliminated R2, etc.
const brettDuke = dukeScores.find((p) => p.playerName === "Brett")!;
assert("Brett: 7 alive (LIU eliminated R1)", brettDuke.teamsAlive, 7);
const nolanDuke = dukeScores.find((p) => p.playerName === "Nolan")!;
assert("Nolan: 7 alive (Iowa eliminated R2)", nolanDuke.teamsAlive, 7);

// ─────────────────────────────────────────────
console.log("\n═══ TEST 12: Upset Bonus Accumulation ═══");
// Noah's High Point (12) upsets Wisconsin (5) R64, then upsets Alabama (4) R32
const hpRun: GameResult[] = [
  { round: 1, winner: "High Point", loser: "Wisconsin", region: "East" },  // 1 + 7 = 8
  { round: 2, winner: "High Point", loser: "Alabama", region: "East" },    // 2 + 8 = 10
];
const hpScores = calculateScores(hpRun);
const noahHP = hpScores.find((p) => p.playerName === "Noah")!;
const hpTeam = noahHP.teamScores.find(t => t.teamName === "High Point")!;
assert("High Point R64: 1 + 7(upset) = 8", hpTeam.pointsByRound[1], 8);
assert("High Point R32: 2 + 8(upset) = 10", hpTeam.pointsByRound[2], 10);
assert("High Point total = 18", hpTeam.totalPoints, 18);
assert("Noah total = 18", noahHP.totalPoints, 18);

// Mike owns Wisconsin → eliminated R1
const mikeHP = hpScores.find((p) => p.playerName === "Mike")!;
assert("Mike: 7 alive (Wisconsin eliminated)", mikeHP.teamsAlive, 7);
// Miller owns Alabama → eliminated R2
const millerHP = hpScores.find((p) => p.playerName === "Miller")!;
assert("Miller: 7 alive (Alabama eliminated)", millerHP.teamsAlive, 7);

// ─────────────────────────────────────────────
console.log("\n═══ TEST 13: Leaderboard Ranking ═══");
const rankResults: GameResult[] = [
  { round: 1, winner: "Duke", loser: "LIU", region: "East" },              // Mike: 1pt
  { round: 1, winner: "High Point", loser: "Wisconsin", region: "East" },  // Noah: 8pts
  { round: 1, winner: "Florida", loser: "Prairie View A&M", region: "South" }, // Miller: 1pt
];
const rankScores = calculateScores(rankResults);
assert("Noah ranked #1 (8pts)", rankScores[0].playerName, "Noah");
assert("Noah rank = 1", rankScores[0].rank, 1);
// Mike and Miller both have 1pt — tiebreak by teams alive
const mike13 = rankScores.find(p => p.playerName === "Mike")!;
const miller13 = rankScores.find(p => p.playerName === "Miller")!;
assert("Mike has 1pt", mike13.totalPoints, 1);
assert("Miller has 1pt", miller13.totalPoints, 1);
// Mike lost Wisconsin (7 alive), Miller has 8 alive → Miller ranked higher
assert("Miller has 8 alive", miller13.teamsAlive, 8);
assert("Mike has 7 alive (lost Wisconsin)", mike13.teamsAlive, 7);
assert("Miller ranked above Mike (tiebreak: more teams alive)", miller13.rank < mike13.rank, true);

// Brett lost LIU → 0pts, 7 alive. Noah lost Prairie View → 8pts, 7 alive
const brett13 = rankScores.find(p => p.playerName === "Brett")!;
assert("Brett has 0pts, 7 alive", brett13.totalPoints === 0 && brett13.teamsAlive === 7, true);
const noah13 = rankScores.find(p => p.playerName === "Noah")!;
assert("Noah: 7 alive (Prairie View eliminated)", noah13.teamsAlive, 7);

// ─────────────────────────────────────────────
console.log("\n═══ TEST 14: Points from Multiple Teams Same Player ═══");
// Miller has Florida and Purdue. Both win R64.
const millerMulti: GameResult[] = [
  { round: 1, winner: "Florida", loser: "Prairie View A&M", region: "South" },  // 1pt
  { round: 1, winner: "Purdue", loser: "Furman", region: "East" },              // 1pt
  { round: 1, winner: "Alabama", loser: "High Point", region: "East" },         // 1pt
];
const millerScores = calculateScores(millerMulti);
const millerM = millerScores.find(p => p.playerName === "Miller")!;
assert("Miller: 3 teams won R64 = 3pts total", millerM.totalPoints, 3);
assert("Miller: R64 round points = 3", millerM.pointsByRound[1], 3);
assert("Miller: 8 teams alive", millerM.teamsAlive, 8);

// ─────────────────────────────────────────────
console.log("\n═══ TEST 15: Edge Case - 16 Seed Championship Upset ═══");
// Maximum possible upset bonus scenario
const maxUpset = calculateGamePoints(6, "LIU", "Duke");
assert("LIU(16) beats Duke(1) in Championship: base = 25", maxUpset.basePoints, 25);
assert("LIU(16) beats Duke(1) in Championship: upset = 15", maxUpset.upsetBonus, 15);
assert("LIU(16) beats Duke(1) in Championship: total = 40", maxUpset.totalPoints, 40);

// ─────────────────────────────────────────────
console.log("\n\n════════════════════════════════");
console.log(`Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
if (failed > 0) {
  process.exit(1);
}
