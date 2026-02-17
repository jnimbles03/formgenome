import type { SortDirection } from '../../types/columns';
import { compareValues } from '../../shared/sort';

export interface FilterSortOptions<T> {
  items: T[];
  searchTerm: string;
  searchFields: string[];
  categoryFilter: string;
  categoryMatchers: Record<string, (item: T) => boolean>;
  sortKey: string;
  sortDirection: SortDirection;
  extraFilters?: Array<(item: T) => boolean>;
}

/**
 * Generic filter and sort function used by both dashboards.
 * Eliminates the duplicated filterAndRenderForms logic.
 */
export function filterAndSort<T>(
  options: FilterSortOptions<T>,
): T[] {
  let results = [...options.items];

  // Apply extra filters (e.g., "show only mine")
  if (options.extraFilters) {
    for (const filter of options.extraFilters) {
      results = results.filter(filter);
    }
  }

  // Apply search filter
  if (options.searchTerm) {
    const term = options.searchTerm.toLowerCase();
    results = results.filter(item => {
      const rec = item as Record<string, unknown>;
      return options.searchFields.some(field => {
        const val = rec[field];
        return val != null && String(val).toLowerCase().includes(term);
      });
    });
  }

  // Apply category filter
  if (options.categoryFilter !== 'all') {
    const matcher = options.categoryMatchers[options.categoryFilter];
    if (matcher) {
      results = results.filter(matcher);
    }
  }

  // Sort
  results.sort((a, b) => {
    const recA = a as Record<string, unknown>;
    const recB = b as Record<string, unknown>;
    return compareValues(recA[options.sortKey], recB[options.sortKey], options.sortDirection);
  });

  return results;
}
