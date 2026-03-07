import jwt from 'jsonwebtoken';
import { config } from '../config';

export function issueToken(clientId: string): string {
  return jwt.sign({ sub: clientId }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string): jwt.JwtPayload {
  const decoded = jwt.verify(token, config.JWT_SECRET);
  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload');
  }
  return decoded;
}
