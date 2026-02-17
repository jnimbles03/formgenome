import type { CachedAnalysis } from '../../types/analysis';
import type { ColumnDefinition, SortDirection } from '../../types/columns';
import { getFormDisplayName } from '../../shared/form-display';
import { getPersonalDashboardColumns } from '../../shared/constants';
import { formatTimeAgo } from '../../shared/time';
import { getColumnOrder, setColumnOrder } from '../../storage/preferences';
import { getAllCachedAnalyses, clearAnalysisCache } from '../../storage/analysis-cache';
import { filterAndSort } from '../shared/filter-sort';
import { renderHeaders, renderCell } from '../shared/table-renderer';
import { setupColumnDragAndDrop } from '../shared/column-drag';
import { exportFilteredFormsToCSV } from '../shared/csv-export';
import { escapeHtml } from '../../shared/sanitize';

// Module state
let allForms: CachedAnalysis[] = [];
let filteredForms: CachedAnalysis[] = [];
let currentSortKey = 'analyzed_at';
let currentSortDirection: SortDirection = 'desc';
let columnOrder: string[] = [];
const selectedKeys = new Set<string>();
const COLUMNS = getPersonalDashboardColumns();

const CATEGORY_MATCHERS: Record<string, (form: CachedAnalysis) => boolean> = {
  'high-complexity': f => (f.complexity_score || 0) >= 7,
  'signatures': f => !!f.signature_required,
  'notary': f => !!f.notarization_required,
  'attachments': f => !!f.attachments_required,
  'payment': f => !!f.payment_required,
};

document.addEventListener('DOMContentLoaded', async () => {
  const savedOrder = await getColumnOrder('dashboardColumnOrder');
  columnOrder = savedOrder || COLUMNS.map(c => c.key);

  // Ensure new columns are present
  COLUMNS.forEach(col => {
    if (!columnOrder.includes(col.key)) columnOrder.push(col.key);
  });

  await loadAllForms();
  updateStats();
  doFilterAndRender();
  setupEventListeners();
});

function setupEventListeners(): void {
  document.getElementById('refreshDashboard')?.addEventListener('click', async () => {
    await loadAllForms();
    updateStats();
    doFilterAndRender();
  });

  document.getElementById('exportAllCSV')?.addEventListener('click', () => {
    const orderedCols = getOrderedColumns();
    exportFilteredFormsToCSV(filteredForms, orderedCols, 'Form_Genome_Dashboard');
  });

  document.getElementById('exportSelectedCSV')?.addEventListener('click', () => {
    const selected = filteredForms.filter(f => selectedKeys.has(f._storage_key || ''));
    if (selected.length === 0) return;
    const orderedCols = getOrderedColumns();
    exportFilteredFormsToCSV(selected, orderedCols, 'Form_Genome_Selected');
  });

  document.getElementById('selectNone')?.addEventListener('click', () => {
    selectedKeys.clear();
    updateBulkUI();
    syncCheckboxes();
  });

  document.getElementById('clearAllData')?.addEventListener('click', async () => {
    if (!confirm(`Are you sure you want to clear all ${allForms.length} analyzed forms?`)) return;
    await clearAnalysisCache();
    location.reload();
  });

  document.getElementById('searchInput')?.addEventListener('input', doFilterAndRender);

  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      (e.target as HTMLElement).classList.add('active');
      doFilterAndRender();
    });
  });

  const sortSelect = document.getElementById('sortSelect') as HTMLSelectElement | null;
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value;
      if (val === 'recent') { currentSortKey = 'analyzed_at'; currentSortDirection = 'desc'; }
      else if (val === 'complexity-high') { currentSortKey = 'complexity_score'; currentSortDirection = 'desc'; }
      else if (val === 'complexity-low') { currentSortKey = 'complexity_score'; currentSortDirection = 'asc'; }
      else if (val === 'name') { currentSortKey = 'form_name'; currentSortDirection = 'asc'; }
      else if (val === 'entity') { currentSortKey = 'entity_name'; currentSortDirection = 'asc'; }
      doFilterAndRender();
    });
  }
}

async function loadAllForms(): Promise<void> {
  const cachedMap = await getAllCachedAnalyses();
  allForms = Array.from(cachedMap.entries())
    .filter(([, value]) => !value.error)
    .map(([key, value]) => ({
      ...value,
      _storage_key: key,
      form_name: getFormDisplayName(value),
      entity_name: value.entity_name || value.entity || '',
      analyzed_at: value._cached_at || Date.now(),
    }));
}

function updateStats(): void {
  const totalEl = document.getElementById('totalForms');
  const avgEl = document.getElementById('avgComplexity');
  const entitiesEl = document.getElementById('uniqueEntities');
  const lastEl = document.getElementById('lastAnalyzed');

  if (totalEl) totalEl.textContent = String(allForms.length);

  if (avgEl) {
    const avg = allForms.length > 0
      ? (allForms.reduce((sum, f) => sum + (f.complexity_score || 0), 0) / allForms.length).toFixed(1)
      : '0';
    avgEl.textContent = avg;
  }

  if (entitiesEl) {
    const unique = new Set(allForms.map(f => f.entity_name || f.entity).filter(Boolean)).size;
    entitiesEl.textContent = String(unique);
  }

  if (lastEl) {
    if (allForms.length > 0) {
      const mostRecent = Math.max(...allForms.map(f => f.analyzed_at || 0));
      lastEl.textContent = formatTimeAgo(mostRecent);
    } else {
      lastEl.textContent = 'Never';
    }
  }
}

function getOrderedColumns(): ColumnDefinition[] {
  return columnOrder.map(key => COLUMNS.find(c => c.key === key)).filter((c): c is ColumnDefinition => !!c);
}

function getActiveFilter(): string {
  const activePill = document.querySelector('.filter-pill.active') as HTMLElement | null;
  return activePill?.dataset.filter || 'all';
}

function doFilterAndRender(): void {
  const searchTerm = (document.getElementById('searchInput') as HTMLInputElement | null)?.value || '';

  filteredForms = filterAndSort({
    items: allForms,
    searchTerm,
    searchFields: ['form_name', 'entity_name', 'entity', 'source_url', 'pdf_url'],
    categoryFilter: getActiveFilter(),
    categoryMatchers: CATEGORY_MATCHERS,
    sortKey: currentSortKey,
    sortDirection: currentSortDirection,
  });

  renderTable();
  updateBulkUI();
}

// ─── Selection helpers ──────────────────────────────────────────────

function updateBulkUI(): void {
  const bar = document.getElementById('bulkActions');
  const countEl = document.getElementById('bulkSelectedCount');
  if (!bar || !countEl) return;

  // Only count selected items that are currently visible (in filteredForms)
  const visibleKeys = new Set(filteredForms.map(f => f._storage_key || ''));
  const visibleSelected = [...selectedKeys].filter(k => visibleKeys.has(k)).length;

  if (visibleSelected > 0) {
    countEl.textContent = String(visibleSelected);
    bar.classList.remove('hidden');
  } else {
    bar.classList.add('hidden');
  }
}

function syncCheckboxes(): void {
  const rows = document.querySelectorAll<HTMLTableRowElement>('#formsTableBody tr');
  rows.forEach(row => {
    const cb = row.querySelector<HTMLInputElement>('.row-checkbox');
    if (!cb) return;
    const key = cb.dataset.storageKey || '';
    cb.checked = selectedKeys.has(key);
    row.classList.toggle('selected', cb.checked);
  });
  syncSelectAll();
}

function syncSelectAll(): void {
  const selectAll = document.querySelector<HTMLInputElement>('.select-all-checkbox');
  if (!selectAll) return;
  const visibleKeys = filteredForms.map(f => f._storage_key || '');
  const checkedCount = visibleKeys.filter(k => selectedKeys.has(k)).length;
  selectAll.checked = visibleKeys.length > 0 && checkedCount === visibleKeys.length;
  selectAll.indeterminate = checkedCount > 0 && checkedCount < visibleKeys.length;
}

function setupRowCheckboxListeners(): void {
  const tbody = document.getElementById('formsTableBody');
  if (!tbody) return;

  // Event delegation on tbody for row checkboxes
  tbody.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    if (!target.classList.contains('row-checkbox')) return;
    const key = target.dataset.storageKey || '';
    if (!key) return;

    if (target.checked) {
      selectedKeys.add(key);
    } else {
      selectedKeys.delete(key);
    }

    // Toggle row highlight
    const row = target.closest('tr');
    row?.classList.toggle('selected', target.checked);

    syncSelectAll();
    updateBulkUI();
  });
}

function setupSelectAllListener(): void {
  const selectAll = document.querySelector<HTMLInputElement>('.select-all-checkbox');
  if (!selectAll) return;

  selectAll.addEventListener('change', () => {
    const checked = selectAll.checked;
    filteredForms.forEach(f => {
      const key = f._storage_key || '';
      if (!key) return;
      if (checked) {
        selectedKeys.add(key);
      } else {
        selectedKeys.delete(key);
      }
    });

    syncCheckboxes();
    updateBulkUI();
  });
}

// ─── Rendering ──────────────────────────────────────────────────────

function renderTable(): void {
  const table = document.getElementById('formsTable') as HTMLTableElement | null;
  const tbody = document.getElementById('formsTableBody');
  const thead = document.getElementById('tableHeaderRow');
  const emptyState = document.getElementById('emptyState');

  if (filteredForms.length === 0) {
    if (table) table.style.display = 'none';
    emptyState?.classList.remove('hidden');
    return;
  }

  if (table) table.style.display = 'table';
  emptyState?.classList.add('hidden');

  const orderedColumns = getOrderedColumns();

  if (thead) {
    // Build header: checkbox + data columns
    const checkboxTh = '<th class="checkbox-cell"><input type="checkbox" class="select-all-checkbox" title="Select all"></th>';
    renderHeaders(thead, orderedColumns, currentSortKey, currentSortDirection, (key) => {
      if (currentSortKey === key) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        currentSortKey = key;
        currentSortDirection = 'desc';
      }
      doFilterAndRender();
    });
    // Prepend checkbox header
    thead.innerHTML = checkboxTh + thead.innerHTML;

    setupSelectAllListener();

    setupColumnDragAndDrop(
      () => columnOrder,
      (order) => {
        columnOrder = order;
        setColumnOrder('dashboardColumnOrder', order);
      },
      doFilterAndRender,
    );
  }

  if (tbody) {
    tbody.innerHTML = filteredForms.map(form => {
      const key = form._storage_key || '';
      const isSelected = selectedKeys.has(key);
      const checked = isSelected ? 'checked' : '';
      const rowClass = isSelected ? ' class="selected"' : '';
      const checkboxCell = `<td class="checkbox-cell"><input type="checkbox" class="row-checkbox" data-storage-key="${escapeHtml(key)}" ${checked}></td>`;
      const cells = orderedColumns.map(col => renderCell(col.key, form)).join('');
      return `<tr${rowClass}>${checkboxCell}${cells}</tr>`;
    }).join('');

    setupRowCheckboxListeners();
  }

  // Sync select-all state after render
  syncSelectAll();
}
