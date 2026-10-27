import axios from 'axios';
import type { AuctionState, Kingdom, Team, Transaction } from '../types/auction';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function getAdminToken(): string | null {
  return localStorage.getItem('samrat_admin_token') || sessionStorage.getItem('samrat_admin_token');
}

export function setAdminToken(token: string, persist = true) {
  if (persist) {
    localStorage.setItem('samrat_admin_token', token);
  } else {
    sessionStorage.setItem('samrat_admin_token', token);
  }
}

export function clearAdminToken() {
  localStorage.removeItem('samrat_admin_token');
  sessionStorage.removeItem('samrat_admin_token');
}

// Interceptor to add Admin token if available
api.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
    config.headers['x-admin-token'] = token;
  }
  return config;
});

// Auth
export async function loginAdmin(password: string) {
  const res = await api.post<{ success: boolean; token: string; role: string; name: string }>('/auth/login', { password });
  if (res.data.token) {
    setAdminToken(res.data.token);
  }
  return res.data;
}

export async function verifyAdmin() {
  const token = getAdminToken();
  if (!token) return false;
  try {
    const res = await api.get('/auth/verify');
    return res.data.success === true;
  } catch {
    clearAdminToken();
    return false;
  }
}

// Teams
export async function fetchTeams(): Promise<Team[]> {
  const res = await api.get<Team[]>('/teams');
  return res.data;
}

export async function fetchTeam(id: number): Promise<Team> {
  const res = await api.get<Team>(`/teams/${id}`);
  return res.data;
}

export async function createTeam(data: { name: string; house_name: string; initial_treasury: number; members: any[] }) {
  const res = await api.post<Team>('/teams', data);
  return res.data;
}

export async function updateTeam(id: number, data: { name?: string; house_name?: string; initial_treasury?: number; members?: any[] }) {
  const res = await api.put<Team>(`/teams/${id}`, data);
  return res.data;
}

export async function deleteTeam(id: number, force = false) {
  const res = await api.delete(`/teams/${id}${force ? '?force=true' : ''}`);
  return res.data;
}

export async function deleteAllTeams() {
  const res = await api.delete('/teams');
  return res.data;
}

export async function restoreDefaultTeams() {
  const res = await api.post<{ success: boolean; message: string }>('/teams/restore-defaults');
  return res.data;
}

// Kingdoms
export async function fetchKingdoms(activeOnly = false): Promise<Kingdom[]> {
  const res = await api.get<Kingdom[]>(`/kingdoms${activeOnly ? '?active_only=true' : ''}`);
  return res.data;
}

export async function fetchKingdom(id: number): Promise<Kingdom> {
  const res = await api.get<Kingdom>(`/kingdoms/${id}`);
  return res.data;
}

export async function createKingdom(data: Partial<Kingdom>) {
  const res = await api.post<Kingdom>('/kingdoms', data);
  return res.data;
}

export async function updateKingdom(id: number, data: Partial<Kingdom>) {
  const res = await api.put<Kingdom>(`/kingdoms/${id}`, data);
  return res.data;
}

export async function toggleKingdomStatus(id: number) {
  const res = await api.patch<{ success: boolean; is_active: boolean }>(`/kingdoms/${id}/status`);
  return res.data;
}

export async function setKingdomPool(params: {
  count?: number;
  mode?: 'first' | 'random' | 'balanced';
  kingdom_ids?: number[];
  reset_to_round_one?: boolean;
}) {
  const res = await api.post<{
    success: boolean;
    message: string;
    active_count: number;
    total_count: number;
    state: AuctionState;
  }>('/kingdoms/pool', params);
  return res.data;
}

export async function fetchKingdomPool() {
  const res = await api.get<{
    active_count: number;
    total_count: number;
    active_kingdoms: Array<{ id: number; name: string; region: string; order_num: number }>;
  }>('/kingdoms/pool');
  return res.data;
}

export async function syncKingdomsFromJSON(default_active_count?: number) {
  const res = await api.post<{
    success: boolean;
    message: string;
    count: number;
    state: AuctionState;
  }>('/kingdoms/sync-json', { default_active_count });
  return res.data;
}

// Auction Controls
export async function fetchAuctionState(): Promise<AuctionState> {
  const res = await api.get<AuctionState>('/auction/state');
  return res.data;
}

export async function selectKingdom(kingdom_id: number, round_number?: number): Promise<AuctionState> {
  const res = await api.post<AuctionState>('/auction/select', { kingdom_id, round_number });
  return res.data;
}

export async function nextKingdom(): Promise<AuctionState> {
  const res = await api.post<AuctionState>('/auction/next');
  return res.data;
}

export async function controlTimer(action: 'start' | 'pause' | 'resume' | 'reset' | 'configure', duration?: number): Promise<AuctionState> {
  const res = await api.post<AuctionState>('/auction/timer', { action, duration });
  return res.data;
}

export async function placeBid(team_id: number, amount: number): Promise<AuctionState> {
  const res = await api.post<AuctionState>('/auction/bid', { team_id, amount });
  return res.data;
}

export async function confirmPurchase(data: {
  kingdom_id: number;
  team_id: number;
  amount: number;
  admin_name?: string;
  notes?: string;
  override?: boolean;
}) {
  const res = await api.post<{
    success: boolean;
    transaction_id: number;
    message: string;
    state: AuctionState;
    leaderboard?: Team[];
    already_sold?: boolean;
    existing?: {
      team_id: number;
      team_name: string;
      amount: number;
      transaction_id: number;
    };
  }>('/auction/confirm-purchase', data);
  return res.data;
}

export async function markUnsold(kingdom_id?: number) {
  const res = await api.post('/auction/mark-unsold', { kingdom_id });
  return res.data;
}

export async function correctTransaction(data: {
  transaction_id: number;
  action: 'revert' | 'reassign' | 'adjust_price';
  new_team_id?: number;
  new_amount?: number;
  reason?: string;
}) {
  const res = await api.post('/auction/correct-transaction', data);
  return res.data;
}

// Transactions & Results
export async function fetchTransactions(): Promise<Transaction[]> {
  const res = await api.get<Transaction[]>('/transactions');
  return res.data;
}

export async function fetchResults() {
  const res = await api.get<{ champion: Team | null; leaderboard: Team[]; formula: string }>('/results');
  return res.data;
}

export async function resetAuction(mode: 'restart_auction' | 'clear_all_teams' | 'restore_defaults' = 'restart_auction') {
  const res = await api.post<{ success: boolean; message: string; state: AuctionState }>('/auction/reset', { mode });
  return res.data;
}
