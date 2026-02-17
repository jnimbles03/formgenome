import type { SortDirection } from '../types/columns';

/**
 * Generic comparator for sorting table data.
 * Handles numeric, string, boolean, null, and undefined values.
 */
export function compareValues(
  a: unknown,
  b: unknown,
  direction: SortDirection
): number {
  // Treat null/undefined as empty
  const valA = a ?? '';
  const valB = b ?? '';

  // Don't treat booleans as numbers
  if (typeof valA === 'boolean' || typeof valB === 'boolean') {
    const strA = String(valA).toLowerCase();
    const strB = String(valB).toLowerCase();
    if (strA < strB) return direction === 'asc' ? -1 : 1;
    if (strA > strB) return direction === 'asc' ? 1 : -1;
    return 0;
  }

  // Try numeric comparison
  const numA = parseFloat(String(valA));
  const numB = parseFloat(String(valB));
  if (!isNaN(numA) && !isNaN(numB) && String(valA) !== '' && String(valB) !== '') {
    return direction === 'asc' ? numA - numB : numB - numA;
  }

  // String comparison
  const strA = String(valA).toLowerCase();
  const strB = String(valB).toLowerCase();
  if (strA < strB) return direction === 'asc' ? -1 : 1;
  if (strA > strB) return direction === 'asc' ? 1 : -1;
  return 0;
}
