import type { CachedAnalysis } from '../types/analysis';
import { PROTECTED_STORAGE_KEYS } from '../types/storage';
import { cacheKeyForUrl } from '../shared/hash';
import { CACHE_TTL_MS } from '../shared/constants';
import { log } from '../shared/logger';

/**
 * Retrieves a cached analysis result for a URL.
 * Returns null if not found or expired.
 */
export async function getCachedAnalysis(url: string): Promise<CachedAnalysis | null> {
  const key = await cacheKeyForUrl(url);
  const data = await chrome.storage.local.get(key);
  const cached = data[key] as CachedAnalysis | undefined;

  if (!cached) return null;

  // Check expiration
  const age = Date.now() - (cached._cached_at || 0);
  if (age > CACHE_TTL_MS) {
    log.debug(`Cache expired for ${key}`);
    return null;
  }

  return cached;
}

/**
 * Stores an analysis result in the cache.
 */
export async function setCachedAnalysis(url: string, result: CachedAnalysis): Promise<string> {
  const key = await cacheKeyForUrl(url);
  result._cached_at = Date.now();
  await chrome.storage.local.set({ [key]: result });
  log.debug(`Cached analysis: ${key}`);
  return key;
}

/**
 * Gets all cached analysis results from storage.
 */
export async function getAllCachedAnalyses(): Promise<Map<string, CachedAnalysis>> {
  const allData = await chrome.storage.local.get(null);
  const results = new Map<string, CachedAnalysis>();

  for (const [key, value] of Object.entries(allData)) {
    if (key.startsWith('analysis_') && value && typeof value === 'object') {
      results.set(key, value as CachedAnalysis);
    }
  }

  return results;
}

/**
 * Clears ONLY analysis cache entries, preserving user preferences,
 * userId, column order, and other non-cache data.
 *
 * This fixes the critical bug where the old code called
 * chrome.storage.local.clear() which nuked everything.
 */
export async function clearAnalysisCache(): Promise<number> {
  const allData = await chrome.storage.local.get(null);
  const protectedSet = new Set<string>(PROTECTED_STORAGE_KEYS as unknown as string[]);

  const keysToRemove = Object.keys(allData).filter(
    key => key.startsWith('analysis_') && !protectedSet.has(key)
  );

  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
  }

  log.info(`Cleared ${keysToRemove.length} cached analyses`);
  return keysToRemove.length;
}

/**
 * Gets all unsynced analysis results.
 */
export async function getUnsyncedAnalyses(): Promise<Array<{ key: string; data: CachedAnalysis }>> {
  const allData = await chrome.storage.local.get(null);

  return Object.entries(allData)
    .filter(([key, value]) => {
      return key.startsWith('analysis_') &&
        value &&
        typeof value === 'object' &&
        !(value as CachedAnalysis).error &&
        ((value as CachedAnalysis).success || (value as CachedAnalysis).ok) &&
        !(value as CachedAnalysis)._synced;
    })
    .map(([key, value]) => ({ key, data: value as CachedAnalysis }));
}

/**
 * Marks an analysis as synced.
 */
export async function markAsSynced(key: string, data: CachedAnalysis): Promise<void> {
  const updatedData: CachedAnalysis = { ...data, _synced: true, _synced_at: Date.now() };
  await chrome.storage.local.set({ [key]: updatedData });
}

/**
 * Resets the sync status on all cached analyses (for force-sync).
 */
export async function resetAllSyncStatus(): Promise<number> {
  const allData = await chrome.storage.local.get(null);
  let count = 0;

  for (const [key, value] of Object.entries(allData)) {
    if (key.startsWith('analysis_') && value && typeof value === 'object') {
      await chrome.storage.local.set({
        [key]: { ...(value as CachedAnalysis), _synced: false },
      });
      count++;
    }
  }

  return count;
}
