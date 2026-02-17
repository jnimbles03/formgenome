import { findPdfLinks } from './pdf-detector';
import { safeSendMessage } from './messaging';

let lastPdfCount = 0;
let scanDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Sets up a MutationObserver to detect dynamically added PDF links.
 * Uses debouncing to prevent network storms during rapid DOM changes.
 */
export function setupDomObserver(): void {
  const observer = new MutationObserver(() => {
    if (scanDebounceTimer) {
      clearTimeout(scanDebounceTimer);
    }

    scanDebounceTimer = setTimeout(async () => {
      const currentPdfs = await findPdfLinks();
      if (currentPdfs.length !== lastPdfCount) {
        lastPdfCount = currentPdfs.length;
        safeSendMessage({
          type: 'PDF_LINKS_UPDATED',
          pdfs: currentPdfs,
          pageUrl: window.location.href,
        });
      }
    }, 500);
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
}
