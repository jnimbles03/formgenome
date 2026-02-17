import type { PdfLink } from '../types/pdf';
import type { CachedAnalysis } from '../types/analysis';
import type { SmartFilterResult } from '../shared/smart-filter';
import { CACHE_TTL_MS } from '../shared/constants';
import { smartFilterPdfs } from '../shared/smart-filter';

interface PdfListState {
  currentPdfs: PdfLink[];
  analysisCache: Map<string, CachedAnalysis>;
  onViewResults: (url: string) => void;
  onPeekAnalyze: (url: string) => void;
}

/**
 * Renders the PDF list using safe DOM construction.
 * Replaces the old innerHTML-based rendering to prevent XSS.
 */
export function renderPdfList(state: PdfListState): void {
  const container = document.getElementById('pdfItems');
  if (!container) return;

  container.innerHTML = '';

  state.currentPdfs.forEach((pdf, index) => {
    const cacheKey = findCacheKey(pdf.url, state.analysisCache);
    const cached = cacheKey ? state.analysisCache.get(cacheKey) : undefined;

    const cacheAge = cached?._cached_at ? Date.now() - cached._cached_at : Infinity;
    const cacheExpired = cacheAge > CACHE_TTL_MS;
    const isAnalyzed = !!cached && !cacheExpired;
    const hasError = !!cached?.error;

    const item = document.createElement('div');
    item.className = 'pdf-item';

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `pdf_${index}`;
    checkbox.dataset.url = pdf.url;
    checkbox.dataset.action = pdf.action;
    if (!isAnalyzed) checkbox.checked = true;
    checkbox.addEventListener('change', updateSelectAllState);
    item.appendChild(checkbox);

    // Info container
    const infoDiv = document.createElement('div');
    infoDiv.className = 'pdf-item-info';

    // Name with link (safe: using textContent and DOM properties)
    const nameDiv = document.createElement('div');
    nameDiv.className = 'pdf-item-name';

    const link = document.createElement('a');
    link.href = pdf.url;
    link.target = '_blank';
    link.className = 'form-link';
    link.title = 'Open form in new tab';
    link.textContent = pdf.text;
    nameDiv.appendChild(link);

    // Badges (safe: using textContent)
    if (pdf.language_count > 1) {
      const langBadge = document.createElement('span');
      langBadge.className = 'lang-badge';
      langBadge.title = `${pdf.language_count} language versions`;
      langBadge.textContent = `+${pdf.language_count - 1} Langs`;
      nameDiv.appendChild(langBadge);
    }

    if (pdf.action === 'navigate') {
      const warnBadge = document.createElement('span');
      warnBadge.className = 'lang-badge warning';
      warnBadge.title = 'URL is broken or blocked. Click the form link on the page first.';
      warnBadge.textContent = 'Click to Open';
      nameDiv.appendChild(warnBadge);
    } else if (pdf.action === 'peek') {
      const peekBadge = document.createElement('span');
      peekBadge.className = 'lang-badge implicit';
      peekBadge.title = 'This is a landing page. Click to peek for PDF.';
      peekBadge.textContent = 'Landing Page';
      nameDiv.appendChild(peekBadge);
    }

    if (pdf.badge_type === 'deep-scan') {
      const deepBadge = document.createElement('span');
      deepBadge.className = 'lang-badge deep-scan';
      deepBadge.title = 'Found on neighboring page';
      deepBadge.textContent = 'Neighbor Page';
      nameDiv.appendChild(deepBadge);
    }

    infoDiv.appendChild(nameDiv);

    // Entity (if cached)
    if (cached?.entity) {
      const entityDiv = document.createElement('div');
      entityDiv.className = 'pdf-item-entity';
      entityDiv.textContent = cached.entity;
      infoDiv.appendChild(entityDiv);
    }

    // Status
    const statusDiv = document.createElement('div');
    statusDiv.className = `pdf-item-status ${isAnalyzed ? 'analyzed' : ''} ${hasError ? 'error' : ''}`;
    if (isAnalyzed) {
      statusDiv.textContent = hasError
        ? `\u2717 ${cached?.error?.substring(0, 60) || 'Error'}`
        : `\u2713 Analyzed (${cached?.confidence_tier || 'Ready'})`;
    } else {
      statusDiv.textContent = 'Not analyzed';
    }
    infoDiv.appendChild(statusDiv);
    item.appendChild(infoDiv);

    // Action button
    if (isAnalyzed && !hasError) {
      const viewBtn = document.createElement('button');
      viewBtn.className = 'btn-view-results';
      viewBtn.textContent = 'View';
      viewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        state.onViewResults(pdf.url);
      });
      item.appendChild(viewBtn);
    } else if (pdf.action === 'navigate') {
      const navBtn = document.createElement('button');
      navBtn.className = 'btn-view-results warning';
      navBtn.disabled = true;
      navBtn.title = 'Click the form link on the page first';
      navBtn.textContent = 'Click Form Link';
      item.appendChild(navBtn);
    } else if (pdf.action === 'peek') {
      const peekBtn = document.createElement('button');
      peekBtn.className = 'btn-view-results peek';
      peekBtn.textContent = 'Peek & Analyze';
      peekBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Disable immediately to prevent duplicate peek requests
        peekBtn.disabled = true;
        peekBtn.textContent = 'Peeking...';
        state.onPeekAnalyze(pdf.url);
      });
      item.appendChild(peekBtn);
    }

    container.appendChild(item);
  });

  updateSelectAllState();
  updateSelectedCount();
}

/**
 * Finds a cache key for a URL in the cache map.
 * The key format is analysis_${hash}.
 */
function findCacheKey(url: string, cache: Map<string, CachedAnalysis>): string | undefined {
  // Since we use async hashing, the popup pre-loads the cache map.
  // We search for any key whose stored data matches the URL.
  for (const [key, value] of cache) {
    if (value.source_url === url || value.pdf_url === url || value.original_url === url) {
      return key;
    }
  }
  // Debug: log when lookup fails but cache is non-empty
  if (cache.size > 0) {
    const first = cache.entries().next().value;
    if (first) {
      console.log(`[FG] findCacheKey MISS for: ${url.substring(0, 80)}`);
      console.log(`[FG]   Cache has ${cache.size} entries. First entry source_url: ${first[1].source_url}, pdf_url: ${first[1].pdf_url}`);
    }
  }
  return undefined;
}

export function updateSelectAllState(): void {
  const checkboxes = document.querySelectorAll<HTMLInputElement>('.pdf-item input[type="checkbox"]');
  const selectAllCheckbox = document.getElementById('selectAll') as HTMLInputElement | null;
  if (!selectAllCheckbox) return;

  const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
  selectAllCheckbox.checked = checkedCount === checkboxes.length;
  selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;

  updateSelectedCount();
}

export function updateSelectedCount(): void {
  const checkboxes = document.querySelectorAll<HTMLInputElement>('.pdf-item input[type="checkbox"]');
  const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;

  const selectedEl = document.getElementById('selectedCount');
  const totalEl = document.getElementById('totalCount');
  if (selectedEl) selectedEl.textContent = String(checkedCount);
  if (totalEl) totalEl.textContent = String(checkboxes.length);
}

export function handleSelectAll(event: Event): void {
  const target = event.target as HTMLInputElement;
  const checkboxes = document.querySelectorAll<HTMLInputElement>('.pdf-item input[type="checkbox"]');
  checkboxes.forEach(cb => {
    cb.checked = target.checked;
  });
  updateSelectedCount();
}

/**
 * Applies the smart filter heuristic to checkbox selection.
 * Deselects informational / marketing PDFs and keeps actionable forms.
 * Already-analyzed PDFs are left untouched.
 */
export function applySmartFilter(
  currentPdfs: PdfLink[],
  analysisCache: Map<string, CachedAnalysis>,
): SmartFilterResult {
  // Determine which indices are already analyzed
  const analyzedIndices = new Set<number>();
  currentPdfs.forEach((pdf, index) => {
    const key = findCacheKey(pdf.url, analysisCache);
    if (key) {
      const cached = analysisCache.get(key);
      const cacheAge = cached?._cached_at ? Date.now() - cached._cached_at : Infinity;
      if (cacheAge <= CACHE_TTL_MS) {
        analyzedIndices.add(index);
      }
    }
  });

  const result = smartFilterPdfs(currentPdfs, analyzedIndices);

  // Apply decisions to checkboxes and add visual feedback
  const pdfItems = document.querySelectorAll<HTMLElement>('.pdf-item');
  pdfItems.forEach((item, index) => {
    // Skip already-analyzed items (don't change their state)
    if (analyzedIndices.has(index)) return;

    const cb = item.querySelector<HTMLInputElement>('input[type="checkbox"]');
    const shouldKeep = result.decisions.get(index);
    if (cb && shouldKeep !== undefined) {
      cb.checked = shouldKeep;

      // Visual flash on deselected items so user can see what changed
      if (!shouldKeep) {
        item.classList.add('filtered-out');
        // Remove class after animation so it doesn't persist on re-renders
        setTimeout(() => item.classList.remove('filtered-out'), 3000);
      }
    }
  });

  updateSelectAllState();
  return result;
}
