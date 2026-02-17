import type { PdfLink } from './pdf';

/** All message types sent through chrome.runtime messaging */
export type ExtensionMessage =
  | { type: 'PDF_DETECTED'; url: string; isPdfPage: true }
  | { type: 'PDF_LINKS_FOUND'; pdfs: PdfLink[]; pageUrl: string }
  | { type: 'PDF_LINKS_UPDATED'; pdfs: PdfLink[]; pageUrl: string }
  | { type: 'PDF_LINK_CLICKED'; url: string }
  | { type: 'SCAN_FOR_PDFS' }
  | { type: 'START_DEEP_SCAN' }
  | { type: 'FETCH_PAGE'; url: string };

export type ScanResponse =
  | { isPdfPage: true; url: string }
  | { isPdfPage: false; pdfs: PdfLink[]; pageUrl: string };

export type DeepScanResponse = {
  success: boolean;
  pdfs: PdfLink[];
};

export type FetchPageResponse = {
  success: boolean;
  html?: string;
  error?: string;
};
