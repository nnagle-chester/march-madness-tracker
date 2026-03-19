"use client";

import { PlayerScore } from "@/lib/scoring";
import { ROUND_NAMES } from "@/data/teams";

interface RoundBreakdownProps {
  playerScores: PlayerScore[];
}

export default function RoundBreakdown({ playerScores }: RoundBreakdownProps) {
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
    <div className="bg-[#141420] border border-[#2a2a3a] rounded-xl overflow-hidden">
      <div className="p-4 border-b border-[#2a2a3a]">
        <h2 className="text-lg font-bold text-white">Round-by-Round Breakdown</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a2a3a]">
              <th className="text-left p-3 text-gray-400 font-medium sticky left-0 bg-[#141420] z-10">
                Player
              </th>
              {rounds.map((r, i) => (
                <th
                  key={r}
                  className="text-center p-3 text-gray-400 font-medium min-w-[60px]"
                >
                  {roundLabels[i]}
                </th>
              ))}
              <th className="text-center p-3 text-gray-400 font-medium min-w-[70px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((ps) => (
              <tr
                key={ps.playerName}
                className="border-b border-[#1a1a2e] hover:bg-[#1a1a2e] transition-colors"
              >
                <td className="p-3 sticky left-0 bg-[#141420] z-10">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: ps.color }}
                    />
                    <span className="font-medium text-white">
                      {ps.playerName}
                    </span>
                  </div>
                </td>
                {rounds.map((r) => {
                  const pts = ps.pointsByRound[r] || 0;
                  return (
                    <td key={r} className="text-center p-3">
                      <span
                        className={`${
                          pts > 0
                            ? "text-green-400 font-semibold"
                            : "text-gray-600"
                        }`}
                      >
                        {pts > 0 ? pts : "-"}
                      </span>
                    </td>
                  );
                })}
                <td className="text-center p-3">
                  <span className="text-white font-bold text-base">
                    {ps.totalPoints}
                  </span>
                </td>
              </tr>
            ))}

            {/* Totals row */}
            <tr className="bg-[#1a1a2e] border-t border-[#2a2a3a]">
              <td className="p-3 sticky left-0 bg-[#1a1a2e] z-10">
                <span className="font-medium text-gray-400">Round Total</span>
              </td>
              {rounds.map((r) => (
                <td key={r} className="text-center p-3">
                  <span className="text-gray-300 font-medium">
                    {roundTotals[r] || "-"}
                  </span>
                </td>
              ))}
              <td className="text-center p-3">
                <span className="text-white font-bold">
                  {Object.values(roundTotals).reduce((a, b) => a + b, 0)}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
