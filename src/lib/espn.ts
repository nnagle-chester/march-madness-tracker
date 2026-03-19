import { GameResult } from "@/data/teams";

const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard";

// Map ESPN full team names to our roster names
const TEAM_ALIAS_MAP: Record<string, string> = {
  "Texas A&M Aggies": "Texas A&M",
  "Wisconsin Badgers": "Wisconsin",
  "Tennessee Volunteers": "Tennessee",
  "Michigan Wolverines": "Michigan",
  "Illinois Fighting Illini": "Illinois",
  "Florida Gators": "Florida",
  "Arizona Wildcats": "Arizona",
  "Iowa State Cyclones": "Iowa State",
  "Houston Cougars": "Houston",
  "UConn Huskies": "UConn",
  "Miami Hurricanes": "Miami FL",
  "Miami (OH) RedHawks": "Miami (OH)",
  "North Carolina Tar Heels": "UNC",
  "Prairie View A&M Panthers": "Prairie View A&M",
  "Saint Mary's Gaels": "Saint Mary's",
  "Saint Louis Billikens": "Saint Louis",
  "Michigan State Spartans": "Michigan State",
  "Virginia Cavaliers": "Virginia",
  "Iowa Hawkeyes": "Iowa",
  "Duke Blue Devils": "Duke",
  "Purdue Boilermakers": "Purdue",
  "Alabama Crimson Tide": "Alabama",
  "Ohio State Buckeyes": "Ohio State",
  "Arkansas Razorbacks": "Arkansas",
  "Texas Tech Red Raiders": "Texas Tech",
  "Missouri Tigers": "Missouri",
  "Villanova Wildcats": "Villanova",
  "Kentucky Wildcats": "Kentucky",
  "Louisville Cardinals": "Louisville",
  "Nebraska Cornhuskers": "Nebraska",
  "Georgia Bulldogs": "Georgia",
  "Vanderbilt Commodores": "Vanderbilt",
  "UCF Knights": "UCF",
  "Kansas Jayhawks": "Kansas",
  "Gonzaga Bulldogs": "Gonzaga",
  "St. John's Red Storm": "St. John's",
  "BYU Cougars": "BYU",
  "UCLA Bruins": "UCLA",
  "Clemson Tigers": "Clemson",
  "Texas Longhorns": "Texas",
  "TCU Horned Frogs": "TCU",
  "Santa Clara Broncos": "Santa Clara",
  "VCU Rams": "VCU",
  "South Florida Bulls": "South Florida",
  "McNeese Cowboys": "McNeese",
  "Northern Iowa Panthers": "Northern Iowa",
  "High Point Panthers": "High Point",
  "Akron Zips": "Akron",
  "Troy Trojans": "Troy",
  "Hofstra Pride": "Hofstra",
  "Cal Baptist Lancers": "Cal Baptist",
  "Hawaii Rainbow Warriors": "Hawaii",
  "Penn Quakers": "Penn",
  "Wright State Raiders": "Wright State",
  "North Dakota State Bison": "North Dakota State",
  "Kennesaw State Owls": "Kennesaw State",
  "Furman Paladins": "Furman",
  "Idaho Vandals": "Idaho",
  "Tennessee State Tigers": "Tennessee State",
  "Queens Royals": "Queens",
  "Siena Saints": "Siena",
  "LIU Sharks": "LIU",
  "Howard Bison": "Howard",
};

function normalizeTeamName(espnName: string): string {
  // Direct match
  if (TEAM_ALIAS_MAP[espnName]) {
    return TEAM_ALIAS_MAP[espnName];
  }

  // Try partial matching - strip common suffixes
  for (const [espnFull, rosterName] of Object.entries(TEAM_ALIAS_MAP)) {
    if (espnName.includes(rosterName) || espnFull.includes(espnName)) {
      return rosterName;
    }
  }

  // Last resort: return as-is and hope it matches
  return espnName;
}

// ESPN status types
type ESPNStatusType = "STATUS_SCHEDULED" | "STATUS_IN_PROGRESS" | "STATUS_FINAL" | "STATUS_HALFTIME";

interface ESPNCompetitor {
  team: {
    displayName: string;
    shortDisplayName: string;
    abbreviation: string;
  };
  score: string;
  winner?: boolean;
  curatedRank?: {
    current: number;
  };
  seed?: string;
}

interface ESPNCompetition {
  id: string;
  competitors: ESPNCompetitor[];
  status: {
    type: {
      name: ESPNStatusType;
      completed: boolean;
    };
    displayClock: string;
    period: number;
  };
  notes?: Array<{ headline: string }>;
}

interface ESPNEvent {
  id: string;
  date: string;
  competitions: ESPNCompetition[];
  season: {
    year: number;
    type: number;
  };
}

interface ESPNResponse {
  events: ESPNEvent[];
}

export interface LiveGame {
  gameId: string;
  team1: string;
  team2: string;
  score1: number;
  score2: number;
  isLive: boolean;
  isComplete: boolean;
  status: string;
  clock: string;
  period: number;
  winner?: string;
  loser?: string;
  round?: number;
  startTime?: string;
}

// Returns 0 for First Four (no points), 1-6 for tournament rounds
function detectRound(notes?: Array<{ headline: string }>): number {
  if (!notes || notes.length === 0) return 1;
  const headline = notes[0].headline.toLowerCase();
  // First Four / play-in games get round 0 — excluded from scoring
  if (headline.includes("first four")) return 0;
  // Check later rounds before earlier ones to avoid substring collisions
  if (headline.includes("national championship")) return 6;
  if (headline.includes("final four") || headline.includes("semifinal")) return 5;
  if (headline.includes("elite eight") || headline.includes("elite 8")) return 4;
  if (headline.includes("sweet sixteen") || headline.includes("sweet 16")) return 3;
  if (headline.includes("second round") || headline.includes("round of 32") || headline.includes("2nd round")) return 2;
  // "first round" or "round of 64" or unrecognized → R64
  return 1;
}

export async function fetchESPNScores(dates?: string): Promise<LiveGame[]> {
  try {
    const params = new URLSearchParams({
      limit: "100",
      groups: "100", // NCAA tournament group
    });
    if (dates) {
      params.set("dates", dates);
    }

    const response = await fetch(`${ESPN_SCOREBOARD_URL}?${params}`, {
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      console.error("ESPN API error:", response.status);
      return [];
    }

    const data: ESPNResponse = await response.json();
    const games: LiveGame[] = [];

    for (const event of data.events) {
      for (const competition of event.competitions) {
        if (competition.competitors.length < 2) continue;

        const comp1 = competition.competitors[0];
        const comp2 = competition.competitors[1];

        const team1 = normalizeTeamName(comp1.team.displayName);
        const team2 = normalizeTeamName(comp2.team.displayName);
        const score1 = parseInt(comp1.score) || 0;
        const score2 = parseInt(comp2.score) || 0;
        const isComplete = competition.status.type.completed;
        const isLive =
          competition.status.type.name === "STATUS_IN_PROGRESS" ||
          competition.status.type.name === "STATUS_HALFTIME";
        const round = detectRound(competition.notes);

        const game: LiveGame = {
          gameId: competition.id,
          team1,
          team2,
          score1,
          score2,
          isLive,
          isComplete,
          status: competition.status.type.name,
          clock: competition.status.displayClock,
          period: competition.status.period,
          round,
          startTime: event.date,
        };

        if (isComplete) {
          if (comp1.winner) {
            game.winner = team1;
            game.loser = team2;
          } else if (comp2.winner) {
            game.winner = team2;
            game.loser = team1;
          } else {
            // fallback: higher score wins
            game.winner = score1 > score2 ? team1 : team2;
            game.loser = score1 > score2 ? team2 : team1;
          }
        }

        // Skip First Four games entirely (round 0)
        if (round === 0) continue;

        games.push(game);
      }
    }

    return games;
  } catch (error) {
    console.error("Failed to fetch ESPN scores:", error);
    return [];
  }
}

export function espnGamesToResults(games: LiveGame[]): GameResult[] {
  return games
    .filter((g) => g.isComplete && g.winner && g.loser && g.round && g.round >= 1)
    .map((g) => ({
      round: g.round!,
      winner: g.winner!,
      loser: g.loser!,
      winnerScore: g.winner === g.team1 ? g.score1 : g.score2,
      loserScore: g.winner === g.team1 ? g.score2 : g.score1,
      region: "",
      gameId: g.gameId,
    }));
}
