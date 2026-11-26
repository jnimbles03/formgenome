/**
 * Leading content that spreadsheet apps evaluate as a formula. Includes
 * full-width variants (which some locales accept as formula operators) and
 * triggers hidden behind leading whitespace.
 */
const FORMULA_TRIGGER = /^(?:[\t\r]|[\s\u3000]*[=+\-@\uFF1D\uFF0B\uFF0D\uFF20])/;

/**
 * Escapes a value for safe CSV output.
 * Handles commas, semicolons, quotes, newlines, null/undefined, and
 * neutralizes spreadsheet formula triggers by prefixing an apostrophe.
 */
export function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  if (typeof value !== 'number' && typeof value !== 'bigint' && FORMULA_TRIGGER.test(str)) {
    str = `'${str}`;
  }
  if (/[,;"\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
