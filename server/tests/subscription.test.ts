import request from 'supertest';
import { createApp } from '../src/app';
import { signIn } from './helpers';

const app = createApp();

describe('Subscription (mock billing mode)', () => {
  it('starts with no subscription', async () => {
    const { token } = await signIn(app, '5553330001', 'User');
    const res = await request(app).get('/subscription').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.subscription.status).toBe('none');
    expect(res.body.billingMode).toBe('mock');
  });

  it('activates on checkout in mock mode', async () => {
    const { token } = await signIn(app, '5553330002', 'User');
    const res = await request(app).post('/subscription/checkout').set('Authorization', `Bearer ${token}`).send();
    expect(res.status).toBe(200);
    expect(res.body.subscription.status).toBe('active');
  });

  it('can be cancelled', async () => {
    const { token } = await signIn(app, '5553330003', 'User');
    await request(app).post('/subscription/checkout').set('Authorization', `Bearer ${token}`).send();
    const res = await request(app).post('/subscription/cancel').set('Authorization', `Bearer ${token}`).send();
    expect(res.status).toBe(200);
    expect(res.body.subscription.status).toBe('canceled');
  });
});
