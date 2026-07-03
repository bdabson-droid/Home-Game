export interface User {
  id: number;
  name: string;
  phone: string;
  email?: string;
  subscriptionStatus: 'inactive' | 'active' | 'cancelled';
  createdAt?: string;
}

export interface Game {
  id: number;
  name: string;
  description?: string;
  inviteCode: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  maxPlayers: number;
  buyInAmount: number;
  currency: string;
  location?: string;
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  hostId: number;
  hostName: string;
  confirmedPlayers?: number;
  totalInvited?: number;
  isHost: boolean;
  myStatus?: string;
  myBuyIn?: number;
  totalPot?: number;
  totalCashedOut?: number;
  players?: GamePlayer[];
  transactions?: Transaction[];
}

export interface GamePlayer {
  id: number;
  userId?: number;
  phone?: string;
  name: string;
  status: 'invited' | 'confirmed' | 'playing' | 'cashed_out';
  buyInTotal: number;
  cashOutAmount?: number;
  chipCount: number;
  rebuyCount: number;
  invitedAt: string;
  joinedAt?: string;
  cashedOutAt?: string;
  profit?: number;
}

export interface Transaction {
  id: number;
  playerName: string;
  type: 'buy_in' | 'rebuy' | 'cash_out';
  amount: number;
  chips?: number;
  note?: string;
  createdAt: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  isLoading: boolean;
}
