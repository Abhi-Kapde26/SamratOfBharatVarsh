import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Coins, Castle, Award } from 'lucide-react';
import type { Team } from '../types/auction';
import { formatCurrency } from '../utils/formatters';

interface ScoreboardProps {
  teams?: Team[];
  scores?: Record<string, number>;
  compact?: boolean;
  title?: string;
  maxDisplay?: number;
  highlightTeamId?: number;
}

const Scoreboard: React.FC<ScoreboardProps> = ({
  teams = [],
  scores,
  compact = false,
  title = 'Dynasty Standings',
  maxDisplay,
  highlightTeamId,
}) => {
  // If scores object provided, convert to unified format; otherwise sort teams by points
  let rankedTeams: Array<{
    id: number | string;
    name: string;
    house_name?: string;
    total_points: number;
    kingdom_count?: number;
    remaining_balance?: number;
  }> = [];

  if (teams && teams.length > 0) {
    rankedTeams = [...teams]
      .sort((a, b) => b.total_points - a.total_points || b.remaining_balance - a.remaining_balance)
      .map((t) => ({
        id: t.id,
        name: t.name,
        house_name: t.house_name,
        total_points: t.total_points,
        kingdom_count: t.kingdom_count,
        remaining_balance: t.remaining_balance,
      }));
  } else if (scores) {
    rankedTeams = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .map(([name, score], idx) => ({
        id: `score-${idx}`,
        name,
        total_points: score,
      }));
  }

  const displayedList = maxDisplay ? rankedTeams.slice(0, maxDisplay) : rankedTeams;

  if (compact) {
    return (
      <div className="bg-[#fdf6e2]/95 border-2 border-amber-700/40 rounded-2xl p-3.5 shadow-md text-stone-900 font-marcellus">
        <div className="flex items-center justify-between pb-2 border-b border-amber-800/20 mb-2.5">
          <div className="flex items-center gap-1.5 text-amber-950 font-cinzel font-bold text-sm">
            <Trophy className="w-4 h-4 text-amber-600" />
            <span>{title}</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
            Live Points
          </span>
        </div>

        {displayedList.length === 0 ? (
          <p className="text-xs text-stone-500 italic py-2 text-center">No participating dynasties.</p>
        ) : (
          <ul className="space-y-1.5 text-xs">
            <AnimatePresence>
              {displayedList.map((team, idx) => {
                const isLeader = idx === 0 && team.total_points > 0;
                const isSelected = highlightTeamId !== undefined && team.id === highlightTeamId;

                return (
                  <motion.li
                    key={team.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.3 }}
                    className={`flex items-center justify-between p-2 rounded-xl border transition ${
                      isSelected
                        ? 'bg-amber-300/80 border-amber-700 font-bold shadow-sm'
                        : isLeader
                        ? 'bg-gradient-to-r from-amber-200/80 to-yellow-100 border-amber-500/80 font-semibold'
                        : 'bg-white/80 border-amber-200/80 hover:bg-amber-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${
                          idx === 0
                            ? 'bg-amber-500 text-stone-950 shadow-sm'
                            : idx === 1
                            ? 'bg-stone-300 text-stone-900'
                            : idx === 2
                            ? 'bg-amber-700 text-amber-100'
                            : 'bg-amber-100 text-stone-700'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <span className="truncate block text-stone-900 font-cinzel text-xs font-bold leading-tight">
                          {isLeader && '👑 '}
                          {team.name}
                        </span>
                        {team.kingdom_count !== undefined && (
                          <span className="text-[10px] text-stone-600 block leading-tight">
                            {team.kingdom_count} {team.kingdom_count === 1 ? 'domain' : 'domains'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <span className="inline-block px-2 py-0.5 rounded-lg bg-amber-800 text-amber-100 font-cinzel font-extrabold text-xs shadow-sm">
                        {team.total_points} <span className="text-[10px] font-normal">pts</span>
                      </span>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    );
  }

  // Expanded Leaderboard
  return (
    <div className="p-6 bg-[#fdf6e2]/95 border-4 border-[#b08968] rounded-[2rem] shadow-xl max-w-3xl mx-auto font-marcellus relative text-stone-900">
      <div className="absolute inset-0 border-[8px] border-double border-[#d4a373] rounded-[2rem] pointer-events-none" />

      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row items-center justify-between pb-4 border-b border-amber-800/20 mb-4 gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-700" />
            <div>
              <h2 className="text-2xl font-cinzel font-bold text-amber-950">{title}</h2>
              <p className="text-xs text-stone-600 italic">Ranked by total imperial points across acquired domains</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-800 text-amber-100 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-yellow-300" />
            <span>Leaderboard</span>
          </span>
        </div>

        {displayedList.length === 0 ? (
          <div className="py-8 text-center text-stone-600 italic">
            No participating dynasties registered.
          </div>
        ) : (
          <ul className="space-y-2.5">
            <AnimatePresence>
              {displayedList.map((team, idx) => {
                const isLeader = idx === 0 && team.total_points > 0;
                const isSelected = highlightTeamId !== undefined && team.id === highlightTeamId;

                return (
                  <motion.li
                    key={team.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border-2 transition ${
                      isSelected
                        ? 'bg-amber-200/90 border-amber-700 shadow-md ring-2 ring-amber-600'
                        : isLeader
                        ? 'bg-gradient-to-r from-amber-100 via-amber-200/70 to-yellow-100 border-amber-600/80 shadow-md'
                        : 'bg-white/85 border-amber-700/20 hover:border-amber-600/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-cinzel font-black text-sm shrink-0 shadow-sm ${
                          idx === 0
                            ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-stone-950 border-2 border-yellow-200'
                            : idx === 1
                            ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-stone-900 border border-slate-300'
                            : idx === 2
                            ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-amber-100 border border-amber-500'
                            : 'bg-amber-100 text-stone-700 border border-amber-300'
                        }`}
                      >
                        {idx === 0 ? '👑' : idx + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-cinzel font-bold text-base text-stone-900">
                            {team.name}
                          </h4>
                          {team.house_name && (
                            <span className="text-xs text-amber-900/80 bg-amber-200/60 px-2 py-0.5 rounded-md font-medium">
                              {team.house_name}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-stone-600 mt-0.5">
                          {team.kingdom_count !== undefined && (
                            <span className="flex items-center gap-1">
                              <Castle className="w-3.5 h-3.5 text-stone-500" />
                              <span>{team.kingdom_count} Domains</span>
                            </span>
                          )}
                          {team.remaining_balance !== undefined && (
                            <span className="flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5 text-amber-700" />
                              <span>Reserves: {formatCurrency(team.remaining_balance, true)}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 sm:mt-0 flex items-center justify-end gap-2">
                      <div className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-800 to-amber-950 text-amber-100 shadow flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-yellow-300" />
                        <span className="font-cinzel font-black text-sm md:text-base">
                          {team.total_points}
                        </span>
                        <span className="text-xs uppercase tracking-wider text-amber-300 font-semibold">
                          pts
                        </span>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
};

export default Scoreboard;
