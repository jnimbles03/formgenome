import type { CachedAnalysis } from '../../types/analysis';
import type { ColumnDefinition, SortDirection } from '../../types/columns';
import { escapeHtml } from '../../shared/sanitize';
import { getTeamDashboardColumns, TEAM_FORMS_LIMIT } from '../../shared/constants';
import { getColumnOrder, setColumnOrder, getUserId } from '../../storage/preferences';
import { fetchTeamForms, updateTeamForm, deleteTeamForms, reanalyzeTeamForms } from '../../api/team';
import { filterAndSort } from '../shared/filter-sort';
import { renderHeaders, renderCell } from '../shared/table-renderer';
import { setupColumnDragAndDrop } from '../shared/column-drag';
import { exportFilteredFormsToCSV } from '../shared/csv-export';
import { downloadViaAnchor } from '../../shared/download';
import { escapeCsv } from '../../shared/csv';
import { log } from '../../shared/logger';

// Module state
let allForms: CachedAnalysis[] = [];
let filteredForms: CachedAnalysis[] = [];
let myUserId = '';
let showOnlyMine = false;
let editingRowId: string | null = null;
let columnOrder: string[] = [];
let currentSortKey = 'analyzed_at';
let currentSortDirection: SortDirection = 'desc';
const selectedFormIds = new Set<string>();
const COLUMNS = getTeamDashboardColumns();

const CATEGORY_MATCHERS: Record<string, (form: CachedAnalysis) => boolean> = {
  'high-complexity': f => (f.complexity_score || 0) >= 7,
  'signatures': f => !!f.signature_required,
  'notary': f => !!f.notarization_required,
  'attachments': f => !!f.attachments_required,
  'payment': f => !!f.payment_required,
};

document.addEventListener('DOMContentLoaded', async () => {
  myUserId = await getUserId();

  const savedOrder = await getColumnOrder('columnOrder');
  columnOrder = savedOrder || COLUMNS.map(c => c.key);

  // Ensure new columns are present
  COLUMNS.forEach(col => {
    if (!columnOrder.includes(col.key)) {
      const idx = columnOrder.indexOf('entity_name');
      if (idx !== -1) columnOrder.splice(idx + 1, 0, col.key);
      else columnOrder.push(col.key);
    }
  });

  await loadAllTeamForms();
  setupEventListeners();
});

function setupEventListeners(): void {
  document.getElementById('refreshDashboard')?.addEventListener('click', async () => {
    await loadAllTeamForms();
  });

  document.getElementById('viewMyForms')?.addEventListener('click', () => {
    showOnlyMine = !showOnlyMine;
    const btn = document.getElementById('viewMyForms');
    if (btn) {
      btn.textContent = showOnlyMine ? 'View All Forms' : 'My Forms Only';
      btn.classList.toggle('active', showOnlyMine);
    }
    doFilterAndRender();
  });

  document.getElementById('exportAllCSV')?.addEventListener('click', exportTeamCSV);
  document.getElementById('searchInput')?.addEventListener('input', doFilterAndRender);

  const filterSelect = document.getElementById('filterSelect') as HTMLSelectElement | null;
  filterSelect?.addEventListener('change', doFilterAndRender);

  document.getElementById('bulkDeleteBtn')?.addEventListener('click', handleBulkDelete);
  document.getElementById('bulkReanalyzeBtn')?.addEventListener('click', handleBulkReanalyze);
}

async function loadAllTeamForms(): Promise<void> {
  showLoading(true);
  try {
    allForms = await fetchTeamForms(TEAM_FORMS_LIMIT);
    log.info(`Loaded ${allForms.length} team forms from API`);
    doFilterAndRender();
  } catch (error) {
    log.error('Error loading team forms', error);
    showError('Unable to connect to backend API. Please check your connection.');
  } finally {
    showLoading(false);
  }
}

function getOrderedColumns(): ColumnDefinition[] {
  return columnOrder.map(key => COLUMNS.find(c => c.key === key)).filter((c): c is ColumnDefinition => !!c);
}

function doFilterAndRender(): void {
  const searchTerm = (document.getElementById('searchInput') as HTMLInputElement | null)?.value || '';
  const filterValue = (document.getElementById('filterSelect') as HTMLSelectElement | null)?.value || 'all';

  const extraFilters: Array<(item: CachedAnalysis) => boolean> = [];
  if (showOnlyMine) {
    extraFilters.push(form => form.user_id === myUserId);
  }

  filteredForms = filterAndSort({
    items: allForms,
    searchTerm,
    searchFields: ['form_name', 'entity_name', 'source_url'],
    categoryFilter: filterValue,
    categoryMatchers: CATEGORY_MATCHERS,
    sortKey: currentSortKey,
    sortDirection: currentSortDirection,
    extraFilters,
  });

  const formCount = document.getElementById('formCount');
  if (formCount) formCount.textContent = `${filteredForms.length} forms`;

  renderTable();
}

function renderTable(): void {
  const table = document.getElementById('formsTable') as HTMLTableElement | null;
  const tbody = document.getElementById('formsTableBody');
  const thead = document.getElementById('tableHeaderRow');
  const emptyState = document.getElementById('emptyState');

  if (filteredForms.length === 0) {
    if (table) table.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (table) table.style.display = 'table';
  if (emptyState) emptyState.style.display = 'none';

  const orderedColumns = getOrderedColumns();

  if (thead) {
    renderHeaders(thead, orderedColumns, currentSortKey, currentSortDirection, (key) => {
      if (key === 'actions' || key === 'checkbox') return;
      if (currentSortKey === key) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        currentSortKey = key;
        currentSortDirection = 'desc';
      }
      doFilterAndRender();
    });

    // Override the checkbox header with a select-all checkbox
    const checkboxTh = thead.querySelector('th[data-column-key="checkbox"]');
    if (checkboxTh) {
      checkboxTh.innerHTML = '<input type="checkbox" id="selectAllHeader" style="cursor: pointer;">';
      const selectAll = document.getElementById('selectAllHeader') as HTMLInputElement | null;
      if (selectAll) {
        const allVisibleSelected = filteredForms.length > 0 &&
          filteredForms.every(f => selectedFormIds.has(f.analysis_id || ''));
        selectAll.checked = allVisibleSelected;
        selectAll.addEventListener('click', (e) => {
          const checked = (e.target as HTMLInputElement).checked;
          filteredForms.forEach(form => {
            const id = String(form.analysis_id || '');
            if (checked) selectedFormIds.add(id);
            else selectedFormIds.delete(id);
          });
          renderTable();
        });
      }
    }

    setupColumnDragAndDrop(
      () => columnOrder,
      (order) => {
        columnOrder = order;
        setColumnOrder('columnOrder', order);
      },
      doFilterAndRender,
    );
  }

  if (tbody) {
    tbody.innerHTML = filteredForms.map(form => {
      const isMyForm = form.user_id === myUserId;
      const rowId = `${form.user_id}_${form.analysis_id}`;
      const analysedAt = new Date(form.analyzed_at || Date.now());
      const isRecent = (Date.now() - analysedAt.getTime()) < 5 * 60 * 1000;

      const cells = orderedColumns.map(col => {
        // Team-specific column overrides
        if (col.key === 'checkbox') {
          return `<td><input type="checkbox" class="row-checkbox" data-analysis-id="${escapeHtml(form.analysis_id || '')}" ${selectedFormIds.has(form.analysis_id || '') ? 'checked' : ''}></td>`;
        }
        if (col.key === 'actions') {
          return `<td>${isMyForm ? `<button class="edit-btn" data-edit-row="${escapeHtml(rowId)}">Edit</button>` : ''}</td>`;
        }
        return renderCell(col.key, form);
      }).join('');

      return `<tr class="${isMyForm ? 'editable' : ''} ${isRecent ? 'recently-updated' : ''}"
          data-row-id="${escapeHtml(rowId)}"
          data-analysis-id="${escapeHtml(form.analysis_id || '')}"
          data-form='${escapeHtml(JSON.stringify(form))}'>
        ${cells}
      </tr>`;
    }).join('');

    // Edit button listeners
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rowId = (e.target as HTMLElement).dataset.editRow;
        if (rowId) startEdit(rowId);
      });
    });

    setupCheckboxListeners();
    updateBulkUI();
  }
}

function setupCheckboxListeners(): void {
  document.querySelectorAll<HTMLInputElement>('.row-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = (e.target as HTMLInputElement).dataset.analysisId;
      if (!id) return;
      if ((e.target as HTMLInputElement).checked) selectedFormIds.add(String(id));
      else selectedFormIds.delete(String(id));
      updateBulkUI();
    });
  });
}

function updateBulkUI(): void {
  const container = document.getElementById('bulkActions');
  const countSpan = document.getElementById('selectedCountDisplay');
  const count = selectedFormIds.size;

  if (container) container.style.display = count > 0 ? 'flex' : 'none';
  if (countSpan) countSpan.textContent = `${count} selected`;
}

function startEdit(rowId: string): void {
  if (editingRowId) {
    alert('Please save or cancel the current edit first');
    return;
  }

  const row = document.querySelector(`tr[data-row-id="${CSS.escape(rowId)}"]`) as HTMLElement | null;
  if (!row) return;

  let form: CachedAnalysis;
  try {
    form = JSON.parse(row.dataset.form || '{}') as CachedAnalysis;
  } catch {
    return;
  }

  editingRowId = rowId;
  row.classList.add('editing');

  const orderedColumns = getOrderedColumns();
  row.innerHTML = orderedColumns.map(col => renderEditCell(col.key, form)).join('');

  row.querySelector('.save-btn')?.addEventListener('click', () => saveEdit(rowId));
  row.querySelector('.cancel-btn')?.addEventListener('click', () => cancelEdit());
}

function renderEditCell(columnKey: string, form: CachedAnalysis): string {
  const rowId = `${form.user_id}_${form.analysis_id}`;

  switch (columnKey) {
    case 'checkbox':
      return '<td></td>';
    case 'actions':
      return `<td>
        <button class="save-btn" data-save-row="${escapeHtml(rowId)}">Save</button>
        <button class="cancel-btn" data-cancel-row="${escapeHtml(rowId)}">Cancel</button>
      </td>`;
    case 'form_name':
      return `<td><input class="edit-field" name="form_name" value="${escapeHtml(form.form_name || '')}" /></td>`;
    case 'entity_name':
      return `<td><input class="edit-field" name="entity_name" value="${escapeHtml(form.entity_name || '')}" /></td>`;
    case 'llm_model':
      return `<td>${escapeHtml(form.llm_model || '')}</td>`;
    case 'source_url':
      return `<td><input class="edit-field" name="source_url" value="${escapeHtml(form.source_url || '')}" /></td>`;
    case 'pages':
      return `<td><input class="edit-field" type="number" name="pages" value="${form.pages || 1}" /></td>`;
    case 'total_field_count':
      return `<td><input class="edit-field" type="number" name="total_field_count" value="${form.total_field_count || 0}" /></td>`;
    case 'complexity_score':
      return `<td><input class="edit-field" type="number" min="0" max="10" name="complexity_score" value="${form.complexity_score || 0}" /></td>`;
    case 'nigo_score':
      return `<td><input class="edit-field" type="number" min="0" max="10" name="nigo_score" value="${form.nigo_score || 0}" /></td>`;
    case 'confidence_tier':
      return `<td>
        <select class="edit-field" name="confidence_tier">
          <option value="High" ${form.confidence_tier === 'High' ? 'selected' : ''}>High</option>
          <option value="Medium" ${form.confidence_tier === 'Medium' ? 'selected' : ''}>Medium</option>
          <option value="Low" ${form.confidence_tier === 'Low' ? 'selected' : ''}>Low</option>
        </select>
      </td>`;
    case 'action_type':
      return `<td><input class="edit-field" name="action_type" value="${escapeHtml(form.action_type || '')}" /></td>`;
    case 'analyzed_at':
      return `<td>${new Date(form.analyzed_at || Date.now()).toLocaleDateString()}</td>`;
    default: {
      // Boolean fields
      const val = (form as unknown as Record<string, unknown>)[columnKey];
      if (typeof val === 'boolean') {
        return `<td>
          <select class="edit-field" name="${escapeHtml(columnKey)}">
            <option value="true" ${val ? 'selected' : ''}>Yes</option>
            <option value="false" ${!val ? 'selected' : ''}>No</option>
          </select>
        </td>`;
      }
      // String/number fields
      return `<td><input class="edit-field" name="${escapeHtml(columnKey)}" value="${escapeHtml(String(val ?? ''))}" /></td>`;
    }
  }
}

async function saveEdit(rowId: string): Promise<void> {
  const row = document.querySelector(`tr[data-row-id="${CSS.escape(rowId)}"]`) as HTMLElement | null;
  if (!row) return;

  let form: CachedAnalysis;
  try {
    form = JSON.parse(row.dataset.form || '{}') as CachedAnalysis;
  } catch {
    return;
  }

  const updatedData = { ...form } as unknown as Record<string, unknown>;
  const inputs = row.querySelectorAll<HTMLInputElement | HTMLSelectElement>('.edit-field');
  inputs.forEach(input => {
    const name = input.name;
    let value: unknown = input.value;
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if (input instanceof HTMLInputElement && input.type === 'number') value = parseFloat(input.value) || 0;
    updatedData[name] = value;
  });

  try {
    const success = await updateTeamForm({
      user_id: form.user_id || '',
      analysis_id: form.analysis_id || '',
      form_data: updatedData,
    });

    if (success) {
      const index = allForms.findIndex(f => f.user_id === form.user_id && f.analysis_id === form.analysis_id);
      if (index !== -1) allForms[index] = updatedData as unknown as CachedAnalysis;
      editingRowId = null;
      doFilterAndRender();
      alert('Form updated successfully!');
    } else {
      throw new Error('Failed to update form');
    }
  } catch (error) {
    log.error('Error updating form', error);
    alert('Failed to update form. Please try again.');
  }
}

function cancelEdit(): void {
  editingRowId = null;
  doFilterAndRender();
}

async function handleBulkDelete(): Promise<void> {
  if (selectedFormIds.size === 0) return;
  if (!confirm(`Are you sure you want to delete ${selectedFormIds.size} forms? This cannot be undone.`)) return;

  showLoading(true);
  try {
    const ids = Array.from(selectedFormIds);
    const result = await deleteTeamForms(ids);
    if (result.ok) {
      selectedFormIds.clear();
      await loadAllTeamForms();
      alert(`Deleted ${result.deleted_count} forms.`);
      updateBulkUI();
    } else {
      throw new Error(result.error || 'Delete failed');
    }
  } catch (error) {
    log.error('Delete failed', error);
    alert('Delete failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    showLoading(false);
  }
}

async function handleBulkReanalyze(): Promise<void> {
  if (selectedFormIds.size === 0) return;
  if (!confirm(`Re-analyze ${selectedFormIds.size} forms? This will queue them for fresh processing.`)) return;

  try {
    const ids = Array.from(selectedFormIds);
    const result = await reanalyzeTeamForms(ids);
    if (result.ok) {
      selectedFormIds.clear();
      renderTable();
      alert(`Queued ${result.queued_count} forms for re-analysis.`);
    } else {
      throw new Error(result.error || 'Re-analyze failed');
    }
  } catch (error) {
    log.error('Re-analyze failed', error);
    alert('Re-analyze failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

function exportTeamCSV(): void {
  if (filteredForms.length === 0) {
    alert('No forms to export!');
    return;
  }

  const orderedCols = getOrderedColumns().filter(c => c.key !== 'checkbox' && c.key !== 'actions');
  // Add user_id column for team export
  const headers = [...orderedCols.map(c => c.label), 'User ID'];

  const rows = filteredForms.map(form => {
    const cells = orderedCols.map(col => {
      const val = (form as unknown as Record<string, unknown>)[col.key];
      if (col.key === 'analyzed_at') return new Date(Number(val) || Date.now()).toISOString();
      if (typeof val === 'boolean') return val ? 'Yes' : 'No';
      return val;
    });
    return [...cells, form.user_id || ''];
  });

  const csvContent = [
    headers.map(escapeCsv).join(','),
    ...rows.map(row => row.map(escapeCsv).join(',')),
  ].join('\n');

  const timestamp = new Date().toISOString().split('T')[0];
  downloadViaAnchor(csvContent, 'text/csv;charset=utf-8;', `Team_Forms_${timestamp}.csv`);
}

function showLoading(show: boolean): void {
  const loadingState = document.getElementById('loadingState');
  const table = document.getElementById('formsTable');
  if (show) {
    if (loadingState) loadingState.style.display = 'block';
    if (table) table.style.display = 'none';
  } else {
    if (loadingState) loadingState.style.display = 'none';
  }
}

function showError(message: string): void {
  const table = document.getElementById('formsTable') as HTMLTableElement | null;
  const tbody = document.getElementById('formsTableBody');
  if (table) table.style.display = 'table';
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="28" style="text-align: center; padding: 40px; color: #ef4444;">
      <strong>Error:</strong> ${escapeHtml(message)}
    </td></tr>`;
  }
}
