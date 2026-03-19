"use client";

import { useState, useEffect, useCallback } from "react";
import { GameResult } from "@/data/teams";
import { LiveGame } from "@/lib/espn";
import { calculateScores, PlayerScore, getRoundProgress } from "@/lib/scoring";

interface ScoresData {
  results: GameResult[];
  liveGames: LiveGame[];
  lastUpdated: string | null;
}

export function useScores() {
  const [results, setResults] = useState<GameResult[]>([]);
  const [liveGames, setLiveGames] = useState<LiveGame[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch("/api/scores");
      if (!res.ok) throw new Error("Failed to fetch scores");
      const data: ScoresData = await res.json();
      setResults(data.results);
      setLiveGames(data.liveGames);
      setLastUpdated(data.lastUpdated);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScores();

    // Poll based on whether games are live
    const interval = setInterval(() => {
      fetchScores();
    }, liveGames.length > 0 ? 60000 : 300000); // 60s if live, 5min otherwise

    return () => clearInterval(interval);
  }, [fetchScores, liveGames.length]);

  const playerScores = calculateScores(results);
  const roundProgress = getRoundProgress(results);

  return {
    results,
    liveGames,
    playerScores,
    roundProgress,
    lastUpdated,
    loading,
    error,
    refetch: fetchScores,
  };
}
