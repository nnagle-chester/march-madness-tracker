export interface Team {
  name: string;
  seed: number;
  region: string;
  eliminated: boolean;
  eliminatedRound?: number;
}

export interface Player {
  name: string;
  color: string;
  teams: Team[];
}

export interface GameResult {
  round: number;
  winner: string;
  loser: string;
  winnerScore?: number;
  loserScore?: number;
  region: string;
  gameId?: string;
  isLive?: boolean;
}

export const ROUND_NAMES: Record<number, string> = {
  1: "Round of 64",
  2: "Round of 32",
  3: "Sweet 16",
  4: "Elite 8",
  5: "Final Four",
  6: "Championship",
};

export const ROUND_POINTS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 5,
  4: 10,
  5: 15,
  6: 25,
};

export const PLAYER_COLORS: Record<string, string> = {
  Mike: "#ef4444",    // red
  Noah: "#3b82f6",    // blue
  Miller: "#22c55e",  // green
  Jon: "#a855f7",     // purple
  Brett: "#f97316",   // orange
  Nolan: "#eab308",   // yellow
  Phill: "#06b6d4",   // cyan
  Will: "#ec4899",    // pink
};

export const PLAYERS: Player[] = [
  {
    name: "Mike",
    color: PLAYER_COLORS.Mike,
    teams: [
      { name: "Duke", seed: 1, region: "East", eliminated: false },
      { name: "Texas A&M", seed: 10, region: "South", eliminated: false },
      { name: "Wisconsin", seed: 5, region: "West", eliminated: false },
      { name: "Tennessee", seed: 6, region: "Midwest", eliminated: false },
      { name: "Missouri", seed: 10, region: "West", eliminated: false },
      { name: "Texas", seed: 11, region: "West", eliminated: false },
      { name: "Utah State", seed: 9, region: "West", eliminated: false },
      { name: "Clemson", seed: 8, region: "South", eliminated: false },
    ],
  },
  {
    name: "Noah",
    color: PLAYER_COLORS.Noah,
    teams: [
      { name: "Michigan", seed: 1, region: "Midwest", eliminated: false },
      { name: "Illinois", seed: 3, region: "South", eliminated: false },
      { name: "Kansas", seed: 4, region: "East", eliminated: false },
      { name: "UCF", seed: 10, region: "East", eliminated: false },
      { name: "McNeese", seed: 12, region: "South", eliminated: false },
      { name: "High Point", seed: 12, region: "West", eliminated: false },
      { name: "North Dakota State", seed: 14, region: "East", eliminated: false },
      { name: "Prairie View A&M", seed: 16, region: "South", eliminated: false },
    ],
  },
  {
    name: "Miller",
    color: PLAYER_COLORS.Miller,
    teams: [
      { name: "Florida", seed: 1, region: "South", eliminated: false },
      { name: "Purdue", seed: 2, region: "West", eliminated: false },
      { name: "Kentucky", seed: 7, region: "Midwest", eliminated: false },
      { name: "Louisville", seed: 6, region: "East", eliminated: false },
      { name: "Alabama", seed: 4, region: "Midwest", eliminated: false },
      { name: "Villanova", seed: 8, region: "West", eliminated: false },
      { name: "Ohio State", seed: 8, region: "East", eliminated: false },
      { name: "Idaho", seed: 15, region: "South", eliminated: false },
    ],
  },
  {
    name: "Jon",
    color: PLAYER_COLORS.Jon,
    teams: [
      { name: "Arizona", seed: 1, region: "West", eliminated: false },
      { name: "Vanderbilt", seed: 5, region: "South", eliminated: false },
      { name: "UCLA", seed: 7, region: "East", eliminated: false },
      { name: "South Florida", seed: 11, region: "East", eliminated: false },
      { name: "Akron", seed: 12, region: "Midwest", eliminated: false },
      { name: "Saint Mary's", seed: 7, region: "South", eliminated: false },
      { name: "Cal Baptist", seed: 13, region: "East", eliminated: false },
      { name: "Furman", seed: 15, region: "East", eliminated: false },
    ],
  },
  {
    name: "Brett",
    color: PLAYER_COLORS.Brett,
    teams: [
      { name: "Iowa State", seed: 2, region: "Midwest", eliminated: false },
      { name: "Gonzaga", seed: 3, region: "West", eliminated: false },
      { name: "St. John's", seed: 5, region: "East", eliminated: false },
      { name: "VCU", seed: 11, region: "South", eliminated: false },
      { name: "TCU", seed: 9, region: "East", eliminated: false },
      { name: "Saint Louis", seed: 9, region: "Midwest", eliminated: false },
      { name: "Penn", seed: 14, region: "South", eliminated: false },
      { name: "LIU", seed: 16, region: "West", eliminated: false },
    ],
  },
  {
    name: "Nolan",
    color: PLAYER_COLORS.Nolan,
    teams: [
      { name: "Houston", seed: 2, region: "South", eliminated: false },
      { name: "Iowa", seed: 9, region: "South", eliminated: false },
      { name: "BYU", seed: 6, region: "West", eliminated: false },
      { name: "Texas Tech", seed: 5, region: "Midwest", eliminated: false },
      { name: "Northern Iowa", seed: 12, region: "East", eliminated: false },
      { name: "Wright State", seed: 14, region: "Midwest", eliminated: false },
      { name: "Hofstra", seed: 13, region: "Midwest", eliminated: false },
      { name: "Tennessee State", seed: 15, region: "Midwest", eliminated: false },
    ],
  },
  {
    name: "Phill",
    color: PLAYER_COLORS.Phill,
    teams: [
      { name: "UConn", seed: 2, region: "East", eliminated: false },
      { name: "Arkansas", seed: 4, region: "West", eliminated: false },
      { name: "Miami (OH)", seed: 11, region: "Midwest", eliminated: false },
      { name: "Santa Clara", seed: 10, region: "Midwest", eliminated: false },
      { name: "Hawaii", seed: 13, region: "West", eliminated: false },
      { name: "Troy", seed: 13, region: "South", eliminated: false },
      { name: "Queens", seed: 15, region: "West", eliminated: false },
      { name: "Siena", seed: 16, region: "East", eliminated: false },
    ],
  },
  {
    name: "Will",
    color: PLAYER_COLORS.Will,
    teams: [
      { name: "Michigan State", seed: 3, region: "East", eliminated: false },
      { name: "Virginia", seed: 3, region: "Midwest", eliminated: false },
      { name: "UNC", seed: 6, region: "South", eliminated: false },
      { name: "Nebraska", seed: 4, region: "South", eliminated: false },
      { name: "Miami FL", seed: 7, region: "West", eliminated: false },
      { name: "Georgia", seed: 8, region: "Midwest", eliminated: false },
      { name: "Kennesaw State", seed: 14, region: "West", eliminated: false },
      { name: "Howard", seed: 16, region: "Midwest", eliminated: false },
    ],
  },
];

// Map from team name to player name for quick lookup
export function getTeamOwner(teamName: string): string | null {
  for (const player of PLAYERS) {
    for (const team of player.teams) {
      if (team.name === teamName) {
        return player.name;
      }
    }
  }
  return null;
}

// Get team info
export function getTeamInfo(teamName: string): { player: string; seed: number; region: string } | null {
  for (const player of PLAYERS) {
    for (const team of player.teams) {
      if (team.name === teamName) {
        return { player: player.name, seed: team.seed, region: team.region };
      }
    }
  }
  return null;
}
