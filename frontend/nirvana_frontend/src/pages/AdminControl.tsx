import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Hammer, Users, BookOpen, History, Lock, LogIn,
  Plus, Edit, Trash2, CheckCircle2, RotateCcw, AlertTriangle, Search, Filter, Play, Pause, Clock
} from 'lucide-react';
import bgImage from '../assets/bg-ancient-scroll.jpg';
import Navbar from '../components/Navbar';
import Scoreboard from '../components/Scoreboard';
import {
  fetchAuctionState, fetchKingdoms, fetchTeams, fetchTransactions,
  selectKingdom, nextKingdom, controlTimer, placeBid, confirmPurchase,
  markUnsold, correctTransaction, createTeam, updateTeam, deleteTeam,
  createKingdom, updateKingdom, toggleKingdomStatus, loginAdmin, getAdminToken,
  deleteAllTeams, resetAuction, restoreDefaultTeams
} from '../api/auctionApi';
import type { AuctionState, Kingdom, Team, Transaction } from '../types/auction';
import { formatCurrency } from '../utils/formatters';
import { useLiveAuctionEvents } from '../hooks/useLiveAuctionEvents';

const AdminControl: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'auction' | 'teams' | 'kingdoms' | 'transactions'>('auction');

  // Core Data
  const [auctionState, setAuctionState] = useState<AuctionState | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [kingdoms, setKingdoms] = useState<Kingdom[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Auction Controls State
  const [selectedBidTeamId, setSelectedBidTeamId] = useState<number | ''>('');
  const [bidAmountInput, setBidAmountInput] = useState<string>('');
  const [customTimerDuration, setCustomTimerDuration] = useState<number>(30);
  const [confirmPurchaseModalOpen, setConfirmPurchaseModalOpen] = useState(false);

  // Kingdoms Tab State
  const [kingdomSearch, setKingdomSearch] = useState('');
  const [kingdomRegionFilter, setKingdomRegionFilter] = useState('ALL');
  const [kingdomStatusFilter, setKingdomStatusFilter] = useState('ALL');
  const [kingdomModalOpen, setKingdomModalOpen] = useState(false);
  const [editingKingdom, setEditingKingdom] = useState<Kingdom | null>(null);
  const [kingdomFormData, setKingdomFormData] = useState<any>({
    name: '', hint: '', ruler: '', modern_city: '', region: 'North', area: 25000,
    base_price: 5000000, army: 50, wealth: 50, territory: 50, culture: 50, politics: 50, population: 50, is_active: true
  });

  // Teams Tab State
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamFormData, setTeamFormData] = useState<any>({
    name: '', house_name: '', initial_treasury: 1000000000,
    members: [{ name: '', academic_year: 'UG', role: 'Member' }]
  });

  // Correction Modal State
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [targetTx, setTargetTx] = useState<Transaction | null>(null);
  const [correctionAction, setCorrectionAction] = useState<'revert' | 'reassign' | 'adjust_price'>('revert');
  const [correctionNewTeamId, setCorrectionNewTeamId] = useState<number | ''>('');
  const [correctionNewAmount, setCorrectionNewAmount] = useState<string>('');
  const [correctionReason, setCorrectionReason] = useState<string>('');

  // Auction Reset State
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetMode, setResetMode] = useState<'restart_auction' | 'clear_all_teams' | 'restore_defaults'>('restart_auction');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    const token = getAdminToken();
    if (token) {
      setIsAuthenticated(true);
      loadAllData();
    }
  }, []);

  const loadAllData = async () => {
    try {
      const [stateRes, teamsRes, kingdomsRes, txRes] = await Promise.all([
        fetchAuctionState(),
        fetchTeams(),
        fetchKingdoms(),
        fetchTransactions()
      ]);
      setAuctionState(stateRes);
      setTeams(teamsRes);
      setKingdoms(kingdomsRes);
      setTransactions(txRes);
      if (stateRes) {
        setBidAmountInput(stateRes.current_price.toString());
        setCustomTimerDuration(stateRes.timer_duration || 30);
      }
    } catch (err: any) {
      console.error(err);
      notify(err.message || 'Error loading administrative records', 'error');
    }
  };

  useLiveAuctionEvents({
    onStateChange: (state) => {
      setAuctionState(state);
    },
    onTeamsUpdated: () => {
      fetchTeams().then(setTeams);
    },
    onKingdomsUpdated: () => {
      fetchKingdoms().then(setKingdoms);
    },
    onPurchaseConfirmed: () => {
      fetchTeams().then(setTeams);
      fetchTransactions().then(setTransactions);
      fetchAuctionState().then(setAuctionState);
    },
    onTransactionCorrected: () => {
      fetchTeams().then(setTeams);
      fetchTransactions().then(setTransactions);
      fetchAuctionState().then(setAuctionState);
    },
    onAuctionReset: () => {
      loadAllData();
    }
  });

  const notify = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await loginAdmin(authPassword);
      if (res.success) {
        setIsAuthenticated(true);
        loadAllData();
      }
    } catch (err: any) {
      setAuthError(err.response?.data?.error || 'Invalid Admin Passcode');
    } finally {
      setAuthLoading(false);
    }
  };

  // ---------------- AUCTION CONTROLS ---------------- //

  const handleSelectKingdom = async (kingdomId: number) => {
    try {
      const updated = await selectKingdom(kingdomId);
      setAuctionState(updated);
      setBidAmountInput(updated.current_price.toString());
      notify(`Loaded domain: ${updated.current_kingdom?.name}`);
    } catch (err: any) {
      notify(err.response?.data?.error || err.message, 'error');
    }
  };

  const handleNextKingdom = async () => {
    try {
      const updated = await nextKingdom();
      setAuctionState(updated);
      setBidAmountInput(updated.current_price.toString());
      notify(`Advanced to Round ${updated.round_number}: ${updated.current_kingdom?.name}`);
    } catch (err: any) {
      notify(err.response?.data?.error || err.message, 'error');
    }
  };

  const handleTimerAction = async (action: 'start' | 'pause' | 'resume' | 'reset') => {
    try {
      const updated = await controlTimer(action);
      setAuctionState(updated);
      notify(`Timer ${action}ed`);
    } catch (err: any) {
      notify(err.response?.data?.error || err.message, 'error');
    }
  };

  const handleConfigureTimer = async () => {
    try {
      const updated = await controlTimer('configure', customTimerDuration);
      setAuctionState(updated);
      notify(`Default discussion timer set to ${customTimerDuration} seconds`);
    } catch (err: any) {
      notify(err.response?.data?.error || err.message, 'error');
    }
  };

  const handlePlaceBid = async () => {
    if (!selectedBidTeamId) {
      return notify('Please select a participating team first', 'error');
    }
    const amt = Number(bidAmountInput);
    if (isNaN(amt) || amt <= 0) {
      return notify('Please enter a valid bid amount', 'error');
    }

    try {
      const updated = await placeBid(Number(selectedBidTeamId), amt);
      setAuctionState(updated);
      notify(`Bid updated: ${formatCurrency(amt, true)} by ${updated.winning_team?.name}`);
    } catch (err: any) {
      notify(err.response?.data?.error || err.message, 'error');
    }
  };

  const handleQuickAddBid = (increment: number) => {
    const current = Number(bidAmountInput) || auctionState?.current_price || 5000000;
    setBidAmountInput((current + increment).toString());
  };

  const handleConfirmPurchase = async () => {
    if (!auctionState?.current_kingdom?.id || !selectedBidTeamId) {
      return notify('Please select a team and confirm the domain', 'error');
    }
    const amt = Number(bidAmountInput);

    try {
      const res = await confirmPurchase({
        kingdom_id: auctionState.current_kingdom.id,
        team_id: Number(selectedBidTeamId),
        amount: amt,
        admin_name: 'Chief Auctioneer',
        notes: `Confirmed live bid win for ${auctionState.current_kingdom.name}`,
        override: true
      });
      notify(res.message, 'success');
      setConfirmPurchaseModalOpen(false);
      loadAllData();
    } catch (err: any) {
      notify(err.response?.data?.error || err.message, 'error');
    }
  };

  const handleMarkUnsold = async () => {
    if (!auctionState?.current_kingdom?.id) return;
    if (!window.confirm(`Mark ${auctionState.current_kingdom.name} as unsold / passed?`)) return;

    try {
      await markUnsold(auctionState.current_kingdom.id);
      notify(`${auctionState.current_kingdom.name} marked as unsold.`);
      loadAllData();
    } catch (err: any) {
      notify(err.response?.data?.error || err.message, 'error');
    }
  };

  // ---------------- TEAMS ACTIONS ---------------- //

  const handleOpenTeamModal = (team?: Team) => {
    if (team) {
      setEditingTeam(team);
      setTeamFormData({
        name: team.name,
        house_name: team.house_name,
        initial_treasury: team.initial_treasury,
        members: team.members.length > 0 ? team.members.map(m => ({ name: m.name, academic_year: m.academic_year || 'UG', role: m.role || 'Member' })) : [{ name: '', academic_year: 'UG', role: 'Member' }]
      });
    } else {
      setEditingTeam(null);
      setTeamFormData({
        name: '',
        house_name: 'House of ',
        initial_treasury: 1000000000,
        members: [{ name: '', academic_year: 'UG', role: 'Member' }]
      });
    }
    setTeamModalOpen(true);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamFormData.name.trim()) return notify('Team name is required', 'error');

    try {
      if (editingTeam) {
        await updateTeam(editingTeam.id, teamFormData);
        notify(`Team ${teamFormData.name} updated successfully!`);
      } else {
        await createTeam(teamFormData);
        notify(`Team ${teamFormData.name} created successfully!`);
      }
      setTeamModalOpen(false);
      loadAllData();
    } catch (err: any) {
      notify(err.response?.data?.error || err.message, 'error');
    }
  };

  const handleDeleteTeam = async (team: Team) => {
    const confirmMsg = team.kingdom_count > 0
      ? `Delete dynasty "${team.name}" and all associated data? This will return ${team.kingdom_count} territory domain(s) back to the auction arena.`
      : `Delete dynasty "${team.name}" and its roster members?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteTeam(team.id, true);
      notify(`Dynasty "${team.name}" and all records successfully deleted.`);
      loadAllData();
    } catch (err: any) {
      notify(err.response?.data?.error || err.message, 'error');
    }
  };

  const handleDeleteAllTeams = async () => {
    if (!window.confirm('⚠️ Are you sure you want to delete ALL dynasties and rosters? This will clear all teams so you can enter or create custom teams.')) return;
    try {
      await deleteAllTeams();
      notify('All dynasties have been cleared. You can now add new teams.');
      loadAllData();
    } catch (err: any) {
      notify(err.response?.data?.error || err.message, 'error');
    }
  };

  const handleRestoreDefaults = async () => {
    if (!window.confirm('⚠️ Restore original 6 default houses? This will reset current teams and load the 6 default dynasties (Marathas, Kalinga, Mauryas, Yadava, Gandhara, Gupta) with ₹100 Cr each.')) return;
    try {
      const res = await restoreDefaultTeams();
      notify(res.message);
      loadAllData();
    } catch (err: any) {
      notify(err.response?.data?.error || err.message, 'error');
    }
  };

  const handleResetAuction = async () => {
    try {
      setResetLoading(true);
      const res = await resetAuction(resetMode);
      notify(res.message);
      setResetModalOpen(false);
      loadAllData();
    } catch (err: any) {
      notify(err.response?.data?.error || err.message, 'error');
    } finally {
      setResetLoading(false);
    }
  };

  // ---------------- KINGDOMS ACTIONS ---------------- //

  const handleOpenKingdomModal = (k?: Kingdom) => {
    if (k) {
      setEditingKingdom(k);
      setKingdomFormData({ ...k });
    } else {
      setEditingKingdom(null);
      setKingdomFormData({
        name: '', hint: '', ruler: '', modern_city: '', region: 'North', area: 20000,
        base_price: 5000000, army: 50, wealth: 50, territory: 50, culture: 50, politics: 50, population: 50, is_active: true
      });
    }
    setKingdomModalOpen(true);
  };

  const handleSaveKingdom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kingdomFormData.name.trim()) return notify('Kingdom name is required', 'error');

    try {
      if (editingKingdom) {
        await updateKingdom(editingKingdom.id, kingdomFormData);
        notify(`Kingdom ${kingdomFormData.name} updated!`);
      } else {
        await createKingdom(kingdomFormData);
        notify(`Kingdom ${kingdomFormData.name} added to library!`);
      }
      setKingdomModalOpen(false);
      loadAllData();
    } catch (err: any) {
      notify(err.response?.data?.error || err.message, 'error');
    }
  };

  const handleToggleKingdomStatus = async (id: number) => {
    try {
      const res = await toggleKingdomStatus(id);
      notify(`Kingdom status changed: ${res.is_active ? 'Active' : 'Archived'}`);
      loadAllData();
    } catch (err: any) {
      notify(err.response?.data?.error || err.message, 'error');
    }
  };

  // ---------------- CORRECTION ACTIONS ---------------- //

  const handleOpenCorrection = (tx: Transaction) => {
    setTargetTx(tx);
    setCorrectionAction('revert');
    setCorrectionNewTeamId(tx.team_id);
    setCorrectionNewAmount(tx.amount.toString());
    setCorrectionReason('');
    setCorrectionModalOpen(true);
  };

  const handleExecuteCorrection = async () => {
    if (!targetTx) return;
    try {
      await correctTransaction({
        transaction_id: targetTx.id,
        action: correctionAction,
        new_team_id: correctionAction === 'reassign' ? Number(correctionNewTeamId) : undefined,
        new_amount: correctionAction !== 'revert' ? Number(correctionNewAmount) : undefined,
        reason: correctionReason || 'Administrative audit correction'
      });
      notify(`Transaction #${targetTx.id} corrected successfully!`);
      setCorrectionModalOpen(false);
      loadAllData();
    } catch (err: any) {
      notify(err.response?.data?.error || err.message, 'error');
    }
  };

  // If not logged in, render the classical royal login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col font-marcellus bg-stone-900 text-[#fefae0]">
        <Navbar />
        <div
          className="flex-1 flex items-center justify-center p-6 bg-cover bg-center"
          style={{ backgroundImage: `url(${bgImage})` }}
        >
          <div className="absolute inset-0 bg-stone-950/40 mix-blend-multiply pointer-events-none" />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-10 max-w-md w-full bg-[#fdf6e2] border-4 border-[#b08968] rounded-[2rem] p-8 shadow-[0_15px_50px_rgba(0,0,0,0.6)] text-stone-900"
          >
            <div className="absolute inset-0 border-[10px] border-double border-[#d4a373] rounded-[2rem] pointer-events-none" />

            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto bg-amber-900/10 border-2 border-amber-800 rounded-full flex items-center justify-center mb-3 text-amber-900">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-3xl font-cinzel font-bold text-amber-950">Chief Imperial Desk</h2>
              <p className="text-sm text-stone-700 italic mt-1 font-marcellus">
                Protected Administrative Console for Host & Auctioneer
              </p>
            </div>

            {authError && (
              <div className="mb-4 p-3 bg-rose-100 border border-rose-400 rounded-xl text-rose-800 text-xs font-semibold text-center">
                {authError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-900">
                    Master Admin Passcode
                  </label>
                  <span className="text-[11px] font-mono text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded font-bold">
                    Default: samrat2026
                  </span>
                </div>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Enter admin passcode (samrat2026)"
                  className="w-full px-4 py-3 bg-amber-50 border-2 border-amber-700/40 rounded-xl text-stone-900 focus:outline-none focus:border-amber-700 font-sans"
                  required
                />
                <div className="flex justify-end mt-1.5">
                  <button
                    type="button"
                    onClick={() => setAuthPassword('samrat2026')}
                    className="text-xs text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
                  >
                    Quick-Fill Default Passcode
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-800 hover:to-amber-950 text-amber-100 font-cinzel font-bold text-base rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>{authLoading ? 'Verifying Credentials...' : 'Authenticate & Enter'}</span>
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    );
  }

  // Filtered Kingdoms list
  const filteredKingdoms = kingdoms.filter((k) => {
    const matchesSearch =
      k.name.toLowerCase().includes(kingdomSearch.toLowerCase()) ||
      k.ruler.toLowerCase().includes(kingdomSearch.toLowerCase()) ||
      k.modern_city.toLowerCase().includes(kingdomSearch.toLowerCase());
    const matchesRegion = kingdomRegionFilter === 'ALL' || k.region.toLowerCase() === kingdomRegionFilter.toLowerCase();
    const matchesStatus =
      kingdomStatusFilter === 'ALL' ||
      (kingdomStatusFilter === 'ACTIVE' && k.is_active) ||
      (kingdomStatusFilter === 'ARCHIVED' && !k.is_active) ||
      (kingdomStatusFilter === 'SOLD' && k.owner) ||
      (kingdomStatusFilter === 'UNSOLD' && !k.owner);
    return matchesSearch && matchesRegion && matchesStatus;
  });

  const selectedTeamDetails = teams.find((t) => t.id === Number(selectedBidTeamId));

  return (
    <div className="min-h-screen flex flex-col font-marcellus bg-stone-900 text-[#fefae0]">
      <Navbar />

      <div
        className="flex-1 p-4 md:p-8 bg-cover bg-center bg-fixed relative"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="absolute inset-0 bg-stone-950/50 mix-blend-multiply pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto">
          {/* Header & Tabs */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-cinzel font-bold text-[#fefae0] flex items-center gap-2">
                <ShieldAlert className="w-8 h-8 text-amber-400" />
                <span>Imperial Control Centre</span>
              </h1>
              <p className="text-amber-200/80 text-sm italic">
                Real-time Auction Desk • Treasury Verification • Kingdom Archives • Audit Log
              </p>
            </div>

            {/* Navigation Tabs & Reset Action */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setResetModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-900 via-amber-900 to-red-900 hover:from-red-800 hover:to-amber-800 text-amber-200 border border-amber-500/60 rounded-xl text-xs md:text-sm font-cinzel font-bold shadow-lg transition duration-200 hover:scale-105"
                title="Restart or reset entire auction"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Restart Auction</span>
              </button>

              <div className="flex flex-wrap gap-1.5 bg-[#2b1d0c]/90 border border-amber-600/40 p-1.5 rounded-2xl backdrop-blur-md">
              <button
                onClick={() => setActiveTab('auction')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition ${
                  activeTab === 'auction' ? 'bg-amber-600 text-stone-950 shadow' : 'text-amber-200 hover:bg-amber-900/40'
                }`}
              >
                <Hammer className="w-4 h-4" />
                <span>Live Auction</span>
              </button>
              <button
                onClick={() => setActiveTab('teams')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition ${
                  activeTab === 'teams' ? 'bg-amber-600 text-stone-950 shadow' : 'text-amber-200 hover:bg-amber-900/40'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Teams & Treasuries</span>
              </button>
              <button
                onClick={() => setActiveTab('kingdoms')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition ${
                  activeTab === 'kingdoms' ? 'bg-amber-600 text-stone-950 shadow' : 'text-amber-200 hover:bg-amber-900/40'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Kingdom Library</span>
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition ${
                  activeTab === 'transactions' ? 'bg-amber-600 text-stone-950 shadow' : 'text-amber-200 hover:bg-amber-900/40'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Audit & History</span>
              </button>
            </div>
          </div>
        </div>

          {/* Status Message Banner */}
          {statusMessage && (
            <div
              className={`mb-6 p-4 rounded-xl border font-semibold text-sm shadow-md text-center ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-900/90 border-emerald-400 text-emerald-100'
                  : 'bg-rose-900/90 border-rose-400 text-rose-100'
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          {/* ================= TAB 1: LIVE AUCTION CONTROLLER ================= */}
          {activeTab === 'auction' && auctionState && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Live Domain & Quick Selector */}
              <div className="lg:col-span-2 bg-[#fdf6e2] border-4 border-[#b08968] rounded-[2rem] p-6 shadow-xl text-stone-900 relative">
                <div className="absolute inset-0 border-[8px] border-double border-[#d4a373] rounded-[2rem] pointer-events-none" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-amber-700/30 gap-2 mb-4">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-amber-800 font-bold">
                      Round {auctionState.round_number} of {auctionState.total_active_rounds}
                    </span>
                    <h2 className="text-3xl font-cinzel font-bold text-amber-950">
                      {auctionState.current_kingdom?.name || 'No Kingdom Selected'}
                    </h2>
                  </div>

                  {/* Quick Kingdom Selector Dropdown */}
                  <div className="flex items-center gap-2">
                    <select
                      value={auctionState.current_kingdom_id || ''}
                      onChange={(e) => handleSelectKingdom(Number(e.target.value))}
                      className="px-3 py-1.5 bg-amber-100 border border-amber-600 rounded-lg text-xs font-semibold"
                    >
                      {kingdoms.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.name} ({k.region}) {k.owner ? '• SOLD' : ''}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleNextKingdom}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold shadow"
                    >
                      Next
                    </button>
                  </div>
                </div>

                {auctionState.current_kingdom ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-amber-100/70 p-3 rounded-xl border border-amber-700/20">
                      <div><span className="text-stone-600">Ruler:</span> <strong className="block text-stone-900">{auctionState.current_kingdom.ruler}</strong></div>
                      <div><span className="text-stone-600">Present-Day:</span> <strong className="block text-stone-900">{auctionState.current_kingdom.modern_city}</strong></div>
                      <div><span className="text-stone-600">Region:</span> <strong className="block text-stone-900">{auctionState.current_kingdom.region}</strong></div>
                      <div><span className="text-stone-600">Base Price:</span> <strong className="block text-amber-900 font-cinzel">{formatCurrency(auctionState.current_kingdom.base_price, true)}</strong></div>
                    </div>

                    <p className="text-stone-700 italic text-sm">“{auctionState.current_kingdom.hint}”</p>

                    {/* Criteria Pillars Preview */}
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-xs">
                      <div className="font-bold text-amber-900 mb-1">
                        Evaluation Pillars (Scored Value: {auctionState.current_kingdom.calculated_points} pts)
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                        <div className="bg-amber-200/50 p-1 rounded font-medium">Army: {auctionState.current_kingdom.army}</div>
                        <div className="bg-amber-200/50 p-1 rounded font-medium">Wealth: {auctionState.current_kingdom.wealth}</div>
                        <div className="bg-amber-200/50 p-1 rounded font-medium">Territory: {auctionState.current_kingdom.territory}</div>
                        <div className="bg-amber-200/50 p-1 rounded font-medium">Culture: {auctionState.current_kingdom.culture}</div>
                        <div className="bg-amber-200/50 p-1 rounded font-medium">Politics: {auctionState.current_kingdom.politics}</div>
                        <div className="bg-amber-200/50 p-1 rounded font-medium">Population: {auctionState.current_kingdom.population}</div>
                      </div>
                    </div>

                    {/* Bidding & Winning Team Input */}
                    <div className="mt-4 p-5 bg-gradient-to-br from-amber-100 to-amber-200/70 rounded-2xl border-2 border-amber-600/40">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <h3 className="text-lg font-cinzel font-bold text-amber-950">Record Bid & Confirm Domain Sale</h3>
                        {auctionState.current_kingdom.confirmed_owner && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-800 text-emerald-100 rounded-full text-xs font-bold shadow">
                            👑 Sold to {auctionState.current_kingdom.confirmed_owner.team_name} ({formatCurrency(auctionState.current_kingdom.confirmed_owner.amount, true)})
                          </span>
                        )}
                      </div>

                      {auctionState.current_kingdom.confirmed_owner && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-400/80 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-amber-950">
                          <span>
                            This domain is currently crowned. To <strong>reassign to another team or update price</strong>, select below and click <em>Finalize & Crown Purchase</em>.
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (auctionState.current_kingdom?.confirmed_owner) {
                                setSelectedBidTeamId(auctionState.current_kingdom.confirmed_owner.team_id);
                                setBidAmountInput(auctionState.current_kingdom.confirmed_owner.amount.toString());
                              }
                            }}
                            className="px-2.5 py-1 bg-amber-700 text-white rounded-lg font-semibold hover:bg-amber-800 transition"
                          >
                            Load Current Winner
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Winning / Bidding House</label>
                          <select
                            value={selectedBidTeamId}
                            onChange={(e) => setSelectedBidTeamId(e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full px-3 py-2 bg-white border border-amber-700/40 rounded-xl font-medium text-sm text-stone-900"
                          >
                            <option value="">-- Choose Dynasty --</option>
                            {teams.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} (Reserves: {formatCurrency(t.remaining_balance, true)})
                              </option>
                            ))}
                          </select>
                          {selectedTeamDetails && (
                            <div className="text-xs text-stone-600 mt-1">
                              Available Treasury: <strong className="text-emerald-800 font-cinzel">{formatCurrency(selectedTeamDetails.remaining_balance, true)}</strong>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Bid Amount (₹)</label>
                          <input
                            type="number"
                            value={bidAmountInput}
                            onChange={(e) => setBidAmountInput(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-amber-700/40 rounded-xl font-mono text-sm text-stone-900 font-bold"
                            placeholder="5000000"
                          />
                          <div className="text-xs text-stone-600 mt-1">
                            Formatted: <strong className="text-amber-900 font-cinzel">{formatCurrency(Number(bidAmountInput) || 0, true)}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Quick Bid Increment Helpers */}
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span className="text-xs font-bold text-stone-700">Quick Raise:</span>
                        <button onClick={() => handleQuickAddBid(500000)} className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-stone-900 rounded-lg text-xs font-semibold border border-amber-400">+5 Lakh</button>
                        <button onClick={() => handleQuickAddBid(1000000)} className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-stone-900 rounded-lg text-xs font-semibold border border-amber-400">+10 Lakh</button>
                        <button onClick={() => handleQuickAddBid(2500000)} className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-stone-900 rounded-lg text-xs font-semibold border border-amber-400">+25 Lakh</button>
                        <button onClick={() => handleQuickAddBid(5000000)} className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-stone-900 rounded-lg text-xs font-semibold border border-amber-400">+50 Lakh</button>
                        <button onClick={() => handleQuickAddBid(10000000)} className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-stone-900 rounded-lg text-xs font-semibold border border-amber-400">+1 Crore</button>
                      </div>

                      {/* Action Submission Buttons */}
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={handlePlaceBid}
                          className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold text-xs shadow"
                        >
                          Update Live Bid
                        </button>
                        <button
                          onClick={() => setConfirmPurchaseModalOpen(true)}
                          className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Finalize & Crown Purchase</span>
                        </button>
                        <button
                          onClick={handleMarkUnsold}
                          className="px-4 py-2.5 bg-stone-700 hover:bg-stone-800 text-stone-200 rounded-xl font-bold text-xs shadow"
                        >
                          Mark Unsold / Pass
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-stone-600">No active domain.</p>
                )}
              </div>

              {/* Right Column: Discussion Timer & Live State Card */}
              <div className="space-y-6">
                {/* Timer Deck */}
                <div className="bg-[#fdf6e2] border-4 border-[#b08968] rounded-[2rem] p-6 shadow-xl text-stone-900 relative">
                  <div className="absolute inset-0 border-[8px] border-double border-[#d4a373] rounded-[2rem] pointer-events-none" />
                  <h3 className="text-lg font-cinzel font-bold text-amber-950 mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-800" />
                    <span>Discussion Timer Controller</span>
                  </h3>

                  <div className="text-center py-4 bg-amber-100/60 rounded-2xl border border-amber-600/30 mb-4">
                    <div className="text-4xl font-mono font-bold text-stone-900">
                      {Math.floor(auctionState.timer_remaining / 60)}:{(auctionState.timer_remaining % 60).toString().padStart(2, '0')}
                    </div>
                    <div className="text-xs uppercase tracking-widest text-stone-600 font-semibold mt-1">
                      Status: {auctionState.timer_running ? 'Running' : 'Paused / Stopped'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button
                      onClick={() => handleTimerAction('start')}
                      className="py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start (30s)</span>
                    </button>
                    <button
                      onClick={() => handleTimerAction('pause')}
                      className="py-2 px-3 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pause</span>
                    </button>
                    <button
                      onClick={() => handleTimerAction('resume')}
                      className="py-2 px-3 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold text-xs"
                    >
                      Resume
                    </button>
                    <button
                      onClick={() => handleTimerAction('reset')}
                      className="py-2 px-3 bg-stone-700 hover:bg-stone-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  </div>

                  {/* Configure Default Timer */}
                  <div className="pt-3 border-t border-amber-700/20 flex items-center gap-2">
                    <input
                      type="number"
                      value={customTimerDuration}
                      onChange={(e) => setCustomTimerDuration(Number(e.target.value))}
                      className="w-20 px-2 py-1 text-xs border rounded bg-white font-mono"
                      min={5}
                      max={300}
                    />
                    <span className="text-xs text-stone-600">sec default</span>
                    <button
                      onClick={handleConfigureTimer}
                      className="ml-auto px-3 py-1 bg-amber-900 text-amber-100 rounded text-xs font-semibold hover:bg-amber-950"
                    >
                      Set Duration
                    </button>
                  </div>
                </div>

                {/* Quick Ownership Card */}
                <div className="bg-[#fdf6e2] border-4 border-[#b08968] rounded-[2rem] p-6 shadow-xl text-stone-900 relative">
                  <div className="absolute inset-0 border-[8px] border-double border-[#d4a373] rounded-[2rem] pointer-events-none" />
                  <h3 className="text-lg font-cinzel font-bold text-amber-950 mb-2">Live Status</h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-amber-700/20">
                      <span className="text-stone-600">Auction Status:</span>
                      <span className="font-bold uppercase text-amber-900">{auctionState.status}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-amber-700/20">
                      <span className="text-stone-600">Current Lead:</span>
                      <span className="font-bold text-stone-900">{auctionState.winning_team?.name || 'None'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-amber-700/20">
                      <span className="text-stone-600">Current Price:</span>
                      <span className="font-bold font-cinzel text-amber-900">{formatCurrency(auctionState.current_price, true)}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-stone-600">Sold Kingdoms:</span>
                      <span className="font-bold">{auctionState.total_sold} / {auctionState.total_active_rounds}</span>
                    </div>
                  </div>
                </div>

                {/* Live Imperial Leaderboard Widget */}
                <Scoreboard
                  teams={teams}
                  compact={true}
                  title="Live Leaderboard (Highest Points)"
                  maxDisplay={8}
                  highlightTeamId={Number(selectedBidTeamId) || undefined}
                />
              </div>
            </div>
          )}

          {/* ================= TAB 2: TEAMS & TREASURIES ================= */}
          {activeTab === 'teams' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#fdf6e2] p-5 rounded-2xl border-2 border-[#b08968] text-stone-900 shadow">
                <div>
                  <h2 className="text-2xl font-cinzel font-bold text-amber-950 flex items-center gap-2">
                    <Users className="w-6 h-6 text-amber-800" />
                    <span>Participating Dynasties ({teams.length})</span>
                  </h2>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Full admin control: create, edit, or delete dynasties and reset auction
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleOpenTeamModal()}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow transition hover:scale-105"
                    title="Enter or create a new team"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add New Dynasty</span>
                  </button>

                  <button
                    onClick={handleRestoreDefaults}
                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-700 hover:bg-amber-800 text-amber-100 rounded-xl text-xs font-bold shadow transition"
                    title="Restore the 6 original default houses"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Restore 6 Default Houses</span>
                  </button>

                  {teams.length > 0 && (
                    <button
                      onClick={handleDeleteAllTeams}
                      className="flex items-center gap-1.5 px-3 py-2 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-xs font-bold shadow transition"
                      title="Clear all teams to start with new teams"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete All Dynasties</span>
                    </button>
                  )}

                  <button
                    onClick={() => setResetModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-stone-800 hover:bg-stone-900 text-amber-300 rounded-xl text-xs font-bold shadow transition"
                    title="Restart auction"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset Auction</span>
                  </button>
                </div>
              </div>

              {teams.length === 0 ? (
                <div className="bg-[#fdf6e2] border-4 border-dashed border-[#b08968] rounded-[2rem] p-12 text-center text-stone-900 shadow-md">
                  <Users className="w-16 h-16 mx-auto mb-4 text-amber-800/60" />
                  <h3 className="text-2xl font-cinzel font-bold text-stone-900 mb-2">No Dynasties Registered</h3>
                  <p className="text-stone-600 text-sm max-w-md mx-auto mb-6">
                    All dynasties have been cleared. You have full admin control to enter new teams or restore the original 6 default houses.
                  </p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <button
                      onClick={() => handleOpenTeamModal()}
                      className="flex items-center gap-2 px-6 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-sm shadow-lg transition hover:scale-105"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Create New Dynasty</span>
                    </button>
                    <button
                      onClick={handleRestoreDefaults}
                      className="flex items-center gap-2 px-6 py-3 bg-amber-800 hover:bg-amber-900 text-amber-100 font-bold rounded-xl text-sm shadow-lg transition hover:scale-105"
                    >
                      <RotateCcw className="w-5 h-5" />
                      <span>Restore 6 Default Houses</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {teams.map((t) => (
                    <div key={t.id} className="bg-[#fdf6e2] border-4 border-[#b08968] rounded-[2rem] p-6 shadow-lg text-stone-900 relative flex flex-col justify-between">
                      <div className="absolute inset-0 border-[6px] border-double border-[#d4a373] rounded-[2rem] pointer-events-none" />

                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-xs uppercase font-semibold text-amber-800">{t.house_name}</span>
                            <h3 className="text-2xl font-cinzel font-bold text-stone-900">{t.name}</h3>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenTeamModal(t)}
                              className="p-1.5 hover:bg-amber-200 rounded text-stone-700"
                              title="Edit Dynasty"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTeam(t)}
                              className="p-1.5 hover:bg-rose-200 rounded text-rose-700"
                              title="Remove Dynasty & its data"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Balances */}
                        <div className="bg-amber-100/60 p-3 rounded-xl border border-amber-700/20 text-xs space-y-1 mb-3">
                          <div className="flex justify-between text-stone-600">
                            <span>Initial Treasury:</span>
                            <span className="font-semibold text-stone-900">{formatCurrency(t.initial_treasury, true)}</span>
                          </div>
                          <div className="flex justify-between text-stone-600">
                            <span>Spent:</span>
                            <span className="font-semibold text-rose-700">- {formatCurrency(t.total_spent, true)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-stone-900 pt-1 border-t border-amber-700/20">
                            <span>Remaining Balance:</span>
                            <span className="text-emerald-800 text-sm">{formatCurrency(t.remaining_balance, true)}</span>
                          </div>
                        </div>

                        {/* Acquired Domains */}
                        <div className="mb-3">
                          <span className="text-xs font-bold text-stone-800 uppercase block mb-1">
                            Acquired Domains ({t.kingdom_count})
                          </span>
                          {t.acquired_kingdoms.length === 0 ? (
                            <span className="text-xs text-stone-500 italic">None yet</span>
                          ) : (
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                              {t.acquired_kingdoms.map(k => (
                                <div key={k.transaction_id} className="text-xs bg-amber-50 p-1.5 rounded border border-amber-200 flex justify-between">
                                  <span className="font-semibold">{k.kingdom_name}</span>
                                  <span className="text-amber-900 font-cinzel">{formatCurrency(k.amount, true)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Members */}
                        <div>
                          <span className="text-xs font-bold text-stone-800 uppercase block mb-1">Roster</span>
                          <div className="flex flex-wrap gap-1">
                            {t.members.map((m, mi) => (
                              <span key={mi} className="text-[11px] bg-amber-200/50 px-2 py-0.5 rounded border border-amber-300">
                                {m.name} ({m.academic_year || 'UG'})
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 3: KINGDOM LIBRARY ================= */}
          {activeTab === 'kingdoms' && (
            <div className="space-y-6">
              {/* Library Bar: Filters & Add Kingdom */}
              <div className="bg-[#fdf6e2] p-4 rounded-2xl border-2 border-[#b08968] text-stone-900 flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
                  {/* Search */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search kingdom, ruler, city..."
                      value={kingdomSearch}
                      onChange={(e) => setKingdomSearch(e.target.value)}
                      className="pl-9 pr-3 py-1.5 text-xs bg-white border border-amber-700/40 rounded-xl w-60"
                    />
                  </div>

                  {/* Region Filter */}
                  <div className="flex items-center gap-1 text-xs">
                    <Filter className="w-3.5 h-3.5 text-stone-600" />
                    <select
                      value={kingdomRegionFilter}
                      onChange={(e) => setKingdomRegionFilter(e.target.value)}
                      className="px-2 py-1.5 bg-white border border-amber-700/40 rounded-xl text-xs"
                    >
                      <option value="ALL">All Regions</option>
                      <option value="East">East</option>
                      <option value="West">West</option>
                      <option value="North">North</option>
                      <option value="South">South</option>
                      <option value="Central">Central</option>
                      <option value="North-West">North-West</option>
                    </select>
                  </div>

                  {/* Status Filter */}
                  <select
                    value={kingdomStatusFilter}
                    onChange={(e) => setKingdomStatusFilter(e.target.value)}
                    className="px-2 py-1.5 bg-white border border-amber-700/40 rounded-xl text-xs"
                  >
                    <option value="ALL">All Status</option>
                    <option value="ACTIVE">Active Only</option>
                    <option value="ARCHIVED">Archived Only</option>
                    <option value="SOLD">Sold Only</option>
                    <option value="UNSOLD">Unsold Only</option>
                  </select>
                </div>

                <button
                  onClick={() => handleOpenKingdomModal()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-800 hover:bg-amber-900 text-amber-100 rounded-xl text-xs font-bold shadow whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Domain</span>
                </button>
              </div>

              {/* Kingdoms Table / Grid */}
              <div className="bg-[#fdf6e2] border-4 border-[#b08968] rounded-[2rem] p-6 shadow-xl text-stone-900 overflow-x-auto relative">
                <div className="absolute inset-0 border-[8px] border-double border-[#d4a373] rounded-[2rem] pointer-events-none" />

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-amber-800/30 text-amber-950 font-cinzel font-bold">
                      <th className="p-3">#</th>
                      <th className="p-3">Domain Name</th>
                      <th className="p-3">Region</th>
                      <th className="p-3">Ruler / Era</th>
                      <th className="p-3">Base Price</th>
                      <th className="p-3">Criteria (A/W/T/C/P/Pop)</th>
                      <th className="p-3">Pts</th>
                      <th className="p-3">Status / Owner</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-700/20 font-sans">
                    {filteredKingdoms.map((k, idx) => (
                      <tr key={k.id} className="hover:bg-amber-100/50 transition">
                        <td className="p-3 font-semibold text-stone-600">{idx + 1}</td>
                        <td className="p-3 font-bold font-cinzel text-amber-950 text-sm">{k.name}</td>
                        <td className="p-3">{k.region}</td>
                        <td className="p-3 max-w-xs truncate" title={k.ruler}>{k.ruler}</td>
                        <td className="p-3 font-cinzel font-semibold">{formatCurrency(k.base_price, true)}</td>
                        <td className="p-3 font-mono text-[11px]">
                          {k.army}/{k.wealth}/{k.territory}/{k.culture}/{k.politics}/{k.population}
                        </td>
                        <td className="p-3 font-bold text-amber-900">{k.calculated_points}</td>
                        <td className="p-3">
                          {k.owner ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-400 text-[11px]">
                              Sold: {k.owner.team_name}
                            </span>
                          ) : k.is_active ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold border border-amber-400 text-[11px]">
                              Available
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-stone-200 text-stone-600 font-semibold border border-stone-400 text-[11px]">
                              Archived
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-1 whitespace-nowrap">
                          <button
                            onClick={() => handleSelectKingdom(k.id)}
                            className="px-2 py-1 bg-amber-800 hover:bg-amber-900 text-amber-100 rounded text-[11px] font-semibold"
                            title="Load into Live Arena"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleOpenKingdomModal(k)}
                            className="p-1 hover:bg-amber-200 rounded text-stone-700"
                            title="Edit Domain"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleKingdomStatus(k.id)}
                            className={`p-1 rounded ${k.is_active ? 'text-amber-700 hover:bg-amber-200' : 'text-stone-500 hover:bg-stone-300'}`}
                            title={k.is_active ? 'Archive Domain' : 'Activate Domain'}
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 4: AUDIT & HISTORY ================= */}
          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <div className="bg-[#fdf6e2] p-4 rounded-2xl border-2 border-[#b08968] text-stone-900 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-cinzel font-bold text-amber-950">Imperial Transaction Ledger ({transactions.length})</h2>
                  <p className="text-xs text-stone-600">Full auditable purchase history, timestamps, auctioneer logs, and correction controls</p>
                </div>
              </div>

              <div className="bg-[#fdf6e2] border-4 border-[#b08968] rounded-[2rem] p-6 shadow-xl text-stone-900 overflow-x-auto relative">
                <div className="absolute inset-0 border-[8px] border-double border-[#d4a373] rounded-[2rem] pointer-events-none" />

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-amber-800/30 text-amber-950 font-cinzel font-bold">
                      <th className="p-3">Tx ID</th>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Domain</th>
                      <th className="p-3">Purchasing Dynasty</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Auctioneer</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Notes</th>
                      <th className="p-3 text-right">Correct</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-700/20 font-sans">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-amber-100/50 transition">
                        <td className="p-3 font-mono font-bold">#{tx.id}</td>
                        <td className="p-3 text-stone-600 whitespace-nowrap">{tx.timestamp}</td>
                        <td className="p-3 font-bold font-cinzel text-stone-900">{tx.kingdom_name}</td>
                        <td className="p-3 font-semibold text-amber-900">{tx.team_name}</td>
                        <td className="p-3 font-bold font-cinzel text-stone-900">{formatCurrency(tx.amount, true)}</td>
                        <td className="p-3 text-stone-600">{tx.admin_name}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                              tx.status === 'confirmed'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-400'
                                : tx.status === 'reverted'
                                ? 'bg-amber-100 text-amber-800 border border-amber-400'
                                : 'bg-rose-100 text-rose-800 border border-rose-400'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="p-3 text-stone-600 max-w-xs truncate" title={tx.notes}>{tx.notes || '—'}</td>
                        <td className="p-3 text-right">
                          {tx.status === 'confirmed' && (
                            <button
                              onClick={() => handleOpenCorrection(tx)}
                              className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded text-[11px] font-semibold"
                            >
                              Correct / Revert
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL: CONFIRM PURCHASE DIALOG ================= */}
      <AnimatePresence>
        {confirmPurchaseModalOpen && auctionState?.current_kingdom && (
          <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#fdf6e2] border-4 border-[#b08968] rounded-[2rem] p-8 max-w-lg w-full text-stone-900 shadow-2xl relative"
            >
              <div className="absolute inset-0 border-[8px] border-double border-[#d4a373] rounded-[2rem] pointer-events-none" />

              <h3 className="text-2xl font-cinzel font-bold text-amber-950 mb-2 text-center">
                Confirm Imperial Purchase
              </h3>
              <p className="text-xs text-stone-600 text-center mb-6">
                Please verify transaction particulars before committing to the immutable ledger.
              </p>

              <div className="bg-amber-100/70 p-4 rounded-xl border border-amber-600/30 space-y-2 text-sm mb-6">
                <div className="flex justify-between">
                  <span className="text-stone-600">Kingdom:</span>
                  <strong className="text-stone-900 font-cinzel">{auctionState.current_kingdom.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">Winning Dynasty:</span>
                  <strong className="text-amber-900">{selectedTeamDetails?.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">Final Price:</span>
                  <strong className="text-emerald-800 font-cinzel text-lg">{formatCurrency(Number(bidAmountInput), true)}</strong>
                </div>
                <div className="flex justify-between text-xs text-stone-600 pt-2 border-t border-amber-700/20">
                  <span>Dynasty Balance After Purchase:</span>
                  <strong className="text-stone-900">
                    {formatCurrency((selectedTeamDetails?.remaining_balance || 0) - Number(bidAmountInput), true)}
                  </strong>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmPurchaseModalOpen(false)}
                  className="px-4 py-2 bg-stone-300 hover:bg-stone-400 text-stone-800 rounded-xl font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmPurchase}
                  className="px-6 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow"
                >
                  Commit Purchase
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: TRANSACTION CORRECTION ================= */}
      <AnimatePresence>
        {correctionModalOpen && targetTx && (
          <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#fdf6e2] border-4 border-[#b08968] rounded-[2rem] p-8 max-w-lg w-full text-stone-900 shadow-2xl relative"
            >
              <div className="absolute inset-0 border-[8px] border-double border-[#d4a373] rounded-[2rem] pointer-events-none" />

              <h3 className="text-2xl font-cinzel font-bold text-amber-950 mb-2">
                Correct Transaction #{targetTx.id}
              </h3>
              <p className="text-xs text-stone-600 mb-4">
                Domain: <strong>{targetTx.kingdom_name}</strong> | Current Buyer: <strong>{targetTx.team_name}</strong> ({formatCurrency(targetTx.amount, true)})
              </p>

              <div className="space-y-4 mb-6 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">Correction Action</label>
                  <select
                    value={correctionAction}
                    onChange={(e: any) => setCorrectionAction(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-amber-700/40 rounded-xl text-stone-900 font-semibold"
                  >
                    <option value="revert">Revert / Cancel Purchase (Refunds Treasury & Returns Domain)</option>
                    <option value="reassign">Reassign to Different Dynasty</option>
                    <option value="adjust_price">Adjust Purchase Price</option>
                  </select>
                </div>

                {correctionAction === 'reassign' && (
                  <div>
                    <label className="block font-bold text-stone-700 uppercase mb-1">New Purchasing Dynasty</label>
                    <select
                      value={correctionNewTeamId}
                      onChange={(e) => setCorrectionNewTeamId(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-amber-700/40 rounded-xl"
                    >
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} (Available: {formatCurrency(t.remaining_balance, true)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {correctionAction !== 'revert' && (
                  <div>
                    <label className="block font-bold text-stone-700 uppercase mb-1">New Amount (₹)</label>
                    <input
                      type="number"
                      value={correctionNewAmount}
                      onChange={(e) => setCorrectionNewAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-amber-700/40 rounded-xl font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">Correction Reason / Audit Note</label>
                  <input
                    type="text"
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    placeholder="e.g. Bidder paddle misread during auction"
                    className="w-full px-3 py-2 bg-white border border-amber-700/40 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setCorrectionModalOpen(false)}
                  className="px-4 py-2 bg-stone-300 hover:bg-stone-400 text-stone-800 rounded-xl font-semibold text-xs"
                >
                  Dismiss
                </button>
                <button
                  onClick={handleExecuteCorrection}
                  className="px-6 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold text-xs shadow"
                >
                  Apply Correction
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: ADD / EDIT TEAM ================= */}
      <AnimatePresence>
        {teamModalOpen && (
          <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#fdf6e2] border-4 border-[#b08968] rounded-[2rem] p-6 md:p-8 max-w-xl w-full text-stone-900 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <div className="absolute inset-0 border-[8px] border-double border-[#d4a373] rounded-[2rem] pointer-events-none" />

              <h3 className="text-2xl font-cinzel font-bold text-amber-950 mb-4">
                {editingTeam ? `Edit Dynasty: ${editingTeam.name}` : 'Create New Imperial Dynasty'}
              </h3>

              <form onSubmit={handleSaveTeam} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 uppercase mb-1">Dynasty / Team Name</label>
                    <input
                      type="text"
                      value={teamFormData.name}
                      onChange={(e) => setTeamFormData({ ...teamFormData, name: e.target.value })}
                      placeholder="e.g. Marathas"
                      className="w-full px-3 py-2 bg-white border border-amber-700/40 rounded-xl font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 uppercase mb-1">House Crest / Name</label>
                    <input
                      type="text"
                      value={teamFormData.house_name}
                      onChange={(e) => setTeamFormData({ ...teamFormData, house_name: e.target.value })}
                      placeholder="e.g. House of Chhatrapati"
                      className="w-full px-3 py-2 bg-white border border-amber-700/40 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">Initial Treasury Allotment (₹)</label>
                  <input
                    type="number"
                    value={teamFormData.initial_treasury}
                    onChange={(e) => setTeamFormData({ ...teamFormData, initial_treasury: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-amber-700/40 rounded-xl font-mono font-bold"
                    required
                  />
                  <span className="text-stone-600 text-[11px] mt-1 block">
                    Allotment: <strong className="text-amber-900 font-cinzel">{formatCurrency(teamFormData.initial_treasury, true)}</strong>
                  </span>
                </div>

                {/* Team Members List */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block font-bold text-stone-700 uppercase">Team Members & Academic Year</label>
                    <button
                      type="button"
                      onClick={() =>
                        setTeamFormData({
                          ...teamFormData,
                          members: [...teamFormData.members, { name: '', academic_year: 'UG', role: 'Member' }]
                        })
                      }
                      className="text-amber-900 font-bold hover:underline"
                    >
                      + Add Member
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {teamFormData.members.map((m: any, idx: number) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={m.name}
                          onChange={(e) => {
                            const newM = [...teamFormData.members];
                            newM[idx].name = e.target.value;
                            setTeamFormData({ ...teamFormData, members: newM });
                          }}
                          placeholder="Member Name"
                          className="flex-1 px-3 py-1.5 bg-white border border-amber-700/40 rounded-lg"
                        />
                        <input
                          type="text"
                          value={m.academic_year}
                          onChange={(e) => {
                            const newM = [...teamFormData.members];
                            newM[idx].academic_year = e.target.value;
                            setTeamFormData({ ...teamFormData, members: newM });
                          }}
                          placeholder="UG / Year"
                          className="w-24 px-2 py-1.5 bg-white border border-amber-700/40 rounded-lg text-center"
                        />
                        {teamFormData.members.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newM = teamFormData.members.filter((_: any, i: number) => i !== idx);
                              setTeamFormData({ ...teamFormData, members: newM });
                            }}
                            className="p-1 text-rose-700 hover:bg-rose-100 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-amber-700/20">
                  <button
                    type="button"
                    onClick={() => setTeamModalOpen(false)}
                    className="px-4 py-2 bg-stone-300 hover:bg-stone-400 text-stone-800 rounded-xl font-semibold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-amber-800 hover:bg-amber-900 text-amber-100 rounded-xl font-bold text-xs shadow"
                  >
                    Save Dynasty
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: ADD / EDIT KINGDOM ================= */}
      <AnimatePresence>
        {kingdomModalOpen && (
          <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#fdf6e2] border-4 border-[#b08968] rounded-[2rem] p-6 md:p-8 max-w-2xl w-full text-stone-900 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <div className="absolute inset-0 border-[8px] border-double border-[#d4a373] rounded-[2rem] pointer-events-none" />

              <h3 className="text-2xl font-cinzel font-bold text-amber-950 mb-4">
                {editingKingdom ? `Edit Domain: ${editingKingdom.name}` : 'Catalog New Historic Domain'}
              </h3>

              <form onSubmit={handleSaveKingdom} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 uppercase mb-1">Kingdom Name</label>
                    <input
                      type="text"
                      value={kingdomFormData.name}
                      onChange={(e) => setKingdomFormData({ ...kingdomFormData, name: e.target.value })}
                      placeholder="e.g. Magadha"
                      className="w-full px-3 py-2 bg-white border border-amber-700/40 rounded-xl font-bold"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 uppercase mb-1">Region</label>
                    <select
                      value={kingdomFormData.region}
                      onChange={(e) => setKingdomFormData({ ...kingdomFormData, region: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-amber-700/40 rounded-xl"
                    >
                      <option value="North">North</option>
                      <option value="South">South</option>
                      <option value="East">East</option>
                      <option value="West">West</option>
                      <option value="Central">Central</option>
                      <option value="North-West">North-West</option>
                      <option value="East-Central">East-Central</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-stone-700 uppercase mb-1">Present-Day City</label>
                    <input
                      type="text"
                      value={kingdomFormData.modern_city}
                      onChange={(e) => setKingdomFormData({ ...kingdomFormData, modern_city: e.target.value })}
                      placeholder="e.g. Patna"
                      className="w-full px-3 py-2 bg-white border border-amber-700/40 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 uppercase mb-1">Area (km²)</label>
                    <input
                      type="number"
                      value={kingdomFormData.area}
                      onChange={(e) => setKingdomFormData({ ...kingdomFormData, area: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-amber-700/40 rounded-xl font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-stone-700 uppercase mb-1">Base Price (₹)</label>
                    <input
                      type="number"
                      value={kingdomFormData.base_price}
                      onChange={(e) => setKingdomFormData({ ...kingdomFormData, base_price: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white border border-amber-700/40 rounded-xl font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">Historical Rulers / Associations</label>
                  <input
                    type="text"
                    value={kingdomFormData.ruler}
                    onChange={(e) => setKingdomFormData({ ...kingdomFormData, ruler: e.target.value })}
                    placeholder="e.g. Bimbisara; Ajatashatru; Ashoka"
                    className="w-full px-3 py-2 bg-white border border-amber-700/40 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 uppercase mb-1">Historical Hint / Tagline</label>
                  <input
                    type="text"
                    value={kingdomFormData.hint}
                    onChange={(e) => setKingdomFormData({ ...kingdomFormData, hint: e.target.value })}
                    placeholder="e.g. Center of political expansion"
                    className="w-full px-3 py-2 bg-white border border-amber-700/40 rounded-xl"
                  />
                </div>

                {/* 6 Strategic Criteria (0-100) */}
                <div className="pt-2 border-t border-amber-700/20">
                  <div className="font-bold text-stone-800 uppercase mb-2">
                    6 Strategic Evaluation Criteria (Values: 0 to 100)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                    <div>
                      <label className="block text-[11px] text-stone-600">Army (30%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={kingdomFormData.army}
                        onChange={(e) => setKingdomFormData({ ...kingdomFormData, army: Number(e.target.value) })}
                        className="w-full px-2 py-1 bg-white border rounded font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-stone-600">Wealth (25%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={kingdomFormData.wealth}
                        onChange={(e) => setKingdomFormData({ ...kingdomFormData, wealth: Number(e.target.value) })}
                        className="w-full px-2 py-1 bg-white border rounded font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-stone-600">Territory (15%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={kingdomFormData.territory}
                        onChange={(e) => setKingdomFormData({ ...kingdomFormData, territory: Number(e.target.value) })}
                        className="w-full px-2 py-1 bg-white border rounded font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-stone-600">Culture (10%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={kingdomFormData.culture}
                        onChange={(e) => setKingdomFormData({ ...kingdomFormData, culture: Number(e.target.value) })}
                        className="w-full px-2 py-1 bg-white border rounded font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-stone-600">Politics (10%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={kingdomFormData.politics}
                        onChange={(e) => setKingdomFormData({ ...kingdomFormData, politics: Number(e.target.value) })}
                        className="w-full px-2 py-1 bg-white border rounded font-mono text-center"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-stone-600">Pop. (10%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={kingdomFormData.population}
                        onChange={(e) => setKingdomFormData({ ...kingdomFormData, population: Number(e.target.value) })}
                        className="w-full px-2 py-1 bg-white border rounded font-mono text-center"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-amber-700/20">
                  <button
                    type="button"
                    onClick={() => setKingdomModalOpen(false)}
                    className="px-4 py-2 bg-stone-300 hover:bg-stone-400 text-stone-800 rounded-xl font-semibold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-amber-800 hover:bg-amber-900 text-amber-100 rounded-xl font-bold text-xs shadow"
                  >
                    Save Domain
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: RESTART / RESET AUCTION ================= */}
      <AnimatePresence>
        {resetModalOpen && (
          <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#fdf6e2] border-4 border-red-900 rounded-[2rem] p-6 md:p-8 max-w-xl w-full text-stone-900 shadow-2xl relative max-h-[90vh] overflow-y-auto"
            >
              <div className="absolute inset-0 border-[8px] border-double border-amber-600/50 rounded-[2rem] pointer-events-none" />

              <div className="flex items-center gap-3 mb-4 text-red-900">
                <AlertTriangle className="w-8 h-8 text-red-700 animate-pulse flex-shrink-0" />
                <div>
                  <h3 className="text-2xl font-cinzel font-bold text-stone-900">
                    Imperial Auction Reset
                  </h3>
                  <p className="text-xs text-stone-600">
                    Choose how you wish to restart or reconfigure the imperial auction
                  </p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {/* Option 1: Restart Auction (Keep Current Teams) */}
                <label
                  onClick={() => setResetMode('restart_auction')}
                  className={`block p-4 rounded-2xl border-2 cursor-pointer transition ${
                    resetMode === 'restart_auction'
                      ? 'border-amber-700 bg-amber-100/90 shadow-md ring-2 ring-amber-600/50'
                      : 'border-amber-700/20 bg-white/70 hover:bg-amber-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="resetMode"
                      value="restart_auction"
                      checked={resetMode === 'restart_auction'}
                      onChange={() => setResetMode('restart_auction')}
                      className="mt-1 text-amber-800"
                    />
                    <div>
                      <div className="font-bold text-stone-900 text-sm font-cinzel flex items-center gap-2">
                        <span>Restart Auction (Keep Current Dynasties)</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-sans font-semibold">Recommended</span>
                      </div>
                      <p className="text-xs text-stone-600 mt-1">
                        • Clears all sales & transactions (returns all 41 kingdoms to unsold pool).<br />
                        • Resets live arena back to Round 1 & Kingdom #1 at base price.<br />
                        • Restores all existing teams' remaining balances back to their full initial treasury allotment.
                      </p>
                    </div>
                  </div>
                </label>

                {/* Option 2: Reset Auction & Clear All Teams */}
                <label
                  onClick={() => setResetMode('clear_all_teams')}
                  className={`block p-4 rounded-2xl border-2 cursor-pointer transition ${
                    resetMode === 'clear_all_teams'
                      ? 'border-red-700 bg-red-100/90 shadow-md ring-2 ring-red-600/50'
                      : 'border-amber-700/20 bg-white/70 hover:bg-red-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="resetMode"
                      value="clear_all_teams"
                      checked={resetMode === 'clear_all_teams'}
                      onChange={() => setResetMode('clear_all_teams')}
                      className="mt-1 text-red-800"
                    />
                    <div>
                      <div className="font-bold text-red-950 text-sm font-cinzel">
                        Reset Auction & Clear All Teams (Fresh Slate)
                      </div>
                      <p className="text-xs text-stone-600 mt-1">
                        • Deletes all existing teams, rosters, and purchase records.<br />
                        • Resets auction to Round 1 so you can enter or create completely custom teams.<br />
                        • Ideal for setting up a brand new contest with custom teams.
                      </p>
                    </div>
                  </div>
                </label>

                {/* Option 3: Reset Auction & Restore 6 Default Houses */}
                <label
                  onClick={() => setResetMode('restore_defaults')}
                  className={`block p-4 rounded-2xl border-2 cursor-pointer transition ${
                    resetMode === 'restore_defaults'
                      ? 'border-amber-700 bg-amber-100/90 shadow-md ring-2 ring-amber-600/50'
                      : 'border-amber-700/20 bg-white/70 hover:bg-amber-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="resetMode"
                      value="restore_defaults"
                      checked={resetMode === 'restore_defaults'}
                      onChange={() => setResetMode('restore_defaults')}
                      className="mt-1 text-amber-800"
                    />
                    <div>
                      <div className="font-bold text-stone-900 text-sm font-cinzel">
                        Reset Auction & Restore 6 Default Houses
                      </div>
                      <p className="text-xs text-stone-600 mt-1">
                        • Resets auction to Round 1.<br />
                        • Clears all sales & reloads the standard 6 dynasties (Marathas, Kalinga, Mauryas, Yadava, Gandhara, Gupta) with ₹100 Cr each and original rosters.
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              <div className="bg-red-50 p-3 rounded-xl border border-red-200 text-xs text-red-800 mb-6 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>
                  <strong>Notice:</strong> This action will immediately update the live display and notify all connected client screens.
                </span>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  disabled={resetLoading}
                  className="px-4 py-2 bg-stone-300 hover:bg-stone-400 text-stone-800 rounded-xl font-semibold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetAuction}
                  disabled={resetLoading}
                  className="px-6 py-2 bg-gradient-to-r from-red-800 to-amber-900 hover:from-red-900 hover:to-amber-950 text-amber-100 rounded-xl font-bold text-xs shadow-lg flex items-center gap-2 transition"
                >
                  {resetLoading ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin text-amber-300" />
                      <span>Resetting Imperial Arena...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4 text-amber-300" />
                      <span>Execute Auction Reset</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminControl;
