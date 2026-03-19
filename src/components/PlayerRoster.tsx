"use client";

import { useState } from "react";
import { PlayerScore, TeamScore } from "@/lib/scoring";
import { ROUND_NAMES, ROUND_POINTS, GameResult, getTeamInfo } from "@/data/teams";
import { calculateGamePoints } from "@/lib/scoring";

interface PlayerRosterProps {
  player: PlayerScore;
  onBack: () => void;
  results: GameResult[];
}

export default function PlayerRoster({ player, onBack, results }: PlayerRosterProps) {
  // Sort: alive teams first, then eliminated
  const sortedTeams = [...player.teamScores].sort((a, b) => {
    if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
    return b.totalPoints - a.totalPoints;
  });

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-4"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Leaderboard
      </button>

      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-4 h-4 rounded-full"
          style={{ backgroundColor: player.color }}
        />
        <h2 className="text-2xl font-bold text-gray-900">{player.playerName}</h2>
        <div className="ml-auto text-right">
          <div className="text-2xl font-bold text-gray-900">{player.totalPoints} pts</div>
          <div className="text-sm text-gray-500">
            {player.teamsAlive} team{player.teamsAlive !== 1 ? "s" : ""} alive
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {sortedTeams.map((team) => (
          <TeamCard key={team.teamName} team={team} playerColor={player.color} results={results} />
        ))}
      </div>
    </div>
  );
}

function TeamCard({ team, playerColor, results }: { team: TeamScore; playerColor: string; results: GameResult[] }) {
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  const rounds = [1, 2, 3, 4, 5, 6];

  // Find wins for this team
  const teamWins = results.filter((r) => r.winner === team.teamName && r.round >= 1);

  return (
    <div
      className={`p-4 rounded-xl border transition-all card-shadow ${
        team.eliminated
          ? "bg-gray-50 border-gray-200 opacity-60"
          : "bg-white border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {team.eliminated ? (
            <span className="text-red-500 font-bold text-lg">{"\u2715"}</span>
          ) : (
            <span className="text-green-600 text-lg">{"\u25CF"}</span>
          )}
          <span
            className={`font-semibold ${
              team.eliminated ? "text-gray-400 line-through" : "text-gray-900"
            }`}
          >
            ({team.seed}) {team.teamName}
          </span>
          <span className="text-xs text-gray-400">{team.region}</span>
        </div>
        <span className="text-lg font-bold text-gray-900">
          {team.totalPoints} pts
        </span>
      </div>

      {/* Scoring detail for each win */}
      {teamWins.length > 0 && (
        <div className="mb-3 space-y-1">
          {teamWins.map((win) => {
            const { basePoints, upsetBonus, totalPoints } = calculateGamePoints(win.round, win.winner, win.loser);
            return (
              <div key={`${win.round}-${win.loser}`} className="text-xs text-gray-500 pl-6">
                Beat {win.loser} ({ROUND_NAMES[win.round]}) — {basePoints}pt{basePoints !== 1 ? "s" : ""}
                {upsetBonus > 0 && <span className="text-[#E8590C]"> + {upsetBonus} upset bonus</span>}
                {" = "}<span className="font-semibold text-gray-700">{totalPoints}pts</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Round breakdown */}
      <div className="grid grid-cols-6 gap-1">
        {rounds.map((r) => {
          const pts = team.pointsByRound[r] || 0;
          return (
            <div key={r} className="text-center">
              <div className="text-[10px] text-gray-400 mb-1">
                R{r}
              </div>
              <button
                onClick={() => pts > 0 ? setExpandedRound(expandedRound === r ? null : r) : undefined}
                className={`w-full text-xs font-medium py-1 rounded ${
                  pts > 0
                    ? "bg-green-50 text-green-600 cursor-pointer hover:bg-green-100"
                    : team.eliminated && r >= (team.eliminatedRound || 99)
                    ? "bg-red-50 text-red-300"
                    : "bg-gray-50 text-gray-400"
                }`}
              >
                {pts > 0 ? `+${pts}` : "-"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
