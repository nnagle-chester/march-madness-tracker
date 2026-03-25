"use client";

import { useMemo, useState } from "react";
import { PlayerScore, TeamScore, calculateGamePoints, formatPts } from "@/lib/scoring";
import { GameResult } from "@/data/teams";

const SHORT_ROUND: Record<number, string> = {
  1: "R64", 2: "R32", 3: "S16", 4: "E8", 5: "F4", 6: "NC",
};
import { calculateMaxPossible, mergeSimulationMax, MaxPossibleResult } from "@/lib/maxPossible";
import { ForecastResult } from "@/lib/simulation/types";

interface LeaderboardProps {
  playerScores: PlayerScore[];
  currentRound: number;
  results: GameResult[];
  forecasts?: ForecastResult[];
}

export default function Leaderboard({
  playerScores,
  currentRound,
  results,
  forecasts,
}: LeaderboardProps) {
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  const maxPossible = useMemo(
    () => forecasts && forecasts.length > 0
      ? mergeSimulationMax(playerScores, forecasts)
      : calculateMaxPossible(playerScores, results),
    [playerScores, results, forecasts]
  );

  const maxMap = useMemo(() => {
    const m: Record<string, MaxPossibleResult> = {};
    for (const mp of maxPossible) {
      m[mp.playerName] = mp;
    }
    return m;
  }, [maxPossible]);

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Leaderboard</h2>
      {playerScores.map((ps, idx) => {
        const isLeader = idx === 0 && ps.totalPoints > 0;
        const roundPoints = ps.pointsByRound[currentRound] || 0;
        const mp = maxMap[ps.playerName];
        const isExpanded = expandedPlayer === ps.playerName;

        return (
          <div key={ps.playerName}>
            <div
              onClick={() => setExpandedPlayer(isExpanded ? null : ps.playerName)}
              className={`w-full flex items-center gap-3 p-3 sm:p-4 rounded-xl border transition-all card-shadow-hover cursor-pointer ${
                isLeader
                  ? "bg-gradient-to-r from-amber-50 to-yellow-50/50 border-amber-200 shadow-sm"
                  : "bg-white border-gray-200 hover:border-gray-300 shadow-sm"
              }`}
            >
              {/* Rank */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
                  idx === 0
                    ? "bg-amber-500 text-white"
                    : idx === 1
                    ? "bg-gray-400 text-white"
                    : idx === 2
                    ? "bg-amber-700 text-white"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {ps.rank}
              </div>

              {/* Player color dot + name */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: ps.color }}
                />
                <span className="font-semibold text-gray-900 truncate">
                  {ps.playerName}
                </span>
                {isLeader && (
                  <span className="text-sm">{"\uD83D\uDC51"}</span>
                )}
                {mp && !mp.isContender && ps.totalPoints > 0 && (
                  <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full border border-red-200">
                    OUT
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-right">
                <div className="hidden sm:block">
                  <div className="text-xs text-gray-500">This Round</div>
                  <div className={`text-sm font-bold ${roundPoints > 0 ? "text-green-600" : "text-gray-400"}`}>
                    +{roundPoints}
                  </div>
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs text-gray-500">Alive</div>
                  <div className="text-sm font-medium text-green-600">
                    {ps.teamsAlive}/8
                  </div>
                </div>
                {mp && (
                  <div className="hidden sm:block" title="Maximum possible score if all remaining teams win every game">
                    <div className="text-xs text-gray-500">Max</div>
                    <div className="text-sm font-medium text-gray-500">
                      {mp.maxPossible}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-500">Total</div>
                  <div className="text-lg font-bold text-gray-900">
                    {ps.totalPoints}
                  </div>
                </div>
                {/* Chevron */}
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>

            {/* Inline expansion panel */}
            {isExpanded && (
              <div className="animate-fade-in">
                <InlineRoster player={ps} results={results} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InlineRoster({ player, results }: { player: PlayerScore; results: GameResult[] }) {
  const sortedTeams = [...player.teamScores].sort((a, b) => {
    if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
    return b.totalPoints - a.totalPoints;
  });

  return (
    <div className="ml-4 mr-1 mt-1 mb-2 border-l-2 border-gray-200 pl-4 space-y-2">
      {/* Summary */}
      <div className="flex items-center justify-between py-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="font-medium text-gray-700">{player.teamsAlive}</span> team{player.teamsAlive !== 1 ? "s" : ""} alive
        </div>
        <div className="text-sm text-gray-500">
          <span className="font-bold text-gray-900">{player.totalPoints}</span> total pts
        </div>
      </div>

      {/* Team cards */}
      {sortedTeams.map((team) => (
        <InlineTeamCard key={team.teamName} team={team} results={results} />
      ))}
    </div>
  );
}

function InlineTeamCard({ team, results }: { team: TeamScore; results: GameResult[] }) {
  const teamWins = results.filter((r) => r.winner === team.teamName && r.round >= 1);
  const rounds = [1, 2, 3, 4, 5, 6];

  return (
    <div
      className={`p-3 rounded-lg border ${
        team.eliminated
          ? "bg-gray-50 border-gray-100 opacity-60"
          : "bg-white border-gray-200"
      }`}
    >
      {/* Team header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {team.eliminated ? (
            <span className="text-red-500 font-bold text-sm">{"\u2715"}</span>
          ) : (
            <span className="text-green-600 text-sm">{"\u25CF"}</span>
          )}
          <span
            className={`font-medium text-sm ${
              team.eliminated ? "text-gray-400 line-through" : "text-gray-900"
            }`}
          >
            ({team.seed}) {team.teamName}
          </span>
          <span className="text-xs text-gray-400">{team.region}</span>
        </div>
        <span className="text-sm font-bold text-gray-900">
          {formatPts(team.totalPoints)}
        </span>
      </div>

      {/* Win details */}
      {teamWins.length > 0 && (
        <div className="mb-2 space-y-0.5">
          {teamWins.map((win) => {
            const { basePoints, upsetBonus, totalPoints } = calculateGamePoints(win.round, win.winner, win.loser);
            return (
              <div key={`${win.round}-${win.loser}`} className="text-xs text-gray-500 pl-5">
                Beat {win.loser} ({SHORT_ROUND[win.round] || `R${win.round}`}) — {formatPts(basePoints)}
                {upsetBonus > 0 && <span className="text-[#E8590C]"> + {upsetBonus} upset</span>}
                {" = "}<span className="font-semibold text-gray-700">{formatPts(totalPoints)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Round breakdown */}
      <div className="grid grid-cols-6 gap-1">
        {rounds.map((r) => {
          const pts = team.pointsByRound[r] || 0;
          return (
            <div key={r} className="text-center">
              <div className="text-[10px] text-gray-400 mb-0.5">R{r}</div>
              <div
                className={`text-xs font-medium py-0.5 rounded ${
                  pts > 0
                    ? "bg-green-50 text-green-600"
                    : team.eliminated && r >= (team.eliminatedRound || 99)
                    ? "bg-red-50 text-red-300"
                    : "bg-gray-50 text-gray-400"
                }`}
              >
                {pts > 0 ? `+${pts}` : "-"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
