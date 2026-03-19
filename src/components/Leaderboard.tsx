"use client";

import { PlayerScore } from "@/lib/scoring";
import { ROUND_NAMES } from "@/data/teams";

interface LeaderboardProps {
  playerScores: PlayerScore[];
  currentRound: number;
  onPlayerClick: (playerName: string) => void;
}

export default function Leaderboard({
  playerScores,
  currentRound,
  onPlayerClick,
}: LeaderboardProps) {
  const leader = playerScores[0];

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-bold text-white mb-4">Leaderboard</h2>
      {playerScores.map((ps, idx) => {
        const isLeader = idx === 0 && ps.totalPoints > 0;
        const roundPoints = ps.pointsByRound[currentRound] || 0;

        return (
          <button
            key={ps.playerName}
            onClick={() => onPlayerClick(ps.playerName)}
            className={`w-full flex items-center gap-3 p-3 sm:p-4 rounded-xl border transition-all hover:scale-[1.01] hover:border-opacity-60 ${
              isLeader
                ? "bg-gradient-to-r from-orange-500/10 to-transparent border-orange-500/30"
                : "bg-[#141420] border-[#2a2a3a] hover:border-[#3a3a5a]"
            }`}
          >
            {/* Rank */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                idx === 0
                  ? "bg-orange-500 text-black"
                  : idx === 1
                  ? "bg-gray-400 text-black"
                  : idx === 2
                  ? "bg-amber-700 text-white"
                  : "bg-[#2a2a3a] text-gray-400"
              }`}
            >
              {ps.rank}
            </div>

            {/* Player color dot + name */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: ps.color }}
              />
              <span className="font-semibold text-white truncate">
                {ps.playerName}
              </span>
              {isLeader && (
                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                  Leader
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-right">
              <div className="hidden sm:block">
                <div className="text-xs text-gray-500">This Round</div>
                <div className="text-sm font-medium text-gray-300">
                  +{roundPoints}
                </div>
              </div>
              <div className="hidden sm:block">
                <div className="text-xs text-gray-500">Alive</div>
                <div className="text-sm font-medium text-green-400">
                  {ps.teamsAlive}/8
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Total</div>
                <div className="text-lg font-bold text-white">
                  {ps.totalPoints}
                </div>
              </div>
              <svg
                className="w-4 h-4 text-gray-600"
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
          </button>
        );
      })}
    </div>
  );
}
