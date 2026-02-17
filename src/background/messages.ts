import type { ExtensionMessage, FetchPageResponse } from '../types/messages';
import { isSafeHttpUrl } from '../shared/url-validation';
import { log } from '../shared/logger';

/** Maximum HTML response size (5 MB). */
const MAX_HTML_BYTES = 5 * 1024 * 1024;

/** Fetch timeout for landing-page peek (5 s). */
const FETCH_TIMEOUT_MS = 5_000;

/**
 * Handles FETCH_PAGE requests with same-origin restriction.
 * Only allows fetching URLs from the same origin as the sender's tab.
 * This prevents the extension from being used as an open proxy.
 */
async function handleFetchPage(
  url: string,
  senderTab: chrome.tabs.Tab | undefined,
): Promise<FetchPageResponse> {
  // Security: verify the request comes from our extension's content script
  if (!senderTab?.url) {
    return { success: false, error: 'No sender tab URL - request denied' };
  }

  try {
    // ── Scheme gate: only http(s) to non-internal hosts ───────────
    if (!isSafeHttpUrl(url)) {
      log.warn(`Blocked unsafe URL scheme or internal host: ${url}`);
      return { success: false, error: 'URL not allowed' };
    }

    const requestedUrl = new URL(url);
    const tabUrl = new URL(senderTab.url);

    // Only allow same-origin fetches
    if (requestedUrl.origin !== tabUrl.origin) {
      log.warn(`Blocked cross-origin fetch: ${requestedUrl.origin} from tab ${tabUrl.origin}`);
      return { success: false, error: 'Cross-origin fetch not allowed' };
    }

    // ── Timeout ───────────────────────────────────────────────────
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    // ── Size gate ─────────────────────────────────────────────────
    const cl = response.headers.get('content-length');
    if (cl && parseInt(cl, 10) > MAX_HTML_BYTES) {
      return { success: false, error: 'Response too large' };
    }

    const html = await response.text();
    if (html.length > MAX_HTML_BYTES) {
      return { success: false, error: 'Response too large' };
    }

    return { success: true, html };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error('Fetch failed:', message);
    return { success: false, error: message };
  }
}

/**
 * Sets up the chrome.runtime.onMessage listener for background script.
 */
export function setupMessageHandler(): void {
  chrome.runtime.onMessage.addListener(
    (message: ExtensionMessage, sender: chrome.runtime.MessageSender, sendResponse): boolean | undefined => {
      // Verify sender is our own extension
      if (sender.id !== chrome.runtime.id) {
        log.warn('Rejected message from unknown sender:', sender.id);
        return;
      }

      try {
        switch (message.type) {
          case 'PDF_DETECTED':
            log.debug('PDF detected:', message.url);
            if (sender.tab?.id) {
              chrome.action.setBadgeText({ text: '\u2713', tabId: sender.tab.id });
              chrome.action.setBadgeBackgroundColor({ color: '#667eea', tabId: sender.tab.id });
            }
            break;

          case 'PDF_LINK_CLICKED':
            log.debug('PDF link clicked:', message.url);
            break;

          case 'FETCH_PAGE':
            handleFetchPage(message.url, sender.tab)
              .then(sendResponse)
              .catch(err => sendResponse({ success: false, error: String(err) }));
            return true; // Keep channel open for async response

          default:
            break;
        }
      } catch (error) {
        log.error('Error handling message:', error);
      }
      return;
    },
  );
}
