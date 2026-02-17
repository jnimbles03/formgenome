import type { CachedAnalysis } from '../types/analysis';

/** Returns true when a string is just a numeric code (not a meaningful title). */
const isNumericOnly = (s: string): boolean => /^\d[\d\s._-]*$/.test(s.trim());

/**
 * Humanize a raw metadata /Title value.
 * Strips a leading numeric prefix (e.g. "218-BECU-Auth..." → "BECU Auth...")
 * and converts dashes/underscores to spaces.
 */
function humanizeMetaTitle(raw: string): string {
  return raw
    .replace(/^\d+[-_\s]*/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns the best display name for a form.
 *
 * Priority: pretty_title → form_title → form_name → metadata /Title → title → pdf_name → 'Untitled'
 * Numeric-only values (e.g. "6715") are skipped since they're meaningless codes.
 *
 * This is the SINGLE source of truth — do not duplicate this logic elsewhere.
 */
export function getFormDisplayName(form: Partial<CachedAnalysis>): string {
  // Check explicit title fields first, skipping numeric-only values
  for (const field of [form.pretty_title, form.form_title, form.form_name]) {
    if (field && field.trim() && !isNumericOnly(field)) return field;
  }

  // Fall back to PDF metadata /Title (e.g. "218-BECU-Authorization to Mail Credit Card")
  const metaTitle = form.metadata?.['/Title'];
  if (metaTitle && !isNumericOnly(metaTitle)) {
    return humanizeMetaTitle(metaTitle);
  }

  // Use API title if it's not purely numeric
  if (form.title && form.title.trim() && !isNumericOnly(form.title)) {
    return form.title;
  }

  // pdf_name from the list item (content script's display text)
  if (form.pdf_name && form.pdf_name.trim()) {
    const cleaned = form.pdf_name
      .replace(/\.pdf\.pdf$/i, '.pdf')
      .replace(/\.pdf$/i, '')
      .replace(/^[Gg]forms?/i, '')
      .trim();
    if (cleaned && !isNumericOnly(cleaned)) return cleaned;
  }

  // Last resort: even numeric title is better than "Untitled"
  return form.title || form.pdf_name || 'Untitled';
}
