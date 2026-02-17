import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatTimeAgo, formatDate } from '../../src/shared/time';

describe('formatTimeAgo', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns "Just now" for timestamps less than a minute ago', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    expect(formatTimeAgo(now - 30_000)).toBe('Just now');
  });

  it('returns minutes ago for timestamps less than an hour ago', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    expect(formatTimeAgo(now - 5 * 60_000)).toBe('5m ago');
  });

  it('returns hours ago for timestamps less than a day ago', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    expect(formatTimeAgo(now - 3 * 3_600_000)).toBe('3h ago');
  });

  it('returns a date string for older timestamps', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const threeDaysAgo = now - 3 * 86_400_000;
    const result = formatTimeAgo(threeDaysAgo);
    // Should be a locale date string, not a relative time
    expect(result).not.toContain('ago');
    expect(result).not.toBe('Just now');
  });
});

describe('formatDate', () => {
  it('returns a locale date string', () => {
    const timestamp = new Date('2026-01-15T12:00:00Z').getTime();
    const result = formatDate(timestamp);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });
});
