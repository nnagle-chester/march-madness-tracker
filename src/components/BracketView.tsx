"use client";

import { useState, useMemo } from "react";
import { REGIONS, RegionBracket } from "@/data/bracket";
import {
  PLAYERS,
  PLAYER_COLORS,
  ROUND_POINTS,
  ROUND_NAMES,
  GameResult,
  getTeamOwner,
  getTeamInfo,
} from "@/data/teams";
import { LiveGame } from "@/lib/espn";

interface BracketViewProps {
  results: GameResult[];
  liveGames: LiveGame[];
  allGames: LiveGame[];
}

// Standard NCAA bracket seeding matchups for Round of 64
const SEED_MATCHUPS: [number, number][] = [
  [1, 16], [8, 9], [5, 12], [4, 13],
  [6, 11], [3, 14], [7, 10], [2, 15],
];

interface MatchupInfo {
  topTeam: string;
  bottomTeam: string;
  topSeed: number;
  bottomSeed: number;
  winner?: string;
  topScore?: number;
  bottomScore?: number;
  isLive: boolean;
  round: number;
  region: string;
}

// ─── Bracket Verification ───────────────────────────────────────────────────

function verifyBracketMatchups(allGames: LiveGame[]): string[] {
  const mismatches: string[] = [];
  if (allGames.length === 0) return mismatches;

  // Build expected R64 pairs from bracket.ts
  const expectedPairs: { region: string; team1: string; team2: string }[] = [];
  for (const region of REGIONS) {
    for (const [topSeed, bottomSeed] of SEED_MATCHUPS) {
      expectedPairs.push({
        region: region.name,
        team1: region.teams[topSeed],
        team2: region.teams[bottomSeed],
      });
    }
  }

  // Build a set of all teams in our bracket
  const allBracketTeams = new Set<string>();
  for (const region of REGIONS) {
    for (const seed in region.teams) {
      allBracketTeams.add(region.teams[parseInt(seed)]);
    }
  }

  // Filter allGames to R64 games only (round 1, and both teams are in our bracket)
  const r64Games = allGames.filter((g) => {
    return g.round === 1 && allBracketTeams.has(g.team1) && allBracketTeams.has(g.team2);
  });

  // For each R64 game from ESPN, check it matches an expected pair
  for (const game of r64Games) {
    const matchesExpected = expectedPairs.some(
      (p) =>
        (p.team1 === game.team1 && p.team2 === game.team2) ||
        (p.team1 === game.team2 && p.team2 === game.team1)
    );
    if (!matchesExpected) {
      mismatches.push(
        `ESPN shows ${game.team1} vs ${game.team2} but this pairing is not in our bracket data`
      );
    }
  }

  // Also check: for each expected pair, is there a matching ESPN game?
  for (const pair of expectedPairs) {
    const hasGame = r64Games.some(
      (g) =>
        (g.team1 === pair.team1 && g.team2 === pair.team2) ||
        (g.team1 === pair.team2 && g.team2 === pair.team1)
    );
    if (!hasGame && r64Games.length >= 16) {
      // Only flag missing pairs if we have a meaningful number of R64 games
      mismatches.push(
        `${pair.region}: Expected ${pair.team1} vs ${pair.team2} but no matching ESPN game found`
      );
    }
  }

  return mismatches;
}

// ─── Core Matchup Logic ─────────────────────────────────────────────────────

function getMatchupsForRegion(
  region: RegionBracket,
  results: GameResult[],
  liveGames: LiveGame[]
): MatchupInfo[][] {
  const rounds: MatchupInfo[][] = [];

  // Live game lookup
  const liveMap = new Map<string, LiveGame>();
  for (const g of liveGames) {
    liveMap.set(`${g.team1}-${g.team2}`, g);
    liveMap.set(`${g.team2}-${g.team1}`, g);
  }

  // Round 1 matchups
  const r1: MatchupInfo[] = SEED_MATCHUPS.map(([topSeed, bottomSeed]) => {
    const topTeam = region.teams[topSeed];
    const bottomTeam = region.teams[bottomSeed];

    let winner: string | undefined;
    let topScore: number | undefined;
    let bottomScore: number | undefined;
    let isLive = false;

    for (const result of results) {
      if (result.round === 1) {
        if (
          (result.winner === topTeam && result.loser === bottomTeam) ||
          (result.winner === bottomTeam && result.loser === topTeam)
        ) {
          winner = result.winner;
          if (result.winner === topTeam) {
            topScore = result.winnerScore;
            bottomScore = result.loserScore;
          } else {
            topScore = result.loserScore;
            bottomScore = result.winnerScore;
          }
          break;
        }
      }
    }

    const liveKey = `${topTeam}-${bottomTeam}`;
    const live = liveMap.get(liveKey);
    if (live) {
      isLive = true;
      topScore = live.team1 === topTeam ? live.score1 : live.score2;
      bottomScore = live.team1 === bottomTeam ? live.score1 : live.score2;
    }

    return {
      topTeam, bottomTeam, topSeed, bottomSeed,
      winner, topScore, bottomScore, isLive,
      round: 1, region: region.name,
    };
  });
  rounds.push(r1);

  // Later rounds
  for (let round = 2; round <= 4; round++) {
    const prevRound = rounds[round - 2];
    const matchups: MatchupInfo[] = [];

    for (let i = 0; i < prevRound.length; i += 2) {
      const topWinner = prevRound[i]?.winner || "";
      const bottomWinner = prevRound[i + 1]?.winner || "";

      let winner: string | undefined;
      let topScore: number | undefined;
      let bottomScore: number | undefined;
      let isLive = false;

      if (topWinner && bottomWinner) {
        for (const result of results) {
          if (result.round === round) {
            if (
              (result.winner === topWinner && result.loser === bottomWinner) ||
              (result.winner === bottomWinner && result.loser === topWinner)
            ) {
              winner = result.winner;
              if (result.winner === topWinner) {
                topScore = result.winnerScore;
                bottomScore = result.loserScore;
              } else {
                topScore = result.loserScore;
                bottomScore = result.winnerScore;
              }
              break;
            }
          }
        }

        const liveKey = `${topWinner}-${bottomWinner}`;
        const live = liveMap.get(liveKey);
        if (live) {
          isLive = true;
          topScore = live.team1 === topWinner ? live.score1 : live.score2;
          bottomScore = live.team1 === bottomWinner ? live.score1 : live.score2;
        }
      }

      const topSeed = getTeamInfo(topWinner)?.seed || 0;
      const bottomSeed = getTeamInfo(bottomWinner)?.seed || 0;

      matchups.push({
        topTeam: topWinner || "TBD",
        bottomTeam: bottomWinner || "TBD",
        topSeed, bottomSeed,
        winner, topScore, bottomScore, isLive,
        round, region: region.name,
      });
    }
    rounds.push(matchups);
  }

  return rounds;
}

// ─── TeamLine ───────────────────────────────────────────────────────────────

function TeamLine({
  teamName, seed, isWinner, isLoser, isLive, score,
}: {
  teamName: string;
  seed: number;
  isWinner: boolean;
  isLoser: boolean;
  isLive: boolean;
  score?: number;
}) {
  const owner = getTeamOwner(teamName);
  const color = owner ? PLAYER_COLORS[owner] : "#d1d5db";
  const isTBD = teamName === "TBD";

  return (
    <div
      className={`flex items-center gap-1 px-1.5 py-0.5 text-[11px] leading-tight ${
        isLoser ? "opacity-35 line-through" : isWinner ? "font-semibold" : isTBD ? "text-gray-300 italic" : ""
      } ${isLive ? "live-pulse" : ""}`}
    >
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-gray-400 w-3 text-[10px]">
        {seed || ""}
      </span>
      <span className={`truncate ${isWinner ? "text-gray-900" : "text-gray-700"}`}>
        {teamName}
      </span>
      {score !== undefined && (
        <span className="ml-auto text-gray-500 font-mono text-[10px]">
          {score}
        </span>
      )}
    </div>
  );
}

// ─── GameCell ────────────────────────────────────────────────────────────────

function GameCell({
  matchup, onClick,
}: {
  matchup: MatchupInfo;
  onClick: () => void;
}) {
  const isTopWinner = matchup.winner === matchup.topTeam;
  const isBottomWinner = matchup.winner === matchup.bottomTeam;
  const isTBDGame = matchup.topTeam === "TBD" && matchup.bottomTeam === "TBD";

  return (
    <button
      onClick={onClick}
      className={`w-full bg-white border rounded overflow-hidden hover:shadow-md transition-all text-left ${
        matchup.isLive
          ? "border-red-300 shadow-[0_0_6px_rgba(239,68,68,0.1)]"
          : isTBDGame
          ? "border-dashed border-gray-200 bg-gray-50/50"
          : "border-gray-200"
      }`}
      style={{ minWidth: "130px", maxWidth: "180px" }}
    >
      {matchup.isLive && (
        <div className="bg-red-50 text-red-600 text-[9px] text-center py-px font-medium">
          LIVE
        </div>
      )}
      <div className="divide-y divide-gray-100">
        <TeamLine
          teamName={matchup.topTeam}
          seed={matchup.topSeed}
          isWinner={isTopWinner}
          isLoser={isBottomWinner}
          isLive={matchup.isLive}
          score={matchup.topScore}
        />
        <TeamLine
          teamName={matchup.bottomTeam}
          seed={matchup.bottomSeed}
          isWinner={isBottomWinner}
          isLoser={isTopWinner}
          isLive={matchup.isLive}
          score={matchup.bottomScore}
        />
      </div>
    </button>
  );
}

// ─── GameModal ───────────────────────────────────────────────────────────────

function GameModal({ matchup, onClose }: { matchup: MatchupInfo; onClose: () => void }) {
  const topOwner = getTeamOwner(matchup.topTeam);
  const bottomOwner = getTeamOwner(matchup.bottomTeam);
  const roundPoints = ROUND_POINTS[matchup.round] || 0;
  const topInfo = getTeamInfo(matchup.topTeam);
  const bottomInfo = getTeamInfo(matchup.bottomTeam);

  let topUpsetBonus = 0;
  let bottomUpsetBonus = 0;
  if (topInfo && bottomInfo) {
    if (topInfo.seed > bottomInfo.seed) topUpsetBonus = topInfo.seed - bottomInfo.seed;
    if (bottomInfo.seed > topInfo.seed) bottomUpsetBonus = bottomInfo.seed - topInfo.seed;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-200 rounded-2xl p-6 max-w-md w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            {matchup.region} — {ROUND_NAMES[matchup.round] || `Round ${matchup.round}`}
          </h3>
          {matchup.isLive && (
            <span className="live-pulse text-red-600 text-sm font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              LIVE
            </span>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900">
            {"\u2715"}
          </button>
        </div>

        <div className="space-y-3 mb-4">
          <div className={`p-3 rounded-lg border ${matchup.winner === matchup.topTeam ? "border-green-300 bg-green-50" : "border-gray-200"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: topOwner ? PLAYER_COLORS[topOwner] : "#d1d5db" }} />
                <span className="font-semibold text-gray-900">({matchup.topSeed}) {matchup.topTeam}</span>
              </div>
              {matchup.topScore !== undefined && (
                <span className="text-xl font-bold text-gray-900">{matchup.topScore}</span>
              )}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Owner: <span style={{ color: topOwner ? PLAYER_COLORS[topOwner] : "#9ca3af" }}>{topOwner || "None"}</span>
            </div>
            {matchup.winner === matchup.topTeam && (
              <span className="text-xs text-green-600 font-medium">WINNER</span>
            )}
          </div>

          <div className="text-center text-gray-400 text-sm">VS</div>

          <div className={`p-3 rounded-lg border ${matchup.winner === matchup.bottomTeam ? "border-green-300 bg-green-50" : "border-gray-200"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: bottomOwner ? PLAYER_COLORS[bottomOwner] : "#d1d5db" }} />
                <span className="font-semibold text-gray-900">({matchup.bottomSeed}) {matchup.bottomTeam}</span>
              </div>
              {matchup.bottomScore !== undefined && (
                <span className="text-xl font-bold text-gray-900">{matchup.bottomScore}</span>
              )}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Owner: <span style={{ color: bottomOwner ? PLAYER_COLORS[bottomOwner] : "#9ca3af" }}>{bottomOwner || "None"}</span>
            </div>
            {matchup.winner === matchup.bottomTeam && (
              <span className="text-xs text-green-600 font-medium">WINNER</span>
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-500 mb-2">Points at Stake</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">Base ({ROUND_NAMES[matchup.round]}):</span>
              <span className="text-gray-900 ml-1">{roundPoints} pts</span>
            </div>
            {topUpsetBonus > 0 && (
              <div>
                <span className="text-gray-500">{matchup.topTeam} upset:</span>
                <span className="text-[#E8590C] ml-1">+{topUpsetBonus}</span>
              </div>
            )}
            {bottomUpsetBonus > 0 && (
              <div>
                <span className="text-gray-500">{matchup.bottomTeam} upset:</span>
                <span className="text-[#E8590C] ml-1">+{bottomUpsetBonus}</span>
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200">
            <span className="text-xs text-gray-500">Players with skin in the game:</span>
            <div className="flex gap-2 mt-1">
              {[topOwner, bottomOwner].filter(Boolean).map((owner) => (
                <span
                  key={owner}
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: PLAYER_COLORS[owner!] + "15",
                    color: PLAYER_COLORS[owner!],
                  }}
                >
                  {owner}
                </span>
              ))}
              {!topOwner && !bottomOwner && (
                <span className="text-xs text-gray-400">No pool members</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Region Quadrant ─────────────────────────────────────────────────────────

function RegionQuadrant({
  region, results, liveGames, onGameClick,
}: {
  region: RegionBracket;
  results: GameResult[];
  liveGames: LiveGame[];
  onGameClick: (m: MatchupInfo) => void;
}) {
  const rounds = getMatchupsForRegion(region, results, liveGames);
  const roundLabels = ["R64", "R32", "S16", "E8"];

  return (
    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
        <span className="w-1 h-4 bg-[#E8590C] rounded-full" />
        {region.name}
      </h3>

      <div className="flex gap-1">
        {rounds.map((roundMatchups, colIdx) => (
          <div
            key={colIdx}
            className="flex flex-col justify-around flex-1 gap-0.5"
          >
            <div className="text-[10px] text-gray-400 text-center mb-0.5 font-medium">
              {roundLabels[colIdx]}
            </div>
            {roundMatchups.map((m, i) => (
              <div key={i} className="flex-1 flex items-center justify-center px-0.5">
                <GameCell matchup={m} onClick={() => onGameClick(m)} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Final Four Center ───────────────────────────────────────────────────────

function FinalFourCenter({
  results, liveGames, onGameClick,
}: {
  results: GameResult[];
  liveGames: LiveGame[];
  onGameClick: (m: MatchupInfo) => void;
}) {
  // Get region champions from bracket data
  const regionRounds = REGIONS.map((r) => getMatchupsForRegion(r, results, liveGames));

  // E8 winner = region champion (round index 3, single game)
  const eastChamp = regionRounds[0]?.[3]?.[0]?.winner || "";
  const southChamp = regionRounds[1]?.[3]?.[0]?.winner || "";
  const midwestChamp = regionRounds[2]?.[3]?.[0]?.winner || "";
  const westChamp = regionRounds[3]?.[3]?.[0]?.winner || "";

  const liveMap = new Map<string, LiveGame>();
  for (const g of liveGames) {
    liveMap.set(`${g.team1}-${g.team2}`, g);
    liveMap.set(`${g.team2}-${g.team1}`, g);
  }

  function buildFFMatchup(team1: string, team2: string, label: string): MatchupInfo {
    let winner: string | undefined;
    let topScore: number | undefined;
    let bottomScore: number | undefined;
    let isLive = false;

    if (team1 && team2) {
      for (const result of results) {
        if (result.round === 5) {
          if (
            (result.winner === team1 && result.loser === team2) ||
            (result.winner === team2 && result.loser === team1)
          ) {
            winner = result.winner;
            topScore = result.winner === team1 ? result.winnerScore : result.loserScore;
            bottomScore = result.winner === team2 ? result.winnerScore : result.loserScore;
            break;
          }
        }
      }
      const live = liveMap.get(`${team1}-${team2}`);
      if (live) {
        isLive = true;
        topScore = live.team1 === team1 ? live.score1 : live.score2;
        bottomScore = live.team1 === team2 ? live.score1 : live.score2;
      }
    }

    return {
      topTeam: team1 || "TBD",
      bottomTeam: team2 || "TBD",
      topSeed: getTeamInfo(team1)?.seed || 0,
      bottomSeed: getTeamInfo(team2)?.seed || 0,
      winner, topScore, bottomScore, isLive,
      round: 5, region: "Final Four",
    };
  }

  // FF Game 1: East vs South (REGIONS[0] vs REGIONS[1])
  const ff1 = buildFFMatchup(eastChamp, southChamp, "East vs South");
  // FF Game 2: Midwest vs West (REGIONS[2] vs REGIONS[3])
  const ff2 = buildFFMatchup(midwestChamp, westChamp, "Midwest vs West");

  // Championship
  const ff1Winner = ff1.winner || "";
  const ff2Winner = ff2.winner || "";
  let champWinner: string | undefined;
  let champTopScore: number | undefined;
  let champBottomScore: number | undefined;
  let champIsLive = false;

  if (ff1Winner && ff2Winner) {
    for (const result of results) {
      if (result.round === 6) {
        if (
          (result.winner === ff1Winner && result.loser === ff2Winner) ||
          (result.winner === ff2Winner && result.loser === ff1Winner)
        ) {
          champWinner = result.winner;
          champTopScore = result.winner === ff1Winner ? result.winnerScore : result.loserScore;
          champBottomScore = result.winner === ff2Winner ? result.winnerScore : result.loserScore;
          break;
        }
      }
    }
    const live = liveMap.get(`${ff1Winner}-${ff2Winner}`);
    if (live) {
      champIsLive = true;
      champTopScore = live.team1 === ff1Winner ? live.score1 : live.score2;
      champBottomScore = live.team1 === ff2Winner ? live.score1 : live.score2;
    }
  }

  const championship: MatchupInfo = {
    topTeam: ff1Winner || "TBD",
    bottomTeam: ff2Winner || "TBD",
    topSeed: getTeamInfo(ff1Winner)?.seed || 0,
    bottomSeed: getTeamInfo(ff2Winner)?.seed || 0,
    winner: champWinner,
    topScore: champTopScore,
    bottomScore: champBottomScore,
    isLive: champIsLive,
    round: 6,
    region: "Championship",
  };

  return (
    <div className="flex items-center justify-center gap-4 py-3">
      {/* FF Game 1 */}
      <div className="text-center">
        <div className="text-[10px] text-gray-400 font-medium mb-1">Final Four</div>
        <div className="text-[9px] text-gray-400 mb-0.5">East vs South</div>
        <GameCell matchup={ff1} onClick={() => onGameClick(ff1)} />
      </div>

      {/* Championship */}
      <div className="text-center">
        <div className="text-[10px] text-[#E8590C] font-bold mb-1">Championship</div>
        <GameCell matchup={championship} onClick={() => onGameClick(championship)} />
        {champWinner && (
          <div className="mt-1 text-xs font-bold text-[#E8590C]">
            {"\uD83C\uDFC6"} {champWinner}
          </div>
        )}
      </div>

      {/* FF Game 2 */}
      <div className="text-center">
        <div className="text-[10px] text-gray-400 font-medium mb-1">Final Four</div>
        <div className="text-[9px] text-gray-400 mb-0.5">Midwest vs West</div>
        <GameCell matchup={ff2} onClick={() => onGameClick(ff2)} />
      </div>
    </div>
  );
}

// ─── Player Legend ───────────────────────────────────────────────────────────

function PlayerLegend() {
  return (
    <div className="flex flex-wrap gap-3 mb-4 p-3 bg-white border border-gray-200 rounded-xl card-shadow">
      {PLAYERS.map((p) => (
        <div key={p.name} className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-xs text-gray-500">{p.name}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main BracketView ────────────────────────────────────────────────────────

export default function BracketView({ results, liveGames, allGames }: BracketViewProps) {
  const [selectedGame, setSelectedGame] = useState<MatchupInfo | null>(null);

  const bracketMismatches = useMemo(
    () => verifyBracketMatchups(allGames),
    [allGames]
  );

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-2">Tournament Bracket</h2>
      <p className="text-sm text-gray-500 mb-4">Click any game to see details and points at stake</p>

      {/* Bracket verification error banner */}
      {bracketMismatches.length > 0 && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-4">
          <div className="font-bold text-sm mb-1">Bracket Data Mismatch</div>
          <div className="text-xs space-y-0.5">
            {bracketMismatches.map((msg, i) => (
              <div key={i}>{msg}</div>
            ))}
          </div>
          <div className="text-xs mt-2 text-red-500">
            The bracket data may need updating. Do not rely on hardcoded data — investigate the API structure.
          </div>
        </div>
      )}

      <PlayerLegend />

      {/* Bracket grid */}
      <div className="overflow-x-auto pb-4">
        <div style={{ minWidth: "1200px" }}>
          {/* Top row: East | West */}
          <div className="flex gap-4 flex-nowrap">
            <RegionQuadrant
              region={REGIONS[0]}
              results={results}
              liveGames={liveGames}
              onGameClick={setSelectedGame}
            />
            <RegionQuadrant
              region={REGIONS[3]}
              results={results}
              liveGames={liveGames}
              onGameClick={setSelectedGame}
            />
          </div>

          {/* Center: Final Four + Championship */}
          <div className="border-t border-b border-gray-200 my-2">
            <FinalFourCenter
              results={results}
              liveGames={liveGames}
              onGameClick={setSelectedGame}
            />
          </div>

          {/* Bottom row: South | Midwest */}
          <div className="flex gap-4 flex-nowrap">
            <RegionQuadrant
              region={REGIONS[1]}
              results={results}
              liveGames={liveGames}
              onGameClick={setSelectedGame}
            />
            <RegionQuadrant
              region={REGIONS[2]}
              results={results}
              liveGames={liveGames}
              onGameClick={setSelectedGame}
            />
          </div>
        </div>
      </div>

      {selectedGame && (
        <GameModal matchup={selectedGame} onClose={() => setSelectedGame(null)} />
      )}
    </div>
  );
}
