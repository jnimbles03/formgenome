import type { PdfLink, PdfValidationResult } from '../types/pdf';

// Cache for validation results to prevent network storms
const validationCache = new Map<string, Promise<PdfValidationResult>>();

/**
 * Generic link-text patterns that don't describe the actual form.
 * When these match, we prefer context from the parent element or the
 * decoded filename from the URL instead.
 */
const GENERIC_LINK_TEXT = /^(print\s*\(pdf\)|pdf|download(\s+pdf)?|click\s+here|view|open|link|document|file|get\s+form|save|attachment)$/i;

/** Returns true when a decoded filename is just a number/code, not a real name. */
const NUMERIC_FILENAME = /^[P\s\-]*\d[\d\s\-.]*$/i;

/**
 * Checks if the current page is a PDF.
 */
export function isPdfPage(): boolean {
  const url = window.location.href;
  return (
    url.endsWith('.pdf') ||
    url.includes('.pdf?') ||
    url.includes('type=application/pdf') ||
    document.contentType === 'application/pdf'
  );
}

/**
 * Validates a URL's accessibility and type via HEAD request.
 */
async function validatePdfUrl(url: string): Promise<PdfValidationResult> {
  const cached = validationCache.get(url);
  if (cached) return cached;

  const promise = (async (): Promise<PdfValidationResult> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        mode: 'no-cors',
      });

      clearTimeout(timeoutId);

      return {
        accessible: response.ok || response.type === 'opaque',
        contentType: response.headers.get('Content-Type'),
        status: response.status,
      };
    } catch (error) {
      return {
        accessible: false,
        contentType: null,
        status: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  })();

  validationCache.set(url, promise);
  return promise;
}

/**
 * Extracts a descriptive form name from the parent / ancestor of a link.
 *
 * Many sites place the form title as plain text in the same container
 * (e.g. `<p>Form Name<br><a>Print (PDF)</a></p>`).  We walk up the DOM
 * a few levels and grab the first meaningful text node.
 */
function extractContextName(anchor: HTMLAnchorElement): string {
  // Walk up at most 3 levels looking for a block-level parent with text
  let el: HTMLElement | null = anchor.parentElement;
  for (let depth = 0; el && depth < 3; depth++, el = el.parentElement) {
    // Collect only direct text nodes (not nested anchor text)
    const textParts: string[] = [];
    el.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent?.trim();
        if (t) textParts.push(t);
      }
    });

    // Join text parts, strip connectors like "or", "and", "|"
    const raw = textParts
      .join(' ')
      .replace(/\b(or|and|\|)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Accept if it's at least 4 chars and not purely generic
    if (raw.length >= 4 && !GENERIC_LINK_TEXT.test(raw)) {
      // Truncate to a reasonable display length
      return raw.length > 80 ? raw.substring(0, 77) + '...' : raw;
    }
  }
  return '';
}

/**
 * Finds all PDF links on a page, groups by language, and validates accessibility.
 */
export async function findPdfLinks(rootElement: Document | HTMLElement = document): Promise<PdfLink[]> {
  const links = rootElement.querySelectorAll('a[href]');
  const pdfMap = new Map<string, PdfLink>();

  const formKeywords = [
    '/form/', '/forms/', '/resource/', '/document/', 'form-', '-form',
    'application', 'authorization', 'instructions', 'permit',
    'request', 'guide', 'manual', 'checklist', 'agreement',
    'contract', 'report', 'survey', 'plan', 'packet',
  ];
  const excludeKeywords = ['.html', '.php', '.aspx', '.jsp', '#', 'javascript:'];

  const langRegex = /[-_](es|sp|vie|chi|rus|zho|kor|tag|hmn)[-_.]|\((Spanish|Español|Vietnamese|Chinese|Russian|Korean|Tagalog)\)/i;

  links.forEach(link => {
    const anchor = link as HTMLAnchorElement;
    const href = anchor.href.toLowerCase();
    const text = anchor.textContent?.trim() || '';

    const isDirectPdf = href.endsWith('.pdf') || href.includes('.pdf?');
    const hasFormKeyword = formKeywords.some(kw => href.includes(kw) || text.toLowerCase().includes(kw));
    const isExcluded = excludeKeywords.some(kw => href.includes(kw)) && !isDirectPdf;

    if (!href || (!isDirectPdf && (!hasFormKeyword || isExcluded))) return;

    const urlParts = anchor.href.split('/');
    const rawFilename = (urlParts[urlParts.length - 1] ?? '').split('?')[0] || 'Implicit Form';

    // Decode percent-encoded filenames and humanize them:
    // "Application-for-Benefits_v2.pdf" → "Application for Benefits v2"
    const decodedFilename = decodeURIComponent(rawFilename)
      .replace(/\.pdf$/i, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Use the link text UNLESS it's generic (e.g. "Print (PDF)", "Download", "Click here")
    const isGenericText = !text || GENERIC_LINK_TEXT.test(text);
    // If the decoded filename is just a number (e.g. "6715"), try parent context first
    const isNumericFilename = NUMERIC_FILENAME.test(decodedFilename);
    let displayText: string;
    if (!isGenericText) {
      displayText = text;
    } else if (!isNumericFilename && decodedFilename) {
      // Filename is descriptive (e.g. "BECU Close Personal Accounts") — use it
      displayText = decodedFilename;
    } else {
      // Both link text and filename are useless — try extracting from page context
      const contextName = extractContextName(anchor);
      displayText = contextName || decodedFilename || rawFilename;
    }

    const isNonEnglish = langRegex.test(rawFilename) || langRegex.test(text);
    const baseName = rawFilename.replace(langRegex, '').replace(/[-_]\.pdf$/i, '.pdf');
    const groupKey = baseName.replace(/\.pdf$/i, '').toLowerCase().trim() || text.toLowerCase().trim();

    if (!pdfMap.has(groupKey)) {
      pdfMap.set(groupKey, {
        url: anchor.href,
        filename: rawFilename,
        text: displayText,
        language_count: 1,
        is_english: !isNonEnglish,
        is_implicit: !isDirectPdf,
        variations: [rawFilename],
        action: 'unknown',
      });
    } else {
      const entry = pdfMap.get(groupKey)!;
      entry.language_count += 1;
      if (!entry.variations.includes(rawFilename)) {
        entry.variations.push(rawFilename);
      }
      if (!entry.is_english && !isNonEnglish) {
        entry.url = anchor.href;
        entry.filename = rawFilename;
        entry.text = displayText;
        entry.is_english = true;
        entry.is_implicit = !isDirectPdf;
      }
    }
  });

  // Validate URLs for implicit forms
  const pdfs = Array.from(pdfMap.values());
  const validated = await Promise.all(
    pdfs.map(async (pdf) => {
      if (pdf.is_implicit) {
        const validation = await validatePdfUrl(pdf.url);
        if (!validation.accessible) {
          pdf.action = 'navigate';
          pdf.badge_type = 'warning';
        } else if (validation.contentType?.includes('pdf')) {
          pdf.action = 'analyze';
          pdf.is_implicit = false;
          pdf.badge_type = 'success';
        } else {
          pdf.action = 'peek';
          pdf.badge_type = 'info';
        }
      } else {
        pdf.action = 'analyze';
        pdf.badge_type = 'success';
      }
      return pdf;
    }),
  );

  return validated;
}
