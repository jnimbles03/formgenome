export type PdfAction = 'analyze' | 'navigate' | 'peek' | 'unknown';
export type PdfBadgeType = 'success' | 'warning' | 'info' | 'deep-scan';

export interface PdfLink {
  url: string;
  filename: string;
  text: string;
  language_count: number;
  is_english: boolean;
  is_implicit: boolean;
  variations: string[];
  action: PdfAction;
  badge_type?: PdfBadgeType;
  source_page?: string;
}

export interface PdfValidationResult {
  accessible: boolean;
  contentType: string | null;
  status: number;
  error?: string;
}
