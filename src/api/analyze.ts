import type { FormAnalysisResult } from '../types/analysis';
import { getConfig } from '../shared/config';
import { isSafeHttpUrl } from '../shared/url-validation';
import { ApiError } from '../shared/errors';
import { log } from '../shared/logger';
import { apiClient } from './client';

interface AnalyzeResponse {
  results?: FormAnalysisResult;
  ok?: boolean;
  error?: string;
}

/** Max PDF download size (50 MB). */
const MAX_PDF_BYTES = 50 * 1024 * 1024;

/** Download timeout (30 s). */
const DOWNLOAD_TIMEOUT_MS = 30_000;

/**
 * Extracts a filename from a URL path and sanitises it.
 */
function extractFilename(url: string): string {
  const raw = url.split('/').pop()?.split('?')[0] || 'document.pdf';
  // Strip path-traversal characters and non-ASCII
  return raw.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 255) || 'document.pdf';
}

/**
 * Analyzes a PDF by URL (server-side fetch) or by downloading and uploading the file.
 */
export async function analyzePdf(pdfUrl: string, asUrl = false): Promise<FormAnalysisResult> {
  // ── URL safety gate ─────────────────────────────────────────────
  if (!isSafeHttpUrl(pdfUrl)) {
    throw new ApiError(400, 'Invalid or blocked PDF URL');
  }

  const config = getConfig();
  const endpoint = config.analyzeEndpoint;

  log.debug(`Analyzing: ${pdfUrl} (${asUrl ? 'URL mode' : 'file mode'})`);

  if (asUrl) {
    // Server-side: send the URL for the backend to fetch
    const data = await apiClient.post<AnalyzeResponse>(endpoint, { url: pdfUrl });
    const result = data.results || (data as unknown as FormAnalysisResult);
    // The API may return an internal "error" field (e.g. "Deep analysis failed
    // completely") alongside valid data. Strip it so the extension doesn't
    // treat a partial-success as a failure.
    if (result.error && (result.confidence_tier || result.pages)) {
      delete result.error;
    }
    return result;
  }

  // ── Client-side: download the PDF then upload it ────────────────
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);

  const pdfResponse = await fetch(pdfUrl, { signal: controller.signal });
  clearTimeout(timer);

  if (!pdfResponse.ok) {
    throw new ApiError(pdfResponse.status, `Failed to download PDF: ${pdfResponse.statusText}`);
  }

  // Size gate (header check first, then actual blob)
  const cl = pdfResponse.headers.get('content-length');
  if (cl && parseInt(cl, 10) > MAX_PDF_BYTES) {
    throw new ApiError(413, 'PDF file too large');
  }

  const blob = await pdfResponse.blob();
  if (blob.size > MAX_PDF_BYTES) {
    throw new ApiError(413, 'PDF file too large');
  }

  const formData = new FormData();
  formData.append('file', blob, extractFilename(pdfUrl));
  formData.append('url', pdfUrl);

  const data = await apiClient.post<AnalyzeResponse>(endpoint, formData, true);
  const result = data.results || (data as unknown as FormAnalysisResult);
  if (result.error && (result.confidence_tier || result.pages)) {
    delete result.error;
  }
  return result;
}
