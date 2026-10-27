export interface Kingdom {
  id: number;
  name: string;
  hint: string;
  ruler: string;
  modern_city: string;
  region: string;
  area: number;
  base_price: number;
  army: number;
  wealth: number;
  territory: number;
  culture: number;
  politics: number;
  population: number;
  is_active: boolean;
  order_num?: number;
  calculated_points?: number;
  owner?: {
    transaction_id: number;
    amount: number;
    timestamp: string;
    team_id: number;
    team_name: string;
  } | null;
  confirmed_owner?: {
    transaction_id: number;
    amount: number;
    team_name: string;
    team_id: number;
  } | null;
}

export interface TeamMember {
  id?: number;
  team_id?: number;
  name: string;
  academic_year: string;
  role: string;
}

export interface AcquiredKingdom {
  transaction_id: number;
  kingdom_id: number;
  kingdom_name: string;
  amount: number;
  timestamp: string;
  region: string;
  area: number;
  army: number;
  wealth: number;
  territory: number;
  culture: number;
  politics: number;
  population: number;
}

export interface Team {
  id: number;
  name: string;
  house_name: string;
  initial_treasury: number;
  created_at?: string;
  members: TeamMember[];
  acquired_kingdoms: AcquiredKingdom[];
  kingdom_count: number;
  total_spent: number;
  remaining_balance: number;
  total_points: number;
  pillar_totals: {
    army: number;
    wealth: number;
    territory: number;
    culture: number;
    politics: number;
    population: number;
  };
}

export type AuctionStatus = 'idle' | 'discussion' | 'bidding' | 'sold' | 'unsold';

export interface AuctionState {
  id: number;
  current_kingdom_id: number | null;
  current_price: number;
  status: AuctionStatus;
  timer_duration: number;
  timer_end_time: number | null;
  timer_remaining: number;
  timer_running: boolean;
  round_number: number;
  winning_team_id: number | null;
  winning_team: { id: number; name: string; house_name: string } | null;
  current_kingdom: Kingdom | null;
  total_active_rounds: number;
  total_library_kingdoms?: number;
  total_sold: number;
  updated_at?: string;
  leaderboard?: Team[];
}

export interface Transaction {
  id: number;
  team_id: number;
  team_name: string;
  house_name?: string;
  kingdom_id: number;
  kingdom_name: string;
  region?: string;
  amount: number;
  status: 'confirmed' | 'cancelled' | 'reverted';
  admin_name: string;
  notes?: string;
  timestamp: string;
}
