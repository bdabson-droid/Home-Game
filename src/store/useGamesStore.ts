import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  BuyIn,
  CashOut,
  HomeGame,
  Invite,
  Member,
  PlayerResult,
  Session,
  User,
} from '../types';
import { generateId, generateInviteCode } from '../utils/id';
import { normalizePhone } from '../utils/format';
import { sendSmsInvite } from '../services/invites';
import { createAsyncStorage } from './persist';

type CreateGameInput = {
  name: string;
  location?: string;
  stakes?: string;
  description?: string;
};

type CreateSessionInput = {
  gameId: string;
  scheduledFor?: number;
  location?: string;
  notes?: string;
  startNow?: boolean;
};

type GamesState = {
  games: HomeGame[];
  sessions: Session[];
  invites: Invite[];

  gamesForUser: (userId: string) => HomeGame[];
  hostedGamesForUser: (userId: string) => HomeGame[];
  getGame: (gameId: string) => HomeGame | undefined;
  sessionsForGame: (gameId: string) => Session[];
  getSession: (sessionId: string) => Session | undefined;
  pendingInvitesForPhone: (phone: string) => Invite[];

  createGame: (host: User, input: CreateGameInput) => HomeGame;
  updateGame: (gameId: string, patch: Partial<CreateGameInput>) => void;
  regenerateInviteCode: (gameId: string) => string;
  removeMember: (gameId: string, userId: string) => void;
  leaveGame: (gameId: string, userId: string) => void;

  inviteByPhone: (params: {
    game: HomeGame;
    phone: string;
    invitedBy: User;
  }) => Promise<Invite>;
  joinByCode: (params: { user: User; code: string }) => HomeGame;
  acceptInvite: (params: { user: User; inviteId: string }) => HomeGame;

  createSession: (input: CreateSessionInput) => Session;
  startSession: (sessionId: string) => void;
  endSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => void;
  addBuyIn: (sessionId: string, playerId: string, playerName: string, amount: number) => void;
  removeBuyIn: (sessionId: string, buyInId: string) => void;
  setCashOut: (sessionId: string, playerId: string, playerName: string, amount: number) => void;
  computeResults: (sessionId: string) => PlayerResult[];
};

export const useGamesStore = create<GamesState>()(
  persist(
    (set, get) => ({
      games: [],
      sessions: [],
      invites: [],

      gamesForUser: (userId) =>
        get().games.filter((g) => g.members.some((m) => m.userId === userId)),

      hostedGamesForUser: (userId) => get().games.filter((g) => g.hostId === userId),

      getGame: (gameId) => get().games.find((g) => g.id === gameId),

      sessionsForGame: (gameId) =>
        get()
          .sessions.filter((s) => s.gameId === gameId)
          .sort((a, b) => {
            const aT = a.startedAt ?? a.scheduledFor ?? 0;
            const bT = b.startedAt ?? b.scheduledFor ?? 0;
            return bT - aT;
          }),

      getSession: (sessionId) => get().sessions.find((s) => s.id === sessionId),

      pendingInvitesForPhone: (phone) => {
        const normalized = normalizePhone(phone);
        return get().invites.filter(
          (i) => i.status === 'pending' && normalizePhone(i.phone) === normalized,
        );
      },

      createGame: (host, input) => {
        const now = Date.now();
        const game: HomeGame = {
          id: generateId('gam'),
          name: input.name.trim(),
          hostId: host.id,
          hostName: host.displayName,
          location: input.location?.trim() || undefined,
          stakes: input.stakes?.trim() || undefined,
          description: input.description?.trim() || undefined,
          inviteCode: generateInviteCode(),
          members: [
            {
              userId: host.id,
              displayName: host.displayName,
              phone: host.phone,
              role: 'host',
              joinedAt: now,
            },
          ],
          createdAt: now,
        };
        set((s) => ({ games: [game, ...s.games] }));
        return game;
      },

      updateGame: (gameId, patch) => {
        set((s) => ({
          games: s.games.map((g) =>
            g.id === gameId
              ? {
                  ...g,
                  name: patch.name?.trim() || g.name,
                  location: patch.location?.trim() ?? g.location,
                  stakes: patch.stakes?.trim() ?? g.stakes,
                  description: patch.description?.trim() ?? g.description,
                }
              : g,
          ),
        }));
      },

      regenerateInviteCode: (gameId) => {
        const next = generateInviteCode();
        set((s) => ({
          games: s.games.map((g) => (g.id === gameId ? { ...g, inviteCode: next } : g)),
        }));
        return next;
      },

      removeMember: (gameId, userId) => {
        set((s) => ({
          games: s.games.map((g) =>
            g.id === gameId && g.hostId !== userId
              ? { ...g, members: g.members.filter((m) => m.userId !== userId) }
              : g,
          ),
        }));
      },

      leaveGame: (gameId, userId) => {
        set((s) => ({
          games: s.games
            .map((g) =>
              g.id === gameId && g.hostId !== userId
                ? { ...g, members: g.members.filter((m) => m.userId !== userId) }
                : g,
            )
            // If host leaves, drop the game entirely; ownership transfer is out of scope.
            .filter((g) => !(g.id === gameId && g.hostId === userId)),
          sessions: s.sessions.filter((sess) =>
            sess.gameId === gameId
              ? s.games.find((g) => g.id === gameId && g.hostId !== userId) !== undefined
              : true,
          ),
        }));
      },

      inviteByPhone: async ({ game, phone, invitedBy }) => {
        const normalized = normalizePhone(phone);
        if (!normalized) throw new Error('Enter a valid phone number.');

        const already = game.members.find((m) => normalizePhone(m.phone) === normalized);
        if (already) {
          throw new Error(`${already.displayName} is already in this game.`);
        }

        const existing = get().invites.find(
          (i) =>
            i.gameId === game.id &&
            i.status === 'pending' &&
            normalizePhone(i.phone) === normalized,
        );
        if (existing) return existing;

        await sendSmsInvite({
          phoneE164: normalized,
          gameName: game.name,
          inviteCode: game.inviteCode,
          hostName: invitedBy.displayName,
        });

        const invite: Invite = {
          id: generateId('inv'),
          gameId: game.id,
          phone: normalized,
          invitedByUserId: invitedBy.id,
          invitedByName: invitedBy.displayName,
          createdAt: Date.now(),
          status: 'pending',
        };
        set((s) => ({ invites: [invite, ...s.invites] }));
        return invite;
      },

      joinByCode: ({ user, code }) => {
        const trimmed = code.trim();
        const game = get().games.find((g) => g.inviteCode === trimmed);
        if (!game) throw new Error('No home game found for that code.');
        return joinGame(set, get, game, user);
      },

      acceptInvite: ({ user, inviteId }) => {
        const invite = get().invites.find((i) => i.id === inviteId);
        if (!invite) throw new Error('Invite not found.');
        const game = get().games.find((g) => g.id === invite.gameId);
        if (!game) throw new Error('That home game no longer exists.');
        const joined = joinGame(set, get, game, user);
        set((s) => ({
          invites: s.invites.map((i) =>
            i.id === inviteId ? { ...i, status: 'accepted' } : i,
          ),
        }));
        return joined;
      },

      createSession: (input) => {
        const now = Date.now();
        const session: Session = {
          id: generateId('ses'),
          gameId: input.gameId,
          status: input.startNow ? 'live' : 'scheduled',
          scheduledFor: input.scheduledFor,
          startedAt: input.startNow ? now : undefined,
          location: input.location,
          notes: input.notes,
          buyIns: [],
          cashOuts: [],
        };
        set((s) => ({ sessions: [session, ...s.sessions] }));
        return session;
      },

      startSession: (sessionId) => {
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? { ...sess, status: 'live', startedAt: sess.startedAt ?? Date.now() }
              : sess,
          ),
        }));
      },

      endSession: (sessionId) => {
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId ? { ...sess, status: 'settled', endedAt: Date.now() } : sess,
          ),
        }));
      },

      deleteSession: (sessionId) => {
        set((s) => ({ sessions: s.sessions.filter((sess) => sess.id !== sessionId) }));
      },

      addBuyIn: (sessionId, playerId, playerName, amount) => {
        if (!(amount > 0)) throw new Error('Buy-in must be greater than 0.');
        const buyIn: BuyIn = {
          id: generateId('buy'),
          playerId,
          playerName,
          amount,
          at: Date.now(),
        };
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId ? { ...sess, buyIns: [...sess.buyIns, buyIn] } : sess,
          ),
        }));
      },

      removeBuyIn: (sessionId, buyInId) => {
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === sessionId
              ? { ...sess, buyIns: sess.buyIns.filter((b) => b.id !== buyInId) }
              : sess,
          ),
        }));
      },

      setCashOut: (sessionId, playerId, playerName, amount) => {
        if (amount < 0) throw new Error('Cash-out cannot be negative.');
        const co: CashOut = { playerId, playerName, amount, at: Date.now() };
        set((s) => ({
          sessions: s.sessions.map((sess) => {
            if (sess.id !== sessionId) return sess;
            const others = sess.cashOuts.filter((c) => c.playerId !== playerId);
            return { ...sess, cashOuts: [...others, co] };
          }),
        }));
      },

      computeResults: (sessionId) => {
        const sess = get().sessions.find((s) => s.id === sessionId);
        if (!sess) return [];
        const byPlayer = new Map<string, PlayerResult>();
        for (const b of sess.buyIns) {
          const prev = byPlayer.get(b.playerId) ?? {
            playerId: b.playerId,
            playerName: b.playerName,
            buyInTotal: 0,
            cashOutTotal: 0,
            net: 0,
          };
          prev.buyInTotal += b.amount;
          prev.playerName = b.playerName;
          byPlayer.set(b.playerId, prev);
        }
        for (const c of sess.cashOuts) {
          const prev = byPlayer.get(c.playerId) ?? {
            playerId: c.playerId,
            playerName: c.playerName,
            buyInTotal: 0,
            cashOutTotal: 0,
            net: 0,
          };
          prev.cashOutTotal += c.amount;
          prev.playerName = c.playerName;
          byPlayer.set(c.playerId, prev);
        }
        const results = Array.from(byPlayer.values()).map((r) => ({
          ...r,
          net: r.cashOutTotal - r.buyInTotal,
        }));
        results.sort((a, b) => b.net - a.net);
        return results;
      },
    }),
    {
      name: 'homegame.games.v1',
      storage: createAsyncStorage(),
    },
  ),
);

type Setter = (partial: Partial<GamesState> | ((s: GamesState) => Partial<GamesState>)) => void;
type Getter = () => GamesState;

function joinGame(set: Setter, get: Getter, game: HomeGame, user: User): HomeGame {
  const already = game.members.find((m) => m.userId === user.id);
  if (already) return game;

  const member: Member = {
    userId: user.id,
    displayName: user.displayName,
    phone: user.phone,
    role: 'player',
    joinedAt: Date.now(),
  };

  const updated: HomeGame = { ...game, members: [...game.members, member] };
  set((s) => ({
    games: s.games.map((g) => (g.id === game.id ? updated : g)),
  }));
  return updated;
}
