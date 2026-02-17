import type { CachedAnalysis } from './analysis';

/** Keys that are protected from bulk deletion */
export const PROTECTED_STORAGE_KEYS = [
  'userId',
  'apiPreference',
  'dashboardColumnOrder',
  'columnOrder',
  'updateAvailable',
  '_cacheKeysMigrated',
] as const;

export type ProtectedStorageKey = typeof PROTECTED_STORAGE_KEYS[number];

/** Update notification data */
export interface UpdateInfo {
  version: string;
  message: string;
  url: string;
}

/** Shape of non-dynamic storage entries */
export interface StoragePreferences {
  userId: string;
  apiPreference: 'local' | 'cloud';
  dashboardColumnOrder: string[];
  columnOrder: string[];
  updateAvailable?: UpdateInfo;
  _cacheKeysMigrated?: boolean;
}

/** Full storage can include dynamic analysis_* keys */
export type StorageData = StoragePreferences & {
  [key: `analysis_${string}`]: CachedAnalysis;
};
