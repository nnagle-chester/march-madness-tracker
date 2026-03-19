"use client";

import { useMemo } from "react";
import { LiveGame } from "@/lib/espn";
import { getGamesToday, GameTodayInfo } from "@/lib/gamesToday";
import { ROUND_NAMES } from "@/data/teams";

interface GamesTodayProps {
  allGames: LiveGame[];
}

export default function GamesToday({ allGames }: GamesTodayProps) {
  const games = useMemo(() => getGamesToday(allGames), [allGames]);

  if (games.length === 0) return null;

  const liveGames = games.filter((g) => g.statusLabel === "LIVE");
  const upcomingGames = games.filter((g) => g.statusLabel === "SCHEDULED");
  const finalGames = games.filter((g) => g.statusLabel === "FINAL");

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 card-shadow mt-4">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Games Today
      </h3>

      <div className="space-y-3">
        {liveGames.length > 0 && (
          <GameGroup label="Live" labelColor="text-red-600" games={liveGames} />
        )}
        {upcomingGames.length > 0 && (
          <GameGroup label="Upcoming" labelColor="text-gray-500" games={upcomingGames} />
        )}
        {finalGames.length > 0 && (
          <GameGroup label="Final" labelColor="text-gray-400" games={finalGames} />
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
      <div className="space-y-1.5">
        {games.map((g) => (
          <GameTodayRow key={g.game.gameId} info={g} />
        ))}
      </div>
    </div>
  );
}

function GameTodayRow({ info }: { info: GameTodayInfo }) {
  const roundName = info.game.round ? ROUND_NAMES[info.game.round] : "";

  // Format points at stake with owner names
  const team1PtsLabel = info.team1Owner
    ? `${info.team1Owner} +${info.team1PointsIfWin}`
    : `+${info.team1PointsIfWin}`;
  const team2PtsLabel = info.team2Owner
    ? `${info.team2Owner} +${info.team2PointsIfWin}`
    : `+${info.team2PointsIfWin}`;

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
      {/* Teams */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: info.team1Color }}
          />
          <span className="font-medium text-gray-900 truncate">
            ({info.team1Seed}) {info.game.team1}
          </span>
          {info.statusLabel !== "SCHEDULED" && (
            <span className="font-bold text-gray-900 ml-auto">{info.game.score1}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-sm mt-0.5">
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: info.team2Color }}
          />
          <span className="font-medium text-gray-900 truncate">
            ({info.team2Seed}) {info.game.team2}
          </span>
          {info.statusLabel !== "SCHEDULED" && (
            <span className="font-bold text-gray-900 ml-auto">{info.game.score2}</span>
          )}
        </div>
      </div>

      {/* Status / Time */}
      <div className="text-right shrink-0">
        {info.statusLabel === "LIVE" && (
          <div className="flex items-center gap-1">
            <span className="live-pulse inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
            <span className="text-xs font-bold text-red-600">LIVE</span>
          </div>
        )}
        {info.statusLabel === "SCHEDULED" && (
          <span className="text-xs text-gray-500">{info.tipTime}</span>
        )}
        {info.statusLabel === "FINAL" && (
          <span className="text-xs font-medium text-gray-400">FINAL</span>
        )}
        {roundName && (
          <div className="text-[10px] text-gray-400">{roundName}</div>
        )}
      </div>

      {/* Points at stake */}
      <div className="text-right shrink-0 pl-2 border-l border-gray-200">
        <div className="text-[10px] text-gray-400">Pts at stake</div>
        <div className="text-xs font-semibold text-[#E8590C]">
          {team1PtsLabel} / {team2PtsLabel}
        </div>
      </div>
    </div>
  );
}
