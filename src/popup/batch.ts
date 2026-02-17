import type { PdfLink } from '../types/pdf';
import type { CachedAnalysis } from '../types/analysis';
import { analyzePdf } from '../api/analyze';
import { cacheKeyForUrl } from '../shared/hash';
import { ANALYSIS_BATCH_SIZE } from '../shared/constants';
import { log } from '../shared/logger';
import { showError, showSuccess } from './ui';

interface BatchState {
  currentPdfs: PdfLink[];
  analysisCache: Map<string, CachedAnalysis>;
  onCacheUpdate: (key: string, result: CachedAnalysis) => Promise<void>;
  onRenderList: () => void;
}

/**
 * Handles batch analysis of selected PDFs.
 */
export async function handleBatchAnalysis(state: BatchState): Promise<void> {
  const checkboxes = document.querySelectorAll<HTMLInputElement>(
    '.pdf-item input[type="checkbox"]:checked',
  );
  const selectedPdfs = Array.from(checkboxes).map(cb => {
    const index = parseInt(cb.id.split('_')[1] ?? '0', 10);
    return {
      url: cb.dataset.url || '',
      action: cb.dataset.action || 'analyze',
      pdf: state.currentPdfs[index]!,
    };
  });

  if (selectedPdfs.length === 0) {
    showError('Please select at least one PDF to analyze');
    return;
  }

  // Filter out forms that require navigation
  const navigateForms = selectedPdfs.filter(p => p.action === 'navigate');
  if (navigateForms.length > 0) {
    showError(`${navigateForms.length} form(s) require you to click the link on the page first. Skipping those.`);
  }

  const analyzablePdfs = selectedPdfs.filter(p => p.action !== 'navigate');
  if (analyzablePdfs.length === 0) {
    showError('No analyzable forms selected. Please click the form links on the page first.');
    return;
  }

  const batchStatusEl = document.getElementById('batchStatus');
  const analyzeBtn = document.getElementById('analyzeBatch') as HTMLButtonElement | null;
  if (batchStatusEl) batchStatusEl.classList.remove('hidden');
  if (analyzeBtn) analyzeBtn.disabled = true;

  let completed = 0;
  let succeeded = 0;
  let lastError = '';
  const total = analyzablePdfs.length;

  async function processItem(item: typeof analyzablePdfs[0]): Promise<void> {
    const { pdf } = item;
    try {
      console.log(`[FG] Sending to API: ${pdf.url}`);
      const result = await analyzePdf(pdf.url, true);
      console.log(`[FG] API returned:`, JSON.stringify(result).substring(0, 200));
      const cacheKey = await cacheKeyForUrl(pdf.url);
      const cachedResult = {
        ...result,
        _cached_at: Date.now(),
        _synced: false,
        source_url: pdf.url,
        pdf_url: pdf.url,
      } as CachedAnalysis;
      console.log(`[FG] Cached under key=${cacheKey}, source_url=${cachedResult.source_url}`);
      await state.onCacheUpdate(cacheKey, cachedResult);
      succeeded++;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      lastError = errMsg;
      console.error(`[FG] Analysis FAILED for ${pdf.url}: ${errMsg}`);
      const cacheKey = await cacheKeyForUrl(pdf.url);
      const errorResult = {
        error: errMsg,
        _cached_at: Date.now(),
        _synced: false,
        source_url: pdf.url,
        pdf_url: pdf.url,
      } as CachedAnalysis;
      state.analysisCache.set(cacheKey, errorResult);
    } finally {
      completed++;
      updateBatchProgress(completed, total, pdf.url);
      state.onRenderList();
    }
  }

  // Process in chunks for parallelism
  for (let i = 0; i < analyzablePdfs.length; i += ANALYSIS_BATCH_SIZE) {
    const chunk = analyzablePdfs.slice(i, i + ANALYSIS_BATCH_SIZE);
    await Promise.all(chunk.map(item => processItem(item)));
  }

  if (batchStatusEl) batchStatusEl.classList.add('hidden');
  if (analyzeBtn) analyzeBtn.disabled = false;

  const failed = completed - succeeded;
  if (failed > 0) {
    showError(`${succeeded}/${completed} succeeded, ${failed} failed: ${lastError}`);
  } else {
    showSuccess(`Analyzed ${completed} items successfully!`);
  }
}

function updateBatchProgress(completed: number, total: number, currentUrl: string): void {
  const filename = currentUrl.split('/').pop()?.split('?')[0] || 'document.pdf';
  const textEl = document.getElementById('batchStatusText');
  const fillEl = document.getElementById('progressFill');

  if (textEl) {
    textEl.textContent = `Analyzing ${Math.min(completed + 1, total)} of ${total}: ${filename}`;
  }
  if (fillEl) {
    fillEl.style.width = `${(completed / total) * 100}%`;
  }
}

/**
 * Handles deep scan to find PDFs on neighboring pages.
 */
export async function handleDeepScan(
  currentPdfs: PdfLink[],
  onRenderList: () => void,
): Promise<PdfLink[]> {
  const deepScanBtn = document.getElementById('deepScan') as HTMLButtonElement | null;
  if (deepScanBtn) {
    deepScanBtn.disabled = true;
    deepScanBtn.textContent = 'Scanning Neighbors...';
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    showError('No active tab found');
    if (deepScanBtn) {
      deepScanBtn.disabled = false;
      deepScanBtn.textContent = 'Deep Scan';
    }
    return currentPdfs;
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'START_DEEP_SCAN' });

    if (response?.success && response.pdfs) {
      const existingUrls = new Set(currentPdfs.map(p => p.url));
      let addedCount = 0;

      for (const pdf of response.pdfs) {
        if (!existingUrls.has(pdf.url)) {
          currentPdfs.push(pdf);
          addedCount++;
        }
      }

      if (addedCount > 0) {
        showSuccess(`Deep Scan found ${addedCount} new forms!`);
        onRenderList();
      } else {
        showSuccess('Deep Scan complete. No new unique forms found.');
      }
    } else {
      showError('Deep Scan failed or found no pagination links.');
    }
  } catch (error) {
    log.error('Deep scan error:', error);
    showError('Deep Scan error: ' + (error instanceof Error ? error.message : 'Unknown'));
  } finally {
    if (deepScanBtn) {
      deepScanBtn.disabled = false;
      deepScanBtn.textContent = 'Deep Scan';
    }
  }

  return currentPdfs;
}
