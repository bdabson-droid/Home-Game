export type User = {
  id: string;
  phone: string;
  displayName: string;
};

export type SubscriptionStatus = 'inactive' | 'active' | 'trialing' | 'cancelled';

export type SubscriptionPlan = 'monthly' | 'annual';

export type Subscription = {
  userId: string;
  status: SubscriptionStatus;
  plan?: SubscriptionPlan;
  startedAt?: number;
  renewsAt?: number;
};

export type MemberRole = 'host' | 'player';

export type Member = {
  userId: string;
  displayName: string;
  phone: string;
  role: MemberRole;
  joinedAt: number;
};

export type HomeGame = {
  id: string;
  name: string;
  hostId: string;
  hostName: string;
  location?: string;
  stakes?: string;
  description?: string;
  inviteCode: string;
  members: Member[];
  createdAt: number;
};

export type Invite = {
  id: string;
  gameId: string;
  phone: string;
  invitedByUserId: string;
  invitedByName: string;
  createdAt: number;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
};

export type BuyIn = {
  id: string;
  playerId: string;
  playerName: string;
  amount: number;
  at: number;
};

export type CashOut = {
  playerId: string;
  playerName: string;
  amount: number;
  at: number;
};

export type SessionStatus = 'scheduled' | 'live' | 'settled';

export type Session = {
  id: string;
  gameId: string;
  status: SessionStatus;
  scheduledFor?: number;
  startedAt?: number;
  endedAt?: number;
  location?: string;
  notes?: string;
  buyIns: BuyIn[];
  cashOuts: CashOut[];
};

export type PlayerResult = {
  playerId: string;
  playerName: string;
  buyInTotal: number;
  cashOutTotal: number;
  net: number;
};
