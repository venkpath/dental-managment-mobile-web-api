import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { formatCurrencyAmountPdfSafe, getCurrencyLocale } from '../../common/utils/currency.util.js';

// Monochrome palette — single thin accent line, hairlines, tinted patient card.
// Mirrors the prescription PDF styling for a consistent clinic identity.
const ACCENT = '#0d6efd';
const ACCENT_SOFT = '#dbeafe';
const TEXT_HEAD = '#0d1b2a';
const TEXT_BODY = '#1f2937';
const TEXT_MUTED = '#6b7280';
const TEXT_FAINT = '#9ca3af';
const HAIRLINE = '#e5e7eb';
const CARD_BG = '#f8fafc';
const TABLE_HEAD_BG = '#f1f5f9';
const PAID_BG = '#dcfce7';
const PAID_FG = '#15803d';
const DUE_FG = '#b91c1c';

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

      const W = doc.page.width;   // 595
      const H = doc.page.height;  // 842
      const M = 40;
      const CW = W - M * 2;

      const currencyCode = data.currency_code ?? 'INR';
      const currencyLocale = getCurrencyLocale(currencyCode);
      const fmt = (n: number) => formatCurrencyAmountPdfSafe(n, currencyCode);

      // ─── HEADER ───
      doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(20)
        .text(data.clinic.name, M, 36, { width: CW * 0.7, lineBreak: false });
      const subLine = data.branch.city ?? data.clinic.city ?? '';
      if (subLine) {
        doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(9)
          .text(subLine, M, 60);
      }

      // Right: clinic contact
      doc.fillColor(TEXT_BODY).fontSize(8.5).font('Helvetica');
      const phone = data.clinic.phone || data.branch.phone || '';
      const email = data.clinic.email || '';
      const addr = [
        data.branch.address || data.clinic.address,
        data.branch.city || data.clinic.city,
        data.branch.state || data.clinic.state,
      ].filter(Boolean).join(', ');

      let rY = 36;
      if (phone) { doc.text(phone, M, rY, { width: CW, align: 'right' }); rY += 12; }
      if (email) { doc.text(email, M, rY, { width: CW, align: 'right' }); rY += 12; }
      if (addr) {
        doc.fillColor(TEXT_MUTED).text(addr, M, rY, { width: CW, align: 'right' });
      }

      // Accent line + hairline beneath header
      doc.rect(M, 88, CW, 1.5).fill(ACCENT);
      doc.rect(M, 89.5, CW, 0.5).fill(HAIRLINE);

      // ─── DOCUMENT TITLE + INVOICE META ───
      doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(13)
        .text('INVOICE', M, 102, { width: CW, align: 'center', characterSpacing: 2 });

      // Invoice number + date row, right-aligned under title
      const metaY = 122;
      const dateStr = new Date(data.created_at).toLocaleDateString(currencyLocale, {
        day: '2-digit', month: 'short', year: 'numeric',
      });
      const metaItems: [string, string][] = [
        ['Invoice #', data.invoice_number],
        ['Date', dateStr],
      ];
      if (data.gst_number) metaItems.push(['GST No', data.gst_number]);

      let mX = W - M;
      for (let i = metaItems.length - 1; i >= 0; i--) {
        const [k, v] = metaItems[i];
        const valW = doc.font('Helvetica-Bold').fontSize(9).widthOfString(v);
        const labW = doc.font('Helvetica').fontSize(9).widthOfString(`${k}: `);
        const blockW = labW + valW + 18;
        mX -= blockW;
        doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(9)
          .text(`${k}:`, mX, metaY, { lineBreak: false });
        doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(9)
          .text(v, mX + labW, metaY, { lineBreak: false });
      }

      // ─── PATIENT / CLINIC CARD ───
      const cardY = 144;
      const cardH = 76;
      doc.rect(M, cardY, CW, cardH).fill(CARD_BG).stroke(HAIRLINE);

      const padX = 16;
      const colW = (CW - padX * 2) / 2;
      const labelW = 78;
      const valueW = colW - labelW - 8;
      const leftX = M + padX;
      const rightX = M + padX + colW + 8;

      const drawKV = (label: string, value: string, x: number, y: number) => {
        doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(8.5)
          .text(label, x, y, { width: labelW });
        doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(9)
          .text(value || '—', x + labelW, y, { width: valueW, ellipsis: true, lineBreak: false });
      };

      const r1 = cardY + 12;
      const r2 = cardY + 30;
      const r3 = cardY + 48;
      const patName = `${data.patient.first_name} ${data.patient.last_name}`;
      const dob = data.patient.date_of_birth
        ? new Date(data.patient.date_of_birth).toLocaleDateString(currencyLocale)
        : '';

      // Left column: Patient details
      drawKV('Patient',  patName, leftX, r1);
      drawKV('Mobile',   data.patient.phone || '—', leftX, r2);
      drawKV('Email',    data.patient.email || '—', leftX, r3);

      // Right column: Doctor + DOB + Branch
      drawKV('Doctor',   data.dentist ? `Dr. ${data.dentist.name}` : '—', rightX, r1);
      drawKV('DOB',      dob || '—', rightX, r2);
      drawKV('Branch',   data.branch.name || '—', rightX, r3);

      // ─── ITEMS TABLE ───
      let cursorY = cardY + cardH + 22;

      const colDef = [
        { key: 'num',   w: 28,  align: 'center' as const, head: '#' },
        { key: 'desc',  w: 218, align: 'left'   as const, head: 'Description' },
        { key: 'tooth', w: 48,  align: 'center' as const, head: 'Tooth' },
        { key: 'qty',   w: 36,  align: 'center' as const, head: 'Qty' },
        { key: 'unit',  w: 80,  align: 'right'  as const, head: 'Unit Price' },
        { key: 'amt',   w: CW - 410, align: 'right' as const, head: 'Amount' },
      ];
      const tableW = colDef.reduce((s, c) => s + c.w, 0);

      // Header row
      doc.rect(M, cursorY, tableW, 20).fill(TABLE_HEAD_BG);
      let cx = M;
      doc.fillColor(TEXT_HEAD).fontSize(8).font('Helvetica-Bold');
      for (const c of colDef) {
        doc.text(c.head.toUpperCase(), cx + 6, cursorY + 6, {
          width: c.w - 12, align: c.align, characterSpacing: 0.5,
        });
        cx += c.w;
      }
      doc.rect(M, cursorY + 20, tableW, 0.5).fill(HAIRLINE);
      cursorY += 20;

      // Data rows
      for (let idx = 0; idx < data.items.length; idx++) {
        const item = data.items[idx];
        const rowH = item.procedure ? 28 : 22;
        if (idx % 2 === 1) {
          doc.rect(M, cursorY, tableW, rowH).fill(CARD_BG);
        }

        let bx = M;
        // #
        doc.fillColor(TEXT_BODY).fontSize(8.5).font('Helvetica')
          .text(`${idx + 1}`, bx + 6, cursorY + 6, { width: colDef[0].w - 12, align: 'center' });
        bx += colDef[0].w;

        // Description (bold) + procedure sub-line
        doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(8.5)
          .text(item.description, bx + 6, cursorY + 5, { width: colDef[1].w - 12 });
        if (item.procedure) {
          doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(7.5)
            .text(item.procedure, bx + 6, cursorY + 16, { width: colDef[1].w - 12 });
        }
        bx += colDef[1].w;

        // Tooth
        doc.fillColor(TEXT_BODY).font('Helvetica').fontSize(8.5)
          .text(item.tooth_number || '—', bx + 6, cursorY + 6, { width: colDef[2].w - 12, align: 'center' });
        bx += colDef[2].w;

        // Qty
        doc.text(String(item.quantity), bx + 6, cursorY + 6, { width: colDef[3].w - 12, align: 'center' });
        bx += colDef[3].w;

        // Unit Price
        doc.text(fmt(Number(item.unit_price)), bx + 6, cursorY + 6, { width: colDef[4].w - 12, align: 'right' });
        bx += colDef[4].w;

        // Amount
        doc.font('Helvetica-Bold').fillColor(TEXT_HEAD)
          .text(fmt(Number(item.total_price)), bx + 6, cursorY + 6, { width: colDef[5].w - 12, align: 'right' });

        cursorY += rowH;
        doc.rect(M, cursorY, tableW, 0.4).fill(HAIRLINE);
      }

      // ─── TOTALS BLOCK (right-aligned) ───
      const totX = M + tableW - 240;
      const totW = 240;
      let totY = cursorY + 12;

      const totLines: [string, string][] = [['Sub Total', fmt(data.total_amount)]];
      if (data.discount_amount > 0) totLines.push(['Discount', `-${fmt(data.discount_amount)}`]);
      if (data.tax_amount > 0) {
        const base = data.total_amount - data.discount_amount;
        const pct = base > 0 ? ((data.tax_amount / base) * 100).toFixed(1) : '0';
        totLines.push([`Tax (${pct}%)`, fmt(data.tax_amount)]);
      }

      for (const [label, val] of totLines) {
        doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(9)
          .text(label, totX, totY, { width: 110 });
        doc.fillColor(TEXT_BODY).font('Helvetica').fontSize(9)
          .text(val, totX + 110, totY, { width: totW - 110, align: 'right' });
        totY += 14;
      }

      // Hairline, then TOTAL row
      doc.rect(totX, totY + 2, totW, 0.5).fill(HAIRLINE);
      totY += 8;

      doc.rect(totX, totY, totW, 26).fill(ACCENT);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10)
        .text('TOTAL', totX + 12, totY + 9, { width: 80, characterSpacing: 1 });
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11)
        .text(fmt(data.net_amount), totX, totY + 8, { width: totW - 12, align: 'right' });

      // ─── PAYMENT INFO + HISTORY ───
      const bottomY = totY + 44;
      const halfW = (CW - 20) / 2;

      // Section heading helper
      const sectionH = (label: string, x: number, y: number, w: number) => {
        doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(10)
          .text(label.toUpperCase(), x, y, { characterSpacing: 1 });
        doc.rect(x, y + 14, 32, 1.2).fill(ACCENT);
        doc.rect(x + 32, y + 14, w - 32, 0.5).fill(HAIRLINE);
      };

      // Payment info (left)
      sectionH('Payment Information', M, bottomY, halfW);

      const paidTotal = data.payments.reduce((s, p) => s + Number(p.amount), 0);
      const balance = Number(data.net_amount) - paidTotal;

      const pmtInfo: [string, string][] = [
        ['Accepted Methods', 'Cash, Card, UPI'],
        ['Total Billed',     fmt(data.net_amount)],
        ['Amount Paid',      fmt(paidTotal)],
      ];

      let pY = bottomY + 24;
      for (const [k, v] of pmtInfo) {
        doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(8.5)
          .text(k, M, pY, { width: 110 });
        doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(9)
          .text(v, M + 110, pY, { width: halfW - 110 });
        pY += 13;
      }

      pY += 4;
      if (balance > 0.01) {
        doc.fillColor(DUE_FG).font('Helvetica-Bold').fontSize(10)
          .text(`Balance Due: ${fmt(balance)}`, M, pY);
      } else {
        doc.rect(M, pY, 84, 20).fill(PAID_BG);
        doc.fillColor(PAID_FG).font('Helvetica-Bold').fontSize(9)
          .text('FULLY PAID', M + 4, pY + 6, { width: 76, align: 'center', characterSpacing: 1 });
      }

      // Payment history (right)
      const histX = M + halfW + 20;
      sectionH('Payment History', histX, bottomY, halfW);

      let hY = bottomY + 24;
      if (data.payments.length === 0) {
        doc.fillColor(TEXT_MUTED).font('Helvetica-Oblique').fontSize(9)
          .text('No payments yet.', histX, hY);
      } else {
        for (const p of data.payments) {
          const pDate = new Date(p.paid_at).toLocaleDateString(currencyLocale, {
            day: '2-digit', month: 'short', year: 'numeric',
          });
          doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(8.5)
            .text(`${pDate} · ${p.method.toUpperCase()}`, histX, hY, { width: halfW - 90 });
          doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(9)
            .text(fmt(Number(p.amount)), histX + halfW - 90, hY, { width: 90, align: 'right' });
          hY += 13;
        }
      }

      // ─── FOOTER ───
      const footerY = H - 40;
      doc.rect(M, footerY - 10, CW, 0.5).fill(HAIRLINE);

      const colWf = CW / 3;
      doc.fillColor(TEXT_FAINT).font('Helvetica').fontSize(7.5);
      doc.text(data.clinic.name, M, footerY, { width: colWf, align: 'left' });
      if (phone) {
        doc.text(phone, M + colWf, footerY, { width: colWf, align: 'center' });
      }
      if (email) {
        doc.text(email, M + colWf * 2, footerY, { width: colWf, align: 'right' });
      }
      // Tagline below
      doc.fillColor(TEXT_FAINT).font('Helvetica-Oblique').fontSize(7.5)
        .text(`Thank you for choosing ${data.clinic.name} for your dental care.`,
          M, footerY + 12, { width: CW, align: 'center' });

      // Suppress unused-variable warning for ACCENT_SOFT (reserved for future badges)
      void ACCENT_SOFT;

      doc.end();
    });
  }
}
