import { log } from './logger';

/**
 * Downloads content by creating a temporary anchor element.
 * Works around chrome.downloads issues in extension popups.
 */
export function downloadViaAnchor(content: string, mimeType: string, filename: string): void {
  const blob = new Blob([content], { type: mimeType });

  if (blob.size === 0) {
    log.error('Download failed: generated file is empty');
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 10000);
  log.info(`Download initiated: ${filename} (${blob.size} bytes)`);
}
