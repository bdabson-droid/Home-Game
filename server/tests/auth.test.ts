import request from 'supertest';
import { createApp } from '../src/app';
import { signIn } from './helpers';

const app = createApp();

describe('Auth (phone OTP)', () => {
  it('rejects invalid phone numbers', async () => {
    const res = await request(app).post('/auth/request-otp').send({ phone: '12345' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('invalid_phone');
  });

  it('issues an OTP and returns a dev code in non-production', async () => {
    const res = await request(app).post('/auth/request-otp').send({ phone: '555-111-2222' });
    expect(res.status).toBe(200);
    expect(res.body.devCode).toMatch(/^\d{6}$/);
    expect(res.body.phone).toBe('+15551112222');
  });

  it('creates a user on first verify and returns a token', async () => {
    const otp = await request(app).post('/auth/request-otp').send({ phone: '5551112222' });
    const res = await request(app)
      .post('/auth/verify-otp')
      .send({ phone: '5551112222', code: otp.body.devCode, name: 'Alice' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.isNewUser).toBe(true);
    expect(res.body.user.name).toBe('Alice');
  });

  it('rejects an incorrect code', async () => {
    await request(app).post('/auth/request-otp').send({ phone: '5551112222' });
    const res = await request(app).post('/auth/verify-otp').send({ phone: '5551112222', code: '000000' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('otp_invalid');
  });

  it('returns profile via /auth/me', async () => {
    const { token } = await signIn(app, '5551112222', 'Bob');
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Bob');
    expect(res.body.subscription.status).toBe('none');
  });

  it('rejects unauthenticated access to /auth/me', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });
});
