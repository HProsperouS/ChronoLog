import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

function getResourcesPath(): string | null {
  const resourcesPath = (process as NodeJS.Process & { resourcesPath?: string }).resourcesPath;
  return typeof resourcesPath === 'string' && resourcesPath.length > 0 ? resourcesPath : null;
}

function resolveEnvPath(): string | null {
  const explicit = process.env.CHRONOLOG_ENV_FILE?.trim();
  if (explicit) return explicit;

  const resourcesPath = getResourcesPath();
  const candidates = [
    path.resolve(__dirname, '../.env'),
    resourcesPath ? path.resolve(resourcesPath, 'backend', '.env') : null,
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }

  return null;
}

const envPath = resolveEnvPath();
if (envPath) {
  dotenv.config({ path: envPath });
}
