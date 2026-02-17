import type { PdfLink } from '../types/pdf';
import { findPdfLinks } from './pdf-detector';
import { log } from '../shared/logger';

/**
 * Finds pagination links on the current page.
 */
function findPaginationLinks(): string[] {
  const urls = new Set<string>();
  const links = document.querySelectorAll('a[href]');

  links.forEach(link => {
    const anchor = link as HTMLAnchorElement;
    const text = (anchor.textContent?.trim() || '').toLowerCase();
    const rel = (anchor.getAttribute('rel') || '').toLowerCase();

    if (rel === 'next' || rel === 'prev') {
      urls.add(anchor.href);
    } else if (['next', 'previous', 'next page', 'previous page', '>', '<'].includes(text)) {
      urls.add(anchor.href);
    } else if (/^\d+$/.test(text) && anchor.href.includes('page')) {
      urls.add(anchor.href);
    }
  });

  // Limit to prevent crawling
  return Array.from(urls).slice(0, 3);
}

/**
 * Performs a deep scan of neighboring pages to find additional PDFs.
 * Uses background script for fetching (with same-origin restriction).
 */
export async function performDeepScan(): Promise<PdfLink[]> {
  const targetUrls = findPaginationLinks();
  let allPdfs: PdfLink[] = [];

  for (const url of targetUrls) {
    try {
      const response = await new Promise<{ success: boolean; html?: string }>((resolve) => {
        chrome.runtime.sendMessage({ type: 'FETCH_PAGE', url }, resolve);
      });

      if (response?.success && response.html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(response.html, 'text/html');

        // Set base URI for relative link resolution
        const base = doc.createElement('base');
        base.href = url;
        doc.head.appendChild(base);

        const pdfs = await findPdfLinks(doc);
        pdfs.forEach(p => {
          p.source_page = 'Neighbor';
          p.badge_type = 'deep-scan';
        });

        allPdfs = [...allPdfs, ...pdfs];
      }
    } catch (error) {
      log.error(`Deep scan error for ${url}:`, error);
    }
  }

  return allPdfs;
}
