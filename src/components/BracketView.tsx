"use client";

import { useState } from "react";
import { REGIONS, RegionBracket } from "@/data/bracket";
import {
  PLAYERS,
  PLAYER_COLORS,
  ROUND_POINTS,
  GameResult,
  getTeamOwner,
  getTeamInfo,
} from "@/data/teams";
import { LiveGame } from "@/lib/espn";
import { calculateGamePoints } from "@/lib/scoring";

interface BracketViewProps {
  results: GameResult[];
  liveGames: LiveGame[];
}

// Standard NCAA bracket seeding matchups for Round of 64
const SEED_MATCHUPS: [number, number][] = [
  [1, 16],
  [8, 9],
  [5, 12],
  [4, 13],
  [6, 11],
  [3, 14],
  [7, 10],
  [2, 15],
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

function getMatchupsForRegion(
  region: RegionBracket,
  results: GameResult[],
  liveGames: LiveGame[]
): MatchupInfo[][] {
  const rounds: MatchupInfo[][] = [];
  const eliminatedTeams = new Set<string>();

  // Build results lookup
  const resultMap = new Map<string, GameResult>();
  for (const r of results) {
    // Key by both participants
    const key1 = `${r.winner}-${r.loser}-${r.round}`;
    const key2 = `${r.loser}-${r.winner}-${r.round}`;
    resultMap.set(key1, r);
    resultMap.set(key2, r);
  }

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

    // Check for result
    let winner: string | undefined;
    let topScore: number | undefined;
    let bottomScore: number | undefined;
    let isLive = false;

    // Check results
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

    // Check live
    const liveKey = `${topTeam}-${bottomTeam}`;
    const live = liveMap.get(liveKey);
    if (live) {
      isLive = true;
      topScore = live.team1 === topTeam ? live.score1 : live.score2;
      bottomScore = live.team1 === bottomTeam ? live.score1 : live.score2;
    }

    if (winner) {
      eliminatedTeams.add(winner === topTeam ? bottomTeam : topTeam);
    }

    return {
      topTeam,
      bottomTeam,
      topSeed,
      bottomSeed,
      winner,
      topScore,
      bottomScore,
      isLive,
      round: 1,
      region: region.name,
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

        if (winner) {
          eliminatedTeams.add(winner === topWinner ? bottomWinner : topWinner);
        }
      }

      const topSeed = getTeamInfo(topWinner)?.seed || 0;
      const bottomSeed = getTeamInfo(bottomWinner)?.seed || 0;

      matchups.push({
        topTeam: topWinner || "TBD",
        bottomTeam: bottomWinner || "TBD",
        topSeed,
        bottomSeed,
        winner,
        topScore,
        bottomScore,
        isLive,
        round,
        region: region.name,
      });
    }
    rounds.push(matchups);
  }

  return rounds;
}

function TeamBadge({ teamName, seed, isWinner, isLoser, isLive, score }: {
  teamName: string;
  seed: number;
  isWinner: boolean;
  isLoser: boolean;
  isLive: boolean;
  score?: number;
}) {
  const owner = getTeamOwner(teamName);
  const color = owner ? PLAYER_COLORS[owner] : "#4b5563";
  const isTBD = teamName === "TBD";

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs sm:text-sm ${
        isLoser
          ? "opacity-40 line-through"
          : isWinner
          ? "font-semibold"
          : isTBD
          ? "opacity-30"
          : ""
      } ${isLive ? "live-pulse" : ""}`}
    >
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
        title={owner || "Unowned"}
      />
      <span className="text-gray-500 text-[10px] w-4">{seed || ""}</span>
      <span className={`truncate ${isWinner ? "text-white" : "text-gray-300"}`}>
        {teamName}
      </span>
      {score !== undefined && (
        <span className="ml-auto text-gray-400 font-mono text-xs">{score}</span>
      )}
    </div>
  );
}

function GameCard({ matchup, onClick }: { matchup: MatchupInfo; onClick: () => void }) {
  const isTopWinner = matchup.winner === matchup.topTeam;
  const isBottomWinner = matchup.winner === matchup.bottomTeam;

  return (
    <button
      onClick={onClick}
      className={`w-full bg-[#141420] border rounded-lg overflow-hidden hover:border-[#3a3a5a] transition-all text-left ${
        matchup.isLive
          ? "border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
          : "border-[#2a2a3a]"
      }`}
    >
      {matchup.isLive && (
        <div className="bg-red-500/20 text-red-400 text-[10px] text-center py-0.5 font-medium">
          LIVE
        </div>
      )}
      <div className="divide-y divide-[#2a2a3a]">
        <TeamBadge
          teamName={matchup.topTeam}
          seed={matchup.topSeed}
          isWinner={isTopWinner}
          isLoser={isBottomWinner}
          isLive={matchup.isLive}
          score={matchup.topScore}
        />
        <TeamBadge
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

function GameModal({ matchup, onClose }: { matchup: MatchupInfo; onClose: () => void }) {
  const topOwner = getTeamOwner(matchup.topTeam);
  const bottomOwner = getTeamOwner(matchup.bottomTeam);
  const roundPoints = ROUND_POINTS[matchup.round] || 0;
  const topInfo = getTeamInfo(matchup.topTeam);
  const bottomInfo = getTeamInfo(matchup.bottomTeam);

  // Calculate potential upset bonuses
  let topUpsetBonus = 0;
  let bottomUpsetBonus = 0;
  if (topInfo && bottomInfo) {
    if (topInfo.seed > bottomInfo.seed) topUpsetBonus = topInfo.seed - bottomInfo.seed;
    if (bottomInfo.seed > topInfo.seed) bottomUpsetBonus = bottomInfo.seed - topInfo.seed;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#141420] border border-[#2a2a3a] rounded-2xl p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">
            {matchup.region} - Round {matchup.round}
          </h3>
          {matchup.isLive && (
            <span className="live-pulse text-red-400 text-sm font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              LIVE
            </span>
          )}
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            ✕
          </button>
        </div>

        {/* Teams */}
        <div className="space-y-3 mb-4">
          <div className={`p-3 rounded-lg border ${matchup.winner === matchup.topTeam ? "border-green-500/40 bg-green-500/5" : "border-[#2a2a3a]"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: topOwner ? PLAYER_COLORS[topOwner] : "#4b5563" }}
                />
                <span className="font-semibold text-white">
                  ({matchup.topSeed}) {matchup.topTeam}
                </span>
              </div>
              {matchup.topScore !== undefined && (
                <span className="text-xl font-bold text-white">{matchup.topScore}</span>
              )}
            </div>
            <div className="text-sm text-gray-400 mt-1">
              Owner: <span style={{ color: topOwner ? PLAYER_COLORS[topOwner] : "#9ca3af" }}>{topOwner || "None"}</span>
            </div>
            {matchup.winner === matchup.topTeam && (
              <span className="text-xs text-green-400 font-medium">WINNER</span>
            )}
          </div>

          <div className="text-center text-gray-600 text-sm">VS</div>

          <div className={`p-3 rounded-lg border ${matchup.winner === matchup.bottomTeam ? "border-green-500/40 bg-green-500/5" : "border-[#2a2a3a]"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: bottomOwner ? PLAYER_COLORS[bottomOwner] : "#4b5563" }}
                />
                <span className="font-semibold text-white">
                  ({matchup.bottomSeed}) {matchup.bottomTeam}
                </span>
              </div>
              {matchup.bottomScore !== undefined && (
                <span className="text-xl font-bold text-white">{matchup.bottomScore}</span>
              )}
            </div>
            <div className="text-sm text-gray-400 mt-1">
              Owner: <span style={{ color: bottomOwner ? PLAYER_COLORS[bottomOwner] : "#9ca3af" }}>{bottomOwner || "None"}</span>
            </div>
            {matchup.winner === matchup.bottomTeam && (
              <span className="text-xs text-green-400 font-medium">WINNER</span>
            )}
          </div>
        </div>

        {/* Points at stake */}
        <div className="bg-[#1a1a2e] rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Points at Stake</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">Base (R{matchup.round}):</span>
              <span className="text-white ml-1">{roundPoints} pts</span>
            </div>
            {topUpsetBonus > 0 && (
              <div>
                <span className="text-gray-500">{matchup.topTeam} upset:</span>
                <span className="text-orange-400 ml-1">+{topUpsetBonus}</span>
              </div>
            )}
            {bottomUpsetBonus > 0 && (
              <div>
                <span className="text-gray-500">{matchup.bottomTeam} upset:</span>
                <span className="text-orange-400 ml-1">+{bottomUpsetBonus}</span>
              </div>
            )}
          </div>

          {/* Who has skin in the game */}
          <div className="mt-3 pt-3 border-t border-[#2a2a3a]">
            <span className="text-xs text-gray-500">Players with skin in the game:</span>
            <div className="flex gap-2 mt-1">
              {[topOwner, bottomOwner].filter(Boolean).map((owner) => (
                <span
                  key={owner}
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: PLAYER_COLORS[owner!] + "20",
                    color: PLAYER_COLORS[owner!],
                  }}
                >
                  {owner}
                </span>
              ))}
              {!topOwner && !bottomOwner && (
                <span className="text-xs text-gray-600">No pool members</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegionBracketView({
  region,
  results,
  liveGames,
}: {
  region: RegionBracket;
  results: GameResult[];
  liveGames: LiveGame[];
}) {
  const [selectedGame, setSelectedGame] = useState<MatchupInfo | null>(null);
  const rounds = getMatchupsForRegion(region, results, liveGames);
  const roundLabels = ["R64", "R32", "S16", "E8"];

  return (
    <div className="mb-8">
      <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
        <span className="w-1 h-6 bg-orange-500 rounded-full" />
        {region.name} Region
      </h3>

      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-[700px]">
          {rounds.map((roundMatchups, roundIdx) => (
            <div
              key={roundIdx}
              className="flex flex-col justify-around flex-1 gap-2"
              style={{ minWidth: roundMatchups.length > 2 ? "160px" : "160px" }}
            >
              <div className="text-xs text-gray-500 text-center mb-1 font-medium">
                {roundLabels[roundIdx]}
              </div>
              {roundMatchups.map((m, i) => (
                <div key={i} className="flex-1 flex items-center">
                  <GameCard matchup={m} onClick={() => setSelectedGame(m)} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {selectedGame && (
        <GameModal matchup={selectedGame} onClose={() => setSelectedGame(null)} />
      )}
    </div>
  );
}

export default function BracketView({ results, liveGames }: BracketViewProps) {
  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-2">Tournament Bracket</h2>
      <p className="text-sm text-gray-500 mb-4">Click any game to see details and points at stake</p>

      {/* Player color legend */}
      <div className="flex flex-wrap gap-3 mb-6 p-3 bg-[#141420] border border-[#2a2a3a] rounded-xl">
        {PLAYERS.map((p) => (
          <div key={p.name} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-xs text-gray-400">{p.name}</span>
          </div>
        ))}
      </div>

      {REGIONS.map((region) => (
        <RegionBracketView
          key={region.name}
          region={region}
          results={results}
          liveGames={liveGames}
        />
      ))}
    </div>
  );
}
