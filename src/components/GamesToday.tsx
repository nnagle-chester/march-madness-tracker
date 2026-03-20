"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { LiveGame } from "@/lib/espn";
import { getGamesToday, GameTodayInfo } from "@/lib/gamesToday";
import { ROUND_NAMES } from "@/data/teams";
import { formatPts } from "@/lib/scoring";

const STORAGE_KEY_FINAL = "games-today-final-expanded";
const STORAGE_KEY_UPCOMING = "games-today-upcoming-expanded";

interface GamesTodayProps {
  allGames: LiveGame[];
}

export default function GamesToday({ allGames }: GamesTodayProps) {
  const games = useMemo(() => getGamesToday(allGames), [allGames]);

  const [finalExpanded, setFinalExpanded] = useState(false);
  const [upcomingExpanded, setUpcomingExpanded] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY_FINAL) === "true") setFinalExpanded(true);
    if (localStorage.getItem(STORAGE_KEY_UPCOMING) === "true") setUpcomingExpanded(true);
  }, []);

  const toggleFinal = useCallback(() => {
    setFinalExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY_FINAL, String(next));
      return next;
    });
  }, []);

  const toggleUpcoming = useCallback(() => {
    setUpcomingExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY_UPCOMING, String(next));
      return next;
    });
  }, []);

  if (games.length === 0) return null;

  const liveGames = games.filter((g) => g.statusLabel === "LIVE");
  const finalGames = games.filter((g) => g.statusLabel === "FINAL");
  const upcomingGames = games.filter((g) => g.statusLabel === "SCHEDULED");

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 card-shadow">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Games Today <span className="text-gray-400 font-normal">{"\u2014"} {dateStr}</span>
      </h3>

      <div className="space-y-3">
        {liveGames.length > 0 && (
          <GameGroup label="Live" labelColor="text-green-600" games={liveGames} />
        )}
        {finalGames.length > 0 && (
          <CollapsibleGroup
            label="Final"
            labelColor="text-gray-400"
            count={finalGames.length}
            expanded={finalExpanded}
            onToggle={toggleFinal}
            games={finalGames}
          />
        )}
        {upcomingGames.length > 0 && (
          <CollapsibleGroup
            label="Upcoming"
            labelColor="text-gray-500"
            count={upcomingGames.length}
            expanded={upcomingExpanded}
            onToggle={toggleUpcoming}
            games={upcomingGames}
          />
        )}
      </div>
    </div>
  );
}

function GameGroup({ label, labelColor, games }: { label: string; labelColor: string; games: GameTodayInfo[] }) {
  return (
    <div>
      <div className={`text-[10px] font-semibold uppercase tracking-wider ${labelColor} mb-1.5`}>
        {label}
      </div>
      <div className="space-y-2">
        {games.map((g) => (
          <GameTodayRow key={g.game.gameId} info={g} />
        ))}
      </div>
    </div>
  );
}

function CollapsibleGroup({
  label,
  labelColor,
  count,
  expanded,
  onToggle,
  games,
}: {
  label: string;
  labelColor: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  games: GameTodayInfo[];
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${labelColor} hover:opacity-70 transition-opacity cursor-pointer`}
      >
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {label} ({count} {count === 1 ? "game" : "games"})
      </button>
      <div
        className="grid transition-all duration-300 ease-in-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="space-y-2 pt-1.5">
            {games.map((g) => (
              <GameTodayRow key={g.game.gameId} info={g} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GameTodayRow({ info }: { info: GameTodayInfo }) {
  const roundName = info.game.round ? ROUND_NAMES[info.game.round] : "";
  const isLive = info.statusLabel === "LIVE";
  const isFinal = info.statusLabel === "FINAL";

  // Determine winner/loser for final games
  const winner = info.game.winner;
  const isTeam1Winner = isFinal && winner === info.game.team1;
  const isTeam2Winner = isFinal && winner === info.game.team2;

  // Calculate points awarded for the winner in final games
  const winnerOwner = isTeam1Winner ? info.team1Owner : isTeam2Winner ? info.team2Owner : null;
  const winnerPoints = isTeam1Winner ? info.team1PointsIfWin : isTeam2Winner ? info.team2PointsIfWin : 0;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center p-3 rounded-xl border transition-shadow card-shadow-hover ${
        isLive
          ? "bg-white border-green-200 border-l-4 border-l-green-500"
          : "bg-white border-gray-200"
      }`}
    >
      {/* Teams + Status (always side by side) */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Teams */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-sm">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: info.team1Color }}
            />
            <span
              className={`truncate ${
                isTeam1Winner
                  ? "font-bold text-gray-900"
                  : isFinal && isTeam2Winner
                  ? "text-gray-400 line-through"
                  : "font-medium text-gray-900"
              }`}
            >
              ({info.team1Seed}) {info.game.team1}
            </span>
            {info.statusLabel !== "SCHEDULED" && (
              <span className={`ml-auto shrink-0 ${isTeam1Winner ? "font-bold text-gray-900" : isFinal ? "text-gray-400" : "font-bold text-gray-900"}`}>
                {info.game.score1}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-sm mt-1">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: info.team2Color }}
            />
            <span
              className={`truncate ${
                isTeam2Winner
                  ? "font-bold text-gray-900"
                  : isFinal && isTeam1Winner
                  ? "text-gray-400 line-through"
                  : "font-medium text-gray-900"
              }`}
            >
              ({info.team2Seed}) {info.game.team2}
            </span>
            {info.statusLabel !== "SCHEDULED" && (
              <span className={`ml-auto shrink-0 ${isTeam2Winner ? "font-bold text-gray-900" : isFinal ? "text-gray-400" : "font-bold text-gray-900"}`}>
                {info.game.score2}
              </span>
            )}
          </div>
        </div>

        {/* Status / Time */}
        <div className="text-right shrink-0">
          {isLive && (
            <div className="flex items-center gap-1.5">
              <span className="live-pulse inline-block w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs font-bold text-green-600">LIVE</span>
            </div>
          )}
          {info.statusLabel === "SCHEDULED" && (
            <div className="flex items-center gap-1 text-gray-500">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs">{info.tipTime}</span>
            </div>
          )}
          {isFinal && (
            <div className="flex items-center gap-1 text-gray-400">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs font-medium">Final</span>
            </div>
          )}
          {roundName && (
            <div className="text-[10px] text-gray-400 mt-0.5">{roundName}</div>
          )}
        </div>
      </div>

      {/* Points section — below on mobile, inline right on sm+ */}
      <div className="shrink-0 mt-2 pt-2 border-t border-gray-100 sm:mt-0 sm:pt-0 sm:border-t-0 sm:pl-3 sm:border-l sm:border-gray-200">
        {isFinal && winnerOwner ? (
          <>
            <div className="text-[10px] text-gray-400 mb-0.5">Points awarded</div>
            <div className="flex items-center gap-1">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: isTeam1Winner ? info.team1Color : info.team2Color }}
              />
              <span className="text-sm font-bold text-green-600">
                {winnerOwner} +{formatPts(winnerPoints)}
              </span>
            </div>
          </>
        ) : isFinal && !winnerOwner ? (
          <div className="text-xs text-gray-400">No pool pts</div>
        ) : (
          <>
            <div className="text-[10px] text-gray-400 mb-0.5">Points at stake</div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 sm:block sm:space-y-0.5">
              {info.team1Owner && (
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: info.team1Color }} />
                  <span className="text-sm font-bold text-gray-900">+{info.team1PointsIfWin}</span>
                  <span className="text-xs text-gray-500">{info.team1Owner}</span>
                </div>
              )}
              {info.team2Owner && (
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: info.team2Color }} />
                  <span className="text-sm font-bold text-gray-900">+{info.team2PointsIfWin}</span>
                  <span className="text-xs text-gray-500">{info.team2Owner}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
