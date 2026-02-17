import { getConfig } from '../shared/config';
import { log } from '../shared/logger';

interface VersionResponse {
  version: string;
  message: string;
  download_url: string;
}

/**
 * Checks if a version string is newer than the current one.
 */
export function isNewerVersion(latest: string, current: string): boolean {
  const l = latest.split('.').map(Number);
  const c = current.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((l[i] ?? 0) > (c[i] ?? 0)) return true;
    if ((l[i] ?? 0) < (c[i] ?? 0)) return false;
  }
  return false;
}

/**
 * Fetches the latest version info from the backend.
 */
export async function checkForUpdate(): Promise<VersionResponse | null> {
  try {
    const config = getConfig();
    const response = await fetch(`${config.apiBaseUrl}/version`);
    if (!response.ok) return null;
    return await response.json() as VersionResponse;
  } catch (error) {
    log.error('Version check failed', error);
    return null;
  }
}
