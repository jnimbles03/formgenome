import { describe, it, expect, afterEach } from 'vitest';
import { syncFormToTeam } from '../../src/api/team';
import { captureDownload } from '../helpers/capture-download';
import { columnValue, expectNeutralized, parseCsv } from '../helpers/csv-formula';
import { TeamApiDouble, installTeamApi } from '../helpers/team-api-double';
import '../../src/dashboard/team/index';

const ATTACKER = 'user-attacker';
const VICTIM = 'user-victim';
const FORM_NAME = '\t=1+1';
const ENTITY = '\r=1+1';
const SOURCE_URL = '=1+1';
const ACTION = '@SUM(A1:A2)';

function installCssEscape(): void {
  const css = (globalThis.CSS ?? { escape: undefined }) as { escape?: (value: string) => string };
  if (typeof css.escape !== 'function') {
    css.escape = (value: string) => String(value).replace(/[^a-zA-Z0-9_-]/g, ch => `\\${ch}`);
    globalThis.CSS = css as typeof CSS;
  }
}

function mount(): void {
  document.body.innerHTML = `
    <button id="refreshDashboard" type="button">Refresh</button>
    <button id="viewMyForms" type="button">My Forms Only</button>
    <button id="exportAllCSV" type="button">Export CSV</button>
    <input id="searchInput" />
    <select id="filterSelect"><option value="all" selected>All Forms</option></select>
    <span id="formCount"></span>
    <div id="loadingState"></div>
    <div id="emptyState"></div>
    <div id="bulkActions"></div>
    <span id="selectedCountDisplay"></span>
    <table id="formsTable">
      <thead><tr id="tableHeaderRow"></tr></thead>
      <tbody id="formsTableBody"></tbody>
    </table>
  `;
}

describe('team dashboard sync to CSV export', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('neutralizes formula fields synced from an analysis when another member exports', async () => {
    const store = new TeamApiDouble();
    installTeamApi(store);
    installCssEscape();
    vi.stubGlobal('alert', vi.fn());

    const synced = await syncFormToTeam({
      user_id: ATTACKER,
      analysis_id: 'local-attacker',
      form_data: {
        form_name: FORM_NAME,
        entity_name: ENTITY,
        source_url: SOURCE_URL,
        action_type: ACTION,
        form_purpose: 'Synced purpose',
        pages: 1,
        complexity_score: 1,
      },
    });
    expect(synced).toBe(true);

    await syncFormToTeam({
      user_id: VICTIM,
      analysis_id: 'local-victim',
      form_data: {
        form_name: 'Quarterly Bonus Schedule',
        entity_name: 'Example Agency',
        source_url: 'https://example.test/forms/bonus.pdf',
        action_type: 'File',
        form_purpose: 'Compensation',
        pages: 1,
        complexity_score: 2,
      },
    });

    // The exporting member is not the member who synced the formula.
    await chrome.storage.local.set({ userId: VICTIM });
    mount();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await vi.waitFor(() => {
      expect(document.getElementById('formCount')?.textContent).toBe('2 forms');
    });

    const download = await captureDownload(() => {
      document.getElementById('exportAllCSV')!.click();
    });

    expect(download.filename).toMatch(/^Team_Forms_\d{4}-\d{2}-\d{2}\.csv$/);

    const rows = parseCsv(download.content);
    const records = rows.slice(1);
    const attacker = records.find(record => columnValue(rows, 'User ID', record) === ATTACKER);
    const victim = records.find(record => columnValue(rows, 'User ID', record) === VICTIM);
    expect(attacker).toBeTruthy();
    expect(victim).toBeTruthy();

    expectNeutralized(columnValue(rows, 'Form Name', attacker!), FORM_NAME);
    expectNeutralized(columnValue(rows, 'Entity', attacker!), ENTITY);
    expectNeutralized(columnValue(rows, 'URL', attacker!), SOURCE_URL);
    expectNeutralized(columnValue(rows, 'Action Type', attacker!), ACTION);
    expect(columnValue(rows, 'Form Name', victim!)).toBe('Quarterly Bonus Schedule');
  });
});
