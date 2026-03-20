"use client";

type View = "leaderboard" | "bracket" | "rounds";

interface NavProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

export default function Nav({ currentView, onViewChange }: NavProps) {
  const tabs: { id: View; label: string; icon: string }[] = [
    { id: "leaderboard", label: "Standings", icon: "\u{1F3C6}" },
    { id: "bracket", label: "Bracket", icon: "\u{1F4CA}" },
    { id: "rounds", label: "Rounds", icon: "\u{1F4CB}" },
  ];

  return (
    <nav className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 card-shadow">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onViewChange(tab.id)}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm transition-colors duration-200 ${
            currentView === tab.id
              ? "bg-[#E8590C] text-white font-bold shadow-sm"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50 font-medium"
          }`}
        >
          <span className="text-base">{tab.icon}</span>
          <span className="hidden sm:inline">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
