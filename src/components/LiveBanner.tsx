"use client";

import { useState, useEffect } from "react";
import { LiveGame } from "@/lib/espn";
import { ROUND_POINTS, PLAYER_COLORS, getTeamOwner, getTeamInfo } from "@/data/teams";
import { formatPts } from "@/lib/scoring";

interface LiveBannerProps {
  liveGames: LiveGame[];
}

export default function LiveBanner({ liveGames }: LiveBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (liveGames.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % liveGames.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [liveGames.length]);

  if (liveGames.length === 0) return null;

  const game = liveGames[currentIndex % liveGames.length];
  if (!game) return null;

  const team1Owner = getTeamOwner(game.team1);
  const team2Owner = getTeamOwner(game.team2);
  const team1Info = getTeamInfo(game.team1);
  const team2Info = getTeamInfo(game.team2);
  const round = game.round || 1;
  const basePoints = ROUND_POINTS[round] || 0;

  // Calculate what each team would earn their owner if they win
  let stakesMessage = "";
  if (team1Owner && team1Info && team2Info) {
    const bonus = team1Info.seed > team2Info.seed ? team1Info.seed - team2Info.seed : 0;
    const total = basePoints + bonus;
    stakesMessage = `If ${game.team1} wins, ${team1Owner} gains ${formatPts(total)}`;
  }
  if (team2Owner && team1Info && team2Info) {
    const bonus = team2Info.seed > team1Info.seed ? team2Info.seed - team1Info.seed : 0;
    const total = basePoints + bonus;
    if (stakesMessage) stakesMessage += " | ";
    else stakesMessage = "";
    stakesMessage += `If ${game.team2} wins, ${team2Owner} gains ${formatPts(total)}`;
  }

  const clockDisplay =
    game.period > 0
      ? `${game.clock} - ${game.period === 1 ? "1st" : "2nd"} Half`
      : game.clock;

  return (
    <div className="bg-white border border-red-200 rounded-xl p-3 mb-4 card-shadow">
      <div className="flex items-center gap-3">
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="live-pulse inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-xs font-bold text-red-600 uppercase">Live</span>
        </div>

        {/* Game info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              {team1Owner && (
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: PLAYER_COLORS[team1Owner] }}
                />
              )}
              <span className="font-semibold text-gray-900">{game.team1}</span>
              <span className="font-bold text-gray-900 ml-1">{game.score1}</span>
            </div>
            <span className="text-gray-400">-</span>
            <div className="flex items-center gap-1">
              <span className="font-bold text-gray-900">{game.score2}</span>
              <span className="font-semibold text-gray-900">{game.team2}</span>
              {team2Owner && (
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: PLAYER_COLORS[team2Owner] }}
                />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-red-500 font-medium">{clockDisplay}</span>
            {stakesMessage && (
              <span className="text-xs text-gray-500 truncate">{stakesMessage}</span>
            )}
          </div>
        </div>

        {/* Game counter */}
        {liveGames.length > 1 && (
          <div className="text-xs text-gray-400 shrink-0">
            {currentIndex + 1}/{liveGames.length}
          </div>
        )}
      </div>
    </div>
  );
}
