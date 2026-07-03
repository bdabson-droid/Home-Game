import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  'http://localhost:3001';

let authToken: string | null = null;

export async function loadToken() {
  authToken = await SecureStore.getItemAsync('auth_token');
  return authToken;
}

export async function setToken(token: string | null) {
  authToken = token;
  if (token) {
    await SecureStore.setItemAsync('auth_token', token);
  } else {
    await SecureStore.deleteItemAsync('auth_token');
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export interface User {
  id: string;
  phone: string;
  name: string;
  isHost: boolean;
  subscriptionStatus: string;
  subscriptionExpiresAt?: string;
}

export interface HomeGame {
  id: string;
  hostId: string;
  name: string;
  joinCode: string;
  description?: string;
  location?: string;
  scheduledAt?: string;
  status: string;
  createdAt: string;
  hostName?: string;
  memberCount?: number;
}

export interface GameMember {
  id: string;
  name: string;
  phone: string;
  role: string;
  joinedAt: string;
}

export interface PendingInvite {
  id: string;
  phone: string;
  invitedBy: string;
  createdAt: string;
}

export interface GameInvite {
  id: string;
  gameId: string;
  gameName: string;
  joinCode: string;
  hostName: string;
  createdAt: string;
}

export const api = {
  sendOtp: (phone: string) =>
    request<{ message: string; devCode?: string }>('/api/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  register: (data: { phone: string; name: string; password: string; otp: string; isHost?: boolean }) =>
    request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (phone: string, password: string) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    }),

  me: () => request<{ user: User }>('/api/auth/me'),

  getGames: () => request<{ games: HomeGame[] }>('/api/games'),

  getGame: (id: string) =>
    request<{
      game: HomeGame;
      members: GameMember[];
      pendingInvites: PendingInvite[];
    }>(`/api/games/${id}`),

  createGame: (data: { name: string; description?: string; location?: string; scheduledAt?: string }) =>
    request<{ game: HomeGame }>('/api/games', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  joinGame: (code: string) =>
    request<{ game: HomeGame; message: string }>('/api/games/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  inviteToGame: (gameId: string, phone: string) =>
    request<{ invite: { id: string; phone: string }; joinCode: string; message: string }>(
      `/api/games/${gameId}/invite`,
      { method: 'POST', body: JSON.stringify({ phone }) }
    ),

  getPendingInvites: () => request<{ invites: GameInvite[] }>('/api/games/invites/pending'),

  acceptInvite: (inviteId: string) =>
    request<{ game: HomeGame; message: string }>(`/api/games/invites/${inviteId}/accept`, {
      method: 'POST',
    }),

  removeMember: (gameId: string, userId: string) =>
    request<{ message: string }>(`/api/games/${gameId}/members/${userId}`, {
      method: 'DELETE',
    }),

  getSubscriptionStatus: () =>
    request<{
      isHost: boolean;
      subscriptionStatus: string;
      subscriptionExpiresAt?: string;
      isActive: boolean;
    }>('/api/subscriptions/status'),

  activateSubscription: () =>
    request<{ message: string; user: User }>('/api/subscriptions/demo-activate', {
      method: 'POST',
    }),

  createCheckout: () =>
    request<{ checkoutUrl?: string; sessionId?: string; message?: string; user?: User }>(
      '/api/subscriptions/checkout',
      { method: 'POST' }
    ),
};
