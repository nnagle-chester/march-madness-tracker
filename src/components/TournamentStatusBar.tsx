"use client";

import { ROUND_NAMES } from "@/data/teams";

interface TournamentStatusBarProps {
  currentRound: number;
  gamesCompleted: number;
  totalGamesInRound: number;
  liveCount: number;
}

export default function TournamentStatusBar({
  currentRound,
  gamesCompleted,
  totalGamesInRound,
  liveCount,
}: TournamentStatusBarProps) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 bg-[#E8590C]/8 rounded-full px-4 sm:px-6 py-2.5 mb-6">
      {/* Round name */}
      <span className="text-[#E8590C] font-semibold text-sm">
        {ROUND_NAMES[currentRound] || `Round ${currentRound}`}
      </span>

      <span className="text-gray-300 text-sm select-none">{"\u00B7"}</span>

      {/* Games progress */}
      <span className="text-gray-500 text-sm">
        {gamesCompleted} of {totalGamesInRound} complete
      </span>

      {/* Live count */}
      {liveCount > 0 && (
        <>
          <span className="text-gray-300 text-sm select-none">{"\u00B7"}</span>
          <span className="flex items-center gap-1.5 text-green-600 font-medium text-sm">
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 live-pulse" />
            {liveCount} Live
          </span>
        </>
      )}
    </div>
  );
}
