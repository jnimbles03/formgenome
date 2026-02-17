import type { ApiMode } from '../types/config';
import type { UpdateInfo } from '../types/storage';
import { log } from '../shared/logger';

/**
 * Gets or creates a persistent user identifier.
 */
export async function getUserId(): Promise<string> {
  // Try sync storage first (shared across devices)
  try {
    const syncData = await chrome.storage.sync.get('userId');
    if (syncData.userId) return syncData.userId as string;
  } catch {
    log.warn('Could not access sync storage for userId');
  }

  // Fall back to local storage
  const localData = await chrome.storage.local.get('userId');
  if (localData.userId) return localData.userId as string;

  // Generate new ID
  const newUserId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  await chrome.storage.local.set({ userId: newUserId });

  // Try to save to sync storage too
  try {
    await chrome.storage.sync.set({ userId: newUserId });
  } catch {
    log.warn('Could not save userId to sync storage');
  }

  return newUserId;
}

/**
 * Gets the current API mode preference.
 */
export async function getApiPreference(): Promise<ApiMode> {
  const data = await chrome.storage.local.get('apiPreference');
  return (data.apiPreference as ApiMode) || 'cloud';
}

/**
 * Sets the API mode preference.
 */
export async function setApiPreference(mode: ApiMode): Promise<void> {
  await chrome.storage.local.set({ apiPreference: mode });
}

/**
 * Gets the saved column order for a dashboard.
 */
export async function getColumnOrder(storageKey: 'dashboardColumnOrder' | 'columnOrder'): Promise<string[] | null> {
  const data = await chrome.storage.local.get(storageKey);
  return (data[storageKey] as string[] | undefined) ?? null;
}

/**
 * Saves the column order for a dashboard.
 */
export async function setColumnOrder(
  storageKey: 'dashboardColumnOrder' | 'columnOrder',
  order: string[],
): Promise<void> {
  await chrome.storage.local.set({ [storageKey]: order });
}

/**
 * Gets update availability info.
 */
export async function getUpdateInfo(): Promise<UpdateInfo | null> {
  const data = await chrome.storage.local.get('updateAvailable');
  return (data.updateAvailable as UpdateInfo | undefined) ?? null;
}

/**
 * Sets or clears update availability info.
 */
export async function setUpdateInfo(info: UpdateInfo | null): Promise<void> {
  if (info) {
    await chrome.storage.local.set({ updateAvailable: info });
  } else {
    await chrome.storage.local.remove('updateAvailable');
  }
}
