import request from 'supertest';
import { createApp } from '../src/app';
import { signIn } from './helpers';

const app = createApp();

async function makeHost(phone: string, name: string) {
  const { token, userId } = await signIn(app, phone, name);
  // In mock billing mode this activates the subscription immediately.
  await request(app).post('/subscription/checkout').set('Authorization', `Bearer ${token}`).send();
  return { token, userId };
}

describe('Home games', () => {
  it('blocks game creation without an active subscription', async () => {
    const { token } = await signIn(app, '5551110001', 'NoSub');
    const res = await request(app)
      .post('/games')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Game' });
    expect(res.status).toBe(402);
    expect(res.body.code).toBe('subscription_required');
  });

  it('lets a subscribed host create a game with a join code', async () => {
    const { token } = await makeHost('5551110002', 'Host');
    const res = await request(app)
      .post('/games')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Friday Night', defaultBuyIn: 200 });
    expect(res.status).toBe(201);
    expect(res.body.game.joinCode).toMatch(/^\d{6}$/);
    expect(res.body.game.name).toBe('Friday Night');
  });

  it('allows another user to join with the numeric code', async () => {
    const host = await makeHost('5551110003', 'Host');
    const created = await request(app)
      .post('/games')
      .set('Authorization', `Bearer ${host.token}`)
      .send({ name: 'Poker Night' });
    const code = created.body.game.joinCode as string;

    const player = await signIn(app, '5551110004', 'Player');
    const joinRes = await request(app)
      .post('/games/join')
      .set('Authorization', `Bearer ${player.token}`)
      .send({ code });
    expect(joinRes.status).toBe(200);
    expect(joinRes.body.role).toBe('player');

    const list = await request(app).get('/games').set('Authorization', `Bearer ${player.token}`);
    expect(list.body.games).toHaveLength(1);
    expect(list.body.games[0].role).toBe('player');
    // Players should not see the join code.
    expect(list.body.games[0].joinCode).toBeUndefined();
  });

  it('rejects joining with an unknown code', async () => {
    const player = await signIn(app, '5551110005', 'Player');
    const res = await request(app)
      .post('/games/join')
      .set('Authorization', `Bearer ${player.token}`)
      .send({ code: '999999' });
    expect(res.status).toBe(404);
  });

  it('invites by phone and auto-joins the user once they sign up', async () => {
    const host = await makeHost('5551110006', 'Host');
    const created = await request(app)
      .post('/games')
      .set('Authorization', `Bearer ${host.token}`)
      .send({ name: 'Invite Game' });
    const gameId = created.body.game.id as string;

    const inviteRes = await request(app)
      .post(`/games/${gameId}/invites`)
      .set('Authorization', `Bearer ${host.token}`)
      .send({ phone: '5551119999' });
    expect(inviteRes.status).toBe(201);
    expect(inviteRes.body.invite.status).toBe('pending');

    // The invited person signs up with the same number.
    const invited = await signIn(app, '5551119999', 'Invitee');
    const list = await request(app).get('/games').set('Authorization', `Bearer ${invited.token}`);
    expect(list.body.games).toHaveLength(1);
    expect(list.body.games[0].id).toBe(gameId);
  });

  it('immediately adds an invitee that already has an account', async () => {
    const host = await makeHost('5551110007', 'Host');
    const existing = await signIn(app, '5551118888', 'Existing');
    const created = await request(app)
      .post('/games')
      .set('Authorization', `Bearer ${host.token}`)
      .send({ name: 'Direct Add' });
    const gameId = created.body.game.id as string;

    const inviteRes = await request(app)
      .post(`/games/${gameId}/invites`)
      .set('Authorization', `Bearer ${host.token}`)
      .send({ phone: '5551118888' });
    expect(inviteRes.status).toBe(201);
    expect(inviteRes.body.invite.status).toBe('accepted');

    const list = await request(app).get('/games').set('Authorization', `Bearer ${existing.token}`);
    expect(list.body.games.map((g: { id: string }) => g.id)).toContain(gameId);
  });

  it('prevents non-hosts from inviting', async () => {
    const host = await makeHost('5551110008', 'Host');
    const created = await request(app)
      .post('/games')
      .set('Authorization', `Bearer ${host.token}`)
      .send({ name: 'Guarded' });
    const gameId = created.body.game.id as string;
    const code = created.body.game.joinCode as string;

    const player = await signIn(app, '5551110009', 'Player');
    await request(app).post('/games/join').set('Authorization', `Bearer ${player.token}`).send({ code });

    const res = await request(app)
      .post(`/games/${gameId}/invites`)
      .set('Authorization', `Bearer ${player.token}`)
      .send({ phone: '5551117777' });
    expect(res.status).toBe(403);
  });
});
