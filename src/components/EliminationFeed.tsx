"use client";

import { useMemo } from "react";
import { GameResult, PLAYER_COLORS } from "@/data/teams";
import { generateFeed, FeedItem } from "@/lib/eliminationFeed";

interface EliminationFeedProps {
  results: GameResult[];
}

export default function EliminationFeed({ results }: EliminationFeedProps) {
  const feed = useMemo(() => generateFeed(results, 10), [results]);

  if (feed.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 card-shadow">
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
    <div className={`flex items-start gap-2.5 p-2 rounded-lg text-sm ${
      isElimination ? "bg-red-50/50" : "bg-green-50/50"
    }`}>
      {/* Icon */}
      <span className="text-base mt-0.5 shrink-0">
        {isElimination ? "\u{1F480}" : "\u{1F525}"}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-gray-700">
          {isElimination ? (
            <>
              <span className="font-medium text-gray-900">({item.seed}) {item.team}</span>
              {" eliminated by "}
              <span className="font-medium">({item.opponentSeed}) {item.opponent}</span>
            </>
          ) : (
            <>
              <span className="font-medium text-gray-900">({item.seed}) {item.team}</span>
              {" beat "}
              <span className="font-medium">({item.opponentSeed}) {item.opponent}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">{item.roundName}</span>
          {item.owner && (
            <span className="flex items-center gap-1 text-xs">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: ownerColor }}
              />
              <span className="text-gray-500">{item.owner}</span>
            </span>
          )}
          {!isElimination && item.points > 0 && (
            <span className="text-xs font-medium text-green-600">+{item.points}pts</span>
          )}
        </div>
      </div>
    </div>
  );
}
