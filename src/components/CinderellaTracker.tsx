"use client";

import { useMemo } from "react";
import { GameResult } from "@/data/teams";
import { findCinderella } from "@/lib/cinderella";

interface CinderellaTrackerProps {
  results: GameResult[];
}

export default function CinderellaTracker({ results }: CinderellaTrackerProps) {
  const cinderella = useMemo(() => findCinderella(results), [results]);

  if (!cinderella) return null;

  return (
    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{"\u{1F31F}"}</span>
        <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wider">
          Cinderella Watch
        </h3>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">
              ({cinderella.seed}) {cinderella.teamName}
            </span>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
              {cinderella.region}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: cinderella.ownerColor }}
            />
            <span className="text-sm text-gray-600">
              Owned by <span className="font-medium text-gray-900">{cinderella.owner}</span>
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">{cinderella.totalPoints}</div>
          <div className="text-xs text-gray-500">
            pts ({cinderella.totalUpsetBonus} upset bonus)
          </div>
        </div>
      </div>

      {/* Win history */}
      {cinderella.wins.length > 0 && (
        <div className="mt-3 pt-3 border-t border-amber-200 space-y-1">
          {cinderella.wins.map((win) => (
            <div
              key={`${win.round}-${win.opponent}`}
              className="text-xs text-gray-600"
            >
              <span className="font-medium text-gray-900">{win.roundName}:</span>{" "}
              Beat ({win.opponentSeed}) {win.opponent} — {win.basePoints}pt
              {win.upsetBonus > 0 && (
                <span className="text-[#E8590C]"> + {win.upsetBonus} upset bonus</span>
              )}
              {" = "}{win.totalPoints}pts
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
