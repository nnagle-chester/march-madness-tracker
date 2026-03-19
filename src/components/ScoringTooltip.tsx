"use client";

import { useState, useRef, useEffect } from "react";
import { ROUND_NAMES, ROUND_POINTS } from "@/data/teams";

export default function ScoringTooltip() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-5 h-5 rounded-full bg-gray-100 border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors text-xs font-medium flex items-center justify-center"
        title="How scoring works"
      >
        ?
      </button>

      {open && (
        <div className="absolute right-0 top-7 z-40 w-72 bg-white border border-gray-200 rounded-xl p-4 shadow-lg">
          <h4 className="text-sm font-bold text-gray-900 mb-3">How Scoring Works</h4>

          <table className="w-full text-sm mb-3">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-gray-500 text-xs py-1">Round</th>
                <th className="text-right text-gray-500 text-xs py-1">Points</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(ROUND_NAMES).map(([round, name]) => (
                <tr key={round} className="border-b border-gray-50">
                  <td className="py-1.5 text-gray-700">{name}</td>
                  <td className="py-1.5 text-right font-semibold text-gray-900">
                    {ROUND_POINTS[parseInt(round)]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="text-xs text-gray-600 space-y-1.5">
            <p>
              <span className="font-semibold text-[#E8590C]">Upset Bonus:</span> When
              a higher-seeded team (numerically) beats a lower-seeded team, earn bonus
              points equal to the seed difference.
            </p>
            <p className="text-gray-500">
              Example: 12-seed beats 5-seed = {ROUND_POINTS[1]}pt base + 7 upset bonus = {ROUND_POINTS[1] + 7}pts
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
