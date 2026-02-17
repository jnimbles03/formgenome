/**
 * Escapes a value for safe CSV output.
 * Handles commas, quotes, newlines, and null/undefined.
 */
export function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
