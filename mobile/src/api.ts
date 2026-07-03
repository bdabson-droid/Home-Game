import { API_BASE_URL } from './config';
import { getToken } from './storage';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type Options = {
  method?: string;
  body?: unknown;
  token?: string | null;
  auth?: boolean;
};

async function request<T>(path: string, options: Options = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = options.token ?? (await getToken());
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError(
      `Could not reach the server. Is the API running at ${API_BASE_URL}?`,
      0,
    );
  }

  let data: any = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (!res.ok) {
    throw new ApiError(
      data?.error || `Request failed (${res.status})`,
      res.status,
      data?.code,
    );
  }
  return data as T;
}

// ---- Types ----
export type User = {
  id: string;
  phone: string;
  displayName: string | null;
  createdAt: string;
};

export type Subscription = {
  plan: string;
  status: string;
  active: boolean;
  currentPeriodEnd: string | null;
  priceLabel: string;
  billingMode: 'stripe' | 'dev';
};

export type Game = {
  id: string;
  name: string;
  description: string | null;
  stakes: string | null;
  location: string | null;
  hostUserId: string;
  isHost: boolean;
  role: string | null;
  memberCount: number;
  createdAt: string;
  joinCode?: string;
};

export type Member = {
  id: string;
  displayName: string | null;
  role: string;
  joinedAt: string;
  phone?: string;
};

export type Invitation = {
  id: string;
  phone: string;
  status: string;
  createdAt: string;
};

export type MyInvitation = {
  id: string;
  status: string;
  createdAt: string;
  game: { id: string; name: string; stakes: string | null; location: string | null };
};

export type Session = {
  id: string;
  scheduledAt: string;
  location: string | null;
  buyIn: string | null;
  notes: string | null;
  status: string;
  myRsvp: 'yes' | 'no' | 'maybe' | null;
  going: number;
  rsvps: { userId: string; displayName: string | null; status: string }[];
};

// ---- Auth ----
export const api = {
  requestOtp: (phone: string) =>
    request<{ ok: boolean; phone: string; devCode?: string }>('/api/auth/request-otp', {
      method: 'POST',
      body: { phone },
      auth: false,
    }),

  verifyOtp: (phone: string, code: string, displayName?: string) =>
    request<{ token: string; isNew: boolean; user: User; subscription: Subscription }>(
      '/api/auth/verify-otp',
      { method: 'POST', body: { phone, code, displayName }, auth: false },
    ),

  me: (token?: string) =>
    request<{ user: User; subscription: Subscription }>('/api/auth/me', { token }),

  updateName: (displayName: string) =>
    request<{ user: User }>('/api/auth/me', { method: 'PATCH', body: { displayName } }),

  // ---- Subscription ----
  getSubscription: () =>
    request<{ subscription: Subscription }>('/api/subscription'),

  subscribe: () =>
    request<{ mode: string; activated: boolean; checkoutUrl?: string; subscription: Subscription }>(
      '/api/subscription/subscribe',
      { method: 'POST', body: {} },
    ),

  cancelSubscription: () =>
    request<{ subscription: Subscription }>('/api/subscription/cancel', { method: 'POST' }),

  // ---- Games ----
  listGames: () => request<{ games: Game[] }>('/api/games'),

  getGame: (id: string) => request<{ game: Game }>(`/api/games/${id}`),

  createGame: (input: {
    name: string;
    description?: string;
    stakes?: string;
    location?: string;
  }) => request<{ game: Game }>('/api/games', { method: 'POST', body: input }),

  updateGame: (id: string, input: Partial<{ name: string; description: string; stakes: string; location: string }>) =>
    request<{ game: Game }>(`/api/games/${id}`, { method: 'PATCH', body: input }),

  deleteGame: (id: string) =>
    request<{ ok: boolean }>(`/api/games/${id}`, { method: 'DELETE' }),

  regenerateCode: (id: string) =>
    request<{ joinCode: string }>(`/api/games/${id}/regenerate-code`, { method: 'POST' }),

  listMembers: (id: string) => request<{ members: Member[] }>(`/api/games/${id}/members`),

  removeMember: (id: string, userId: string) =>
    request<{ ok: boolean }>(`/api/games/${id}/members/${userId}`, { method: 'DELETE' }),

  // ---- Invitations ----
  invite: (id: string, phone: string) =>
    request<{ ok: boolean; invited: string; autoAdded: boolean; joinCode: string }>(
      `/api/games/${id}/invitations`,
      { method: 'POST', body: { phone } },
    ),

  listInvitations: (id: string) =>
    request<{ invitations: Invitation[] }>(`/api/games/${id}/invitations`),

  revokeInvitation: (id: string, invId: string) =>
    request<{ ok: boolean }>(`/api/games/${id}/invitations/${invId}`, { method: 'DELETE' }),

  myInvitations: () => request<{ invitations: MyInvitation[] }>('/api/invitations/mine'),

  acceptInvitation: (invId: string) =>
    request<{ ok: boolean; gameId: string }>(`/api/invitations/${invId}/accept`, {
      method: 'POST',
    }),

  // ---- Join ----
  joinByCode: (code: string) =>
    request<{ ok: boolean; gameId: string; gameName?: string; alreadyMember?: boolean }>(
      '/api/join',
      { method: 'POST', body: { code } },
    ),

  // ---- Sessions ----
  listSessions: (id: string) => request<{ sessions: Session[] }>(`/api/games/${id}/sessions`),

  createSession: (id: string, input: { scheduledAt: string; location?: string; buyIn?: string; notes?: string }) =>
    request<{ session: any }>(`/api/games/${id}/sessions`, { method: 'POST', body: input }),

  rsvp: (sessionId: string, status: 'yes' | 'no' | 'maybe') =>
    request<{ ok: boolean; status: string }>(`/api/sessions/${sessionId}/rsvp`, {
      method: 'POST',
      body: { status },
    }),
};
