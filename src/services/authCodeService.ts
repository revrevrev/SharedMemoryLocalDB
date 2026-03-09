import { randomBytes } from 'crypto';

interface AuthCode {
  redirectUri: string;
  expiresAt: number;
}

const codes = new Map<string, AuthCode>();

export function generateCode(redirectUri: string): string {
  const code = randomBytes(16).toString('hex');
  codes.set(code, {
    redirectUri,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  });
  return code;
}

export function consumeCode(code: string, redirectUri: string): boolean {
  const entry = codes.get(code);
  if (!entry) return false;
  codes.delete(code);
  if (Date.now() > entry.expiresAt) return false;
  if (entry.redirectUri !== redirectUri) return false;
  return true;
}
