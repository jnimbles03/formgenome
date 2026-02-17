import type { CachedAnalysis } from '../../types/analysis';
import type { ColumnDefinition } from '../../types/columns';
import { escapeCsv } from '../../shared/csv';
import { downloadViaAnchor } from '../../shared/download';

/**
 * Exports filtered forms to CSV using the current column order.
 * Single implementation for both dashboards.
 */
export function exportFilteredFormsToCSV(
  forms: CachedAnalysis[],
  columns: ColumnDefinition[],
  filenamePrefix: string,
): void {
  if (forms.length === 0) {
    alert('No forms to export!');
    return;
  }

  const headers = columns.map(c => c.label);

  const rows = forms.map(form => {
    return columns.map(col => {
      const val = (form as unknown as Record<string, unknown>)[col.key];
      if (col.key === 'analyzed_at') return new Date(Number(val) || Date.now()).toISOString();
      if (typeof val === 'boolean') return val ? 'Yes' : 'No';
      return val;
    });
  });

  const csvContent = [
    headers.map(escapeCsv).join(','),
    ...rows.map(row => row.map(escapeCsv).join(',')),
  ].join('\n');

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${filenamePrefix}_${timestamp}.csv`;

  downloadViaAnchor(csvContent, 'text/csv;charset=utf-8;', filename);
}
