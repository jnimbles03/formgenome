import type { AppConfig, ApiMode } from '../types/config';

const PRODUCTION_URL = 'https://form-genome-api-nxqo233ggq-uc.a.run.app';
const LOCAL_URL = 'http://localhost:8080';
const ANALYZE_ENDPOINT = '/api/analyze/upload';

let currentConfig: AppConfig = {
  apiBaseUrl: PRODUCTION_URL,
  analyzeEndpoint: ANALYZE_ENDPOINT,
  isLocal: false,
};

/**
 * Initialize config from stored preference.
 * Must be called once at startup of each entry point that needs API access.
 */
export async function initConfig(): Promise<AppConfig> {
  const data = await chrome.storage.local.get('apiPreference');
  const pref = (data as { apiPreference?: ApiMode }).apiPreference;
  currentConfig = {
    apiBaseUrl: pref === 'local' ? LOCAL_URL : PRODUCTION_URL,
    analyzeEndpoint: ANALYZE_ENDPOINT,
    isLocal: pref === 'local',
  };
  return currentConfig;
}

export function getConfig(): Readonly<AppConfig> {
  return currentConfig;
}

export function setApiMode(mode: ApiMode): void {
  currentConfig = {
    ...currentConfig,
    apiBaseUrl: mode === 'local' ? LOCAL_URL : PRODUCTION_URL,
    isLocal: mode === 'local',
  };
}
