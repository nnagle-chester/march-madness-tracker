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
        Welcome to Brett&apos;s Angels March Madness Challenge {"\uD83C\uDFC0"}
      </h2>

      <div className="space-y-2 text-sm text-gray-700">
        <p>
          8 friends. 8 teams each. One glorious month of chaos.
        </p>

        <p>
          A huge thanks to Jon for organizing — and to Claude for the custom software engineering this afternoon.
        </p>

        <p>
          The stakes are simple: the winner takes home cold hard cash and eternal bragging rights.
          The loser? You&apos;re buying pitchers at Pennies for the group. No exceptions. No excuses.
        </p>
      </div>
    </div>
  );
}
