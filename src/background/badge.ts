import { log } from '../shared/logger';

/**
 * Determines if a URL points to a PDF.
 */
function isPdfUrl(url: string | undefined): boolean {
  if (!url) return false;
  return (
    url.endsWith('.pdf') ||
    url.includes('.pdf?') ||
    url.includes('type=application/pdf')
  );
}

/**
 * Sets up tab event listeners for badge management.
 */
export function setupBadgeHandlers(): void {
  // Clear badge when tab is closed
  chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.action.setBadgeText({ text: '', tabId });
  });

  // Update badge when switching tabs
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      if (isPdfUrl(tab.url)) {
        chrome.action.setBadgeText({ text: '\u2713', tabId: tab.id });
        chrome.action.setBadgeBackgroundColor({ color: '#667eea', tabId: tab.id });
      } else {
        chrome.action.setBadgeText({ text: '', tabId: tab.id });
      }
    } catch (error) {
      log.error('Error updating badge:', error);
    }
  });
}
