import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Crown, Sparkles, RefreshCw } from 'lucide-react';
import bgImage from '../assets/bg-ancient-scroll.jpg';
import Navbar from '../components/Navbar';
import { fetchResults } from '../api/auctionApi';
import type { Team } from '../types/auction';
import { formatCurrency } from '../utils/formatters';
import { useLiveAuctionEvents } from '../hooks/useLiveAuctionEvents';

const Results: React.FC = () => {
  const [champion, setChampion] = useState<Team | null>(null);
  const [leaderboard, setLeaderboard] = useState<Team[]>([]);
  const [formula, setFormula] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadResults = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchResults();
      setChampion(data.champion);
      setLeaderboard(data.leaderboard);
      setFormula(data.formula);
    } catch (err: any) {
      setError(err.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, []);

  useLiveAuctionEvents({
    onPurchaseConfirmed: () => loadResults(),
    onTransactionCorrected: () => loadResults(),
    onTeamsUpdated: () => loadResults(),
  });

  return (
    <div className="min-h-screen flex flex-col font-marcellus selection:bg-amber-800 selection:text-amber-100 bg-stone-900 text-[#fefae0]">
      <Navbar />

      <div
        className="flex-1 p-4 md:p-8 bg-cover bg-center bg-fixed relative"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="absolute inset-0 bg-stone-950/45 mix-blend-multiply pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-widest mb-3"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Imperial Scoring & Crown Leaderboard</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-cinzel font-black text-amber-950 drop-shadow-md"
            >
              SAMRAT OF BHARATAVARSHA
            </motion.h1>
            <p className="text-stone-800 text-lg md:text-xl italic mt-1 font-serif">
              The Grand Coronation of the Undivided Realm
            </p>

            <div className="mt-2 text-xs text-stone-700 bg-[#fdf6e2]/80 max-w-xl mx-auto py-1 px-3 rounded-full border border-amber-700/30 font-sans">
              Strategic Formula: <strong>{formula || '0.30(Army) + 0.25(Wealth) + 0.15(Territory) + 0.10(Culture) + 0.10(Politics) + 0.10(Population)'}</strong>
            </div>
          </div>

          {loading && leaderboard.length === 0 && (
            <div className="p-16 text-center bg-[#fdf6e2]/80 border-4 border-[#b08968] rounded-[2rem]">
              <RefreshCw className="w-10 h-10 animate-spin text-amber-800 mx-auto mb-3" />
              <p className="text-xl text-stone-800 font-cinzel">Summoning Council Results...</p>
            </div>
          )}

          {error && (
            <div className="p-6 text-center bg-rose-100 border-2 border-rose-400 rounded-2xl text-rose-900 mb-6">
              <p className="font-bold">Error: {error}</p>
              <button onClick={loadResults} className="mt-2 px-4 py-1.5 bg-rose-700 text-white rounded-lg text-xs">Retry</button>
            </div>
          )}

          {/* Crowned Champion Banner */}
          {champion && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-10 bg-gradient-to-br from-[#fdf6e2] via-[#fefae0] to-[#fde047]/40 border-4 border-[#b08968] rounded-[2.5rem] p-8 md:p-12 shadow-[0_15px_50px_rgba(0,0,0,0.45)] text-stone-900 text-center relative overflow-hidden"
            >
              <div className="absolute inset-0 border-[10px] border-double border-[#d4a373] rounded-[2.5rem] pointer-events-none" />

              <div className="relative z-10 flex flex-col items-center">
                <div className="p-4 bg-amber-400/20 border-2 border-amber-600 rounded-full mb-3 animate-bounce">
                  <Crown className="w-14 h-14 text-amber-700 filter drop-shadow" />
                </div>

                <span className="text-xs md:text-sm uppercase tracking-[0.25em] font-bold text-amber-900 mb-1">
                  Crown Emperor & Supreme Ruler
                </span>

                <h2 className="text-4xl md:text-6xl font-cinzel font-black text-amber-950 mb-2">
                  👑 {champion.name} 👑
                </h2>
                <span className="text-lg text-amber-800 font-semibold mb-4">{champion.house_name}</span>

                <div className="inline-flex items-center gap-3 px-6 py-2 bg-amber-600 text-white rounded-full font-cinzel font-extrabold text-xl shadow-lg mb-6">
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                  <span>{champion.total_points} Total Strategic Points</span>
                </div>

                {/* Champion Kingdom Portfolio & Pillar Breakdown */}
                <div className="w-full max-w-2xl bg-amber-100/70 p-4 rounded-2xl border border-amber-700/30 text-xs">
                  <div className="font-bold text-amber-950 uppercase mb-2">
                    Imperial Pillars & Territory Dominion ({champion.kingdom_count} Domains)
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-stone-800 font-medium mb-3">
                    <div className="bg-amber-200/60 p-1.5 rounded">Army: {champion.pillar_totals.army}</div>
                    <div className="bg-amber-200/60 p-1.5 rounded">Wealth: {champion.pillar_totals.wealth}</div>
                    <div className="bg-amber-200/60 p-1.5 rounded">Territory: {champion.pillar_totals.territory}</div>
                    <div className="bg-amber-200/60 p-1.5 rounded">Culture: {champion.pillar_totals.culture}</div>
                    <div className="bg-amber-200/60 p-1.5 rounded">Politics: {champion.pillar_totals.politics}</div>
                    <div className="bg-amber-200/60 p-1.5 rounded">Pop: {champion.pillar_totals.population}</div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-1.5">
                    {champion.acquired_kingdoms.map(k => (
                      <span key={k.transaction_id} className="px-2.5 py-1 bg-amber-300/60 border border-amber-700/30 rounded-lg text-stone-900 font-semibold">
                        {k.kingdom_name} ({formatCurrency(k.amount, true)})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Full Leaderboard Table */}
          <div className="bg-[#fdf6e2] border-4 border-[#b08968] rounded-[2rem] p-6 md:p-8 shadow-xl text-stone-900 relative">
            <div className="absolute inset-0 border-[8px] border-double border-[#d4a373] rounded-[2rem] pointer-events-none" />

            <h3 className="text-2xl font-cinzel font-bold text-amber-950 mb-4 pb-2 border-b border-amber-700/30 flex items-center justify-between">
              <span>Dynasty Standings & Valuation Rankings</span>
              <button onClick={loadResults} className="p-1 hover:text-amber-900">
                <RefreshCw className="w-4 h-4" />
              </button>
            </h3>

            {leaderboard.length === 0 && !loading && (
              <div className="p-8 text-center text-stone-600 italic">
                No active bids recorded yet. Complete territory bidding in the Auction Arena.
              </div>
            )}

            <div className="space-y-3 font-sans">
              {leaderboard.map((team, idx) => {
                const isWinner = idx === 0 && team.total_points > 0;
                return (
                  <motion.div
                    key={team.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border-2 transition ${
                      isWinner
                        ? 'bg-amber-200/90 border-amber-500 shadow-md'
                        : idx === 1
                        ? 'bg-amber-100/70 border-amber-300'
                        : idx === 2
                        ? 'bg-orange-100/60 border-orange-300'
                        : 'bg-amber-50/60 border-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2 sm:mb-0">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-cinzel font-bold text-sm ${
                          isWinner ? 'bg-amber-600 text-white' : 'bg-stone-300 text-stone-800'
                        }`}
                      >
                        {idx + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-cinzel font-bold text-base md:text-lg text-stone-900">
                            {team.name}
                          </span>
                          <span className="text-xs text-amber-900 font-semibold font-marcellus">
                            ({team.house_name})
                          </span>
                          {isWinner && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 text-[10px] font-extrabold uppercase">
                              Samrat
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-600">
                          {team.kingdom_count} Domain(s) acquired • Remaining: {formatCurrency(team.remaining_balance, true)}
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-xs text-stone-600 hidden md:block">
                        Army: {team.pillar_totals.army} | W: {team.pillar_totals.wealth} | T: {team.pillar_totals.territory}
                      </div>
                      <div className="font-cinzel font-extrabold text-xl md:text-2xl text-amber-950">
                        {team.total_points} <span className="text-xs font-normal text-stone-600 font-sans">pts</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-8 text-center text-xs text-stone-600 italic">
              Powered by Nirvana Strategy Club • Samrat of Bharatavarsha Auction Engine
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;
