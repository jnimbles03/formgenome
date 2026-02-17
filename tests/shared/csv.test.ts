import { describe, it, expect } from 'vitest';
import { escapeCsv } from '../../src/shared/csv';

describe('escapeCsv', () => {
  it('returns empty string for null', () => {
    expect(escapeCsv(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(escapeCsv(undefined)).toBe('');
  });

  it('passes through simple strings', () => {
    expect(escapeCsv('hello')).toBe('hello');
  });

  it('wraps strings with commas in quotes', () => {
    expect(escapeCsv('hello, world')).toBe('"hello, world"');
  });

  it('wraps strings with double quotes and escapes them', () => {
    expect(escapeCsv('say "hi"')).toBe('"say ""hi"""');
  });

  it('wraps strings with newlines in quotes', () => {
    expect(escapeCsv('line1\nline2')).toBe('"line1\nline2"');
  });

  it('handles numbers', () => {
    expect(escapeCsv(42)).toBe('42');
  });

  it('handles booleans', () => {
    expect(escapeCsv(true)).toBe('true');
    expect(escapeCsv(false)).toBe('false');
  });

  it('handles empty string', () => {
    expect(escapeCsv('')).toBe('');
  });
});
