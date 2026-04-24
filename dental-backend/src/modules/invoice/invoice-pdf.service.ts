import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { formatCurrencyAmount, getCurrencyLocale, getCurrencySymbol } from '../../common/utils/currency.util.js';

// Teal brand colour matching the template in the image
const TEAL = '#0891b2';
const TEAL_DARK = '#0e7490';
const WHITE = '#ffffff';
const TEXT_DARK = '#1e293b';
const TEXT_MID = '#475569';
const TEXT_LIGHT = '#94a3b8';
const BORDER = '#e2e8f0';

interface InvoiceData {
  invoice_number: string;
  created_at: Date;
  gst_number?: string | null;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
  clinic: {
    name: string;
    email: string;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
  };
  branch: {
    name: string;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
  };
  patient: {
    first_name: string;
    last_name: string;
    phone: string;
    email?: string | null;
    date_of_birth?: string | null;
  };
  dentist?: {
    name: string;
    specialization?: string | null;
    license_number?: string | null;
  } | null;
  items: Array<{
    item_type: string;
    description: string;
    procedure?: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    tooth_number?: string | null;
  }>;
  payments: Array<{
    amount: number;
    method: string;
    paid_at: Date;
  }>;
  currency_code?: string;
}

/** Draw a simple tooth silhouette using PDFKit curves */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawToothIcon(doc: any, x: number, y: number, size: number, color: string) {
  const s = size;
  doc.save();
  doc.fillColor(color);
  // Crown (top rounded bumps)
  doc
    .moveTo(x + s * 0.15, y + s * 0.45)
    .bezierCurveTo(x, y + s * 0.35, x, y + s * 0.1, x + s * 0.25, y + s * 0.05)
    .bezierCurveTo(x + s * 0.4, y, x + s * 0.4, y + s * 0.15, x + s * 0.5, y + s * 0.15)
    .bezierCurveTo(x + s * 0.6, y + s * 0.15, x + s * 0.6, y, x + s * 0.75, y + s * 0.05)
    .bezierCurveTo(x + s, y + s * 0.1, x + s, y + s * 0.35, x + s * 0.85, y + s * 0.45)
    // Root (tapers down)
    .bezierCurveTo(x + s * 0.78, y + s * 0.7, x + s * 0.72, y + s, x + s * 0.62, y + s)
    .bezierCurveTo(x + s * 0.55, y + s, x + s * 0.52, y + s * 0.75, x + s * 0.5, y + s * 0.75)
    .bezierCurveTo(x + s * 0.48, y + s * 0.75, x + s * 0.45, y + s, x + s * 0.38, y + s)
    .bezierCurveTo(x + s * 0.28, y + s, x + s * 0.22, y + s * 0.7, x + s * 0.15, y + s * 0.45)
    .closePath()
    .fill();
  doc.restore();
}

@Injectable()
export class InvoicePdfService {
  async generate(data: InvoiceData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        info: {
          Title: `Invoice ${data.invoice_number}`,
          Author: data.clinic.name,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const PAGE_W = doc.page.width;   // 595
      const PAGE_H = doc.page.height;  // 842
      const MARGIN = 40;
      const CONTENT_W = PAGE_W - MARGIN * 2;

      // ── White background ─────────────────────────────────────────────
      doc.rect(0, 0, PAGE_W, PAGE_H).fill(WHITE);

      // ── Header bar ──────────────────────────────────────────────────
      const HEADER_H = 90;
      doc.rect(0, 0, PAGE_W, HEADER_H).fill(TEAL_DARK);

      // Tooth icon + clinic name (left)
      drawToothIcon(doc, MARGIN, 22, 36, 'rgba(255,255,255,0.35)');
      doc
        .fontSize(22)
        .font('Helvetica-Bold')
        .fillColor(WHITE)
        .text(data.clinic.name.toUpperCase(), MARGIN + 44, 30, { width: 260 });

      // Sub-line: branch name or address
      const subLine = data.branch.city ?? data.clinic.city ?? '';
      if (subLine) {
        doc.fontSize(8).font('Helvetica').fillColor('rgba(255,255,255,0.75)')
          .text(subLine.toUpperCase(), MARGIN + 44, 54, { width: 260 });
      }

      // "INVOICE" box (right)
      const INV_BOX_W = 140;
      const INV_BOX_X = PAGE_W - MARGIN - INV_BOX_W;
      doc.roundedRect(INV_BOX_X, 22, INV_BOX_W, 36, 4).fill(TEAL);
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor(WHITE)
        .text('INVOICE', INV_BOX_X, 31, { width: INV_BOX_W, align: 'center' });

      const currencyCode = data.currency_code ?? 'INR';
      const currencyLocale = getCurrencyLocale(currencyCode);

      // ── Invoice meta row (below header) ─────────────────────────────
      const META_Y = HEADER_H + 14;
      const dateStr = new Date(data.created_at).toLocaleDateString(currencyLocale, {
        day: 'numeric', month: 'long', year: 'numeric',
      });

      doc.fontSize(9).font('Helvetica').fillColor(TEXT_MID).text('Invoice #:', INV_BOX_X, META_Y);
      doc.fontSize(9).font('Helvetica-Bold').fillColor(TEXT_DARK).text(data.invoice_number, INV_BOX_X + 58, META_Y);
      doc.fontSize(9).font('Helvetica').fillColor(TEXT_MID).text('Date:', INV_BOX_X, META_Y + 14);
      doc.fontSize(9).font('Helvetica-Bold').fillColor(TEXT_DARK).text(dateStr, INV_BOX_X + 35, META_Y + 14);

      if (data.gst_number) {
        doc.fontSize(9).font('Helvetica').fillColor(TEXT_MID).text('GST No:', INV_BOX_X, META_Y + 28);
        doc.fontSize(9).font('Helvetica-Bold').fillColor(TEXT_DARK).text(data.gst_number, INV_BOX_X + 45, META_Y + 28);
      }

      // ── Divider ──────────────────────────────────────────────────────
      doc.moveTo(MARGIN, META_Y + 42).lineTo(PAGE_W - MARGIN, META_Y + 42).lineWidth(0.5).stroke(BORDER);

      // ── Doctor + Patient info columns ────────────────────────────────
      const INFO_Y = META_Y + 52;
      const COL_W = CONTENT_W / 2 - 10;

      // Doctor / Clinic info (left)
      doc.fontSize(9).font('Helvetica-Bold').fillColor(TEAL_DARK).text('CLINIC INFORMATION', MARGIN, INFO_Y);
      doc.moveTo(MARGIN, INFO_Y + 12).lineTo(MARGIN + COL_W, INFO_Y + 12).lineWidth(1).stroke(TEAL);

      const clinicLines: string[] = [
        data.clinic.name,
        data.branch.address ?? data.clinic.address ?? '',
        [data.branch.city ?? data.clinic.city, data.branch.state ?? data.clinic.state].filter(Boolean).join(', '),
        data.clinic.phone ?? data.branch.phone ?? '',
        data.clinic.email,
      ].filter((l): l is string => Boolean(l));

      let docY = INFO_Y + 18;
      clinicLines.forEach((line, i) => {
        doc
          .fontSize(i === 0 ? 10 : 8.5)
          .font(i === 0 ? 'Helvetica-Bold' : 'Helvetica')
          .fillColor(i === 0 ? TEXT_DARK : TEXT_MID)
          .text(line, MARGIN, docY);
        docY += i === 0 ? 13 : 11;
      });

      if (data.dentist) {
        docY += 6;
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor(TEXT_DARK)
          .text(`Dr. ${data.dentist.name}`, MARGIN, docY);
        docY += 11;
        if (data.dentist.specialization) {
          doc.fontSize(8.5).font('Helvetica').fillColor(TEXT_MID)
            .text(data.dentist.specialization, MARGIN, docY);
          docY += 11;
        }
        if (data.dentist.license_number) {
          doc.fontSize(8.5).font('Helvetica').fillColor(TEXT_MID)
            .text(`License: ${data.dentist.license_number}`, MARGIN, docY);
          docY += 11;
        }
      }

      // Patient info heading (right column)
      const PAT_X = MARGIN + COL_W + 20;
      doc.fontSize(9).font('Helvetica-Bold').fillColor(TEAL_DARK).text('PATIENT INFORMATION', PAT_X, INFO_Y);
      doc.moveTo(PAT_X, INFO_Y + 12).lineTo(PAT_X + COL_W, INFO_Y + 12).lineWidth(1).stroke(TEAL);

      const patName = `${data.patient.first_name} ${data.patient.last_name}`;
      const patLines: string[] = [
        patName,
        data.patient.phone,
        data.patient.email ?? '',
        data.patient.date_of_birth
          ? `DOB: ${new Date(data.patient.date_of_birth).toLocaleDateString(currencyLocale)}`
          : '',
      ].filter((l): l is string => Boolean(l));

      let patY = INFO_Y + 18;
      patLines.forEach((line, i) => {
        doc
          .fontSize(i === 0 ? 10 : 8.5)
          .font(i === 0 ? 'Helvetica-Bold' : 'Helvetica')
          .fillColor(i === 0 ? TEXT_DARK : TEXT_MID)
          .text(line, PAT_X, patY);
        patY += i === 0 ? 13 : 11;
      });

      // ── Items Table ──────────────────────────────────────────────────
      const TABLE_Y = Math.max(docY, patY) + 24;
      const TABLE_HEADER_H = 24;

      // Columns: # | Description | Tooth | Qty | Unit Price | Amount
      const COL = {
        num:   { x: MARGIN,       w: 28 },
        desc:  { x: MARGIN + 28,  w: 228 },
        tooth: { x: MARGIN + 256, w: 48 },
        qty:   { x: MARGIN + 304, w: 36 },
        unit:  { x: MARGIN + 340, w: 72 },
        fee:   { x: MARGIN + 412, w: CONTENT_W - 412 },
      };

      doc.rect(MARGIN, TABLE_Y, CONTENT_W, TABLE_HEADER_H).fill(TEAL);

      const heads = ['#', 'DESCRIPTION', 'TOOTH', 'QTY', 'UNIT PRICE', 'AMOUNT'];
      const cols = Object.values(COL);
      const aligns = ['center', 'left', 'center', 'center', 'right', 'right'] as const;
      heads.forEach((h, i) => {
        doc
          .fontSize(8)
          .font('Helvetica-Bold')
          .fillColor(WHITE)
          .text(h, cols[i].x + 4, TABLE_Y + 8, { width: cols[i].w - 8, align: aligns[i] });
      });

      let rowY = TABLE_Y + TABLE_HEADER_H;
      data.items.forEach((item, idx) => {
        const ROW_H = item.procedure ? 30 : 22;
        const isEven = idx % 2 === 0;
        doc.rect(MARGIN, rowY, CONTENT_W, ROW_H).fill(isEven ? '#f0f9ff' : WHITE);

        const rowNum = String(idx + 1);

        doc.fontSize(8.5).font('Helvetica').fillColor(TEXT_DARK)
          .text(rowNum, cols[0].x + 4, rowY + (ROW_H - 10) / 2, { width: cols[0].w - 8, align: 'center' });

        // Description + procedure sub-line
        const descY = item.procedure ? rowY + 5 : rowY + 7;
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor(TEXT_DARK)
          .text(item.description, cols[1].x + 4, descY, { width: cols[1].w - 8 });
        if (item.procedure) {
          doc.fontSize(7.5).font('Helvetica').fillColor(TEXT_MID)
            .text(item.procedure, cols[1].x + 4, descY + 11, { width: cols[1].w - 8 });
        }

        const numRowData = [
          item.tooth_number ?? '',
          String(item.quantity),
          `${getCurrencySymbol(currencyCode)}${Number(item.unit_price).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}`,
          `${getCurrencySymbol(currencyCode)}${Number(item.total_price).toLocaleString(currencyLocale, { minimumFractionDigits: 2 })}`,
        ];
        const numCols = [cols[2], cols[3], cols[4], cols[5]];
        const numAligns = ['center', 'center', 'right', 'right'] as const;
        numRowData.forEach((val, i) => {
          doc.fontSize(8.5).font('Helvetica').fillColor(TEXT_DARK)
            .text(val, numCols[i].x + 4, rowY + (ROW_H - 10) / 2, { width: numCols[i].w - 8, align: numAligns[i] });
        });

        doc.moveTo(MARGIN, rowY + ROW_H).lineTo(MARGIN + CONTENT_W, rowY + ROW_H).lineWidth(0.5).stroke(BORDER);
        rowY += ROW_H;
      });

      // ── Totals block (right-aligned) ─────────────────────────────────
      const TOT_X = MARGIN + 310;
      const TOT_W = CONTENT_W - 310;
      let totY = rowY + 14;

      const fmt = (n: number) => formatCurrencyAmount(n, currencyCode);

      const totLines: [string, string][] = [['Sub Total', fmt(data.total_amount)]];
      if (data.discount_amount > 0) totLines.push(['Discount', `-${fmt(data.discount_amount)}`]);
      if (data.tax_amount > 0) {
        const base = data.total_amount - data.discount_amount;
        const pct = base > 0 ? ((data.tax_amount / base) * 100).toFixed(1) : '0';
        totLines.push([`Tax (${pct}%)`, fmt(data.tax_amount)]);
      }

      totLines.forEach(([label, val]) => {
        doc.fontSize(8.5).font('Helvetica').fillColor(TEXT_MID)
          .text(label, TOT_X, totY, { width: 90 });
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor(TEXT_DARK)
          .text(val, TOT_X + 90, totY, { width: TOT_W - 94, align: 'right' });
        totY += 14;
      });

      // Thin divider before total
      doc.moveTo(TOT_X, totY + 2).lineTo(TOT_X + TOT_W, totY + 2).lineWidth(0.5).stroke(BORDER);
      totY += 8;

      // TOTAL box
      doc.rect(TOT_X, totY, TOT_W, 30).fill(TEAL);
      doc.fontSize(11).font('Helvetica-Bold').fillColor(WHITE)
        .text('TOTAL', TOT_X + 8, totY + 10, { width: 70 });
      doc.fontSize(13).font('Helvetica-Bold').fillColor(WHITE)
        .text(fmt(data.net_amount), TOT_X, totY + 9, { width: TOT_W - 8, align: 'right' });

      // ── Bottom section: Payment info (left) + Payment history (right) ─
      const BOTTOM_Y = totY + 44;
      const HALF_W = CONTENT_W / 2 - 10;

      // Payment methods accepted (left — mirrors the bank info section in the template)
      doc.fontSize(9).font('Helvetica-Bold').fillColor(TEAL_DARK)
        .text('PAYMENT INFORMATION', MARGIN, BOTTOM_Y);
      doc.moveTo(MARGIN, BOTTOM_Y + 12).lineTo(MARGIN + HALF_W, BOTTOM_Y + 12).lineWidth(1).stroke(TEAL);

      const paidTotal = data.payments.reduce((s, p) => s + Number(p.amount), 0);
      const balance = Number(data.net_amount) - paidTotal;

      const pmtInfoLines: [string, string][] = [
        ['Accepted Methods:', 'Cash, Card, UPI'],
        ['Total Billed:', fmt(data.net_amount)],
        ['Amount Paid:', fmt(paidTotal)],
      ];

      let pmtInfoY = BOTTOM_Y + 18;
      pmtInfoLines.forEach(([label, val]) => {
        doc.fontSize(8.5).font('Helvetica').fillColor(TEXT_MID)
          .text(label, MARGIN, pmtInfoY, { width: 90 });
        doc.fontSize(8.5).font('Helvetica-Bold').fillColor(TEXT_DARK)
          .text(val, MARGIN + 95, pmtInfoY, { width: HALF_W - 95 });
        pmtInfoY += 13;
      });

      if (balance > 0.01) {
        pmtInfoY += 2;
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#b91c1c')
          .text(`Balance Due: ${fmt(balance)}`, MARGIN, pmtInfoY);
      } else {
        pmtInfoY += 2;
        doc.rect(MARGIN, pmtInfoY, 80, 18).fill('#dcfce7');
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#15803d')
          .text('FULLY PAID', MARGIN + 4, pmtInfoY + 4, { width: 72, align: 'center' });
      }

      // Payment history (right column)
      if (data.payments.length > 0) {
        const PMT_X = MARGIN + HALF_W + 20;
        doc.fontSize(9).font('Helvetica-Bold').fillColor(TEAL_DARK)
          .text('PAYMENT HISTORY', PMT_X, BOTTOM_Y);
        doc.moveTo(PMT_X, BOTTOM_Y + 12).lineTo(PMT_X + HALF_W, BOTTOM_Y + 12).lineWidth(1).stroke(TEAL);

        let pmtY = BOTTOM_Y + 18;
        data.payments.forEach((p) => {
          const pDate = new Date(p.paid_at).toLocaleDateString(currencyLocale, {
            day: 'numeric', month: 'short', year: 'numeric',
          });
          doc.fontSize(8.5).font('Helvetica').fillColor(TEXT_MID)
            .text(`${pDate} — ${p.method.toUpperCase()}`, PMT_X, pmtY, { width: HALF_W - 90 });
          doc.fontSize(8.5).font('Helvetica-Bold').fillColor(TEXT_DARK)
            .text(fmt(Number(p.amount)), PMT_X + HALF_W - 85, pmtY, { width: 85, align: 'right' });
          pmtY += 13;
        });
      }

      // ── Footer ───────────────────────────────────────────────────────
      const FOOTER_Y = PAGE_H - 44;
      doc.rect(0, FOOTER_Y - 4, PAGE_W, 48).fill('#f8fafc');
      doc.moveTo(MARGIN, FOOTER_Y - 4).lineTo(PAGE_W - MARGIN, FOOTER_Y - 4).lineWidth(0.5).stroke(BORDER);
      doc
        .fontSize(8)
        .font('Helvetica-Oblique')
        .fillColor(TEXT_LIGHT)
        .text(
          `Thank you for choosing ${data.clinic.name} for your dental care.  |  For inquiries: ${data.clinic.phone ?? data.clinic.email}`,
          MARGIN,
          FOOTER_Y + 4,
          { width: CONTENT_W, align: 'center' },
        );

      doc.end();
    });
  }
}
