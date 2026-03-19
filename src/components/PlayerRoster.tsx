"use client";

import { PlayerScore, TeamScore } from "@/lib/scoring";
import { ROUND_NAMES, ROUND_POINTS } from "@/data/teams";

interface PlayerRosterProps {
  player: PlayerScore;
  onBack: () => void;
}

export default function PlayerRoster({ player, onBack }: PlayerRosterProps) {
  // Sort: alive teams first, then eliminated
  const sortedTeams = [...player.teamScores].sort((a, b) => {
    if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
    return b.totalPoints - a.totalPoints;
  });

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
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
        <h2 className="text-2xl font-bold text-white">{player.playerName}</h2>
        <div className="ml-auto text-right">
          <div className="text-2xl font-bold text-white">{player.totalPoints} pts</div>
          <div className="text-sm text-gray-400">
            {player.teamsAlive} team{player.teamsAlive !== 1 ? "s" : ""} alive
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {sortedTeams.map((team) => (
          <TeamCard key={team.teamName} team={team} playerColor={player.color} />
        ))}
      </div>
    </div>
  );
}

function TeamCard({ team, playerColor }: { team: TeamScore; playerColor: string }) {
  const rounds = [1, 2, 3, 4, 5, 6];

  return (
    <div
      className={`p-4 rounded-xl border transition-all ${
        team.eliminated
          ? "bg-[#0e0e18] border-[#1a1a2a] opacity-50"
          : "bg-[#141420] border-[#2a2a3a]"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {team.eliminated ? (
            <span className="text-red-500 font-bold text-lg">✕</span>
          ) : (
            <span className="text-green-400 text-lg">●</span>
          )}
          <span
            className={`font-semibold ${
              team.eliminated ? "text-gray-500 line-through" : "text-white"
            }`}
          >
            ({team.seed}) {team.teamName}
          </span>
          <span className="text-xs text-gray-600">{team.region}</span>
        </div>
        <span className="text-lg font-bold text-white">
          {team.totalPoints} pts
        </span>
      </div>

      {/* Round breakdown */}
      <div className="grid grid-cols-6 gap-1">
        {rounds.map((r) => {
          const pts = team.pointsByRound[r] || 0;
          return (
            <div key={r} className="text-center">
              <div className="text-[10px] text-gray-600 mb-1">
                R{r}
              </div>
              <div
                className={`text-xs font-medium py-1 rounded ${
                  pts > 0
                    ? "bg-green-500/20 text-green-400"
                    : team.eliminated && r >= (team.eliminatedRound || 99)
                    ? "bg-red-500/10 text-red-500/30"
                    : "bg-[#1a1a2e] text-gray-600"
                }`}
              >
                {pts > 0 ? `+${pts}` : "-"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
