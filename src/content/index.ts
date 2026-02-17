import { isPdfPage, findPdfLinks } from './pdf-detector';
import { performDeepScan } from './deep-scan';
import { safeSendMessage } from './messaging';
import { setupDomObserver } from './observer';
import type { ScanResponse, DeepScanResponse } from '../types/messages';

// Version stamp — check console to confirm the latest content script is loaded
console.log('[Form Genome] Content script v2.1 loaded (context-aware names)');

/**
 * Content script entry point.
 * Detects PDFs on the current page and communicates with the popup/background.
 */
async function performInitialScan(): Promise<void> {
  if (isPdfPage()) {
    safeSendMessage({
      type: 'PDF_DETECTED',
      url: window.location.href,
      isPdfPage: true,
    });
  } else {
    const pdfLinks = await findPdfLinks();
    if (pdfLinks.length > 0) {
      safeSendMessage({
        type: 'PDF_LINKS_FOUND',
        pdfs: pdfLinks,
        pageUrl: window.location.href,
      });
    }
  }
}

// Perform initial scan when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { performInitialScan(); });
} else {
  performInitialScan();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, _sender, sendResponse): boolean | undefined => {
  if (request.type === 'SCAN_FOR_PDFS') {
    if (isPdfPage()) {
      sendResponse({
        isPdfPage: true,
        url: window.location.href,
      } satisfies ScanResponse);
      return;
    } else {
      findPdfLinks().then(pdfLinks => {
        sendResponse({
          isPdfPage: false,
          pdfs: pdfLinks,
          pageUrl: window.location.href,
        } satisfies ScanResponse);
      });
      return true; // Keep channel open for async response
    }
  } else if (request.type === 'START_DEEP_SCAN') {
    performDeepScan().then(deepPdfs => {
      sendResponse({
        success: true,
        pdfs: deepPdfs,
      } satisfies DeepScanResponse);
    });
    return true;
  }
  return;
});

// Watch for dynamically added PDF links
setupDomObserver();
