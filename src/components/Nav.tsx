"use client";

type View = "leaderboard" | "bracket" | "rounds";

interface NavProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

export default function Nav({ currentView, onViewChange }: NavProps) {
  const tabs: { id: View; label: string; icon: string }[] = [
    { id: "leaderboard", label: "Standings", icon: "🏆" },
    { id: "bracket", label: "Bracket", icon: "📊" },
    { id: "rounds", label: "Rounds", icon: "📋" },
  ];

  return (
    <nav className="flex gap-1 bg-[#141420] border border-[#2a2a3a] rounded-xl p-1 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onViewChange(tab.id)}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
            currentView === tab.id
              ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
              : "text-gray-500 hover:text-gray-300 hover:bg-[#1a1a2e]"
          }`}
        >
          <span className="text-base">{tab.icon}</span>
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
