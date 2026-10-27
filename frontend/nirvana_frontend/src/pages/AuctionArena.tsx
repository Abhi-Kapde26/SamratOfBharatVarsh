import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Maximize2, Minimize2, ChevronRight, Play, Eye, EyeOff, Trophy, AlertTriangle,
  Sliders, Layers, Check, X, Lock, RefreshCw, Crown, CheckCircle2
} from 'lucide-react';
import bgImage from '../assets/bg-ancient-scroll.jpg';
import Navbar from '../components/Navbar';
import KingdomCard from '../components/KingdomCard';
import BidTimer from '../components/BidTimer';
import Scoreboard from '../components/Scoreboard';
import {
  fetchAuctionState, fetchTeams, nextKingdom, controlTimer, getAdminToken,
  setKingdomPool, loginAdmin, confirmPurchase
} from '../api/auctionApi';
import type { AuctionState, Team } from '../types/auction';
import { useLiveAuctionEvents } from '../hooks/useLiveAuctionEvents';
import { formatCurrency } from '../utils/formatters';

const AuctionArena: React.FC = () => {
  const [auctionState, setAuctionState] = useState<AuctionState | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectorMode, setProjectorMode] = useState(false);
  const [showCriteriaScores, setShowCriteriaScores] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [localTimeLeft, setLocalTimeLeft] = useState<number>(30);
  const [soldCelebration, setSoldCelebration] = useState<string | null>(null);

  // Auction Pool Selection Modal State
  const [poolModalOpen, setPoolModalOpen] = useState(false);
  const [poolCountInput, setPoolCountInput] = useState<number>(20);
  const [poolMode, setPoolMode] = useState<'first' | 'random' | 'balanced'>('first');
  const [poolResetRound, setPoolResetRound] = useState(true);
  const [poolLoading, setPoolLoading] = useState(false);
  const [poolAdminPassword, setPoolAdminPassword] = useState('');
  const [poolNotice, setPoolNotice] = useState<string | null>(null);

  // Crown Winner / Enter Sale Modal State
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [selectedBuyerTeamId, setSelectedBuyerTeamId] = useState<number | ''>('');
  const [buyerPriceInput, setBuyerPriceInput] = useState<string>('');
  const [sellPasscode, setSellPasscode] = useState('');
  const [sellOverride, setSellOverride] = useState(false);
  const [sellLoading, setSellLoading] = useState(false);
  const [sellError, setSellError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stateData, teamsData] = await Promise.all([
        fetchAuctionState(),
        fetchTeams().catch(() => [])
      ]);
      setAuctionState(stateData);
      setTeams(teamsData);
      if (stateData) {
        setLocalTimeLeft(stateData.timer_remaining);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to auction server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setIsAdmin(Boolean(getAdminToken()));
  }, []);

  // Real-time synchronization
  useLiveAuctionEvents({
    onStateChange: (state: AuctionState) => {
      setAuctionState(state);
      setLocalTimeLeft(state.timer_remaining);
      if (state.leaderboard) {
        setTeams(state.leaderboard);
      }
    },
    onTimerTick: (data) => {
      setLocalTimeLeft(data.remaining);
    },
    onTimerComplete: () => {
      setLocalTimeLeft(0);
    },
    onPurchaseConfirmed: (data) => {
      setSoldCelebration(`👑 ${data.kingdom_name} CROWNED TO ${data.team_name} FOR ${formatCurrency(data.amount, true)}!`);
      setTimeout(() => setSoldCelebration(null), 8000);
      fetchTeams().then(setTeams).catch(console.error);
      fetchAuctionState().then(setAuctionState).catch(console.error);
    },
    onTeamsUpdated: (data) => {
      if (data.leaderboard) {
        setTeams(data.leaderboard);
      } else {
        fetchTeams().then(setTeams).catch(console.error);
      }
    },
    onTransactionCorrected: () => {
      loadData();
    },
    onAuctionReset: () => {
      loadData();
    }
  });

  const handleNextKingdom = async () => {
    try {
      const updated = await nextKingdom();
      setAuctionState(updated);
      setLocalTimeLeft(updated.timer_remaining);
      if (updated.leaderboard) setTeams(updated.leaderboard);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Error moving to next kingdom');
    }
  };

  const handleStartTimer = async () => {
    try {
      const updated = await controlTimer('start');
      setAuctionState(updated);
      setLocalTimeLeft(updated.timer_remaining);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Error starting timer');
    }
  };

  const handlePauseTimer = async () => {
    try {
      const updated = await controlTimer('pause');
      setAuctionState(updated);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleResumeTimer = async () => {
    try {
      const updated = await controlTimer('resume');
      setAuctionState(updated);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleResetTimer = async () => {
    try {
      const updated = await controlTimer('reset');
      setAuctionState(updated);
      setLocalTimeLeft(updated.timer_duration || 30);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleOpenPoolModal = () => {
    setPoolCountInput(auctionState?.total_active_rounds || 20);
    setPoolNotice(null);
    setPoolModalOpen(true);
  };

  const handleApplyPool = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setPoolLoading(true);
      setPoolNotice(null);

      // Authenticate if not logged in
      if (!getAdminToken()) {
        const pass = poolAdminPassword.trim() || 'samrat2026';
        try {
          await loginAdmin(pass);
          setIsAdmin(true);
        } catch {
          alert('Admin authentication failed. Default passcode is samrat2026.');
          setPoolLoading(false);
          return;
        }
      }

      const count = Math.max(1, Math.min(Number(poolCountInput) || 20, 100));
      const res = await setKingdomPool({
        count,
        mode: poolMode,
        reset_to_round_one: poolResetRound
      });

      setAuctionState(res.state);
      setLocalTimeLeft(res.state.timer_remaining);
      if (res.state.leaderboard) setTeams(res.state.leaderboard);
      setPoolNotice(`✅ ${res.message}`);
      setTimeout(() => {
        setPoolModalOpen(false);
        setPoolNotice(null);
      }, 1200);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Failed to update pool');
    } finally {
      setPoolLoading(false);
    }
  };

  // Open the sale modal to enter winning team and price
  const handleOpenSellModal = () => {
    if (!currentKingdom) return;

    setSellError(null);
    if (currentKingdom.confirmed_owner) {
      setSelectedBuyerTeamId(currentKingdom.confirmed_owner.team_id);
      setBuyerPriceInput(currentKingdom.confirmed_owner.amount.toString());
      setSellOverride(true);
    } else {
      setSelectedBuyerTeamId(teams.length > 0 ? teams[0].id : '');
      const defaultPrice = auctionState?.current_price && auctionState.current_price > 0
        ? auctionState.current_price
        : (currentKingdom.base_price || 5000000);
      setBuyerPriceInput(defaultPrice.toString());
      setSellOverride(false);
    }

    setSellModalOpen(true);
  };

  const handleQuickAddPrice = (increment: number) => {
    const current = Number(buyerPriceInput) || currentKingdom?.base_price || 5000000;
    setBuyerPriceInput((current + increment).toString());
  };

  const handleConfirmSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentKingdom) return;

    if (!selectedBuyerTeamId) {
      setSellError('Please select which team has bought the kingdom.');
      return;
    }

    const price = Number(buyerPriceInput);
    if (isNaN(price) || price <= 0) {
      setSellError('Please enter a valid sale price in ₹.');
      return;
    }

    setSellLoading(true);
    setSellError(null);

    try {
      // Ensure admin authentication
      if (!getAdminToken()) {
        const pass = sellPasscode.trim() || 'samrat2026';
        try {
          await loginAdmin(pass);
          setIsAdmin(true);
        } catch {
          setSellError('Authentication failed. Master admin passcode is samrat2026.');
          setSellLoading(false);
          return;
        }
      }

      const res = await confirmPurchase({
        kingdom_id: currentKingdom.id,
        team_id: Number(selectedBuyerTeamId),
        amount: price,
        admin_name: 'Chief Auctioneer',
        notes: `Crowned in live arena to ${teams.find(t => t.id === Number(selectedBuyerTeamId))?.name}`,
        override: sellOverride || Boolean(currentKingdom.confirmed_owner)
      });

      if (res.state) {
        setAuctionState(res.state);
        if (res.state.leaderboard) {
          setTeams(res.state.leaderboard);
        }
      }

      setSellModalOpen(false);
      setSoldCelebration(`👑 ${currentKingdom.name} CROWNED FOR ${formatCurrency(price, true)}!`);
      setTimeout(() => setSoldCelebration(null), 8000);
      fetchTeams().then(setTeams).catch(console.error);
    } catch (err: any) {
      setSellError(err.response?.data?.error || err.message || 'Failed to crown kingdom');
    } finally {
      setSellLoading(false);
    }
  };

  const toggleProjectorMode = () => {
    setProjectorMode((prev) => !prev);
  };

  const currentKingdom = auctionState?.current_kingdom;
  const isKingdomSold = Boolean(currentKingdom?.confirmed_owner || auctionState?.status === 'sold');
  const selectedBuyerTeam = teams.find((t) => t.id === Number(selectedBuyerTeamId));
  const topTeam = teams.length > 0 ? [...teams].sort((a, b) => b.total_points - a.total_points)[0] : null;

  return (
    <div className={`min-h-screen flex flex-col font-marcellus selection:bg-amber-800 selection:text-amber-100 ${projectorMode ? 'bg-[#1a1107]' : 'bg-stone-900'}`}>
      {/* Top Navbar: hidden in projector mode for pure 16:9 auditorium display */}
      <Navbar hideInProjectorMode={projectorMode} />

      {/* Main Auction Arena Canvas */}
      <div
        className="relative flex-1 flex flex-col items-center justify-center p-4 md:p-8 bg-cover bg-center bg-no-repeat min-h-[calc(100vh-80px)]"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="absolute inset-0 bg-stone-950/35 mix-blend-multiply pointer-events-none" />

        {/* Floating Top Control Toolbar */}
        <div className="absolute top-4 right-4 z-40 flex flex-wrap items-center gap-2 bg-[#2b1d0c]/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-amber-600/50 text-[#fefae0] text-xs shadow-lg">
          {/* Live Leaderboard Toggle Button */}
          <button
            onClick={() => setShowLeaderboard((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold transition border shadow ${
              showLeaderboard
                ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-stone-950 border-yellow-300'
                : 'bg-amber-950/80 hover:bg-amber-900 text-yellow-300 border-amber-600/60'
            }`}
            title="Toggle Live Scoreboard"
          >
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            <span>
              Leaderboard
              {topTeam && topTeam.total_points > 0 && (
                <span className="ml-1 text-[11px] font-bold opacity-90">
                  (1st: {topTeam.name} - {topTeam.total_points}pts)
                </span>
              )}
            </span>
          </button>

          {/* Auction Pool Button */}
          <button
            onClick={handleOpenPoolModal}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-800/90 hover:bg-amber-700 transition border border-amber-500/60 text-amber-100 font-semibold shadow"
            title="Choose number of kingdoms for auction"
          >
            <Sliders className="w-3.5 h-3.5 text-yellow-300" />
            <span>Pool: <strong className="text-yellow-300">{auctionState?.total_active_rounds || 0}</strong> Domains</span>
          </button>

          {/* Projector Mode Button */}
          <button
            onClick={toggleProjectorMode}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-amber-800/60 transition"
            title={projectorMode ? 'Exit Projector View' : 'Enter 16:9 Projector Mode'}
          >
            {projectorMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{projectorMode ? 'Standard View' : 'Projector 16:9'}</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setShowCriteriaScores((prev) => !prev)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full hover:bg-amber-800/60 transition text-amber-300"
              title="Admin Criteria Peek"
            >
              {showCriteriaScores ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Pillars</span>
            </button>
          )}
        </div>

        {/* Sold / Purchase Flash Celebration Banner */}
        <AnimatePresence>
          {soldCelebration && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: -40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="fixed top-8 z-50 px-8 py-4 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 text-stone-950 font-cinzel font-extrabold text-xl md:text-2xl rounded-2xl shadow-[0_10px_40px_rgba(245,158,11,0.9)] border-4 border-yellow-200 flex items-center gap-3 animate-bounce"
            >
              <Crown className="w-8 h-8 text-amber-950" />
              <span>{soldCelebration}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading and Error Handlers */}
        {loading && !auctionState && (
          <div className="relative z-10 bg-[#fdf6e2]/90 border-4 border-[#b08968] p-10 rounded-2xl text-center">
            <h2 className="text-2xl font-cinzel font-bold text-stone-900">Entering Bharatavarsha Auction Arena...</h2>
          </div>
        )}

        {error && (
          <div className="relative z-10 bg-rose-100 border-2 border-rose-400 p-6 rounded-2xl text-center text-rose-900 max-w-md">
            <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
            <p className="font-bold">{error}</p>
            <button onClick={loadData} className="mt-3 px-4 py-1.5 bg-rose-700 text-white rounded-lg">Retry</button>
          </div>
        )}

        {/* Main Grid: Card & Timer in Center, Optional Leaderboard Drawer */}
        <div className="relative z-10 w-full max-w-7xl flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8">
          {/* Central Display: Kingdom Card & Action Controls */}
          {currentKingdom && (
            <div className="w-full max-w-4xl flex flex-col items-center flex-1">
              {/* Crowned Ownership Banner if Sold */}
              {currentKingdom.confirmed_owner && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-4 w-full p-4 bg-gradient-to-r from-amber-100 via-yellow-200/90 to-amber-100 border-2 border-amber-600 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between text-stone-900 gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 border border-amber-600 rounded-full">
                      <Crown className="w-6 h-6 text-amber-800 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-xs uppercase tracking-wider font-bold text-amber-900 block">
                        Imperial Domain Crowned
                      </span>
                      <strong className="text-base md:text-lg font-cinzel font-bold text-amber-950">
                        Acquired by {currentKingdom.confirmed_owner.team_name} for {formatCurrency(currentKingdom.confirmed_owner.amount, true)}
                      </strong>
                    </div>
                  </div>
                  <button
                    onClick={handleOpenSellModal}
                    className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-amber-100 rounded-xl text-xs font-bold transition shadow"
                  >
                    Change Winner / Price
                  </button>
                </motion.div>
              )}

              <KingdomCard
                name={currentKingdom.name}
                hint={currentKingdom.hint}
                region={currentKingdom.region}
                area={currentKingdom.area}
                king={currentKingdom.ruler}
                modern_city={currentKingdom.modern_city}
                currentRound={auctionState.round_number}
                totalRounds={auctionState.total_active_rounds || 100}
                basePrice={currentKingdom.base_price || 5000000}
                currentPrice={auctionState.current_price}
                status={auctionState.status}
                winningTeamName={auctionState.winning_team?.name || currentKingdom.confirmed_owner?.team_name}
              />

              {/* Admin evaluation pillar details */}
              {showCriteriaScores && isAdmin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 w-full bg-[#fdf6e2]/95 border-2 border-amber-600 rounded-xl p-4 shadow-lg text-xs md:text-sm font-semibold text-stone-900"
                >
                  <div className="text-amber-900 font-bold mb-2 uppercase tracking-wider text-center">
                    Evaluation Pillars (Scored Value: {currentKingdom.calculated_points} pts)
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center text-stone-800">
                    <div className="bg-amber-100 p-1.5 rounded">Army: {currentKingdom.army} (30%)</div>
                    <div className="bg-amber-100 p-1.5 rounded">Wealth: {currentKingdom.wealth} (25%)</div>
                    <div className="bg-amber-100 p-1.5 rounded">Territory: {currentKingdom.territory} (15%)</div>
                    <div className="bg-amber-100 p-1.5 rounded">Culture: {currentKingdom.culture} (10%)</div>
                    <div className="bg-amber-100 p-1.5 rounded">Politics: {currentKingdom.politics} (10%)</div>
                    <div className="bg-amber-100 p-1.5 rounded">Population: {currentKingdom.population} (10%)</div>
                  </div>
                </motion.div>
              )}

              {/* Discussion Countdown Timer */}
              <BidTimer
                timeLeft={localTimeLeft}
                isRunning={auctionState.timer_running}
                onStart={handleStartTimer}
                onPause={handlePauseTimer}
                onResume={handleResumeTimer}
                onReset={handleResetTimer}
                label={auctionState.status === 'bidding' ? 'Bidding Window' : 'Discussion Countdown'}
                showControls={true}
              />

              {/* Primary Auction Action Buttons */}
              <div className="mt-8 flex flex-wrap justify-center gap-3 md:gap-4">
                {/* Crown / Sell Kingdom Action Button */}
                <button
                  className="flex items-center gap-2 px-6 py-3 text-base md:text-lg font-cinzel font-bold bg-gradient-to-r from-yellow-500 via-amber-600 to-yellow-600 hover:from-yellow-400 hover:to-amber-500 text-stone-950 rounded-xl shadow-xl hover:shadow-yellow-600/50 transition duration-300 border-2 border-yellow-200 cursor-pointer"
                  onClick={handleOpenSellModal}
                >
                  <Crown className="w-5 h-5 text-stone-950 fill-current" />
                  <span>{isKingdomSold ? 'Edit Crowned Winner / Price' : 'Crown Winner / Sell Kingdom'}</span>
                </button>

                <button
                  className="flex items-center gap-2 px-5 py-3 text-sm md:text-base font-cinzel font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-lg transition duration-300 border border-orange-400 cursor-pointer"
                  onClick={handleNextKingdom}
                >
                  <span>Reveal Next Domain</span>
                  <ChevronRight className="w-5 h-5" />
                </button>

                <button
                  className="flex items-center gap-2 px-5 py-3 text-sm md:text-base font-cinzel font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg transition duration-300 border border-emerald-400 cursor-pointer"
                  onClick={handleStartTimer}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Discussion Timer</span>
                </button>

                <button
                  className={`flex items-center gap-2 px-4 py-3 text-sm md:text-base font-cinzel font-bold rounded-xl shadow-lg transition duration-300 border cursor-pointer ${
                    showLeaderboard
                      ? 'bg-yellow-400 text-stone-950 border-yellow-200'
                      : 'bg-[#2b1d0c] hover:bg-[#3d2912] text-amber-200 border-amber-600/50'
                  }`}
                  onClick={() => setShowLeaderboard((prev) => !prev)}
                >
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>{showLeaderboard ? 'Hide Leaderboard' : 'View Leaderboard'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Collapsible / Side Live Leaderboard Panel */}
          {showLeaderboard && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full lg:w-80 xl:w-96 shrink-0"
            >
              <Scoreboard
                teams={teams}
                compact={true}
                title="Live Imperial Leaderboard"
              />
            </motion.div>
          )}
        </div>

        {/* Empty State / All Kingdoms Auctioned */}
        {!currentKingdom && !loading && (
          <div className="relative z-10 bg-[#fdf6e2]/95 border-4 border-[#b08968] p-8 md:p-12 rounded-[2rem] text-center max-w-lg shadow-2xl text-stone-900">
            <div className="absolute inset-0 border-[8px] border-double border-[#d4a373] rounded-[2rem] pointer-events-none" />
            <Layers className="w-14 h-14 text-amber-800 mx-auto mb-3" />
            <h2 className="text-2xl md:text-3xl font-cinzel font-bold text-amber-950 mb-2">
              {auctionState?.total_sold && auctionState.total_sold >= (auctionState?.total_active_rounds || 0)
                ? 'All Auction Domains Concluded!'
                : 'No Kingdom Loaded in Live Arena'}
            </h2>
            <p className="text-sm text-stone-700 mb-6 font-marcellus leading-relaxed">
              {auctionState?.total_sold && auctionState.total_sold >= (auctionState?.total_active_rounds || 0)
                ? `All ${auctionState.total_active_rounds} active kingdoms have been auctioned. You can configure a new pool or view the final standings.`
                : 'Choose how many kingdoms from the historical domains you want to include in this auction to begin.'}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={handleOpenPoolModal}
                className="px-6 py-3 bg-amber-800 hover:bg-amber-900 text-amber-100 font-cinzel font-bold text-sm rounded-xl shadow-lg transition flex items-center gap-2 border border-amber-600"
              >
                <Sliders className="w-4 h-4 text-yellow-300" />
                <span>Configure Auction Pool</span>
              </button>
              <a
                href="/results"
                className="px-6 py-3 bg-stone-800 hover:bg-stone-900 text-amber-200 font-cinzel font-bold text-sm rounded-xl shadow-lg transition flex items-center gap-2 border border-stone-600"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>View Results</span>
              </a>
            </div>
          </div>
        )}

        {/* ================= MODAL: CROWN WINNER & RECORD SALE ================= */}
        <AnimatePresence>
          {sellModalOpen && currentKingdom && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative max-w-lg w-full bg-[#fdf6e2] border-4 border-[#b08968] rounded-[2rem] p-6 md:p-8 shadow-2xl text-stone-900"
              >
                <div className="absolute inset-0 border-[8px] border-double border-[#d4a373] rounded-[2rem] pointer-events-none" />

                <div className="flex justify-between items-center pb-3 border-b border-amber-800/20 mb-4">
                  <div className="flex items-center gap-2">
                    <Crown className="w-6 h-6 text-amber-800" />
                    <h3 className="text-2xl font-cinzel font-bold text-amber-950">
                      {isKingdomSold ? 'Update / Reassign Domain' : 'Crown Domain to Winner'}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSellModalOpen(false)}
                    className="p-1 rounded-full hover:bg-amber-200 text-stone-600 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {sellError && (
                  <div className="mb-4 p-3 bg-rose-100 border border-rose-400 rounded-xl text-rose-900 text-xs font-semibold text-center">
                    {sellError}
                  </div>
                )}

                {/* Kingdom Information Card */}
                <div className="mb-4 bg-amber-100/70 p-3.5 rounded-xl border border-amber-600/30 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-stone-600">Kingdom:</span>
                    <strong className="text-sm font-cinzel font-bold text-amber-950">{currentKingdom.name}</strong>
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-stone-600">Region & Ruler:</span>
                    <span className="font-medium text-stone-800">{currentKingdom.region} • {currentKingdom.ruler}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-amber-700/20">
                    <span className="text-stone-600">Domain Strategic Value:</span>
                    <strong className="text-amber-900 font-bold">{currentKingdom.calculated_points} Points</strong>
                  </div>
                </div>

                <form onSubmit={handleConfirmSale} className="space-y-4">
                  {/* Team Selector */}
                  <div>
                    <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider mb-1">
                      Winning Dynasty / House:
                    </label>
                    <select
                      value={selectedBuyerTeamId}
                      onChange={(e) => setSelectedBuyerTeamId(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-white border-2 border-amber-700/40 rounded-xl text-stone-900 text-sm font-medium focus:outline-none focus:border-amber-700"
                      required
                    >
                      <option value="">-- Select Dynasty --</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.house_name}) — Reserves: {formatCurrency(t.remaining_balance, true)}
                        </option>
                      ))}
                    </select>

                    {selectedBuyerTeam && (
                      <div className="flex items-center justify-between text-xs text-stone-600 mt-1.5 px-1">
                        <span>Treasury Reserves: <strong className="text-emerald-800 font-semibold">{formatCurrency(selectedBuyerTeam.remaining_balance, true)}</strong></span>
                        <span>Current Points: <strong className="text-amber-900 font-semibold">{selectedBuyerTeam.total_points} pts</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Purchase Price Input */}
                  <div>
                    <label className="block text-xs font-bold text-amber-950 uppercase tracking-wider mb-1">
                      Final Hammer Price (₹):
                    </label>
                    <input
                      type="number"
                      value={buyerPriceInput}
                      onChange={(e) => setBuyerPriceInput(e.target.value)}
                      placeholder="e.g. 5000000"
                      className="w-full px-3.5 py-2.5 bg-white border-2 border-amber-700/40 rounded-xl text-stone-900 font-mono text-base font-bold focus:outline-none focus:border-amber-700"
                      required
                    />

                    <div className="text-xs text-stone-600 mt-1 px-1 flex justify-between">
                      <span>Formatted: <strong className="text-amber-900 font-cinzel text-sm">{formatCurrency(Number(buyerPriceInput) || 0, true)}</strong></span>
                      <span>Base Price: {formatCurrency(currentKingdom.base_price, true)}</span>
                    </div>

                    {/* Quick Raise Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[11px] font-bold text-stone-600 mr-1">Quick Add:</span>
                      <button type="button" onClick={() => handleQuickAddPrice(500000)} className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 rounded text-xs font-semibold">+5L</button>
                      <button type="button" onClick={() => handleQuickAddPrice(1000000)} className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 rounded text-xs font-semibold">+10L</button>
                      <button type="button" onClick={() => handleQuickAddPrice(2500000)} className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 rounded text-xs font-semibold">+25L</button>
                      <button type="button" onClick={() => handleQuickAddPrice(5000000)} className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 rounded text-xs font-semibold">+50L</button>
                      <button type="button" onClick={() => handleQuickAddPrice(10000000)} className="px-2 py-0.5 bg-amber-200 hover:bg-amber-300 rounded text-xs font-semibold">+1Cr</button>
                    </div>
                  </div>

                  {/* If already sold, allow override toggle */}
                  {currentKingdom.confirmed_owner && (
                    <div className="p-3 bg-amber-100/90 rounded-xl border border-amber-500 text-xs flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="overrideCheck"
                        checked={sellOverride}
                        onChange={(e) => setSellOverride(e.target.checked)}
                        className="w-4 h-4 accent-amber-800 rounded"
                      />
                      <label htmlFor="overrideCheck" className="text-stone-800 font-semibold cursor-pointer">
                        Reassign ownership & refund previous owner ({currentKingdom.confirmed_owner.team_name})
                      </label>
                    </div>
                  )}

                  {/* Passcode field if not already logged in */}
                  {!isAdmin && (
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-300 text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <label className="flex items-center gap-1.5 font-bold text-amber-950">
                          <Lock className="w-3.5 h-3.5 text-amber-800" />
                          <span>Admin Passcode</span>
                        </label>
                        <span className="text-[10px] bg-amber-200 px-1.5 py-0.5 rounded font-mono font-bold">
                          Default: samrat2026
                        </span>
                      </div>
                      <input
                        type="password"
                        placeholder="Enter admin passcode (samrat2026)"
                        value={sellPasscode}
                        onChange={(e) => setSellPasscode(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-amber-600 rounded-lg text-xs"
                      />
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-3 border-t border-amber-800/20">
                    <button
                      type="button"
                      onClick={() => setSellModalOpen(false)}
                      disabled={sellLoading}
                      className="px-4 py-2 border border-stone-400 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={sellLoading}
                      className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-amber-100 rounded-xl text-xs font-bold shadow-lg transition disabled:opacity-50"
                    >
                      {sellLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Recording Purchase...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-yellow-300" />
                          <span>Confirm Sale & Crown to Dynasty</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ================= MODAL: CHOOSE NO. OF KINGDOMS FOR AUCTION ================= */}
        <AnimatePresence>
          {poolModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative max-w-lg w-full bg-[#fdf6e2] border-4 border-[#b08968] rounded-[2rem] p-6 md:p-8 shadow-2xl text-stone-900"
              >
                <div className="absolute inset-0 border-[8px] border-double border-[#d4a373] rounded-[2rem] pointer-events-none" />

                <div className="flex justify-between items-center pb-3 border-b border-amber-800/20 mb-4">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-6 h-6 text-amber-800" />
                    <h3 className="text-2xl font-cinzel font-bold text-amber-950">Imperial Auction Pool</h3>
                  </div>
                  <button
                    onClick={() => setPoolModalOpen(false)}
                    className="p-1 rounded-full hover:bg-amber-200 text-stone-600 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {poolNotice && (
                  <div className="mb-4 p-3 bg-emerald-100 border border-emerald-400 rounded-xl text-emerald-900 text-xs font-semibold text-center">
                    {poolNotice}
                  </div>
                )}

                <p className="text-xs text-stone-700 mb-5 font-marcellus leading-relaxed">
                  Select how many kingdoms from historical domains you wish to include in the live arena pool.
                </p>

                {/* Number of Kingdoms selector */}
                <div className="mb-5 bg-amber-100/70 p-4 rounded-2xl border border-amber-700/30">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-stone-800 uppercase tracking-wider font-cinzel">
                      Number of Domains to Auction:
                    </label>
                    <span className="text-2xl font-cinzel font-extrabold text-amber-900">
                      {poolCountInput} <span className="text-xs font-normal text-stone-600">/ 100</span>
                    </span>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={poolCountInput}
                    onChange={(e) => setPoolCountInput(Number(e.target.value))}
                    className="w-full accent-amber-800 cursor-pointer h-2 bg-amber-200 rounded-lg mb-3"
                  />

                  {/* Preset Pills */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-stone-600 mr-1">Presets:</span>
                    {[10, 15, 20, 25, 30, 40, 50, 100].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setPoolCountInput(num)}
                        className={`px-2.5 py-1 text-xs rounded-lg font-bold transition border ${
                          poolCountInput === num
                            ? 'bg-amber-800 text-amber-100 border-amber-900 shadow'
                            : 'bg-white hover:bg-amber-200 text-stone-800 border-amber-400'
                        }`}
                      >
                        {num === 100 ? 'All 100' : num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selection Mode Strategy */}
                <div className="mb-5">
                  <label className="block text-xs font-bold text-stone-800 uppercase tracking-wider font-cinzel mb-2">
                    Domain Selection Method:
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setPoolMode('first')}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        poolMode === 'first'
                          ? 'bg-amber-800 text-amber-100 border-amber-900 shadow font-bold'
                          : 'bg-white hover:bg-amber-100 text-stone-800 border-amber-300'
                      }`}
                    >
                      <div className="font-cinzel text-xs font-bold">First {poolCountInput}</div>
                      <div className="text-[10px] opacity-80 mt-0.5">By Roster Order</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPoolMode('random')}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        poolMode === 'random'
                          ? 'bg-amber-800 text-amber-100 border-amber-900 shadow font-bold'
                          : 'bg-white hover:bg-amber-100 text-stone-800 border-amber-300'
                      }`}
                    >
                      <div className="font-cinzel text-xs font-bold">Random {poolCountInput}</div>
                      <div className="text-[10px] opacity-80 mt-0.5">Shuffle Surprise</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPoolMode('balanced')}
                      className={`p-2.5 rounded-xl border text-center transition ${
                        poolMode === 'balanced'
                          ? 'bg-amber-800 text-amber-100 border-amber-900 shadow font-bold'
                          : 'bg-white hover:bg-amber-100 text-stone-800 border-amber-300'
                      }`}
                    >
                      <div className="font-cinzel text-xs font-bold">Balanced</div>
                      <div className="text-[10px] opacity-80 mt-0.5">Across Regions</div>
                    </button>
                  </div>
                </div>

                {/* Reset Arena Checkbox */}
                <div className="mb-5 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="poolReset"
                    checked={poolResetRound}
                    onChange={(e) => setPoolResetRound(e.target.checked)}
                    className="w-4 h-4 accent-amber-800 rounded cursor-pointer"
                  />
                  <label htmlFor="poolReset" className="text-xs text-stone-800 cursor-pointer font-medium">
                    Reset live arena to <strong>Round 1</strong> with first domain in this pool
                  </label>
                </div>

                {/* Passcode input if not admin yet */}
                {!isAdmin && (
                  <div className="mb-5 bg-amber-50 p-3 rounded-xl border border-amber-300 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <label className="flex items-center gap-1.5 font-bold text-amber-950">
                        <Lock className="w-3.5 h-3.5 text-amber-800" />
                        <span>Chief Auctioneer Passcode</span>
                      </label>
                      <span className="text-[10px] bg-amber-200 px-1.5 py-0.5 rounded font-mono font-bold">
                        Default: samrat2026
                      </span>
                    </div>
                    <input
                      type="password"
                      placeholder="Enter admin password (samrat2026)"
                      value={poolAdminPassword}
                      onChange={(e) => setPoolAdminPassword(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-amber-600 rounded-lg text-xs"
                    />
                  </div>
                )}

                {/* Modal Action Buttons */}
                <div className="flex justify-end gap-3 pt-3 border-t border-amber-800/20">
                  <button
                    type="button"
                    onClick={() => setPoolModalOpen(false)}
                    disabled={poolLoading}
                    className="px-4 py-2 border border-stone-400 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyPool}
                    disabled={poolLoading}
                    className="flex items-center gap-1.5 px-6 py-2 bg-amber-800 hover:bg-amber-900 text-amber-100 rounded-xl text-xs font-bold shadow transition disabled:opacity-50"
                  >
                    {poolLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Applying Pool...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Apply {poolCountInput} Domains to Arena</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AuctionArena;
