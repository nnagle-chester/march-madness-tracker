"use client";

import { useState } from "react";
import { useScores } from "@/lib/useScores";
import Nav from "@/components/Nav";
import TournamentStatusBar from "@/components/TournamentStatusBar";
import Leaderboard from "@/components/Leaderboard";
import BracketView from "@/components/BracketView";
import RoundBreakdown from "@/components/RoundBreakdown";
import WelcomeCard from "@/components/WelcomeCard";

import GamesToday from "@/components/GamesToday";
import ScoringTooltip from "@/components/ScoringTooltip";

type View = "leaderboard" | "bracket" | "rounds";

export default function Home() {
  const [currentView, setCurrentView] = useState<View>("leaderboard");

  const {
    results,
    liveGames,
    allGames,
    playerScores,
    roundProgress,
    lastUpdated,
    loading,
    error,
  } = useScores();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-[#E8590C] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-500">Loading tournament data...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 pb-20">
      {/* 1. Welcome Card */}
      <WelcomeCard />

      {/* 2. Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
            Brett&apos;s Angels
          </h1>
          <ScoringTooltip />
        </div>
        <p className="text-sm text-gray-500 mt-1">March Madness 2026 Pool Tracker</p>
        {lastUpdated && (
          <p className="text-xs text-gray-400 mt-1">
            Last updated: {new Date(lastUpdated).toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* 3. Tournament Status Bar */}
      <TournamentStatusBar
        currentRound={roundProgress.currentRound}
        gamesCompleted={roundProgress.gamesCompleted}
        totalGamesInRound={roundProgress.totalGamesInRound}
        liveCount={liveGames.length}
      />

      {/* 5. Games Today */}
      <GamesToday allGames={allGames} />

      {/* 6. Tab Navigation */}
      <Nav currentView={currentView} onViewChange={(v) => setCurrentView(v)} />

      {/* Error notice */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm mb-4">
          {error} — showing cached data
        </div>
      )}

      {/* 8. Tab Content */}
      {currentView === "leaderboard" && (
        <Leaderboard
          playerScores={playerScores}
          currentRound={roundProgress.currentRound}
          results={results}
        />
      )}

      {currentView === "bracket" && (
        <BracketView results={results} liveGames={liveGames} allGames={allGames} />
      )}

      {currentView === "rounds" && (
        <RoundBreakdown playerScores={playerScores} results={results} />
      )}
    </main>
  );
}
