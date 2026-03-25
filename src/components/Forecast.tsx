"use client";

import { useState } from "react";
import { ForecastResponse, ForecastResult } from "@/lib/simulation/types";

interface ForecastProps {
  forecast: ForecastResponse | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export default function Forecast({
  forecast,
  loading,
  error,
  onRefresh,
}: ForecastProps) {
  if (loading && !forecast) {
    return <ForecastSkeleton />;
  }

  if (error && !forecast) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
        Failed to load forecast: {error}
      </div>
    );
  }

  if (!forecast) return null;

  const maxWinPct = Math.max(...forecast.forecasts.map((f) => f.winPct), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <ForecastHeader forecast={forecast} onRefresh={onRefresh} loading={loading} />

      {/* Win Probability Chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Win Probability</h3>
        <div className="space-y-3">
          {forecast.forecasts.map((f) => (
            <WinProbabilityBar key={f.playerName} forecast={f} maxWinPct={maxWinPct} />
          ))}
        </div>
      </div>

      {/* Player Forecast Cards */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-gray-900">Detailed Forecasts</h3>
        {forecast.forecasts.map((f) => (
          <PlayerForecastCard key={f.playerName} forecast={f} />
        ))}
      </div>

      {/* Settings */}
      <ForecastSettings forecast={forecast} />
    </div>
  );
}

// ─── Header ─────────────────────────────────────────────────────────────────

function ForecastHeader({
  forecast,
  onRefresh,
  loading,
}: {
  forecast: ForecastResponse;
  onRefresh: () => void;
  loading: boolean;
}) {
  const timeAgo = getTimeAgo(forecast.simulatedAt);

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900">Win Probability Forecast</h2>
      <p className="text-sm text-gray-500">
        Based on {forecast.simulationCount.toLocaleString()} bracket simulations
        {" \u00B7 "}
        {forecast.gamesRemaining} game{forecast.gamesRemaining !== 1 ? "s" : ""} remaining
      </p>
      <div className="flex items-center gap-3 mt-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          forecast.oddsAvailable
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-gray-50 text-gray-600 border border-gray-200"
        }`}>
          {forecast.oddsAvailable ? "Vegas Odds" : "Seed-Based Model"}
        </span>
        <span className="text-xs text-gray-400">
          Simulated {timeAgo}
        </span>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-xs text-[#E8590C] hover:text-[#d04f0a] font-medium disabled:opacity-50"
        >
          {loading ? "Running..." : "Refresh"}
        </button>
      </div>
    </div>
  );
}

// ─── Win Probability Bar ────────────────────────────────────────────────────

function WinProbabilityBar({
  forecast,
  maxWinPct,
}: {
  forecast: ForecastResult;
  maxWinPct: number;
}) {
  const barWidth = maxWinPct > 0 ? (forecast.winPct / maxWinPct) * 100 : 0;

  return (
    <div className="flex items-center gap-3">
      {/* Player name */}
      <div className="flex items-center gap-1.5 w-16 shrink-0">
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: forecast.color }}
        />
        <span className="text-sm font-medium text-gray-900 truncate">
          {forecast.playerName}
        </span>
      </div>

      {/* Bar */}
      <div className="flex-1 bg-gray-100 rounded-full h-7 overflow-hidden relative">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out flex items-center"
          style={{
            width: `${Math.max(barWidth, 1)}%`,
            backgroundColor: forecast.color,
            opacity: forecast.winPct > 0 ? 1 : 0.2,
          }}
        />
        {/* Top 3 label inside bar area */}
        {forecast.top3Pct > 0 && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
            Top 3: {forecast.top3Pct.toFixed(0)}%
          </span>
        )}
      </div>

      {/* Win % */}
      <div className="w-14 text-right shrink-0">
        <span className="text-sm font-bold text-gray-900">
          {forecast.winPct.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

// ─── Player Forecast Card ───────────────────────────────────────────────────

function PlayerForecastCard({ forecast }: { forecast: ForecastResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 sm:p-4 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
      >
        {/* Player color + name */}
        <div
          className="w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: forecast.color }}
        />
        <span className="font-semibold text-gray-900 flex-1 min-w-0 truncate">
          {forecast.playerName}
        </span>

        {/* Stat pills */}
        <div className="flex items-center gap-2 sm:gap-4 text-right">
          <StatPill label="Win" value={`${forecast.winPct.toFixed(1)}%`} highlight={forecast.winPct > 20} />
          <StatPill label="Top 3" value={`${forecast.top3Pct.toFixed(0)}%`} />
          <StatPill label="Median" value={`${forecast.medianScore}`} />
          <StatPill label="Max" value={`${forecast.maxPossible}`} />
        </div>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ${expanded ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Expanded: Paths to Victory */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50 animate-fade-in">
          <div className="text-xs font-medium text-gray-500 mb-2">Path to Victory</div>
          {forecast.pathsToVictory.length > 0 ? (
            <div className="space-y-1.5">
              {forecast.pathsToVictory.map((path, i) => (
                <div key={i} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-gray-400 shrink-0">{i + 1}.</span>
                  <span>{path}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No winning scenarios found</p>
          )}

          <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-2 text-xs text-gray-500">
            <div>Current: <span className="font-medium text-gray-900">{forecast.currentPoints} pts</span></div>
            <div>Max Possible: <span className="font-medium text-gray-900">{forecast.maxPossible} pts</span></div>
            <div>Median Final: <span className="font-medium text-gray-900">{forecast.medianScore} pts</span></div>
            <div>Contender: <span className={`font-medium ${forecast.isContender ? "text-green-600" : "text-red-500"}`}>
              {forecast.isContender ? "Yes" : "Eliminated"}
            </span></div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="hidden sm:block">
      <div className="text-[10px] text-gray-400">{label}</div>
      <div className={`text-sm font-bold ${highlight ? "text-[#E8590C]" : "text-gray-900"}`}>
        {value}
      </div>
    </div>
  );
}

// ─── Forecast Settings ──────────────────────────────────────────────────────

function ForecastSettings({ forecast }: { forecast: ForecastResponse }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-medium text-gray-500">Simulation Settings</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 py-3 text-sm text-gray-600 space-y-2">
          <div className="flex items-center justify-between">
            <span>Probability Model</span>
            <span className="font-medium text-gray-900">
              {forecast.oddsAvailable ? "Vegas Odds + Seed Fallback" : "Seed-Based Historical"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Simulations</span>
            <span className="font-medium text-gray-900">{forecast.simulationCount.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Games Remaining</span>
            <span className="font-medium text-gray-900">{forecast.gamesRemaining}</span>
          </div>
          {!forecast.oddsAvailable && (
            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              Add <code className="bg-amber-100 px-1 rounded">ODDS_API_KEY</code> environment variable
              for Vegas-powered forecasts. Get a free key at the-odds-api.com (500 requests/month).
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

function ForecastSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-6 bg-gray-200 rounded w-48 mb-2" />
        <div className="h-4 bg-gray-100 rounded w-64" />
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="h-4 bg-gray-200 rounded w-32 mb-4" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 mb-3">
            <div className="w-16 h-4 bg-gray-100 rounded" />
            <div className="flex-1 h-7 bg-gray-100 rounded-full" />
            <div className="w-14 h-4 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return "1 hour ago";
  return `${hours} hours ago`;
}
