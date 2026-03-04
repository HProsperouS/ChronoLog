import fs from 'fs';
import path from 'path';
import type { Activity } from '../types';

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const ACTIVITIES_DIR = path.join(DATA_DIR, 'activities');

function ensureDir() {
  if (!fs.existsSync(ACTIVITIES_DIR)) {
    fs.mkdirSync(ACTIVITIES_DIR, { recursive: true });
  }
}

function filePath(date: string): string {
  return path.join(ACTIVITIES_DIR, `${date}.json`);
}

function atomicWrite(file: string, data: Activity[]): void {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

export function readDay(date: string): Activity[] {
  ensureDir();
  const file = filePath(date);
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Activity[];
  } catch {
    return [];
  }
}

export function writeDay(date: string, activities: Activity[]): void {
  ensureDir();
  atomicWrite(filePath(date), activities);
}

export function readRange(from: string, to: string): Activity[] {
  ensureDir();
  const result: Activity[] = [];
  const files = fs.readdirSync(ACTIVITIES_DIR).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const date = file.replace('.json', '');
    if (date >= from && date <= to) {
      result.push(...readDay(date));
    }
  }
  return result.sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function availableDates(): string[] {
  ensureDir();
  return fs
    .readdirSync(ACTIVITIES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''))
    .sort();
}

let _seq = 0;

export function nextActivityId(activities: Activity[]): number {
  if (_seq === 0 && activities.length > 0) {
    _seq = Math.max(...activities.map((a) => a.id));
  }
  _seq += 1;
  return _seq;
}
