import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Use an isolated temp database for tests.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'homegame-test-'));
process.env.DATABASE_PATH = path.join(tmpDir, 'test.db');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const { createApp } = await import('../src/app.js');
const request = (await import('supertest')).default;

const app = createApp();
const api = () => request(app);

// Helper: sign a user in via the OTP flow and return their token.
async function signIn(phone, displayName) {
  const otpRes = await api().post('/api/auth/request-otp').send({ phone });
  assert.equal(otpRes.status, 200);
  const code = otpRes.body.devCode;
  assert.ok(code, 'dev OTP code should be returned in test mode');
  const verifyRes = await api()
    .post('/api/auth/verify-otp')
    .send({ phone, code, displayName });
  assert.equal(verifyRes.status, 200);
  return verifyRes.body;
}

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('health check works', async () => {
  const res = await api().get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
});

test('OTP sign up creates an account', async () => {
  const result = await signIn('+15551230001', 'Alice');
  assert.ok(result.token);
  assert.equal(result.isNew, true);
  assert.equal(result.user.phone, '+15551230001');
  assert.equal(result.subscription.active, false);
});

test('creating a game requires a subscription', async () => {
  const { token } = await signIn('+15551230002', 'Bob');
  const res = await api()
    .post('/api/games')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Friday Night Poker' });
  assert.equal(res.status, 402);
  assert.equal(res.body.code, 'subscription_required');
});

test('host can subscribe then create a game with a join code', async () => {
  const { token } = await signIn('+15551230003', 'Carol');
  const subRes = await api()
    .post('/api/subscription/subscribe')
    .set('Authorization', `Bearer ${token}`)
    .send({});
  assert.equal(subRes.status, 200);
  assert.equal(subRes.body.subscription.active, true);

  const gameRes = await api()
    .post('/api/games')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Carol\'s Home Game', stakes: '1/2 NL' });
  assert.equal(gameRes.status, 201);
  assert.equal(gameRes.body.game.isHost, true);
  assert.match(gameRes.body.game.joinCode, /^\d{6}$/);
});

test('a player can join a game by numeric code', async () => {
  const host = await signIn('+15551230010', 'Host Dan');
  await api()
    .post('/api/subscription/subscribe')
    .set('Authorization', `Bearer ${host.token}`)
    .send({});
  const gameRes = await api()
    .post('/api/games')
    .set('Authorization', `Bearer ${host.token}`)
    .send({ name: 'Code Join Game' });
  const code = gameRes.body.game.joinCode;

  const player = await signIn('+15551230011', 'Player Eve');
  const joinRes = await api()
    .post('/api/join')
    .set('Authorization', `Bearer ${player.token}`)
    .send({ code });
  assert.equal(joinRes.status, 201);
  assert.equal(joinRes.body.gameId, gameRes.body.game.id);

  const listRes = await api()
    .get('/api/games')
    .set('Authorization', `Bearer ${player.token}`);
  assert.equal(listRes.body.games.length, 1);
  assert.equal(listRes.body.games[0].joinCode, undefined, 'non-host should not see code');
});

test('host can invite by phone and invitee is auto-added on sign up', async () => {
  const host = await signIn('+15551230020', 'Host Fay');
  await api()
    .post('/api/subscription/subscribe')
    .set('Authorization', `Bearer ${host.token}`)
    .send({});
  const gameRes = await api()
    .post('/api/games')
    .set('Authorization', `Bearer ${host.token}`)
    .send({ name: 'Invite Game' });
  const gameId = gameRes.body.game.id;

  const inviteePhone = '+15551230021';
  const inviteRes = await api()
    .post(`/api/games/${gameId}/invitations`)
    .set('Authorization', `Bearer ${host.token}`)
    .send({ phone: inviteePhone });
  assert.equal(inviteRes.status, 201);
  assert.equal(inviteRes.body.autoAdded, false);

  // Invitee signs up -> pending invitation should be auto-accepted.
  const invitee = await signIn(inviteePhone, 'Invited Greg');
  const listRes = await api()
    .get('/api/games')
    .set('Authorization', `Bearer ${invitee.token}`);
  assert.equal(listRes.body.games.length, 1);
  assert.equal(listRes.body.games[0].id, gameId);
});

test('inviting an existing user adds them immediately', async () => {
  const host = await signIn('+15551230030', 'Host Hank');
  await api()
    .post('/api/subscription/subscribe')
    .set('Authorization', `Bearer ${host.token}`)
    .send({});
  const gameRes = await api()
    .post('/api/games')
    .set('Authorization', `Bearer ${host.token}`)
    .send({ name: 'Existing Invite Game' });
  const gameId = gameRes.body.game.id;

  const existing = await signIn('+15551230031', 'Existing Ida');
  const inviteRes = await api()
    .post(`/api/games/${gameId}/invitations`)
    .set('Authorization', `Bearer ${host.token}`)
    .send({ phone: '+15551230031' });
  assert.equal(inviteRes.body.autoAdded, true);

  const membersRes = await api()
    .get(`/api/games/${gameId}/members`)
    .set('Authorization', `Bearer ${host.token}`);
  assert.equal(membersRes.body.members.length, 2);
  // Host sees phone numbers.
  assert.ok(membersRes.body.members.every((m) => m.phone));
});

test('non-members cannot view a game', async () => {
  const host = await signIn('+15551230040', 'Host Jim');
  await api()
    .post('/api/subscription/subscribe')
    .set('Authorization', `Bearer ${host.token}`)
    .send({});
  const gameRes = await api()
    .post('/api/games')
    .set('Authorization', `Bearer ${host.token}`)
    .send({ name: 'Private Game' });
  const gameId = gameRes.body.game.id;

  const stranger = await signIn('+15551230041', 'Stranger Kim');
  const res = await api()
    .get(`/api/games/${gameId}`)
    .set('Authorization', `Bearer ${stranger.token}`);
  assert.equal(res.status, 403);
});

test('host can schedule a game night and members can RSVP', async () => {
  const host = await signIn('+15551230050', 'Host Lee');
  await api()
    .post('/api/subscription/subscribe')
    .set('Authorization', `Bearer ${host.token}`)
    .send({});
  const gameRes = await api()
    .post('/api/games')
    .set('Authorization', `Bearer ${host.token}`)
    .send({ name: 'Session Game' });
  const gameId = gameRes.body.game.id;

  const sessionRes = await api()
    .post(`/api/games/${gameId}/sessions`)
    .set('Authorization', `Bearer ${host.token}`)
    .send({ scheduledAt: '2030-01-01T19:00:00Z', buyIn: '$100' });
  assert.equal(sessionRes.status, 201);
  const sessionId = sessionRes.body.session.id;

  const rsvpRes = await api()
    .post(`/api/sessions/${sessionId}/rsvp`)
    .set('Authorization', `Bearer ${host.token}`)
    .send({ status: 'yes' });
  assert.equal(rsvpRes.status, 200);

  const listRes = await api()
    .get(`/api/games/${gameId}/sessions`)
    .set('Authorization', `Bearer ${host.token}`);
  assert.equal(listRes.body.sessions[0].going, 1);
  assert.equal(listRes.body.sessions[0].myRsvp, 'yes');
});

test('unauthenticated requests are rejected', async () => {
  const res = await api().get('/api/games');
  assert.equal(res.status, 401);
});
