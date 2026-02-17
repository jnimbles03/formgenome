import { SUCCESS_DISMISS_MS, ERROR_DISMISS_MS } from '../shared/constants';

/**
 * Shows a status message with spinner.
 */
export function showStatus(message: string): void {
  const el = document.getElementById('status');
  const text = document.getElementById('statusText');
  if (el) el.classList.remove('hidden');
  if (text) text.textContent = message;
  hideAll(['error', 'results', 'pdfList', 'singlePdf', 'noPdf']);
}

/**
 * Shows an error message that auto-dismisses.
 */
export function showError(message: string): void {
  const errorEl = document.getElementById('error');
  const errorText = document.getElementById('errorText');
  if (errorEl) {
    errorEl.classList.remove('hidden');
    errorEl.style.background = '';
    errorEl.style.borderColor = '';
  }
  if (errorText) {
    errorText.style.color = '';
    errorText.textContent = message;
  }

  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.classList.add('hidden');

  setTimeout(() => {
    if (errorEl) errorEl.classList.add('hidden');
  }, ERROR_DISMISS_MS);
}

/**
 * Shows a success message that auto-dismisses.
 */
export function showSuccess(message: string): void {
  const errorEl = document.getElementById('error');
  const errorText = document.getElementById('errorText');
  if (errorEl) {
    errorEl.classList.remove('hidden');
    errorEl.style.background = '#e8f5e9';
    errorEl.style.borderColor = '#a5d6a7';
  }
  if (errorText) {
    errorText.style.color = '#2e7d32';
    errorText.textContent = message;
  }

  setTimeout(() => {
    if (errorEl) {
      errorEl.classList.add('hidden');
      errorEl.style.background = '';
      errorEl.style.borderColor = '';
    }
    if (errorText) errorText.style.color = '';
  }, SUCCESS_DISMISS_MS);
}

/**
 * Shows the "no PDF found" state.
 */
export function showNoPdf(): void {
  const el = document.getElementById('noPdf');
  if (el) el.classList.remove('hidden');
  hideAll(['pdfList', 'singlePdf', 'status', 'error', 'results']);
}

/**
 * Hides a list of elements by ID.
 */
export function hideAll(ids: string[]): void {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
}
