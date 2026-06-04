import { CONDITION_COLORS } from './dental-chart-svg.util.js';

// Style palette — kept consistent with the prescription PDF.
const ACCENT = '#0d6efd';
const TEXT_HEAD = '#0d1b2a';
const TEXT_BODY = '#1f2937';
const TEXT_MUTED = '#6b7280';
const HAIRLINE = '#e5e7eb';
const TABLE_HEAD_BG = '#f1f5f9';

export interface DentalChartPagePayload {
  clinicName: string;
  patientName: string;
  /** Pre-rasterised chart image (PNG). */
  png: Buffer;
  conditions: Array<{
    fdi: number;
    tooth_name?: string | null;
    condition: string;
    surface?: string | null;
    severity?: string | null;
    notes?: string | null;
  }>;
  generatedAt?: Date;
}

/**
 * Draw a full dental-chart page (heading, chart image, legend, conditions
 * table) onto the current PDFKit page. The caller is responsible for adding a
 * fresh page first when appending to an existing document — this function
 * assumes it owns the page it draws on. Handles its own pagination for long
 * condition lists.
 *
 * Shared by the prescription PDF (chart appended as an extra page) and the
 * standalone dental-chart PDF so both render identically.
 */
export function drawDentalChartPage(
  doc: PDFKit.PDFDocument,
  payload: DentalChartPagePayload,
): void {
  const W = 595;
  const H = 842;
  const M = 40;
  const CW = W - M * 2;
  const BOTTOM = H - M;

  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  // ─── HEADER ───
  doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(20)
    .text(payload.clinicName, M, 36, { width: CW * 0.7, lineBreak: false });
  doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(9)
    .text('Multi-speciality Dental Clinic', M, 60);
  doc.rect(M, 88, CW, 1.5).fill(ACCENT);
  doc.rect(M, 89.5, CW, 0.5).fill(HAIRLINE);

  doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(13)
    .text('DENTAL CHART', M, 102, { width: CW, align: 'center', characterSpacing: 2 });

  doc.fillColor(TEXT_BODY).font('Helvetica').fontSize(10)
    .text(payload.patientName, M, 124, { width: CW, align: 'center' });
  doc.fillColor(TEXT_MUTED).fontSize(8.5)
    .text(`As of ${fmtDate(payload.generatedAt ?? new Date())}`, M, 138, { width: CW, align: 'center' });

  // ─── CHART IMAGE ───
  const imgTop = 158;
  const imgMaxH = 280;
  try {
    doc.image(payload.png, M, imgTop, { fit: [CW, imgMaxH], align: 'center' });
  } catch {
    // Bad image bytes — skip the visual, the table below still conveys data.
  }

  let cursorY = imgTop + imgMaxH + 8;

  // ─── LEGEND (only conditions present, falls back to full key) ───
  const usedConditions = Array.from(
    new Set(payload.conditions.map((c) => c.condition).filter((name) => CONDITION_COLORS[name])),
  );
  const legendItems = (usedConditions.length > 0
    ? usedConditions
    : Object.keys(CONDITION_COLORS)
  ).map((name) => ({ name, fill: CONDITION_COLORS[name].fill }));

  doc.fillColor(TEXT_MUTED).font('Helvetica-Bold').fontSize(8).text('LEGEND', M, cursorY, { characterSpacing: 1 });
  cursorY += 12;
  let lx = M;
  const swatch = 8;
  for (const item of legendItems) {
    const labelW = doc.font('Helvetica').fontSize(8.5).widthOfString(item.name) + swatch + 10;
    if (lx + labelW > M + CW) {
      lx = M;
      cursorY += 14;
    }
    doc.rect(lx, cursorY, swatch, swatch).fill(item.fill);
    doc.fillColor(TEXT_BODY).font('Helvetica').fontSize(8.5)
      .text(item.name, lx + swatch + 3, cursorY - 0.5, { lineBreak: false });
    lx += labelW;
  }
  cursorY += 22;

  // ─── CONDITIONS TABLE ───
  doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(10)
    .text('Recorded Conditions', M, cursorY);
  cursorY += 16;

  if (payload.conditions.length === 0) {
    doc.fillColor(TEXT_MUTED).font('Helvetica-Oblique').fontSize(9)
      .text('No tooth conditions recorded for this patient.', M, cursorY);
    return;
  }

  const cols = [
    { key: 'tooth', label: 'Tooth', w: CW * 0.18 },
    { key: 'condition', label: 'Condition', w: CW * 0.2 },
    { key: 'surface', label: 'Surface', w: CW * 0.16 },
    { key: 'severity', label: 'Severity', w: CW * 0.16 },
    { key: 'notes', label: 'Notes', w: CW * 0.3 },
  ] as const;
  const rowH = 18;

  const drawHeader = (y: number): number => {
    doc.rect(M, y, CW, rowH).fill(TABLE_HEAD_BG);
    let cx = M;
    doc.fillColor(TEXT_MUTED).font('Helvetica-Bold').fontSize(8);
    for (const col of cols) {
      doc.text(col.label.toUpperCase(), cx + 4, y + 5, { width: col.w - 8, characterSpacing: 0.5 });
      cx += col.w;
    }
    return y + rowH;
  };

  cursorY = drawHeader(cursorY);

  const sorted = [...payload.conditions].sort((a, b) => a.fdi - b.fdi);

  for (const c of sorted) {
    const notesText = c.notes || '—';
    doc.font('Helvetica').fontSize(8.5);
    const notesH = doc.heightOfString(notesText, { width: cols[4].w - 8 });
    const thisRowH = Math.max(rowH, notesH + 8);

    if (cursorY + thisRowH > BOTTOM) {
      doc.addPage({ size: 'A4', margin: 0 });
      cursorY = drawHeader(M);
    }

    const toothLabel = c.tooth_name ? `#${c.fdi} ${c.tooth_name}` : `#${c.fdi}`;
    const values: Record<string, string> = {
      tooth: toothLabel,
      condition: c.condition,
      surface: c.surface || '—',
      severity: c.severity || '—',
      notes: notesText,
    };

    let cx = M;
    doc.fillColor(TEXT_BODY).font('Helvetica').fontSize(8.5);
    for (const col of cols) {
      doc.text(values[col.key], cx + 4, cursorY + 5, { width: col.w - 8 });
      cx += col.w;
    }
    doc.rect(M, cursorY + thisRowH, CW, 0.5).fill(HAIRLINE);
    doc.fillColor(TEXT_BODY);
    cursorY += thisRowH;
  }
}
