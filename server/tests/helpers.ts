import request from 'supertest';
import type { Express } from 'express';

export async function signIn(app: Express, phone: string, name?: string): Promise<{ token: string; userId: string }> {
  const otpRes = await request(app).post('/auth/request-otp').send({ phone });
  const code = otpRes.body.devCode as string;
  const verifyRes = await request(app).post('/auth/verify-otp').send({ phone, code, name });
  return { token: verifyRes.body.token, userId: verifyRes.body.user.id };
}

export function auth(token: string): [string, string] {
  return ['Authorization', `Bearer ${token}`];
}
