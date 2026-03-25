export interface BracketSlot {
  gameNumber: number;       // 0-62
  round: number;            // 1-6
  region: string;
  feedsInto: number | null;
  feedPosition: "top" | "bottom";
  topTeam: string | null;
  bottomTeam: string | null;
  topSeed: number;
  bottomSeed: number;
  winner: string | null;
  isDecided: boolean;       // true if result already known from actual games
}

export interface SimulationResult {
  // Per-player final scores for one simulation run
  scores: Record<string, number>;
  // Which team won each undecided game in this sim
  gameWinners: Record<number, string>;
}

export interface ForecastResult {
  playerName: string;
  color: string;
  currentPoints: number;
  maxPossible: number;      // highest score across all sims
  winPct: number;           // % of sims finishing #1
  top3Pct: number;          // % of sims finishing top 3
  medianScore: number;
  isContender: boolean;     // maxPossible >= leader's current score
  pathsToVictory: string[]; // up to 3 narrative descriptions
}

export interface ForecastResponse {
  forecasts: ForecastResult[];
  simulatedAt: string;
  oddsAvailable: boolean;
  simulationCount: number;
  gamesRemaining: number;
}
