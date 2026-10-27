import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Coins, Shield, Landmark, Users, ArrowUpRight, Award, RefreshCw } from 'lucide-react';
import bgImage from '../assets/bg-ancient-scroll.jpg';
import Navbar from '../components/Navbar';
import { fetchTeams, fetchAuctionState } from '../api/auctionApi';
import type { Team } from '../types/auction';
import { formatCurrency, formatIndianNumber } from '../utils/formatters';
import { useLiveAuctionEvents } from '../hooks/useLiveAuctionEvents';

const Dashboard: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [totalActiveDomains, setTotalActiveDomains] = useState<number>(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [liveUpdateAlert, setLiveUpdateAlert] = useState<string | null>(null);

  const loadTeams = async () => {
    try {
      setLoading(true);
      setError(null);
      const [teamsData, stateData] = await Promise.all([
        fetchTeams(),
        fetchAuctionState().catch(() => null)
      ]);
      setTeams(teamsData);
      if (stateData && stateData.total_active_rounds) {
        setTotalActiveDomains(stateData.total_active_rounds);
      }
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, []);

  // Real-time synchronization across connected devices
  useLiveAuctionEvents({
    onTeamsUpdated: () => {
      loadTeams();
      triggerAlert('Team profiles or rosters updated!');
    },
    onPurchaseConfirmed: (data) => {
      loadTeams();
      triggerAlert(`Confirmed Purchase: ${data.kingdom_name} acquired by ${data.team_name} for ${formatCurrency(data.amount, true)}!`);
    },
    onTransactionCorrected: () => {
      loadTeams();
      triggerAlert('A transaction was updated by the Chief Auctioneer.');
    },
    onStateChange: () => {
      // Refresh teams if state change indicates a sale
      loadTeams();
    },
    onAuctionReset: () => {
      loadTeams();
      triggerAlert('Imperial auction was reset by the Chief Auctioneer.');
    }
  });

  const triggerAlert = (msg: string) => {
    setLiveUpdateAlert(msg);
    setTimeout(() => setLiveUpdateAlert(null), 5000);
  };

  const totalImperialCapital = teams.reduce((sum, t) => sum + t.initial_treasury, 0);
  const totalExpended = teams.reduce((sum, t) => sum + t.total_spent, 0);
  const totalRemaining = totalImperialCapital - totalExpended;
  const totalKingdomsAcquired = teams.reduce((sum, t) => sum + t.kingdom_count, 0);

  return (
    <div className="min-h-screen flex flex-col font-marcellus selection:bg-amber-800 selection:text-amber-100 bg-stone-900">
      <Navbar />

      {/* Main Content with Ancient Parchment Theme */}
      <div
        className="flex-1 p-4 md:p-8 bg-cover bg-center bg-fixed relative"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="absolute inset-0 bg-stone-950/40 mix-blend-multiply pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto">
          {/* Header Title Banner */}
          <div className="text-center mb-8">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-cinzel font-bold text-amber-950 drop-shadow-sm flex items-center justify-center gap-3"
            >
              <span>Imperial Treasury & House Rosters</span>
            </motion.h1>
            <p className="text-stone-800 text-lg md:text-xl italic mt-1 font-marcellus">
              Shared real-time ledger of competing dynasties, remaining reserves and acquired domains
            </p>
            <div className="flex items-center justify-center gap-2 mt-2 text-xs text-stone-700">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>Live Synchronized Ledger • Last synced: {lastUpdated.toLocaleTimeString()}</span>
              <button
                onClick={loadTeams}
                className="ml-2 p-1 hover:text-amber-900 transition-colors"
                title="Refresh manually"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Live Event Floating Banner */}
          {liveUpdateAlert && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 p-4 rounded-xl bg-amber-500/90 text-stone-950 border-2 border-amber-300 font-semibold shadow-lg text-center"
            >
              👑 {liveUpdateAlert}
            </motion.div>
          )}

          {/* Overview Imperial Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-[#fdf6e2]/90 border-2 border-[#b08968] rounded-2xl p-4 shadow-md backdrop-blur-sm">
              <div className="flex items-center gap-2 text-amber-900 text-sm font-semibold mb-1">
                <Coins className="w-4 h-4 text-amber-700" />
                <span>Total Capital Pool</span>
              </div>
              <div className="text-2xl md:text-3xl font-bold font-cinzel text-stone-900">
                {formatCurrency(totalImperialCapital, true)}
              </div>
              <div className="text-xs text-stone-600 mt-1">₹{formatIndianNumber(totalImperialCapital)}</div>
            </div>

            <div className="bg-[#fdf6e2]/90 border-2 border-[#b08968] rounded-2xl p-4 shadow-md backdrop-blur-sm">
              <div className="flex items-center gap-2 text-rose-900 text-sm font-semibold mb-1">
                <ArrowUpRight className="w-4 h-4 text-rose-700" />
                <span>Total Expended</span>
              </div>
              <div className="text-2xl md:text-3xl font-bold font-cinzel text-rose-800">
                {formatCurrency(totalExpended, true)}
              </div>
              <div className="text-xs text-stone-600 mt-1">₹{formatIndianNumber(totalExpended)} spent</div>
            </div>

            <div className="bg-[#fdf6e2]/90 border-2 border-[#b08968] rounded-2xl p-4 shadow-md backdrop-blur-sm">
              <div className="flex items-center gap-2 text-emerald-900 text-sm font-semibold mb-1">
                <Shield className="w-4 h-4 text-emerald-700" />
                <span>Remaining Reserves</span>
              </div>
              <div className="text-2xl md:text-3xl font-bold font-cinzel text-emerald-800">
                {formatCurrency(totalRemaining, true)}
              </div>
              <div className="text-xs text-stone-600 mt-1">₹{formatIndianNumber(totalRemaining)} available</div>
            </div>

            <div className="bg-[#fdf6e2]/90 border-2 border-[#b08968] rounded-2xl p-4 shadow-md backdrop-blur-sm">
              <div className="flex items-center gap-2 text-amber-900 text-sm font-semibold mb-1">
                <Landmark className="w-4 h-4 text-amber-700" />
                <span>Domains Acquired</span>
              </div>
              <div className="text-2xl md:text-3xl font-bold font-cinzel text-stone-900">
                {totalKingdomsAcquired} <span className="text-sm font-normal text-stone-600">/ {totalActiveDomains}</span>
              </div>
              <div className="text-xs text-stone-600 mt-1">{teams.length} Competing Dynasties</div>
            </div>
          </div>

          {/* Loading and Error States */}
          {loading && teams.length === 0 && (
            <div className="p-16 text-center bg-[#fdf6e2]/80 border-2 border-[#b08968] rounded-2xl">
              <RefreshCw className="w-10 h-10 animate-spin text-amber-800 mx-auto mb-3" />
              <p className="text-xl text-stone-800 font-cinzel">Summoning Imperial Dynasty Records...</p>
            </div>
          )}

          {error && (
            <div className="p-8 text-center bg-rose-100 border-2 border-rose-400 rounded-2xl text-rose-900 mb-6">
              <p className="text-lg font-bold">Error loading records: {error}</p>
              <button
                onClick={loadTeams}
                className="mt-3 px-4 py-2 bg-rose-700 text-white rounded-lg hover:bg-rose-800"
              >
                Retry
              </button>
            </div>
          )}

          {/* Teams Grid Layout */}
          {!loading && teams.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#fdf6e2]/95 border-4 border-dashed border-[#b08968] rounded-[2rem] p-12 text-center text-stone-900 shadow-xl max-w-xl mx-auto"
            >
              <Users className="w-16 h-16 mx-auto mb-4 text-amber-800/70" />
              <h2 className="text-3xl font-cinzel font-bold text-amber-950 mb-2">No Competing Dynasties</h2>
              <p className="text-stone-700 text-sm md:text-base max-w-md mx-auto mb-6 font-marcellus">
                All dynasties have been cleared. The Chief Auctioneer can register new participating dynasties or restore default houses in the Imperial Control Centre.
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team, idx) => {
              const spentPercentage = team.initial_treasury > 0
                ? Math.min(100, Math.round((team.total_spent / team.initial_treasury) * 100))
                : 0;

              return (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="relative bg-[#fdf6e2]/95 border-4 border-[#b08968] rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col justify-between backdrop-blur-sm"
                >
                  {/* Subtle Inner Double Border */}
                  <div className="absolute inset-0 border-[6px] border-double border-[#d4a373] rounded-[2rem] pointer-events-none" />

                  {/* Card Header: Team & House */}
                  <div>
                    <div className="bg-gradient-to-r from-[#5a1a12] via-[#7c2d12] to-[#5a1a12] text-amber-100 p-5 text-center relative border-b-2 border-amber-500/40 shadow-inner">
                      <div className="text-xs uppercase tracking-widest text-amber-300 font-semibold mb-0.5">
                        {team.house_name}
                      </div>
                      <h2 className="text-2xl md:text-3xl font-cinzel font-extrabold text-amber-100 drop-shadow">
                        ⚔️ {team.name}
                      </h2>
                      {team.total_points > 0 && (
                        <div className="mt-1 inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-400/30">
                          <Award className="w-3.5 h-3.5" />
                          <span>{team.total_points} Strategic Pts</span>
                        </div>
                      )}
                    </div>

                    {/* Treasury Metrics Card Body */}
                    <div className="p-6 space-y-4">
                      {/* Financial Balances Card */}
                      <div className="bg-amber-100/60 border border-amber-700/30 rounded-xl p-4">
                        <div className="flex justify-between items-center text-sm mb-1 text-stone-700">
                          <span>Starting Treasury:</span>
                          <span className="font-semibold text-stone-900 font-cinzel">
                            {formatCurrency(team.initial_treasury, true)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-sm mb-2 text-stone-700">
                          <span>Expenditure:</span>
                          <span className="font-semibold text-rose-700 font-cinzel">
                            - {formatCurrency(team.total_spent, true)}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-amber-800/20 flex justify-between items-center">
                          <span className="text-stone-900 font-bold text-base">Remaining Balance:</span>
                          <span className="text-xl font-extrabold font-cinzel text-emerald-800">
                            {formatCurrency(team.remaining_balance, true)}
                          </span>
                        </div>

                        {/* Balance Progress Bar */}
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-stone-600 mb-1">
                            <span>Reserves Depleted</span>
                            <span>{spentPercentage}%</span>
                          </div>
                          <div className="w-full h-2.5 bg-stone-300/80 rounded-full overflow-hidden shadow-inner">
                            <div
                              className={`h-full transition-all duration-500 ${
                                spentPercentage > 80
                                  ? 'bg-rose-600'
                                  : spentPercentage > 50
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-600'
                              }`}
                              style={{ width: `${spentPercentage}%` }}
                            />
                          </div>
                          <div className="text-[11px] text-stone-600 mt-1 text-right">
                            ₹{formatIndianNumber(team.remaining_balance)} exact
                          </div>
                        </div>
                      </div>

                      {/* Acquired Kingdoms Section */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-stone-900 uppercase tracking-wide flex items-center gap-1.5">
                            <Landmark className="w-4 h-4 text-amber-800" />
                            <span>Acquired Domains ({team.kingdom_count})</span>
                          </span>
                        </div>

                        {team.acquired_kingdoms.length === 0 ? (
                          <div className="text-xs italic text-stone-600 bg-stone-200/50 p-2.5 rounded-lg text-center border border-dashed border-stone-400">
                            No kingdoms acquired yet. Standing by for auction.
                          </div>
                        ) : (
                          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                            {team.acquired_kingdoms.map((k) => (
                              <div
                                key={k.transaction_id}
                                className="flex items-center justify-between p-2 bg-amber-50 border border-amber-300/60 rounded-lg text-xs"
                              >
                                <div className="flex flex-col">
                                  <span className="font-bold text-stone-900">{k.kingdom_name}</span>
                                  <span className="text-[10px] text-stone-600">{k.region} Region</span>
                                </div>
                                <span className="font-semibold text-amber-900 font-cinzel">
                                  {formatCurrency(k.amount, true)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Team Members List */}
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900 uppercase tracking-wide mb-1.5">
                          <Users className="w-4 h-4 text-amber-800" />
                          <span>Imperial Roster & Academic Details</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {team.members.map((m, mIdx) => (
                            <span
                              key={m.id || mIdx}
                              className="px-2.5 py-1 bg-amber-200/60 border border-amber-800/20 text-stone-800 rounded-md text-xs font-medium"
                            >
                              {m.name} {m.academic_year && <span className="text-[10px] text-amber-900 font-semibold">({m.academic_year})</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Accent Ribbon */}
                  <div className="h-2.5 bg-gradient-to-r from-[#7c2d12] via-amber-600 to-[#7c2d12] border-t border-amber-500/50" />
                </motion.div>
              );
            })}
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
