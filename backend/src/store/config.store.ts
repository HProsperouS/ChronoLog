import fs from 'fs';
import path from 'path';
import type { Insight } from '../types';

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const INSIGHTS_FILE = path.join(DATA_DIR, 'insights.json');

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function sleepMs(ms: number): void {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // busy wait
  }
}

function atomicWrite(file: string, data: unknown): void {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');

  let lastError: unknown;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      if (fs.existsSync(file)) {
        try {
          fs.rmSync(file, { force: true });
        } catch {
          // ignore and let rename try anyway
        }
      }

      fs.renameSync(tmp, file);
      return;
    } catch (err) {
      lastError = err;
      sleepMs(100);
    }
  }

  throw lastError;
}
export function readInsights(): Insight[] {
  ensureDir();
  if (!fs.existsSync(INSIGHTS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(INSIGHTS_FILE, 'utf8')) as Insight[];
  } catch {
    return [];
  }
}

export function writeInsights(insights: Insight[]): void {
  ensureDir();
  atomicWrite(INSIGHTS_FILE, insights);
}
