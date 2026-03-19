"use client";

import { useState } from "react";
import { useScores } from "@/lib/useScores";
import Nav from "@/components/Nav";
import RoundProgressBar from "@/components/RoundProgressBar";
import Leaderboard from "@/components/Leaderboard";
import PlayerRoster from "@/components/PlayerRoster";
import BracketView from "@/components/BracketView";
import RoundBreakdown from "@/components/RoundBreakdown";

type View = "leaderboard" | "bracket" | "rounds";

export default function Home() {
  const [currentView, setCurrentView] = useState<View>("leaderboard");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const {
    results,
    liveGames,
    playerScores,
    roundProgress,
    lastUpdated,
    loading,
    error,
  } = useScores();

  const handlePlayerClick = (playerName: string) => {
    setSelectedPlayer(playerName);
  };

  const handleBack = () => {
    setSelectedPlayer(null);
  };

  const selectedPlayerData = selectedPlayer
    ? playerScores.find((ps) => ps.playerName === selectedPlayer)
    : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400">Loading tournament data...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 pb-20">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
          Brett&apos;s Angels
        </h1>
        <p className="text-sm text-gray-500">March Madness 2025 Pool Tracker</p>
        {lastUpdated && (
          <p className="text-xs text-gray-600 mt-1">
            Last updated: {new Date(lastUpdated).toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Round Progress */}
      <RoundProgressBar
        currentRound={roundProgress.currentRound}
        gamesCompleted={roundProgress.gamesCompleted}
        totalGamesInRound={roundProgress.totalGamesInRound}
        liveCount={liveGames.length}
      />

      {/* Navigation */}
      <Nav currentView={currentView} onViewChange={(v) => {
        setCurrentView(v);
        setSelectedPlayer(null);
      }} />

      {/* Error notice */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm mb-4">
          {error} — showing cached data
        </div>
      )}

      {/* Content */}
      {currentView === "leaderboard" && !selectedPlayerData && (
        <Leaderboard
          playerScores={playerScores}
          currentRound={roundProgress.currentRound}
          onPlayerClick={handlePlayerClick}
        />
      )}

      {currentView === "leaderboard" && selectedPlayerData && (
        <PlayerRoster player={selectedPlayerData} onBack={handleBack} />
      )}

      {currentView === "bracket" && (
        <BracketView results={results} liveGames={liveGames} />
      )}

      {currentView === "rounds" && (
        <RoundBreakdown playerScores={playerScores} />
      )}
    </main>
  );
}
