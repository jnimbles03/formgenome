import { log } from '../shared/logger';
import { setUpdateInfo } from '../storage/preferences';
import { checkForUpdate, isNewerVersion } from '../api/version';

/**
 * Checks the backend for available updates and shows a badge if found.
 */
export async function runUpdateCheck(): Promise<void> {
  try {
    const manifest = chrome.runtime.getManifest();
    const currentVersion = manifest.version;

    const versionInfo = await checkForUpdate();
    if (!versionInfo) return;

    if (isNewerVersion(versionInfo.version, currentVersion)) {
      log.info(`Update available: ${versionInfo.version} (current: ${currentVersion})`);

      await setUpdateInfo({
        version: versionInfo.version,
        message: versionInfo.message,
        url: versionInfo.download_url,
      });

      chrome.action.setBadgeText({ text: 'UPDT' });
      chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
    } else {
      await setUpdateInfo(null);
    }
  } catch (error) {
    log.error('Update check failed:', error);
  }
}
