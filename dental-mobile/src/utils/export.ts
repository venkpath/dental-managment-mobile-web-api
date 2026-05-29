import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';

export type ExportFormat = 'csv' | 'excel' | 'pdf';

export interface ExportColumn<T = Record<string, unknown>> {
  key: string;
  header: string;
  format?: (row: T) => string;
}

function safeFilename(s: string) {
  const ts = new Date().toISOString().slice(0, 10);
  const slug = s.replace(/[^a-z0-9-]/gi, '_').toLowerCase();
  return `${slug}_${ts}`;
}

function escapeCsv(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function valueFor<T>(row: T, col: ExportColumn<T>): string {
  if (col.format) return col.format(row) ?? '';
  const v = (row as Record<string, unknown>)[col.key];
  return v == null ? '' : String(v);
}

async function ensureSharing(): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('Sharing is not available on this device.');
}

// ─── CSV ─────────────────────────────────────────────────────────────────────
async function exportCsv<T>(rows: T[], columns: ExportColumn<T>[], filename: string) {
  const headers = columns.map((c) => c.header).join(',');
  const body = rows.map((r) => columns.map((c) => escapeCsv(valueFor(r, c))).join(',')).join('\n');
  const content = `${headers}\n${body}`;

  const uri = FileSystem.documentDirectory + filename + '.csv';
  await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
  await ensureSharing();
  await Sharing.shareAsync(uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Share CSV export',
    UTI: 'public.comma-separated-values-text',
  });
}

// ─── Excel ───────────────────────────────────────────────────────────────────
async function exportExcel<T>(rows: T[], columns: ExportColumn<T>[], filename: string) {
  const headers = columns.map((c) => c.header);
  const dataRows = rows.map((r) => columns.map((c) => valueFor(r, c)));

  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Patients');

  // base64 for binary safe write
  const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
  const uri = FileSystem.documentDirectory + filename + '.xlsx';
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  await ensureSharing();
  await Sharing.shareAsync(uri, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Share Excel export',
    UTI: 'com.microsoft.excel.xlsx',
  });
}

// ─── PDF ─────────────────────────────────────────────────────────────────────
async function exportPdf<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  filename: string,
  title: string,
) {
  const generatedOn = new Date().toLocaleString();
  const headHtml = columns.map((c) => `<th>${htmlEscape(c.header)}</th>`).join('');
  const bodyHtml = rows
    .map(
      (r) =>
        `<tr>${columns.map((c) => `<td>${htmlEscape(valueFor(r, c))}</td>`).join('')}</tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #0f172a; padding: 24px 28px; font-size: 11px; }
  h1 { font-size: 20px; margin: 0 0 4px; color: #0f172a; }
  .meta { color: #64748b; font-size: 11px; margin-bottom: 18px; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  thead th {
    background: #4361EE; color: #fff; font-weight: 700;
    text-align: left; padding: 8px 10px; border: 1px solid #4361EE;
  }
  tbody td {
    padding: 7px 10px; border: 1px solid #e2e8f0; vertical-align: top;
  }
  tbody tr:nth-child(even) td { background: #f8fafc; }
  .footer { color: #94a3b8; font-size: 9px; margin-top: 16px; text-align: right; }
</style>
</head>
<body>
  <h1>${htmlEscape(title)}</h1>
  <div class="meta">Generated on ${generatedOn} · ${rows.length} records</div>
  <table>
    <thead><tr>${headHtml}</tr></thead>
    <tbody>${bodyHtml}</tbody>
  </table>
  <div class="footer">Smart Dental Desk</div>
</body>
</html>`;

  const { uri: tmpUri } = await Print.printToFileAsync({ html, base64: false });
  // Move into documentDirectory with the desired filename
  const finalUri = FileSystem.documentDirectory + filename + '.pdf';
  try {
    await FileSystem.deleteAsync(finalUri, { idempotent: true });
    await FileSystem.moveAsync({ from: tmpUri, to: finalUri });
  } catch {
    // If move fails (unlikely), fall back to sharing the temp file
  }
  const shareUri = (await FileSystem.getInfoAsync(finalUri)).exists ? finalUri : tmpUri;

  await ensureSharing();
  await Sharing.shareAsync(shareUri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Share PDF export',
    UTI: 'com.adobe.pdf',
  });
}

// ─── Public API ─────────────────────────────────────────────────────────────
export async function exportData<T>(
  format: ExportFormat,
  rows: T[],
  columns: ExportColumn<T>[],
  baseName: string,
  pdfTitle?: string,
) {
  const filename = safeFilename(baseName);
  if (format === 'csv') return exportCsv(rows, columns, filename);
  if (format === 'excel') return exportExcel(rows, columns, filename);
  return exportPdf(rows, columns, filename, pdfTitle ?? baseName);
}
