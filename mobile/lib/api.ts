import Constants from 'expo-constants';

type FetchOptions = RequestInit & { token?: string | null };

function resolveBaseUrl(): string {
  const configured =
    (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ??
    process.env.EXPO_PUBLIC_API_BASE_URL;
  if (configured) return configured.replace(/\/$/, '');
  return 'http://localhost:4000';
}

export const API_BASE_URL = resolveBaseUrl();

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  { token, headers, body, ...rest }: FetchOptions = {},
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body,
  });

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : `Request failed (${res.status})`) as string;
    const code =
      data && typeof data === 'object' && 'code' in data && typeof (data as { code?: string }).code === 'string'
        ? (data as { code: string }).code
        : undefined;
    throw new ApiError(message, res.status, code);
  }
  return (data ?? {}) as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// --- Typed helpers --------------------------------------------------------

export type CurrentUser = {
  id: number;
  phone: string;
  name: string | null;
  subscription_status: string;
  subscription_expires_at: number | null;
};

export type Game = {
  id: number;
  name: string;
  description: string | null;
  stakes: string | null;
  location: string | null;
  next_session_at: number | null;
  created_at: number;
  host_id: number;
  is_host: boolean;
  join_code: string;
};

export type Player = {
  id: number;
  name: string | null;
  phone: string;
  role: 'host' | 'player';
  joined_at: number;
};

export type PendingInvite = {
  id: number;
  phone: string;
  created_at: number;
};

export type GameDetail = {
  game: Game;
  players: Player[];
  pending_invites: PendingInvite[];
};

export const api = {
  requestOtp: (phone: string) =>
    apiRequest<{ ok: true; devCode?: string }>('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),
  verifyOtp: (phone: string, code: string) =>
    apiRequest<{ token: string; user: CurrentUser }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, code }),
    }),
  me: (token: string) =>
    apiRequest<{ user: CurrentUser; canHost: boolean }>('/me', { token }),
  updateProfile: (token: string, name: string) =>
    apiRequest<{ user: CurrentUser; canHost: boolean }>('/me', {
      method: 'PATCH',
      token,
      body: JSON.stringify({ name }),
    }),
  listGames: (token: string) => apiRequest<{ games: Game[] }>('/games', { token }),
  createGame: (
    token: string,
    input: {
      name: string;
      description?: string;
      stakes?: string;
      location?: string;
      next_session_at?: number;
    },
  ) =>
    apiRequest<{ game: Game }>('/games', {
      method: 'POST',
      token,
      body: JSON.stringify(input),
    }),
  gameDetail: (token: string, id: number) =>
    apiRequest<GameDetail>(`/games/${id}`, { token }),
  invitePlayer: (token: string, id: number, phone: string) =>
    apiRequest<{ ok: true; status: 'invited' | 'added'; join_code?: string }>(
      `/games/${id}/invite`,
      { method: 'POST', token, body: JSON.stringify({ phone }) },
    ),
  cancelInvite: (token: string, id: number, inviteId: number) =>
    apiRequest<{ ok: true }>(`/games/${id}/invite/${inviteId}`, {
      method: 'DELETE',
      token,
    }),
  removeMember: (token: string, id: number, userId: number) =>
    apiRequest<{ ok: true }>(`/games/${id}/members/${userId}`, {
      method: 'DELETE',
      token,
    }),
  joinByCode: (token: string, code: string) =>
    apiRequest<{ game: Game }>('/games/join', {
      method: 'POST',
      token,
      body: JSON.stringify({ code }),
    }),
  leaveGame: (token: string, id: number) =>
    apiRequest<{ ok: true }>(`/games/${id}/leave`, { method: 'POST', token }),
  deleteGame: (token: string, id: number) =>
    apiRequest<{ ok: true }>(`/games/${id}`, { method: 'DELETE', token }),
  subscriptionStatus: (token: string) =>
    apiRequest<{
      status: string;
      expires_at: number | null;
      active: boolean;
      stripe_configured: boolean;
    }>('/subscription/status', { token }),
  createCheckout: (token: string) =>
    apiRequest<{ url: string; id: string }>('/subscription/checkout', {
      method: 'POST',
      token,
    }),
};
