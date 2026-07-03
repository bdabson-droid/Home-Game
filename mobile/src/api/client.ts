import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type {
  GameDetail,
  GameListItem,
  GameSession,
  MeResponse,
  SessionSeat,
  Subscription,
  User,
} from './types';

function resolveBaseUrl(): string {
  const configured =
    (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
    process.env.EXPO_PUBLIC_API_URL;
  if (configured && configured.length > 0) {
    // Android emulators cannot reach the host via localhost.
    if (Platform.OS === 'android' && configured.includes('localhost')) {
      return configured.replace('localhost', '10.0.2.2');
    }
    return configured;
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
}

export const API_BASE_URL = resolveBaseUrl();

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch (err) {
    throw new ApiError(0, `Network error: could not reach the server at ${API_BASE_URL}`);
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new ApiError(res.status, data.error ?? 'Request failed', data.code);
  }
  return data as T;
}

export const api = {
  // ---- Auth ----
  requestOtp: (phone: string) =>
    request<{ ok: boolean; phone: string; devCode?: string }>('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  verifyOtp: (phone: string, code: string, name?: string) =>
    request<{ token: string; isNewUser: boolean; acceptedInvites: number; user: User }>(
      '/auth/verify-otp',
      { method: 'POST', body: JSON.stringify({ phone, code, name }) }
    ),

  me: () => request<MeResponse>('/auth/me'),

  updateProfile: (name: string) =>
    request<{ user: User }>('/auth/me', { method: 'PATCH', body: JSON.stringify({ name }) }),

  // ---- Subscription ----
  getSubscription: () =>
    request<{ subscription: Subscription; billingMode: 'stripe' | 'mock' }>('/subscription'),

  startCheckout: () =>
    request<{ billingMode: 'stripe' | 'mock'; checkoutUrl?: string; subscription?: Subscription }>(
      '/subscription/checkout',
      { method: 'POST' }
    ),

  cancelSubscription: () =>
    request<{ subscription: Subscription }>('/subscription/cancel', { method: 'POST' }),

  // ---- Games ----
  listGames: () => request<{ games: GameListItem[] }>('/games'),

  getGame: (id: string) => request<{ game: GameDetail }>(`/games/${id}`),

  createGame: (input: { name: string; description?: string; location?: string; defaultBuyIn?: number }) =>
    request<{ game: GameDetail }>('/games', { method: 'POST', body: JSON.stringify(input) }),

  updateGame: (
    id: string,
    input: { name?: string; description?: string; location?: string; defaultBuyIn?: number }
  ) => request<{ game: GameDetail }>(`/games/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),

  deleteGame: (id: string) => request<{ ok: boolean }>(`/games/${id}`, { method: 'DELETE' }),

  joinGame: (code: string) =>
    request<{ game: { id: string; name: string }; role: string }>('/games/join', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  leaveGame: (id: string) => request<{ ok: boolean }>(`/games/${id}/leave`, { method: 'POST' }),

  invite: (gameId: string, phone: string) =>
    request<{ invite: { id: string; phone: string; status: string } }>(`/games/${gameId}/invites`, {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  revokeInvite: (gameId: string, inviteId: string) =>
    request<{ ok: boolean }>(`/games/${gameId}/invites/${inviteId}`, { method: 'DELETE' }),

  removeMember: (gameId: string, userId: string) =>
    request<{ ok: boolean }>(`/games/${gameId}/members/${userId}`, { method: 'DELETE' }),

  // ---- Sessions ----
  createSession: (gameId: string, input: { scheduledAt: string; location?: string }) =>
    request<{ session: GameSession }>(`/games/${gameId}/sessions`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateSession: (
    gameId: string,
    sessionId: string,
    input: { scheduledAt?: string; location?: string; status?: string }
  ) =>
    request<{ session: GameSession }>(`/games/${gameId}/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  rsvp: (gameId: string, sessionId: string, input: { rsvp?: string; buyIn?: number }) =>
    request<{ seat: SessionSeat }>(`/games/${gameId}/sessions/${sessionId}/rsvp`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  recordResult: (
    gameId: string,
    sessionId: string,
    input: { userId: string; buyIn?: number; cashOut?: number }
  ) =>
    request<{ seat: SessionSeat }>(`/games/${gameId}/sessions/${sessionId}/results`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};
