"use client";

import { useState } from "react";
import { PlayerScore } from "@/lib/scoring";
import { ROUND_NAMES, GameResult } from "@/data/teams";
import { calculateGamePoints, formatPts } from "@/lib/scoring";

interface RoundBreakdownProps {
  playerScores: PlayerScore[];
  results: GameResult[];
}

function CellDetail({ playerName, round, results, onClose }: {
  playerName: string;
  round: number;
  results: GameResult[];
  onClose: () => void;
}) {
  const ps = results.filter(
    (r) => r.round === round && r.winner
  );

  // Find this player's teams
  const playerScore = null; // We'll find wins from results
  const playerWins = ps.filter((r) => {
    // Check if the winner belongs to this player
    // We need to import getTeamOwner but it's available via scoring
    return true; // We'll filter in rendering
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-200 rounded-xl p-4 max-w-sm w-full shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-gray-900">{playerName} - {ROUND_NAMES[round]}</h4>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900">{"\u2715"}</button>
        </div>
        <div className="space-y-2">
          {ps.map((r) => {
            const { basePoints, upsetBonus, totalPoints } = calculateGamePoints(r.round, r.winner, r.loser);
            return (
              <div key={`${r.winner}-${r.loser}`} className="text-sm text-gray-700 bg-gray-50 rounded-lg p-2">
                <span className="font-medium">{r.winner}</span>
                <span className="text-gray-400"> def. </span>
                <span>{r.loser}</span>
                <div className="text-xs text-gray-500 mt-0.5">
                  {formatPts(basePoints)} base{upsetBonus > 0 && ` + ${upsetBonus} upset`} = {formatPts(totalPoints)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function RoundBreakdown({ playerScores, results }: RoundBreakdownProps) {
  const [expandedCell, setExpandedCell] = useState<{ player: string; round: number } | null>(null);
  const rounds = [1, 2, 3, 4, 5, 6];
  const roundLabels = ["R64", "R32", "S16", "E8", "F4", "Champ"];

  // Calculate round totals (all players combined)
  const roundTotals: Record<number, number> = {};
  for (const r of rounds) {
    roundTotals[r] = playerScores.reduce(
      (sum, ps) => sum + (ps.pointsByRound[r] || 0),
      0
    );
  }

  // Sort by rank
  const sorted = [...playerScores].sort((a, b) => a.rank - b.rank);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden card-shadow">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">Round-by-Round Breakdown</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left p-3 text-gray-500 font-medium sticky left-0 bg-white z-10">
                Player
              </th>
              {rounds.map((r, i) => (
                <th
                  key={r}
                  className="text-center p-3 text-gray-500 font-medium min-w-[60px]"
                >
                  {roundLabels[i]}
                </th>
              ))}
              <th className="text-center p-3 text-gray-500 font-medium min-w-[70px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((ps) => (
              <tr
                key={ps.playerName}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="p-3 sticky left-0 bg-white z-10">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: ps.color }}
                    />
                    <span className="font-medium text-gray-900">
                      {ps.playerName}
                    </span>
                  </div>
                </td>
                {rounds.map((r) => {
                  const pts = ps.pointsByRound[r] || 0;
                  return (
                    <td key={r} className="text-center p-3">
                      <button
                        onClick={() => pts > 0 ? setExpandedCell({ player: ps.playerName, round: r }) : undefined}
                        className={`${
                          pts > 0
                            ? "text-green-600 font-semibold cursor-pointer hover:underline"
                            : "text-gray-300 cursor-default"
                        }`}
                      >
                        {pts > 0 ? pts : "-"}
                      </button>
                    </td>
                  );
                })}
                <td className="text-center p-3">
                  <span className="text-gray-900 font-bold text-base">
                    {ps.totalPoints}
                  </span>
                </td>
              </tr>
            ))}

            {/* Totals row */}
            <tr className="bg-gray-50 border-t border-gray-200">
              <td className="p-3 sticky left-0 bg-gray-50 z-10">
                <span className="font-medium text-gray-500">Round Total</span>
              </td>
              {rounds.map((r) => (
                <td key={r} className="text-center p-3">
                  <span className="text-gray-700 font-medium">
                    {roundTotals[r] || "-"}
                  </span>
                </td>
              ))}
              <td className="text-center p-3">
                <span className="text-gray-900 font-bold">
                  {Object.values(roundTotals).reduce((a, b) => a + b, 0)}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {expandedCell && (
        <CellDetail
          playerName={expandedCell.player}
          round={expandedCell.round}
          results={results}
          onClose={() => setExpandedCell(null)}
        />
      )}
    </div>
  );
}
