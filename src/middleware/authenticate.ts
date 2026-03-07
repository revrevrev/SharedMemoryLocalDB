import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/tokenService';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.slice(7);
  try {
    verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
