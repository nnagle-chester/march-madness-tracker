"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "welcome-dismissed";

export default function WelcomeCard() {
  const [dismissed, setDismissed] = useState(true); // default hidden to avoid flash

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setDismissed(stored === "true");
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const handleShow = () => {
    setDismissed(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  if (dismissed) {
    return (
      <button
        onClick={handleShow}
        className="text-xs text-gray-400 hover:text-[#E8590C] transition-colors mb-2"
      >
        How does scoring work?
      </button>
    );
  }

  return (
    <div className="bg-gradient-to-r from-[#E8590C]/5 to-amber-50 border border-[#E8590C]/20 rounded-xl p-5 mb-6 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-[#E8590C]/60 hover:text-[#E8590C] text-sm"
      >
        {"\u2715"}
      </button>

      <h2 className="text-lg font-bold text-gray-900 mb-2">
        Welcome to the Pool Tracker
      </h2>

      <div className="space-y-2 text-sm text-gray-700">
        <p>
          Each player drafted 8 NCAA tournament teams. When your team wins a game,
          you earn points based on the round:
        </p>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 my-3">
          {[
            { round: "R64", pts: 1 },
            { round: "R32", pts: 2 },
            { round: "S16", pts: 5 },
            { round: "E8", pts: 10 },
            { round: "F4", pts: 15 },
            { round: "Champ", pts: 25 },
          ].map((r) => (
            <div
              key={r.round}
              className="text-center bg-white/60 rounded-lg py-1.5 px-2"
            >
              <div className="text-xs text-gray-500">{r.round}</div>
              <div className="font-bold text-gray-900">{r.pts}</div>
            </div>
          ))}
        </div>

        <p>
          <span className="font-semibold text-[#E8590C]">Upset bonus:</span> If
          your team&apos;s seed is higher than the opponent&apos;s (a lower-seeded team winning),
          you earn bonus points equal to the seed difference. Example: a 12-seed
          beating a 5-seed earns 7 bonus points on top of the round base.
        </p>

        <p className="text-xs text-gray-500">
          Scores update automatically from ESPN every 60 seconds during live games.
        </p>
      </div>
    </div>
  );
}
