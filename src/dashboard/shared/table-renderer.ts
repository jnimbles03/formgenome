import type { CachedAnalysis } from '../../types/analysis';
import type { ColumnDefinition, SortDirection } from '../../types/columns';
import { escapeHtml } from '../../shared/sanitize';
import { formatDate } from '../../shared/time';

/**
 * Renders table headers with sort indicators and drag support.
 * Uses event delegation instead of inline onclick handlers (XSS fix).
 */
export function renderHeaders(
  thead: HTMLElement,
  columns: ColumnDefinition[],
  currentSortKey: string,
  currentSortDirection: SortDirection,
  onSort: (key: string) => void,
): void {
  thead.innerHTML = columns.map(col => {
    const draggableAttr = col.draggable ? 'draggable="true"' : '';
    const draggableClass = col.draggable ? 'draggable' : '';
    const dragIndicator = col.draggable ? '<span class="drag-indicator">\u22EE\u22EE</span>' : '';

    let sortClass = '';
    let sortIndicator = '';
    if (col.key === currentSortKey) {
      sortClass = 'sorted';
      sortIndicator = currentSortDirection === 'asc' ? ' \u2191' : ' \u2193';
    }

    return `
      <th class="${draggableClass} ${sortClass}"
          ${draggableAttr}
          data-column-key="${escapeHtml(col.key)}"
          style="cursor: ${col.key === 'actions' || col.key === 'checkbox' ? 'default' : 'pointer'}">
        <div style="display: flex; align-items: center;">
          ${dragIndicator}
          <span class="header-text">${col.label}${sortIndicator}</span>
        </div>
      </th>
    `;
  }).join('');

  // Event delegation for sort clicks (replaces inline onclick)
  thead.addEventListener('click', (e) => {
    const th = (e.target as HTMLElement).closest('th');
    if (!th) return;
    const key = th.dataset.columnKey;
    if (key && key !== 'actions' && key !== 'checkbox') {
      onSort(key);
    }
  });
}

/**
 * Renders a single table cell with proper escaping.
 */
export function renderCell(key: string, form: CachedAnalysis): string {
  let val = (form as unknown as Record<string, unknown>)[key];

  // Normalize API field name mismatches
  if (key === 'entity_name' && !val) val = (form as unknown as Record<string, unknown>)['entity'];

  if (key === 'source_url' || key === 'pdf_url') {
    const url = String(val || '');
    if (url) {
      return `<td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">
        <a href="${escapeHtml(url)}" target="_blank" class="url-link" title="${escapeHtml(url)}">${escapeHtml(url)}</a>
      </td>`;
    }
    return '<td></td>';
  }

  if (typeof val === 'boolean') {
    const text = val ? 'Yes' : 'No';
    return `<td class="${val ? 'yes' : 'no'}">${text}</td>`;
  }

  if (key === 'complexity_score') {
    const num = parseInt(String(val)) || 0;
    const cls = num >= 7 ? 'complexity-high' : num >= 4 ? 'complexity-medium' : 'complexity-low';
    return `<td class="${cls}">${num}</td>`;
  }

  if (key === 'analyzed_at') {
    return `<td>${formatDate(Number(val) || Date.now())}</td>`;
  }

  if (key === 'llm_model') {
    const model = String(val || 'Unknown');
    const style = model.includes('Gemini')
      ? 'background: #e6f4ea; color: #137333; padding: 2px 6px; border-radius: 4px; font-size: 11px;'
      : 'background: #fce8e6; color: #c5221f; padding: 2px 6px; border-radius: 4px; font-size: 11px;';
    return `<td><span style="${style}">${escapeHtml(model)}</span></td>`;
  }

  // Default: escape all values
  const content = val == null ? '' : escapeHtml(String(val));
  return `<td>${content}</td>`;
}
