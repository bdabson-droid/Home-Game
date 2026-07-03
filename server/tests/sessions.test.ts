import request from 'supertest';
import { createApp } from '../src/app';
import { signIn } from './helpers';

const app = createApp();

async function hostWithGame(phone: string) {
  const { token } = await signIn(app, phone, 'Host');
  await request(app).post('/subscription/checkout').set('Authorization', `Bearer ${token}`).send();
  const created = await request(app)
    .post('/games')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Session Game' });
  return { token, gameId: created.body.game.id as string, code: created.body.game.joinCode as string };
}

describe('Sessions & ledger', () => {
  it('host schedules a session and a member RSVPs', async () => {
    const host = await hostWithGame('5552220001');
    const sessionRes = await request(app)
      .post(`/games/${host.gameId}/sessions`)
      .set('Authorization', `Bearer ${host.token}`)
      .send({ scheduledAt: new Date(Date.now() + 86400000).toISOString(), location: 'Garage' });
    expect(sessionRes.status).toBe(201);
    const sessionId = sessionRes.body.session.id as string;

    const player = await signIn(app, '5552220002', 'Player');
    await request(app).post('/games/join').set('Authorization', `Bearer ${player.token}`).send({ code: host.code });

    const rsvp = await request(app)
      .post(`/games/${host.gameId}/sessions/${sessionId}/rsvp`)
      .set('Authorization', `Bearer ${player.token}`)
      .send({ rsvp: 'yes', buyIn: 100 });
    expect(rsvp.status).toBe(200);
    expect(rsvp.body.seat.rsvp).toBe('yes');
    expect(rsvp.body.seat.buyIn).toBe(100);
  });

  it('host records results for a seat', async () => {
    const host = await hostWithGame('5552220003');
    const sessionRes = await request(app)
      .post(`/games/${host.gameId}/sessions`)
      .set('Authorization', `Bearer ${host.token}`)
      .send({ scheduledAt: new Date().toISOString() });
    const sessionId = sessionRes.body.session.id as string;

    const player = await signIn(app, '5552220004', 'Player');
    await request(app).post('/games/join').set('Authorization', `Bearer ${player.token}`).send({ code: host.code });

    const result = await request(app)
      .post(`/games/${host.gameId}/sessions/${sessionId}/results`)
      .set('Authorization', `Bearer ${host.token}`)
      .send({ userId: player.userId, buyIn: 200, cashOut: 350 });
    expect(result.status).toBe(200);
    expect(result.body.seat.buyIn).toBe(200);
    expect(result.body.seat.cashOut).toBe(350);
  });
});
