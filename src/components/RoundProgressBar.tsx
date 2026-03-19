"use client";

import { ROUND_NAMES } from "@/data/teams";

interface RoundProgressBarProps {
  currentRound: number;
  gamesCompleted: number;
  totalGamesInRound: number;
  liveCount: number;
}

export default function RoundProgressBar({
  currentRound,
  gamesCompleted,
  totalGamesInRound,
  liveCount,
}: RoundProgressBarProps) {
  const rounds = [1, 2, 3, 4, 5, 6];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 card-shadow">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Tournament Progress
        </h2>
        {liveCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="live-pulse inline-block w-2 h-2 rounded-full bg-red-500" />
            <span className="text-sm text-red-600 font-medium">
              {liveCount} game{liveCount > 1 ? "s" : ""} live
            </span>
          </div>
        )}
      </div>

      {/* Round pills */}
      <div className="flex gap-1 sm:gap-2 mb-3">
        {rounds.map((r) => (
          <div
            key={r}
            className={`flex-1 text-center py-1.5 px-1 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              r === currentRound
                ? "bg-[#E8590C]/5 text-[#E8590C] border border-[#E8590C]/20"
                : r < currentRound
                ? "bg-green-50 text-green-600 border border-green-200"
                : "bg-gray-50 text-gray-400 border border-gray-200"
            }`}
          >
            <span className="hidden sm:inline">{ROUND_NAMES[r]}</span>
            <span className="sm:hidden">R{r}</span>
          </div>
        ))}
      </div>

      {/* Progress bar for current round */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#E8590C] to-[#E8590C]/80 h-full rounded-full transition-all duration-500"
            style={{
              width: `${totalGamesInRound > 0 ? (gamesCompleted / totalGamesInRound) * 100 : 0}%`,
            }}
          />
        </div>
        <span className="text-sm text-gray-500 whitespace-nowrap">
          {gamesCompleted}/{totalGamesInRound} games
        </span>
      </div>
    </div>
  );
}
