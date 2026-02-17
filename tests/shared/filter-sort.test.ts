import { describe, it, expect } from 'vitest';
import { filterAndSort } from '../../src/dashboard/shared/filter-sort';

interface TestItem {
  name: string;
  category: string;
  score: number;
  active: boolean;
}

const items: TestItem[] = [
  { name: 'Alpha Form', category: 'finance', score: 8, active: true },
  { name: 'Beta Report', category: 'legal', score: 3, active: false },
  { name: 'Gamma Invoice', category: 'finance', score: 5, active: true },
  { name: 'Delta Agreement', category: 'legal', score: 9, active: true },
];

const matchers: Record<string, (item: TestItem) => boolean> = {
  'finance': item => item.category === 'finance',
  'legal': item => item.category === 'legal',
  'high-score': item => item.score >= 7,
};

describe('filterAndSort', () => {
  it('returns all items when no filters are applied', () => {
    const result = filterAndSort({
      items,
      searchTerm: '',
      searchFields: ['name'],
      categoryFilter: 'all',
      categoryMatchers: matchers,
      sortKey: 'name',
      sortDirection: 'asc',
    });
    expect(result).toHaveLength(4);
  });

  it('filters by search term', () => {
    const result = filterAndSort({
      items,
      searchTerm: 'form',
      searchFields: ['name'],
      categoryFilter: 'all',
      categoryMatchers: matchers,
      sortKey: 'name',
      sortDirection: 'asc',
    });
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('Alpha Form');
  });

  it('search is case-insensitive', () => {
    const result = filterAndSort({
      items,
      searchTerm: 'REPORT',
      searchFields: ['name'],
      categoryFilter: 'all',
      categoryMatchers: matchers,
      sortKey: 'name',
      sortDirection: 'asc',
    });
    expect(result).toHaveLength(1);
  });

  it('filters by category', () => {
    const result = filterAndSort({
      items,
      searchTerm: '',
      searchFields: ['name'],
      categoryFilter: 'finance',
      categoryMatchers: matchers,
      sortKey: 'name',
      sortDirection: 'asc',
    });
    expect(result).toHaveLength(2);
    expect(result.every(r => r.category === 'finance')).toBe(true);
  });

  it('sorts ascending by string', () => {
    const result = filterAndSort({
      items,
      searchTerm: '',
      searchFields: ['name'],
      categoryFilter: 'all',
      categoryMatchers: matchers,
      sortKey: 'name',
      sortDirection: 'asc',
    });
    expect(result[0]!.name).toBe('Alpha Form');
    expect(result[3]!.name).toBe('Gamma Invoice');
  });

  it('sorts descending by number', () => {
    const result = filterAndSort({
      items,
      searchTerm: '',
      searchFields: ['name'],
      categoryFilter: 'all',
      categoryMatchers: matchers,
      sortKey: 'score',
      sortDirection: 'desc',
    });
    expect(result[0]!.score).toBe(9);
    expect(result[3]!.score).toBe(3);
  });

  it('applies extra filters', () => {
    const result = filterAndSort({
      items,
      searchTerm: '',
      searchFields: ['name'],
      categoryFilter: 'all',
      categoryMatchers: matchers,
      sortKey: 'name',
      sortDirection: 'asc',
      extraFilters: [item => item.active],
    });
    expect(result).toHaveLength(3);
    expect(result.every(r => r.active)).toBe(true);
  });

  it('combines search, category filter, and extra filters', () => {
    const result = filterAndSort({
      items,
      searchTerm: '',
      searchFields: ['name'],
      categoryFilter: 'high-score',
      categoryMatchers: matchers,
      sortKey: 'score',
      sortDirection: 'desc',
      extraFilters: [item => item.active],
    });
    expect(result).toHaveLength(2);
    expect(result[0]!.name).toBe('Delta Agreement');
    expect(result[1]!.name).toBe('Alpha Form');
  });
});
