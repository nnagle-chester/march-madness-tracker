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

  const allBracketTeams = new Set<string>();
  for (const region of REGIONS) {
    for (const seed in region.teams) {
      allBracketTeams.add(region.teams[parseInt(seed)]);
    }
  }

  const r64Games = allGames.filter((g) => {
    return g.round === 1 && allBracketTeams.has(g.team1) && allBracketTeams.has(g.team2);
  });

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

  for (const pair of expectedPairs) {
    const hasGame = r64Games.some(
      (g) =>
        (g.team1 === pair.team1 && g.team2 === pair.team2) ||
        (g.team1 === pair.team2 && g.team2 === pair.team1)
    );
    if (!hasGame && r64Games.length >= 16) {
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

  const liveMap = new Map<string, LiveGame>();
  for (const g of liveGames) {
    liveMap.set(`${g.team1}-${g.team2}`, g);
    liveMap.set(`${g.team2}-${g.team1}`, g);
  }

  // Round 1
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

// ─── ESPN-Style Column Headers ──────────────────────────────────────────────

const ROUND_HEADERS = ["1ST ROUND", "2ND ROUND", "SWEET 16", "ELITE 8"];

// ─── TeamLine ───────────────────────────────────────────────────────────────

function TeamLine({
  teamName, seed, isWinner, isLoser, isLive, score, mirrored,
}: {
  teamName: string;
  seed: number;
  isWinner: boolean;
  isLoser: boolean;
  isLive: boolean;
  score?: number;
  mirrored?: boolean;
}) {
  const owner = getTeamOwner(teamName);
  const color = owner ? PLAYER_COLORS[owner] : "#d1d5db";
  const isTBD = teamName === "TBD";

  return (
    <div
      className={`flex items-center gap-1 px-1.5 py-[3px] text-[11px] leading-tight ${
        mirrored ? "flex-row-reverse" : ""
      } ${isLoser ? "opacity-35" : ""} ${isLive ? "live-pulse" : ""}`}
    >
      {/* Seed */}
      <span className={`text-gray-400 text-[10px] shrink-0 ${mirrored ? "text-right" : ""}`} style={{ width: "14px" }}>
        {seed || ""}
      </span>
      {/* Owner dot */}
      <div
        className="w-[6px] h-[6px] rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      {/* Team name */}
      <span className={`truncate flex-1 ${
        isWinner ? "font-bold text-gray-900" : isLoser ? "text-gray-400 line-through" : isTBD ? "text-gray-300 italic" : "text-gray-700"
      } ${mirrored ? "text-right" : ""}`}>
        {teamName}
      </span>
      {/* Score */}
      {score !== undefined && (
        <span className={`font-mono text-[10px] shrink-0 ${isWinner ? "font-bold text-gray-900" : "text-gray-500"}`}>
          {score}
        </span>
      )}
    </div>
  );
}

// ─── GameCell ────────────────────────────────────────────────────────────────

function GameCell({
  matchup, onClick, mirrored,
}: {
  matchup: MatchupInfo;
  onClick: () => void;
  mirrored?: boolean;
}) {
  const isTopWinner = matchup.winner === matchup.topTeam;
  const isBottomWinner = matchup.winner === matchup.bottomTeam;
  const isTBDGame = matchup.topTeam === "TBD" && matchup.bottomTeam === "TBD";

  return (
    <button
      onClick={onClick}
      className={`w-[140px] bg-white border rounded-sm overflow-hidden hover:shadow-md transition-shadow text-left ${
        matchup.isLive
          ? "border-green-400 border-l-[3px]"
          : isTBDGame
          ? "border-dashed border-gray-200 bg-gray-50/50"
          : "border-gray-300"
      }`}
    >
      {matchup.isLive && (
        <div className="bg-red-50 text-red-600 text-[8px] text-center py-px font-bold tracking-wider">
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
          mirrored={mirrored}
        />
        <TeamLine
          teamName={matchup.bottomTeam}
          seed={matchup.bottomSeed}
          isWinner={isBottomWinner}
          isLoser={isTopWinner}
          isLive={matchup.isLive}
          score={matchup.bottomScore}
          mirrored={mirrored}
        />
      </div>
    </button>
  );
}

// ─── Bracket Connectors ─────────────────────────────────────────────────────

function ConnectorPair({ mirrored }: { mirrored?: boolean }) {
  const borderSide = mirrored ? "border-l-2" : "border-r-2";
  return (
    <div className="flex flex-col" style={{ width: "16px" }}>
      <div className={`flex-1 ${borderSide} border-t-2 border-gray-200`} />
      <div className={`flex-1 ${borderSide} border-b-2 border-gray-200`} />
    </div>
  );
}

function HorizontalLine() {
  return <div className="border-t-2 border-gray-200" style={{ width: "8px" }} />;
}

// ─── Region Bracket ─────────────────────────────────────────────────────────

function RegionBracketView({
  region, results, liveGames, onGameClick, mirrored,
}: {
  region: RegionBracket;
  results: GameResult[];
  liveGames: LiveGame[];
  onGameClick: (m: MatchupInfo) => void;
  mirrored?: boolean;
}) {
  const rounds = getMatchupsForRegion(region, results, liveGames);
  const headers = mirrored ? [...ROUND_HEADERS].reverse() : ROUND_HEADERS;

  // Build columns: for each round, a column of games, then connectors
  // Left: R64 → conn → R32 → conn → S16 → conn → E8
  // Right (mirrored): E8 → conn → S16 → conn → R32 → conn → R64
  const orderedRounds = mirrored ? [...rounds].reverse() : rounds;

  // Heights: R64=8 games, R32=4, S16=2, E8=1
  // We use a fixed height container and justify-around to space things evenly

  return (
    <div className="flex flex-col">
      {/* Region name */}
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
        <span className="w-1 h-3 bg-[#E8590C] rounded-full" />
        {region.name}
      </h3>

      {/* Column headers */}
      <div className={`flex ${mirrored ? "flex-row-reverse" : ""}`}>
        {ROUND_HEADERS.map((h, i) => (
          <div key={i} className="text-[9px] text-gray-400 font-semibold tracking-wider text-center" style={{ width: "140px" }}>
            {h}
          </div>
        ))}
      </div>

      {/* Bracket body */}
      <div className={`flex items-stretch ${mirrored ? "flex-row-reverse" : ""}`} style={{ height: "380px" }}>
        {orderedRounds.map((roundMatchups, colIdx) => {
          const actualRoundIdx = mirrored ? (orderedRounds.length - 1 - colIdx) : colIdx;
          return (
            <div key={colIdx} className="flex items-stretch">
              {/* Round column */}
              <div className="flex flex-col justify-around" style={{ width: "140px" }}>
                {roundMatchups.map((m, i) => (
                  <div key={i} className="flex items-center justify-center">
                    <GameCell matchup={m} onClick={() => onGameClick(m)} mirrored={mirrored} />
                  </div>
                ))}
              </div>

              {/* Connector column (not after the last round) */}
              {colIdx < orderedRounds.length - 1 && (
                <div className="flex flex-col justify-around">
                  {Array.from({ length: roundMatchups.length / 2 }).map((_, i) => (
                    <div key={i} className="flex items-center">
                      {!mirrored && <HorizontalLine />}
                      <ConnectorPair mirrored={mirrored} />
                      {mirrored && <HorizontalLine />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Final Four Center Column ───────────────────────────────────────────────

function CenterColumn({
  results, liveGames, onGameClick,
}: {
  results: GameResult[];
  liveGames: LiveGame[];
  onGameClick: (m: MatchupInfo) => void;
}) {
  const regionRounds = REGIONS.map((r) => getMatchupsForRegion(r, results, liveGames));

  const eastChamp = regionRounds[0]?.[3]?.[0]?.winner || "";
  const southChamp = regionRounds[1]?.[3]?.[0]?.winner || "";
  const midwestChamp = regionRounds[2]?.[3]?.[0]?.winner || "";
  const westChamp = regionRounds[3]?.[3]?.[0]?.winner || "";

  const liveMap = new Map<string, LiveGame>();
  for (const g of liveGames) {
    liveMap.set(`${g.team1}-${g.team2}`, g);
    liveMap.set(`${g.team2}-${g.team1}`, g);
  }

  function buildFFMatchup(team1: string, team2: string): MatchupInfo {
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

  // FF Game 1: East vs South
  const ff1 = buildFFMatchup(eastChamp, southChamp);
  // FF Game 2: Midwest vs West
  const ff2 = buildFFMatchup(midwestChamp, westChamp);

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
    <div className="flex flex-col items-center justify-evenly h-full px-2" style={{ width: "180px" }}>
      {/* FF Game 1: East vs South */}
      <div className="text-center">
        <div className="text-[9px] text-gray-400 font-semibold tracking-wider mb-1">FINAL FOUR</div>
        <GameCell matchup={ff1} onClick={() => onGameClick(ff1)} />
      </div>

      {/* Championship */}
      <div className="text-center">
        <div className="text-[10px] text-[#E8590C] font-bold tracking-wider mb-1">CHAMPIONSHIP</div>
        <GameCell matchup={championship} onClick={() => onGameClick(championship)} />
        {champWinner && (
          <div className="mt-1.5 text-xs font-bold text-[#E8590C] flex items-center justify-center gap-1">
            {"\uD83C\uDFC6"} {champWinner}
          </div>
        )}
      </div>

      {/* FF Game 2: Midwest vs West */}
      <div className="text-center">
        <div className="text-[9px] text-gray-400 font-semibold tracking-wider mb-1">FINAL FOUR</div>
        <GameCell matchup={ff2} onClick={() => onGameClick(ff2)} />
      </div>
    </div>
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

// ─── Player Legend ───────────────────────────────────────────────────────────

function PlayerLegend() {
  return (
    <div className="flex flex-wrap gap-3 mb-3 p-2.5 bg-white border border-gray-200 rounded-lg">
      {PLAYERS.map((p) => (
        <div key={p.name} className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-xs text-gray-500">{p.name}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Mobile Region Tabs ─────────────────────────────────────────────────────

function MobileRegionTabs({
  results, liveGames, onGameClick,
}: {
  results: GameResult[];
  liveGames: LiveGame[];
  onGameClick: (m: MatchupInfo) => void;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const regionOrder = [REGIONS[0], REGIONS[1], REGIONS[2], REGIONS[3]]; // East, South, Midwest, West

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 mb-3">
        {regionOrder.map((r, i) => (
          <button
            key={r.name}
            onClick={() => setActiveTab(i)}
            className={`flex-1 py-2 text-xs font-bold tracking-wider text-center transition-colors ${
              activeTab === i
                ? "text-[#E8590C] border-b-2 border-[#E8590C]"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {r.name.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Active region bracket */}
      <div className="overflow-x-auto pb-3">
        <RegionBracketView
          region={regionOrder[activeTab]}
          results={results}
          liveGames={liveGames}
          onGameClick={onGameClick}
          mirrored={false}
        />
      </div>

      {/* Compact Final Four */}
      <div className="border-t border-gray-200 pt-3 mt-2">
        <CompactFinalFour results={results} liveGames={liveGames} onGameClick={onGameClick} />
      </div>
    </div>
  );
}

function CompactFinalFour({
  results, liveGames, onGameClick,
}: {
  results: GameResult[];
  liveGames: LiveGame[];
  onGameClick: (m: MatchupInfo) => void;
}) {
  const regionRounds = REGIONS.map((r) => getMatchupsForRegion(r, results, liveGames));

  const eastChamp = regionRounds[0]?.[3]?.[0]?.winner || "";
  const southChamp = regionRounds[1]?.[3]?.[0]?.winner || "";
  const midwestChamp = regionRounds[2]?.[3]?.[0]?.winner || "";
  const westChamp = regionRounds[3]?.[3]?.[0]?.winner || "";

  const liveMap = new Map<string, LiveGame>();
  for (const g of liveGames) {
    liveMap.set(`${g.team1}-${g.team2}`, g);
    liveMap.set(`${g.team2}-${g.team1}`, g);
  }

  function buildFFMatchup(team1: string, team2: string): MatchupInfo {
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
      topTeam: team1 || "TBD", bottomTeam: team2 || "TBD",
      topSeed: getTeamInfo(team1)?.seed || 0, bottomSeed: getTeamInfo(team2)?.seed || 0,
      winner, topScore, bottomScore, isLive,
      round: 5, region: "Final Four",
    };
  }

  const ff1 = buildFFMatchup(eastChamp, southChamp);
  const ff2 = buildFFMatchup(midwestChamp, westChamp);

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
    topTeam: ff1Winner || "TBD", bottomTeam: ff2Winner || "TBD",
    topSeed: getTeamInfo(ff1Winner)?.seed || 0, bottomSeed: getTeamInfo(ff2Winner)?.seed || 0,
    winner: champWinner, topScore: champTopScore, bottomScore: champBottomScore,
    isLive: champIsLive, round: 6, region: "Championship",
  };

  return (
    <div className="flex items-start justify-center gap-3 flex-wrap">
      <div className="text-center">
        <div className="text-[9px] text-gray-400 font-semibold tracking-wider mb-1">FINAL FOUR</div>
        <GameCell matchup={ff1} onClick={() => onGameClick(ff1)} />
      </div>
      <div className="text-center">
        <div className="text-[10px] text-[#E8590C] font-bold tracking-wider mb-1">CHAMPIONSHIP</div>
        <GameCell matchup={championship} onClick={() => onGameClick(championship)} />
        {champWinner && (
          <div className="mt-1 text-xs font-bold text-[#E8590C]">{"\uD83C\uDFC6"} {champWinner}</div>
        )}
      </div>
      <div className="text-center">
        <div className="text-[9px] text-gray-400 font-semibold tracking-wider mb-1">FINAL FOUR</div>
        <GameCell matchup={ff2} onClick={() => onGameClick(ff2)} />
      </div>
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
        </div>
      )}

      <PlayerLegend />

      {/* Desktop: 2x2 grid with center column */}
      <div className="hidden lg:block overflow-x-auto pb-4">
        <div style={{ minWidth: "1400px" }} className="grid grid-cols-[1fr_auto_1fr] grid-rows-2">
          {/* Row 1, Col 1: East (L→R) */}
          <div className="p-2">
            <RegionBracketView
              region={REGIONS[0]}
              results={results}
              liveGames={liveGames}
              onGameClick={setSelectedGame}
              mirrored={false}
            />
          </div>

          {/* Row 1-2, Col 2: Center column (spans both rows) */}
          <div className="row-span-2 flex items-stretch border-x border-gray-100">
            <CenterColumn
              results={results}
              liveGames={liveGames}
              onGameClick={setSelectedGame}
            />
          </div>

          {/* Row 1, Col 3: West (R→L mirrored) */}
          <div className="p-2">
            <RegionBracketView
              region={REGIONS[3]}
              results={results}
              liveGames={liveGames}
              onGameClick={setSelectedGame}
              mirrored={true}
            />
          </div>

          {/* Row 2, Col 1: South (L→R) */}
          <div className="p-2 border-t border-gray-100">
            <RegionBracketView
              region={REGIONS[1]}
              results={results}
              liveGames={liveGames}
              onGameClick={setSelectedGame}
              mirrored={false}
            />
          </div>

          {/* Row 2, Col 3: Midwest (R→L mirrored) */}
          <div className="p-2 border-t border-gray-100">
            <RegionBracketView
              region={REGIONS[2]}
              results={results}
              liveGames={liveGames}
              onGameClick={setSelectedGame}
              mirrored={true}
            />
          </div>
        </div>
      </div>

      {/* Mobile: tab navigation */}
      <div className="lg:hidden">
        <MobileRegionTabs
          results={results}
          liveGames={liveGames}
          onGameClick={setSelectedGame}
        />
      </div>

      {selectedGame && (
        <GameModal matchup={selectedGame} onClose={() => setSelectedGame(null)} />
      )}
    </div>
  );
}
