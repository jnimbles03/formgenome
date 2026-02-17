import type { CachedAnalysis } from '../types/analysis';
import type { PdfLink } from '../types/pdf';
import { initConfig, setApiMode, getConfig } from '../shared/config';
import { cacheKeyForUrl } from '../shared/hash';
import { isSafeHttpUrl } from '../shared/url-validation';
import { log } from '../shared/logger';
import { analyzePdf } from '../api/analyze';
import { getUpdateInfo } from '../storage/preferences';
import { getAllCachedAnalyses, clearAnalysisCache, setCachedAnalysis } from '../storage/analysis-cache';
import { showStatus, showError, showSuccess, showNoPdf, hideAll } from './ui';
import { renderPdfList, handleSelectAll, updateSelectAllState, updateSelectedCount, applySmartFilter } from './pdf-list';
import { displayResults } from './results';
import { handleBatchAnalysis, handleDeepScan } from './batch';
import { generateBatchReport, generateCSVReport } from './report-generator';

// Module-scoped state (not global)
let currentPdfs: PdfLink[] = [];
const analysisCache = new Map<string, CachedAnalysis>();

/**
 * Scans for PDFs with retry mechanism.
 */
async function scanForPdfs(tabId: number, retries = 3, delay = 100): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { type: 'SCAN_FOR_PDFS' });

      if (response?.isPdfPage) {
        showSinglePdfMode(response.url);
        return;
      } else if (response?.pdfs?.length > 0) {
        showPdfListMode(response.pdfs);
        return;
      } else {
        showNoPdf();
        return;
      }
    } catch {
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      } else {
        showNoPdf();
      }
    }
  }
}

function showSinglePdfMode(url: string): void {
  const el = document.getElementById('singlePdf');
  const titleEl = document.getElementById('currentPdfTitle');
  if (el) el.classList.remove('hidden');

  // Extract and humanize the filename from the URL
  const rawName = url.split('/').pop()?.split('?')[0] || '';
  const decoded = decodeURIComponent(rawName)
    .replace(/\.pdf$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (titleEl) titleEl.textContent = decoded || 'document.pdf';

  hideAll(['pdfList', 'noPdf', 'status', 'error']);

  // Check for cached analysis
  for (const [, cached] of analysisCache) {
    if (cached.source_url === url || cached.pdf_url === url) {
      displayResults(cached);
      break;
    }
  }
}

function showPdfListMode(pdfs: PdfLink[]): void {
  currentPdfs = pdfs;
  const el = document.getElementById('pdfList');
  if (el) el.classList.remove('hidden');
  hideAll(['singlePdf', 'noPdf', 'status', 'error', 'results']);
  doRenderPdfList();
}

function doRenderPdfList(): void {
  renderPdfList({
    currentPdfs,
    analysisCache,
    onViewResults: (url: string) => {
      for (const [, cached] of analysisCache) {
        if (cached.source_url === url || cached.pdf_url === url || cached.original_url === url) {
          displayResults(cached);
          return;
        }
      }
    },
    onPeekAnalyze: (url: string) => {
      handleSingleAnalysisFromUrl(url);
    },
  });
}

async function handleSingleAnalysisFromUrl(url: string): Promise<void> {
  showStatus('Peeking at landing page...');
  try {
    const response = await chrome.runtime.sendMessage({ type: 'FETCH_PAGE', url });

    if (!response?.success) {
      return await handleSingleAnalysisFromUrlFallback(url);
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(response.html, 'text/html');

    // Find PDF link in the page
    let pdfUrl: string | null = null;

    /**
     * Helper: accept a candidate URL only when it is a safe http(s)
     * URL that looks like a PDF link.
     */
    const isPdfCandidate = (candidate: string): boolean => {
      const lc = candidate.toLowerCase();
      return (
        isSafeHttpUrl(candidate) &&
        (lc.endsWith('.pdf') || lc.includes('.pdf?'))
      );
    };

    // Strategy A: Direct links
    const links = Array.from(doc.querySelectorAll('a[href]'));
    for (const link of links) {
      try {
        const absoluteUrl = new URL(link.getAttribute('href') || '', url).href;
        if (isPdfCandidate(absoluteUrl)) {
          pdfUrl = absoluteUrl;
          break;
        }
      } catch { /* invalid URL */ }
    }

    // Strategy B: Iframes
    if (!pdfUrl) {
      const iframes = Array.from(doc.querySelectorAll('iframe[src]'));
      for (const iframe of iframes) {
        try {
          const absoluteUrl = new URL(iframe.getAttribute('src') || '', url).href;
          if (isPdfCandidate(absoluteUrl)) {
            pdfUrl = absoluteUrl;
            break;
          }
        } catch { /* invalid URL */ }
      }
    }

    // Strategy C: Regex in raw HTML (already restricted to https?://)
    if (!pdfUrl) {
      const regex = /["'](https?:\/\/[^"']+\.pdf(?:\?[^"']+)?)["']/i;
      const match = response.html.match(regex);
      if (match?.[1] && isSafeHttpUrl(match[1])) pdfUrl = match[1];
    }

    if (!pdfUrl) throw new Error('No hidden PDF link found on this page.');

    showStatus(`Found PDF. Analyzing...`);

    // URL mode: server fetches the PDF directly
    const result = await analyzePdf(pdfUrl, true);
    const cacheKey = await cacheKeyForUrl(url);
    const cachedResult = {
      ...result,
      _cached_at: Date.now(),
      _synced: false,
      was_peeked: true,
      original_url: url,
      source_url: url,
      pdf_url: pdfUrl,
    } as CachedAnalysis;

    analysisCache.set(cacheKey, cachedResult);
    await chrome.storage.local.set({ [cacheKey]: cachedResult });
    displayResults(cachedResult);
  } catch (error) {
    log.error('Peek failed:', error);
    showError(error instanceof Error ? error.message : 'Failed to peek at landing page');
  }
}

async function handleSingleAnalysisFromUrlFallback(url: string): Promise<void> {
  try {
    const result = await analyzePdf(url, true);
    const cacheKey = await cacheKeyForUrl(url);
    const cachedResult = {
      ...result,
      _cached_at: Date.now(),
      _synced: false,
      source_url: url,
      pdf_url: url,
    } as CachedAnalysis;
    analysisCache.set(cacheKey, cachedResult);
    await chrome.storage.local.set({ [cacheKey]: cachedResult });
    displayResults(cachedResult);
  } catch (error) {
    showError(error instanceof Error ? error.message : 'Analysis failed');
  }
}

async function handleSingleAnalysis(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;

  showStatus('Analyzing PDF...');
  try {
    // URL mode: server fetches the PDF directly — faster and avoids cross-origin blocks
    const result = await analyzePdf(tab.url, true);
    const cacheKey = await cacheKeyForUrl(tab.url);
    const cachedResult = {
      ...result,
      _cached_at: Date.now(),
      _synced: false,
      source_url: tab.url,
      pdf_url: tab.url,
    } as CachedAnalysis;
    analysisCache.set(cacheKey, cachedResult);
    await chrome.storage.local.set({ [cacheKey]: cachedResult });
    displayResults(cachedResult);
  } catch (error) {
    showError(error instanceof Error ? error.message : 'Failed to analyze PDF');
  }
}

async function handleClearCache(): Promise<void> {
  if (!confirm('Clear all cached analysis results? You will need to re-analyze PDFs.')) return;

  const count = await clearAnalysisCache();
  analysisCache.clear();
  doRenderPdfList();
  showSuccess(`Cleared ${count} cached analyses.`);
}

function hashLookup(url: string): string | undefined {
  for (const [key, value] of analysisCache) {
    if (value.source_url === url || value.pdf_url === url || value.original_url === url) {
      return key;
    }
  }
  return undefined;
}

// Entry point
document.addEventListener('DOMContentLoaded', async () => {
  const config = await initConfig();

  // Load analysis cache
  const cachedData = await getAllCachedAnalyses();
  for (const [key, value] of cachedData) {
    analysisCache.set(key, value);
  }

  // Get current tab and scan
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) await scanForPdfs(tab.id);

  // Set up event listeners (each registered ONCE - fixes duplicate listener bug)
  document.getElementById('selectAll')?.addEventListener('change', handleSelectAll);
  document.getElementById('analyzeBatch')?.addEventListener('click', () => {
    handleBatchAnalysis({
      currentPdfs,
      analysisCache,
      onCacheUpdate: async (key, result) => {
        analysisCache.set(key, result);
        await chrome.storage.local.set({ [key]: result });
      },
      onRenderList: doRenderPdfList,
    });
  });
  document.getElementById('deepScan')?.addEventListener('click', async () => {
    currentPdfs = await handleDeepScan(currentPdfs, doRenderPdfList);
  });
  document.getElementById('analyzeSingle')?.addEventListener('click', handleSingleAnalysis);
  document.getElementById('smartFilter')?.addEventListener('click', () => {
    log.info(`Smart filter: ${currentPdfs.length} PDFs to evaluate`);
    const result = applySmartFilter(currentPdfs, analysisCache);
    log.info(`Smart filter result: kept ${result.kept}, skipped ${result.removed}`);
    showSuccess(`Smart filter: kept ${result.kept}, skipped ${result.removed}`);
  });
  document.getElementById('clearCache')?.addEventListener('click', handleClearCache);
  document.getElementById('generateReport')?.addEventListener('click', () => {
    generateBatchReport(analysisCache, currentPdfs, hashLookup);
  });
  document.getElementById('generateCSV')?.addEventListener('click', () => {
    generateCSVReport(analysisCache, currentPdfs, hashLookup);
  });
  document.getElementById('openDashboard')?.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
  });
  document.getElementById('openTeamDashboard')?.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/team-dashboard.html') });
  });

  // API toggle
  const btnToggle = document.getElementById('toggleApi');
  if (btnToggle) {
    const localWarning = document.getElementById('localWarning');
    if (config.isLocal) {
      btnToggle.textContent = 'Local';
      btnToggle.classList.add('local-mode');
      localWarning?.classList.remove('hidden');
    } else {
      btnToggle.textContent = 'Cloud';
      btnToggle.classList.remove('local-mode');
      localWarning?.classList.add('hidden');
    }

    btnToggle.addEventListener('click', async () => {
      const currentConfig = getConfig();
      const newMode = currentConfig.isLocal ? 'cloud' : 'local';
      setApiMode(newMode);
      await chrome.storage.local.set({ apiPreference: newMode });

      if (newMode === 'local') {
        btnToggle.textContent = 'Local';
        btnToggle.classList.add('local-mode');
        localWarning?.classList.remove('hidden');
      } else {
        btnToggle.textContent = 'Cloud';
        btnToggle.classList.remove('local-mode');
        localWarning?.classList.add('hidden');
      }

      showSuccess(`Switched to ${newMode === 'local' ? 'Local' : 'Cloud'} API`);
    });
  }

  // Check for update notification
  const updateInfo = await getUpdateInfo();
  if (updateInfo) {
    const notifyEl = document.getElementById('updateNotification');
    const versionEl = document.getElementById('newVersion');
    const linkEl = document.getElementById('updateLink') as HTMLAnchorElement | null;

    if (versionEl) versionEl.textContent = updateInfo.version;
    if (linkEl) linkEl.href = updateInfo.url;
    notifyEl?.classList.remove('hidden');
  }
});
