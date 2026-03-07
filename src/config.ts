import * as dotenv from 'dotenv';
dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = Object.freeze({
  PORT: parseInt(process.env['PORT'] ?? '3000', 10),
  DATA_DIR: process.env['DATA_DIR'] ?? './data',
  OAUTH_CLIENT_ID: requireEnv('OAUTH_CLIENT_ID'),
  OAUTH_CLIENT_SECRET: requireEnv('OAUTH_CLIENT_SECRET'),
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: parseInt(process.env['JWT_EXPIRES_IN'] ?? '3600', 10),
});
