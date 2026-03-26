"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { LiveGame } from "@/lib/espn";
import { getGamesToday, GameTodayInfo, toLocalDateStr, getTodayET } from "@/lib/gamesToday";
import { ROUND_NAMES } from "@/data/teams";
import { formatPts } from "@/lib/scoring";

const STORAGE_KEY_FINAL = "games-today-final-expanded";
const STORAGE_KEY_UPCOMING = "games-today-upcoming-expanded";

// ── Date helpers ─────────────────────────────────────────────────

/** Parse "YYYY-MM-DD" into a local Date (avoids UTC midnight shift). */
function parseDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** "2026-03-20" → "THU, MAR 20" */
function formatDateNav(dateStr: string): string {
  return parseDateStr(dateStr)
    .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
    .toUpperCase();
}

/** "2026-03-20" → "Thu, Mar 20" */
function formatDateHeader(dateStr: string): string {
  return parseDateStr(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Shift a YYYY-MM-DD by N days. */
function shiftDate(dateStr: string, days: number): string {
  const d = parseDateStr(dateStr);
  d.setDate(d.getDate() + days);
  return toLocalDateStr(d);
}

/** "2026-03-19" → "20260319" for ESPN API. */
function toESPNDate(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

/** Validate YYYY-MM-DD format and real date. */
function isValidDateStr(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = parseDateStr(s);
  return !isNaN(d.getTime()) && toLocalDateStr(d) === s;
}

// ── Tournament dates (only days with scheduled games) ────────────

const TOURNAMENT_DATES = [
  "2026-03-17", "2026-03-18",         // First Four
  "2026-03-19", "2026-03-20",         // Round of 64
  "2026-03-21", "2026-03-22",         // Round of 32
  "2026-03-26", "2026-03-27",         // Sweet 16
  "2026-03-28", "2026-03-29",         // Elite 8
  "2026-04-04",                        // Final Four
  "2026-04-06",                        // Championship
];

/** Find the next tournament date on or after the given date. */
function nextTournamentDate(dateStr: string): string | null {
  return TOURNAMENT_DATES.find((d) => d >= dateStr) ?? null;
}

/** Find the previous tournament date strictly before the given date. */
function prevTournamentDate(dateStr: string): string | null {
  for (let i = TOURNAMENT_DATES.length - 1; i >= 0; i--) {
    if (TOURNAMENT_DATES[i] < dateStr) return TOURNAMENT_DATES[i];
  }
  return null;
}

/** Find the next tournament date strictly after the given date. */
function nextTournamentDateAfter(dateStr: string): string | null {
  return TOURNAMENT_DATES.find((d) => d > dateStr) ?? null;
}

// ── Component ────────────────────────────────────────────────────

interface GamesTodayProps {
  allGames: LiveGame[];
}

export default function GamesToday({ allGames }: GamesTodayProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Today in ET (recomputed each render, self-corrects at midnight ET)
  const todayStr = getTodayET();

  // Determine if today is a tournament date
  const isTournamentDay = TOURNAMENT_DATES.includes(todayStr);

  // Read & validate ?date= param
  const rawDate = searchParams.get("date");
  const defaultDate = isTournamentDay ? todayStr : (nextTournamentDate(todayStr) ?? todayStr);
  const selectedDate = rawDate && isValidDateStr(rawDate) ? rawDate : defaultDate;
  const isToday = selectedDate === todayStr;
  const isShowingFutureDate = selectedDate > todayStr;
  const isFutureOrToday = selectedDate >= todayStr;

  // ── Historical fetch state ──
  const [historicalGames, setHistoricalGames] = useState<LiveGame[]>([]);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [historicalError, setHistoricalError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  // ── Collapse state ──
  const [finalExpanded, setFinalExpanded] = useState(false);
  const [upcomingExpanded, setUpcomingExpanded] = useState(false);

  // ── Navigation ──
  const navigateToDate = useCallback(
    (dateStr: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (dateStr === todayStr) {
        params.delete("date");
      } else {
        params.set("date", dateStr);
      }
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "/", { scroll: false });
    },
    [searchParams, todayStr, router],
  );

  const goBack = useCallback(() => {
    const prev = prevTournamentDate(selectedDate);
    if (prev) navigateToDate(prev);
  }, [selectedDate, navigateToDate]);

  const goForward = useCallback(() => {
    const next = nextTournamentDateAfter(selectedDate);
    if (next) navigateToDate(next);
  }, [selectedDate, navigateToDate]);

  // ── Fetch historical games when not viewing today ──
  useEffect(() => {
    if (isToday) {
      setHistoricalGames([]);
      setHistoricalError(null);
      setHistoricalLoading(false);
      return;
    }

    let cancelled = false;
    setHistoricalLoading(true);
    setHistoricalError(null);

    // Fetch target date AND next UTC day to catch late-night ET games
    // (e.g., a 10pm ET game = 2am UTC next day)
    const d1 = toESPNDate(selectedDate);
    const d2 = toESPNDate(shiftDate(selectedDate, 1));
    Promise.all([
      fetch(`/api/scores?dates=${d1}`).then((r) => r.ok ? r.json() : Promise.reject(new Error("Failed to fetch games"))),
      fetch(`/api/scores?dates=${d2}`).then((r) => r.ok ? r.json() : { allGames: [] }),
    ])
      .then(([data1, data2]) => {
        if (!cancelled) {
          const combined = [...(data1.allGames || []), ...(data2.allGames || [])];
          setHistoricalGames(combined);
        }
      })
      .catch((err) => {
        if (!cancelled) setHistoricalError(err instanceof Error ? err.message : "Unknown error");
      })
      .finally(() => {
        if (!cancelled) setHistoricalLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedDate, isToday, fetchKey]);

  // ── Reset collapse state on date change ──
  useEffect(() => {
    if (isToday) {
      setFinalExpanded(localStorage.getItem(STORAGE_KEY_FINAL) === "true");
      setUpcomingExpanded(localStorage.getItem(STORAGE_KEY_UPCOMING) === "true");
    } else {
      setFinalExpanded(true);
      setUpcomingExpanded(false);
    }
  }, [isToday, selectedDate]);

  const toggleFinal = useCallback(() => {
    setFinalExpanded((prev) => {
      const next = !prev;
      if (isToday) localStorage.setItem(STORAGE_KEY_FINAL, String(next));
      return next;
    });
  }, [isToday]);

  const toggleUpcoming = useCallback(() => {
    setUpcomingExpanded((prev) => {
      const next = !prev;
      if (isToday) localStorage.setItem(STORAGE_KEY_UPCOMING, String(next));
      return next;
    });
  }, [isToday]);

  // ── Process games ──
  const sourceGames = isToday ? allGames : historicalGames;
  const games = useMemo(() => getGamesToday(sourceGames, selectedDate), [sourceGames, selectedDate]);

  const liveGames = games.filter((g) => g.statusLabel === "LIVE");
  const finalGames = games.filter((g) => g.statusLabel === "FINAL");
  const upcomingGames = games.filter((g) => g.statusLabel === "SCHEDULED");

  // ── Render ──
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 card-shadow">
      {/* Date navigation bar */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={goBack}
          disabled={!prevTournamentDate(selectedDate)}
          className={`p-1.5 rounded-lg transition-colors ${
            !prevTournamentDate(selectedDate)
              ? "text-gray-200 cursor-not-allowed"
              : "hover:bg-gray-100 cursor-pointer text-gray-500 hover:text-gray-700"
          }`}
          aria-label="Previous tournament day"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={() => navigateToDate(defaultDate)}
          className="text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
        >
          {formatDateNav(selectedDate)}
        </button>

        <button
          onClick={goForward}
          disabled={!nextTournamentDateAfter(selectedDate)}
          className={`p-1.5 rounded-lg transition-colors ${
            !nextTournamentDateAfter(selectedDate)
              ? "text-gray-200 cursor-not-allowed"
              : "hover:bg-gray-100 cursor-pointer text-gray-500 hover:text-gray-700"
          }`}
          aria-label="Next tournament day"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Section header */}
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        {isToday ? "Games Today" : isShowingFutureDate ? "Next Games" : "Games"}{" "}
        <span className="text-gray-400 font-normal">
          {"\u2014"} {formatDateHeader(selectedDate)}
        </span>
      </h3>

      {/* Loading skeleton */}
      {historicalLoading && !isToday && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Error state */}
      {historicalError && !isToday && (
        <div className="text-center py-6">
          <p className="text-sm text-red-500">Failed to load games</p>
          <button
            onClick={() => setFetchKey((k) => k + 1)}
            className="text-xs text-gray-500 underline mt-1 cursor-pointer"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!historicalLoading && !historicalError && games.length === 0 && (
        <div className="text-center py-6">
          <p className="text-sm text-gray-500">
            {isFutureOrToday && !isToday
              ? "No games yet \u2014 check back later"
              : isToday
              ? "No games featuring your teams today"
              : "No games featuring your teams on this date"}
          </p>
        </div>
      )}

      {/* Game groups */}
      {!historicalLoading && !historicalError && games.length > 0 && (
        <div className="space-y-3">
          {liveGames.length > 0 && (
            <GameGroup label="Live" labelColor="text-green-600" games={liveGames} />
          )}
          {finalGames.length > 0 && (
            <CollapsibleGroup
              label="Final"
              labelColor="text-gray-400"
              count={finalGames.length}
              expanded={finalExpanded}
              onToggle={toggleFinal}
              games={finalGames}
            />
          )}
          {upcomingGames.length > 0 && (
            <CollapsibleGroup
              label="Upcoming"
              labelColor="text-gray-500"
              count={upcomingGames.length}
              expanded={upcomingExpanded}
              onToggle={toggleUpcoming}
              games={upcomingGames}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components (unchanged from before) ───────────────────────

function GameGroup({ label, labelColor, games }: { label: string; labelColor: string; games: GameTodayInfo[] }) {
  return (
    <div>
      <div className={`text-[10px] font-semibold uppercase tracking-wider ${labelColor} mb-1.5`}>
        {label}
      </div>
      <div className="space-y-2">
        {games.map((g) => (
          <GameTodayRow key={g.game.gameId} info={g} />
        ))}
      </div>
    </div>
  );
}

function CollapsibleGroup({
  label,
  labelColor,
  count,
  expanded,
  onToggle,
  games,
}: {
  label: string;
  labelColor: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  games: GameTodayInfo[];
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${labelColor} hover:opacity-70 transition-opacity cursor-pointer`}
      >
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {label} ({count} {count === 1 ? "game" : "games"})
      </button>
      <div
        className="grid transition-all duration-300 ease-in-out"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="space-y-2 pt-1.5">
            {games.map((g) => (
              <GameTodayRow key={g.game.gameId} info={g} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GameTodayRow({ info }: { info: GameTodayInfo }) {
  const roundName = info.game.round ? ROUND_NAMES[info.game.round] : "";
  const isLive = info.statusLabel === "LIVE";
  const isFinal = info.statusLabel === "FINAL";

  const winner = info.game.winner;
  const isTeam1Winner = isFinal && winner === info.game.team1;
  const isTeam2Winner = isFinal && winner === info.game.team2;

  const winnerOwner = isTeam1Winner ? info.team1Owner : isTeam2Winner ? info.team2Owner : null;
  const winnerPoints = isTeam1Winner ? info.team1PointsIfWin : isTeam2Winner ? info.team2PointsIfWin : 0;

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center p-3 rounded-xl border transition-shadow card-shadow-hover ${
        isLive
          ? "bg-white border-green-200 border-l-4 border-l-green-500"
          : "bg-white border-gray-200"
      }`}
    >
      {/* Teams + Status (always side by side) */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Teams */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-sm">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: info.team1Color }}
            />
            <span
              className={`truncate ${
                isTeam1Winner
                  ? "font-bold text-gray-900"
                  : isFinal && isTeam2Winner
                  ? "text-gray-400 line-through"
                  : "font-medium text-gray-900"
              }`}
            >
              ({info.team1Seed}) {info.game.team1}
            </span>
            {info.statusLabel !== "SCHEDULED" && (
              <span className={`ml-auto shrink-0 ${isTeam1Winner ? "font-bold text-gray-900" : isFinal ? "text-gray-400" : "font-bold text-gray-900"}`}>
                {info.game.score1}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-sm mt-1">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: info.team2Color }}
            />
            <span
              className={`truncate ${
                isTeam2Winner
                  ? "font-bold text-gray-900"
                  : isFinal && isTeam1Winner
                  ? "text-gray-400 line-through"
                  : "font-medium text-gray-900"
              }`}
            >
              ({info.team2Seed}) {info.game.team2}
            </span>
            {info.statusLabel !== "SCHEDULED" && (
              <span className={`ml-auto shrink-0 ${isTeam2Winner ? "font-bold text-gray-900" : isFinal ? "text-gray-400" : "font-bold text-gray-900"}`}>
                {info.game.score2}
              </span>
            )}
          </div>
        </div>

        {/* Status / Time */}
        <div className="text-right shrink-0">
          {isLive && (
            <div className="flex items-center gap-1.5">
              <span className="live-pulse inline-block w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs font-bold text-green-600">LIVE</span>
            </div>
          )}
          {info.statusLabel === "SCHEDULED" && (
            <div className="flex items-center gap-1 text-gray-500">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs">{info.tipTime}</span>
            </div>
          )}
          {isFinal && (
            <div className="flex items-center gap-1 text-gray-400">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-xs font-medium">Final</span>
            </div>
          )}
          {roundName && (
            <div className="text-[10px] text-gray-400 mt-0.5">{roundName}</div>
          )}
        </div>
      </div>

      {/* Points section — below on mobile, inline right on sm+ */}
      <div className="shrink-0 mt-2 pt-2 border-t border-gray-100 sm:mt-0 sm:pt-0 sm:border-t-0 sm:pl-3 sm:border-l sm:border-gray-200">
        {isFinal && winnerOwner ? (
          <>
            <div className="text-[10px] text-gray-400 mb-0.5">Points awarded</div>
            <div className="flex items-center gap-1">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: isTeam1Winner ? info.team1Color : info.team2Color }}
              />
              <span className="text-sm font-bold text-green-600">
                {winnerOwner} +{formatPts(winnerPoints)}
              </span>
            </div>
          </>
        ) : isFinal && !winnerOwner ? (
          <div className="text-xs text-gray-400">No pool pts</div>
        ) : (
          <>
            <div className="text-[10px] text-gray-400 mb-0.5">Points at stake</div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 sm:block sm:space-y-0.5">
              {info.team1Owner && (
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: info.team1Color }} />
                  <span className="text-sm font-bold text-gray-900">+{info.team1PointsIfWin}</span>
                  <span className="text-xs text-gray-500">{info.team1Owner}</span>
                </div>
              )}
              {info.team2Owner && (
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: info.team2Color }} />
                  <span className="text-sm font-bold text-gray-900">+{info.team2PointsIfWin}</span>
                  <span className="text-xs text-gray-500">{info.team2Owner}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
