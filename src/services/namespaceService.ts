import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

const NAMESPACE_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;

export interface NamespaceEntry {
  id: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export function validateNamespaceName(name: string): void {
  if (!NAMESPACE_NAME_PATTERN.test(name)) {
    const err = new Error('Invalid namespace name. Only letters, numbers, hyphens, and underscores are allowed.');
    (err as NodeJS.ErrnoException).code = 'INVALID_NAME';
    throw err;
  }
}

function getFilePath(name: string): string {
  return path.resolve(config.DATA_DIR, `${name}.json`);
}

function ensureDataDir(): void {
  if (!fs.existsSync(config.DATA_DIR)) {
    fs.mkdirSync(config.DATA_DIR, { recursive: true });
  }
}

export function readNamespace(name: string): NamespaceEntry[] {
  const filePath = getFilePath(name);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as NamespaceEntry[];
}

export function appendEntry(name: string, payload: Record<string, unknown>): NamespaceEntry {
  ensureDataDir();
  const entries = readNamespace(name);
  const entry: NamespaceEntry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    payload,
  };
  entries.push(entry);
  fs.writeFileSync(getFilePath(name), JSON.stringify(entries, null, 2), 'utf-8');
  return entry;
}
