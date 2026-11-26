/**
 * Spec for formula-safe CSV cells.
 * A spreadsheet formula trigger must be stored as text by prefixing one
 * apostrophe, which is what the CSV parser yields after quotes are removed.
 */

export function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const c = content[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }

    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (c === '\r' && content[i + 1] === '\n') {
      continue;
    } else {
      field += c;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

/** Parse one escapeCsv result as a single CSV field. */
export function parseCsvField(escaped: string): string {
  const rows = parseCsv(escaped);
  if (rows.length !== 1 || rows[0]!.length !== 1) {
    throw new Error(`expected one CSV field, got ${JSON.stringify(rows)}`);
  }
  return rows[0]![0]!;
}

export function columnValue(rows: string[][], label: string, record: string[]): string {
  const headers = rows[0];
  if (!headers) throw new Error('CSV has no header row');
  const idx = headers.indexOf(label);
  if (idx < 0) throw new Error(`CSV is missing column ${label}`);
  return record[idx] ?? '';
}

/** Leading character that spreadsheet apps treat as a formula. */
export const FORMULA_TRIGGERS = ['=', '+', '-', '@', '\t', '\r'] as const;

export function expectNeutralized(actual: string, original: string): void {
  expect(actual).toBe(`'${original}`);
}
