import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthTokenPayload {
  userId: string;
  phone: string;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn } as jwt.SignOptions);
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  return jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
}
