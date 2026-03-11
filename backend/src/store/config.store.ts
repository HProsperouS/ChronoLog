import fs from 'fs';
import path from 'path';
import type { Insight } from '../types';

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const INSIGHTS_FILE = path.join(DATA_DIR, 'insights.json');

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function atomicWrite(file: string, data: unknown): void {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
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
