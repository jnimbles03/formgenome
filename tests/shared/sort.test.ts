import { describe, it, expect } from 'vitest';
import { compareValues } from '../../src/shared/sort';

describe('compareValues', () => {
  it('sorts strings ascending', () => {
    expect(compareValues('apple', 'banana', 'asc')).toBeLessThan(0);
    expect(compareValues('banana', 'apple', 'asc')).toBeGreaterThan(0);
    expect(compareValues('apple', 'apple', 'asc')).toBe(0);
  });

  it('sorts strings descending', () => {
    expect(compareValues('apple', 'banana', 'desc')).toBeGreaterThan(0);
    expect(compareValues('banana', 'apple', 'desc')).toBeLessThan(0);
  });

  it('sorts numbers ascending', () => {
    expect(compareValues(1, 2, 'asc')).toBeLessThan(0);
    expect(compareValues(2, 1, 'asc')).toBeGreaterThan(0);
    expect(compareValues(5, 5, 'asc')).toBe(0);
  });

  it('sorts numbers descending', () => {
    expect(compareValues(1, 2, 'desc')).toBeGreaterThan(0);
    expect(compareValues(2, 1, 'desc')).toBeLessThan(0);
  });

  it('sorts numeric strings as numbers', () => {
    expect(compareValues('10', '9', 'asc')).toBeGreaterThan(0);
    expect(compareValues('2', '10', 'asc')).toBeLessThan(0);
  });

  it('handles null values', () => {
    expect(compareValues(null, 'a', 'asc')).toBeLessThan(0);
    expect(compareValues('a', null, 'asc')).toBeGreaterThan(0);
  });

  it('handles undefined values', () => {
    expect(compareValues(undefined, 'a', 'asc')).toBeLessThan(0);
  });

  it('sorts booleans as strings', () => {
    expect(compareValues(true, false, 'asc')).toBeGreaterThan(0);
    expect(compareValues(false, true, 'asc')).toBeLessThan(0);
  });

  it('is case-insensitive for strings', () => {
    expect(compareValues('Apple', 'banana', 'asc')).toBeLessThan(0);
    expect(compareValues('BANANA', 'apple', 'asc')).toBeGreaterThan(0);
  });
});
