import { NextFunction, Request, Response } from 'express';
import { verifyAuthToken } from '../utils/jwt';
import { ApiError } from './error';

export interface AuthedRequest extends Request {
  userId?: string;
  userPhone?: string;
}

export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new ApiError(401, 'Missing authorization token', 'unauthorized');
  }
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifyAuthToken(token);
    req.userId = payload.userId;
    req.userPhone = payload.phone;
    next();
  } catch {
    throw new ApiError(401, 'Invalid or expired token', 'unauthorized');
  }
}
