"use client";

import { useState, useEffect } from "react";
import { REGIONS } from "@/data/bracket";
import { ROUND_NAMES } from "@/data/teams";

interface ManualResult {
  round: number;
  winner: string;
  loser: string;
  winnerScore?: number;
  loserScore?: number;
  region: string;
  gameId?: string;
}

// Get all team names for dropdowns
const ALL_TEAMS: string[] = [];
for (const region of REGIONS) {
  for (const seed of Object.keys(region.teams)) {
    ALL_TEAMS.push(region.teams[parseInt(seed)]);
  }
}
ALL_TEAMS.sort();

export default function AdminPage() {
  const [round, setRound] = useState("1");
  const [winner, setWinner] = useState("");
  const [loser, setLoser] = useState("");
  const [winnerScore, setWinnerScore] = useState("");
  const [loserScore, setLoserScore] = useState("");
  const [region, setRegion] = useState("East");
  const [status, setStatus] = useState<string | null>(null);
  const [results, setResults] = useState<ManualResult[]>([]);

  useEffect(() => {
    fetchResults();
  }, []);

  async function fetchResults() {
    try {
      const res = await fetch("/api/scores");
      const data = await res.json();
      setResults(data.results);
    } catch {
      // ignore
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          round: parseInt(round),
          winner,
          loser,
          winnerScore: winnerScore || undefined,
          loserScore: loserScore || undefined,
          region,
        }),
      });

      if (res.ok) {
        setStatus("Game result saved successfully!");
        setWinner("");
        setLoser("");
        setWinnerScore("");
        setLoserScore("");
        fetchResults();
      } else {
        const data = await res.json();
        setStatus(`Error: ${data.error}`);
      }
    } catch (err) {
      setStatus("Failed to save result");
    }
  }

  async function handleDelete(result: ManualResult) {
    if (!confirm(`Delete ${result.winner} vs ${result.loser}?`)) return;

    try {
      await fetch("/api/games", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          round: result.round,
          winner: result.winner,
          loser: result.loser,
        }),
      });
      fetchResults();
    } catch {
      // ignore
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin - Manual Score Entry</h1>
      <p className="text-sm text-gray-500 mb-6">
        Use this page to manually enter game results when the ESPN API doesn&apos;t cover a game.
      </p>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 mb-8 card-shadow">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Round</label>
            <select
              value={round}
              onChange={(e) => setRound(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm"
            >
              {Object.entries(ROUND_NAMES).map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm"
            >
              {REGIONS.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
              <option value="Final Four">Final Four</option>
              <option value="Championship">Championship</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Winner</label>
            <select
              value={winner}
              onChange={(e) => setWinner(e.target.value)}
              required
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm"
            >
              <option value="">Select winner...</option>
              {ALL_TEAMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Loser</label>
            <select
              value={loser}
              onChange={(e) => setLoser(e.target.value)}
              required
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm"
            >
              <option value="">Select loser...</option>
              {ALL_TEAMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Winner Score (optional)</label>
            <input
              type="number"
              value={winnerScore}
              onChange={(e) => setWinnerScore(e.target.value)}
              placeholder="e.g. 78"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Loser Score (optional)</label>
            <input
              type="number"
              value={loserScore}
              onChange={(e) => setLoserScore(e.target.value)}
              placeholder="e.g. 65"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-[#E8590C] hover:bg-[#E8590C]/90 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          Save Game Result
        </button>

        {status && (
          <p
            className={`mt-3 text-sm text-center ${
              status.includes("Error") || status.includes("Failed")
                ? "text-red-600"
                : "text-green-600"
            }`}
          >
            {status}
          </p>
        )}
      </form>

      {/* Existing results */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 card-shadow">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Current Results ({results.length})
        </h2>
        {results.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No results yet. Games will appear here as they are completed.
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm"
              >
                <div>
                  <span className="text-gray-500">R{r.round}</span>
                  <span className="text-gray-900 font-medium ml-2">{r.winner}</span>
                  <span className="text-gray-400 mx-1">def.</span>
                  <span className="text-gray-500">{r.loser}</span>
                  {r.winnerScore && r.loserScore && (
                    <span className="text-gray-400 ml-2">
                      ({r.winnerScore}-{r.loserScore})
                    </span>
                  )}
                </div>
                {r.gameId?.startsWith("manual") && (
                  <button
                    onClick={() => handleDelete(r)}
                    className="text-red-600 hover:text-red-500 text-xs"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 text-center">
        <a href="/" className="text-[#E8590C] hover:text-[#E8590C]/80 text-sm">
          {"\u2190"} Back to Pool Tracker
        </a>
      </div>
    </main>
  );
}
