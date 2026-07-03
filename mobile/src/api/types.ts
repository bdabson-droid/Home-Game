export type MemberRole = 'host' | 'player';
export type SubscriptionStatus = 'none' | 'incomplete' | 'active' | 'past_due' | 'canceled';
export type SessionStatus = 'scheduled' | 'live' | 'completed' | 'canceled';

export interface User {
  id: string;
  phone: string;
  name: string | null;
}

export interface Subscription {
  status: SubscriptionStatus;
  plan?: string;
  currentPeriodEnd?: string | null;
}

export interface HostRef {
  id: string;
  name: string | null;
  phone: string;
}

export interface GameSession {
  id: string;
  gameId: string;
  scheduledAt: string;
  location: string | null;
  status: SessionStatus;
  seats?: SessionSeat[];
}

export interface SessionSeat {
  id: string;
  sessionId: string;
  userId: string;
  buyIn: number;
  cashOut: number | null;
  rsvp: string;
}

export interface GameListItem {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  role: MemberRole;
  memberCount: number;
  host: HostRef;
  joinCode?: string;
  nextSession: GameSession | null;
}

export interface GameMember {
  userId: string;
  role: MemberRole;
  name: string | null;
  phone?: string;
}

export interface PendingInvite {
  id: string;
  phone: string;
  status: string;
}

export interface GameDetail {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  defaultBuyIn: number;
  host: HostRef;
  role: MemberRole;
  joinCode?: string;
  members: GameMember[];
  pendingInvites?: PendingInvite[];
  sessions: GameSession[];
}

export interface MeResponse {
  user: User;
  subscription: Subscription;
  membershipCount: number;
}
