// Full 64-team bracket structure organized by region and seed matchups
// Each region has 16 teams seeded 1-16 in standard NCAA bracket format

export interface BracketMatchup {
  region: string;
  round: number;
  gameNumber: number; // position in the bracket
  topSeed?: number;
  bottomSeed?: number;
  topTeam?: string;
  bottomTeam?: string;
  winner?: string;
  topScore?: number;
  bottomScore?: number;
  isLive?: boolean;
  nextGame?: number; // game number this feeds into
}

// Standard NCAA bracket seeding matchups for Round of 64
// 1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15
const SEED_MATCHUPS = [
  [1, 16], [8, 9], [5, 12], [4, 13],
  [6, 11], [3, 14], [7, 10], [2, 15],
];

export interface RegionBracket {
  name: string;
  teams: Record<number, string>; // seed -> team name
}

export const REGIONS: RegionBracket[] = [
  {
    name: "East",
    teams: {
      1: "Duke",
      2: "UConn",
      3: "Michigan State",
      4: "Kansas",
      5: "St. John's",
      6: "Louisville",
      7: "UCLA",
      8: "Ohio State",
      9: "TCU",
      10: "UCF",
      11: "South Florida",
      12: "Northern Iowa",
      13: "Cal Baptist",
      14: "North Dakota State",
      15: "Furman",
      16: "Siena",
    },
  },
  {
    name: "South",
    teams: {
      1: "Florida",
      2: "Houston",
      3: "Illinois",
      4: "Nebraska",
      5: "Vanderbilt",
      6: "UNC",
      7: "Saint Mary's",
      8: "Clemson",
      9: "Iowa",
      10: "Texas A&M",
      11: "VCU",
      12: "McNeese",
      13: "Troy",
      14: "Penn",
      15: "Idaho",
      16: "Prairie View A&M",
    },
  },
  {
    name: "Midwest",
    teams: {
      1: "Michigan",
      2: "Iowa State",
      3: "Virginia",
      4: "Alabama",
      5: "Texas Tech",
      6: "Tennessee",
      7: "Kentucky",
      8: "Georgia",
      9: "Saint Louis",
      10: "Santa Clara",
      11: "Miami (OH)",
      12: "Akron",
      13: "Hofstra",
      14: "Wright State",
      15: "Tennessee State",
      16: "Howard",
    },
  },
  {
    name: "West",
    teams: {
      1: "Arizona",
      2: "Purdue",
      3: "Gonzaga",
      4: "Arkansas",
      5: "Wisconsin",
      6: "BYU",
      7: "Miami FL",
      8: "Villanova",
      9: "Utah State",
      10: "Missouri",
      11: "Texas",
      12: "High Point",
      13: "Hawaii",
      14: "Kennesaw State",
      15: "Queens",
      16: "LIU",
    },
  },
];

export function generateRegionMatchups(region: RegionBracket, regionIndex: number): BracketMatchup[] {
  const matchups: BracketMatchup[] = [];
  const baseGameNumber = regionIndex * 15; // 15 games per region (8+4+2+1)

  // Round of 64 (8 games per region)
  SEED_MATCHUPS.forEach(([topSeed, bottomSeed], i) => {
    matchups.push({
      region: region.name,
      round: 1,
      gameNumber: baseGameNumber + i,
      topSeed,
      bottomSeed,
      topTeam: region.teams[topSeed],
      bottomTeam: region.teams[bottomSeed],
      nextGame: baseGameNumber + 8 + Math.floor(i / 2),
    });
  });

  // Round of 32 (4 games per region)
  for (let i = 0; i < 4; i++) {
    matchups.push({
      region: region.name,
      round: 2,
      gameNumber: baseGameNumber + 8 + i,
      nextGame: baseGameNumber + 12 + Math.floor(i / 2),
    });
  }

  // Sweet 16 (2 games per region)
  for (let i = 0; i < 2; i++) {
    matchups.push({
      region: region.name,
      round: 3,
      gameNumber: baseGameNumber + 12 + i,
      nextGame: baseGameNumber + 14,
    });
  }

  // Elite 8 (1 game per region)
  matchups.push({
    region: region.name,
    round: 4,
    gameNumber: baseGameNumber + 14,
    nextGame: 60 + Math.floor(regionIndex / 2), // Final Four games
  });

  return matchups;
}

export function generateFullBracket(): BracketMatchup[] {
  const allMatchups: BracketMatchup[] = [];

  REGIONS.forEach((region, i) => {
    allMatchups.push(...generateRegionMatchups(region, i));
  });

  // Final Four (2 games): East vs South, Midwest vs West
  allMatchups.push({
    region: "Final Four",
    round: 5,
    gameNumber: 60,
    nextGame: 62,
  });
  allMatchups.push({
    region: "Final Four",
    round: 5,
    gameNumber: 61,
    nextGame: 62,
  });

  // Championship (1 game)
  allMatchups.push({
    region: "Championship",
    round: 6,
    gameNumber: 62,
  });

  return allMatchups;
}
