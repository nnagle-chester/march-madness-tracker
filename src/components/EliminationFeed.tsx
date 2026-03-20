"use client";

import { useMemo } from "react";
import { GameResult, PLAYER_COLORS } from "@/data/teams";
import { formatPts } from "@/lib/scoring";
import { generateFeed, FeedItem } from "@/lib/eliminationFeed";

interface EliminationFeedProps {
  results: GameResult[];
}

export default function EliminationFeed({ results }: EliminationFeedProps) {
  const feed = useMemo(() => generateFeed(results, 8), [results]);

  if (feed.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 card-shadow">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Recent Activity
      </h3>

      <div className="space-y-2">
        {feed.map((item, idx) => (
          <FeedRow key={`${item.type}-${item.team}-${item.round}-${idx}`} item={item} />
        ))}
      </div>
    </div>
  );
}

function FeedRow({ item }: { item: FeedItem }) {
  const isElimination = item.type === "elimination";
  const ownerColor = item.owner ? PLAYER_COLORS[item.owner] : "#d1d5db";

  return (
    <div
      className={`flex items-start gap-2.5 p-3 rounded-xl text-sm border-l-4 animate-fade-in ${
        isElimination
          ? "bg-red-50/40 border-l-red-300"
          : "bg-green-50/40 border-l-green-500"
      }`}
    >
      {/* Icon */}
      <span className="text-base mt-0.5 shrink-0">
        {isElimination ? "\u{1F480}" : "\u{1F525}"}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-gray-700">
          {isElimination ? (
            <>
              <span className="font-semibold text-gray-900">{item.team}</span>
              {" eliminated"}
              {item.owner && (
                <>
                  {" \u2014 "}
                  <span className="font-medium" style={{ color: ownerColor }}>{item.owner}</span>
                  {" loses their "}{item.seed}-seed
                </>
              )}
            </>
          ) : (
            <>
              <span className="font-semibold text-gray-900">{item.team}</span>
              {" advances"}
              {item.owner && (
                <>
                  {" \u2014 "}
                  <span className="font-medium" style={{ color: ownerColor }}>{item.owner}</span>
                  {" "}
                  <span className="font-bold text-green-600">+{formatPts(item.points)}</span>
                </>
              )}
            </>
          )}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {item.roundName}
        </div>
      </div>
    </div>
  );
}
