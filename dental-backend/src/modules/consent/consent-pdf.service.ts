import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import type { ConsentTemplateBody } from './default-templates.js';

const ACCENT = '#0d6efd';
const TEXT_HEAD = '#0d1b2a';
const TEXT_BODY = '#1f2937';
const TEXT_MUTED = '#6b7280';
const TEXT_FAINT = '#9ca3af';
const HAIRLINE = '#e5e7eb';
const CARD_BG = '#f8fafc';

export interface ConsentPdfData {
  template_title: string;
  template_version: number;
  language: string; // ISO code like 'en'/'hi'/'ta' — printed in footer
  body: ConsentTemplateBody;
  /** Procedure description — interpolated into body.procedure_clause's `{procedure}`. */
  procedure?: string | null;
  treatment_summary?: string | null;
  generated_at: Date;
  clinic: {
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    logo_image?: Buffer | null;
  };
  branch: {
    name: string;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
  };
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    age?: number | null;
    gender?: string | null;
    date_of_birth?: Date | string | null;
    guardian_name?: string | null;
  };
  doctor?: {
    name: string;
    license_number?: string | null;
    signature_image?: Buffer | null;
  } | null;
  /** Set when the form is being rendered as the final SIGNED copy. */
  signature?: {
    method: 'digital' | 'upload';
    signed_by_name: string;
    signed_at: Date;
    /** Captured signature image (PNG) — embedded above the patient signature line. */
    image?: Buffer | null;
    witness_name?: string | null;
  } | null;
}

@Injectable()
export class ConsentPdfService {
  async generate(data: ConsentPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        info: { Title: data.template_title, Author: data.clinic.name },
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.renderHeader(doc, data);
      this.renderTitle(doc, data);
      let y = this.renderPatientCard(doc, data, 178);
      y = this.renderProcedureClause(doc, data, y + 12);
      y = this.renderAnaesthesiaOptions(doc, data, y);
      y = this.renderSections(doc, data, y);
      y = this.renderConsentStatement(doc, data, y);
      this.renderSignatureLines(doc, data, Math.max(y + 16, 660));
      this.renderFooter(doc, data);

      doc.end();
    });
  }

  // ─── Layout helpers ──────────────────────────────────────────────────

  private static readonly M = 40;
  private get M() { return ConsentPdfService.M; }

  /** Ensure y has at least `needed` pts of room before page bottom; otherwise add page. */
  private ensureSpace(doc: PDFKit.PDFDocument, y: number, needed: number): number {
    const bottom = doc.page.height - 60; // leave room for footer
    if (y + needed > bottom) {
      doc.addPage();
      this.renderHeader(doc, undefined);
      return 100;
    }
    return y;
  }

  private renderHeader(doc: PDFKit.PDFDocument, data?: ConsentPdfData): void {
    const M = this.M;
    const W = doc.page.width;
    const CW = W - M * 2;

    // Accent strip
    doc.rect(M, 88, CW, 1.5).fill(ACCENT);
    doc.rect(M, 89.5, CW, 0.5).fill(HAIRLINE);

    if (!data) return; // continuation pages keep accent only

    const LOGO_BOX = 48;
    let titleX = M;
    if (data.clinic.logo_image) {
      try {
        doc.image(data.clinic.logo_image, M, 30, { fit: [LOGO_BOX, LOGO_BOX] });
        titleX = M + LOGO_BOX + 12;
      } catch {
        /* ignore bad image bytes */
      }
    }

    doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(20)
      .text(data.clinic.name, titleX, 36, { width: CW * 0.6 - (titleX - M), lineBreak: false });
    const subLine = data.branch.city ?? data.clinic.city ?? '';
    if (subLine) {
      doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(9).text(subLine, titleX, 60);
    }

    // Right-aligned contact block
    doc.fillColor(TEXT_BODY).font('Helvetica').fontSize(8.5);
    let rY = 36;
    if (data.clinic.phone || data.branch.phone) {
      doc.text(data.clinic.phone || data.branch.phone || '', M, rY, { width: CW, align: 'right' });
      rY += 12;
    }
    if (data.clinic.email) {
      doc.text(data.clinic.email, M, rY, { width: CW, align: 'right' });
      rY += 12;
    }
    const addr = [
      data.branch.address || data.clinic.address,
      data.branch.city || data.clinic.city,
      data.clinic.state,
    ].filter(Boolean).join(', ');
    if (addr) doc.fillColor(TEXT_MUTED).text(addr, M, rY, { width: CW, align: 'right' });
  }

  private renderTitle(doc: PDFKit.PDFDocument, data: ConsentPdfData): void {
    const M = this.M;
    const W = doc.page.width;
    const CW = W - M * 2;
    doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(14)
      .text(data.template_title.toUpperCase(), M, 110, { width: CW, align: 'center', characterSpacing: 1.5 });

    if (data.body.intro) {
      doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(9.5)
        .text(data.body.intro, M, 134, { width: CW, align: 'center' });
    }
  }

  private renderPatientCard(doc: PDFKit.PDFDocument, data: ConsentPdfData, startY: number): number {
    const M = this.M;
    const CW = doc.page.width - M * 2;
    const cardH = 60;

    doc.rect(M, startY, CW, cardH).fill(CARD_BG).stroke(HAIRLINE);

    const padX = 14;
    const colW = (CW - padX * 2) / 3;
    const drawKV = (label: string, value: string, x: number, y: number, w: number) => {
      doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(8).text(label, x, y, { width: w });
      doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(10).text(value || '—', x, y + 11, { width: w, ellipsis: true, lineBreak: false });
    };

    const r1 = startY + 10;
    const r2 = startY + 32;
    const c1 = M + padX, c2 = M + padX + colW + 6, c3 = M + padX + (colW + 6) * 2;
    const fullName = `${data.patient.first_name} ${data.patient.last_name}`.trim();
    const ageGender = [
      data.patient.age != null ? `${data.patient.age} yrs` : null,
      data.patient.gender || null,
    ].filter(Boolean).join(' / ');
    const today = data.generated_at.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const shortId = data.patient.id.slice(0, 8).toUpperCase();

    drawKV('Patient', fullName, c1, r1, colW);
    drawKV('Age / Gender', ageGender, c2, r1, colW);
    drawKV('Patient ID', shortId, c3, r1, colW);
    drawKV('Mobile', data.patient.phone || '—', c1, r2, colW);
    drawKV('Date', today, c2, r2, colW);
    drawKV('Branch', data.branch.name || '—', c3, r2, colW);

    return startY + cardH;
  }

  private renderProcedureClause(doc: PDFKit.PDFDocument, data: ConsentPdfData, startY: number): number {
    if (!data.body.procedure_clause) return startY;
    const M = this.M;
    const CW = doc.page.width - M * 2;
    const text = data.body.procedure_clause.replace('{procedure}', data.procedure || '________________________________');

    doc.fillColor(TEXT_BODY).font('Helvetica').fontSize(10);
    const h = doc.heightOfString(text, { width: CW });
    doc.text(text, M, startY, { width: CW, align: 'left' });
    return startY + h + 6;
  }

  private renderAnaesthesiaOptions(doc: PDFKit.PDFDocument, data: ConsentPdfData, startY: number): number {
    const opts = data.body.anaesthesia_options;
    if (!opts || opts.length === 0) return startY;
    const M = this.M;
    let y = this.ensureSpace(doc, startY, opts.length * 16 + 8);
    doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(9.5).text('Anaesthesia options', M, y);
    y += 13;
    doc.fillColor(TEXT_BODY).font('Helvetica').fontSize(10);
    for (const opt of opts) {
      // Empty checkbox + label
      doc.lineWidth(0.8).strokeColor('#374151').rect(M + 2, y + 2, 9, 9).stroke();
      doc.text(opt, M + 18, y, { lineBreak: false });
      y += 14;
    }
    return y + 4;
  }

  private renderSections(doc: PDFKit.PDFDocument, data: ConsentPdfData, startY: number): number {
    const M = this.M;
    const CW = doc.page.width - M * 2;
    let y = startY;

    for (const section of data.body.sections) {
      y = this.ensureSpace(doc, y, 30);
      doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(10.5).text(section.heading, M, y);
      y += 14;

      if (section.paragraphs) {
        doc.fillColor(TEXT_BODY).font('Helvetica').fontSize(10);
        for (const p of section.paragraphs) {
          const h = doc.heightOfString(p, { width: CW, align: 'justify' });
          y = this.ensureSpace(doc, y, h + 4);
          doc.text(p, M, y, { width: CW, align: 'justify' });
          y += h + 4;
        }
      }

      if (section.bullets) {
        doc.fillColor(TEXT_BODY).font('Helvetica').fontSize(10);
        for (const b of section.bullets) {
          const h = doc.heightOfString(b, { width: CW - 16, align: 'left' });
          y = this.ensureSpace(doc, y, h + 4);
          doc.fillColor(TEXT_MUTED).text('•', M + 2, y, { lineBreak: false });
          doc.fillColor(TEXT_BODY).text(b, M + 14, y, { width: CW - 16 });
          y += h + 3;
        }
      }
      y += 6;
    }
    return y;
  }

  private renderConsentStatement(doc: PDFKit.PDFDocument, data: ConsentPdfData, startY: number): number {
    const M = this.M;
    const CW = doc.page.width - M * 2;
    const text = data.body.consent_statement;
    const h = doc.fontSize(10).heightOfString(text, { width: CW });
    let y = this.ensureSpace(doc, startY, h + (data.body.doctor_statement ? 50 : 20));

    doc.rect(M, y, CW, h + 12).fillAndStroke('#fffaf0', '#facc15');
    doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(10).text(text, M + 8, y + 6, { width: CW - 16, align: 'left' });
    y += h + 18;

    if (data.body.doctor_statement) {
      const dh = doc.font('Helvetica-Oblique').fontSize(9.5).heightOfString(data.body.doctor_statement, { width: CW });
      y = this.ensureSpace(doc, y, dh + 12);
      doc.fillColor(TEXT_MUTED).text(data.body.doctor_statement, M, y, { width: CW });
      y += dh + 8;
    }
    return y;
  }

  private renderSignatureLines(doc: PDFKit.PDFDocument, data: ConsentPdfData, startY: number): void {
    const M = this.M;
    const CW = doc.page.width - M * 2;
    const lines = data.body.signature_lines.filter((k) => k !== 'doctor');
    if (!lines.length) return;

    const y = this.ensureSpace(doc, startY, 110);
    const slotW = CW / lines.length;
    const labelMap: Record<string, string> = {
      patient: 'Patient signature',
      guardian: 'Parent / Guardian',
      witness: 'Witness',
      doctor: 'Doctor / Treating dentist',
    };

    lines.forEach((kind, idx) => {
      const x = M + idx * slotW;
      const lineY = y + 36;

      // Optional embedded signature image — only on the kind that matches
      // the captured signature.
      if (kind === 'patient' || kind === 'guardian') {
        if (data.signature?.image) {
          try {
            doc.image(data.signature.image, x + 12, y, { fit: [slotW - 24, 36], align: 'center', valign: 'bottom' });
          } catch { /* ignore */ }
        }
      }

      // Signature line
      doc.lineWidth(0.7).strokeColor('#374151')
        .moveTo(x + 12, lineY).lineTo(x + slotW - 12, lineY).stroke();

      doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(8.5)
        .text(labelMap[kind] ?? kind, x, lineY + 4, { width: slotW, align: 'center' });

      // Filled name + date when signed
      let nameLine = '';
      if (kind === 'patient' || kind === 'guardian') {
        nameLine = data.signature?.signed_by_name ?? '';
      }
      if (nameLine) {
        doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(9).text(nameLine, x, lineY + 14, { width: slotW, align: 'center' });
      }
      if ((kind === 'patient' || kind === 'guardian') && data.signature?.signed_at) {
        const d = new Date(data.signature.signed_at);
        doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(8.5)
          .text(d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            x, lineY + 26, { width: slotW, align: 'center' });
      }
    });
  }

  private renderFooter(doc: PDFKit.PDFDocument, data: ConsentPdfData): void {
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      const W = doc.page.width;
      const M = this.M;
      const y = doc.page.height - 32;
      doc.fillColor(TEXT_FAINT).font('Helvetica').fontSize(7.5)
        .text(
          `${data.template_title} • v${data.template_version} • ${data.language.toUpperCase()} • Generated ${data.generated_at.toLocaleString('en-IN')}`,
          M,
          y,
          { width: W - M * 2, align: 'left', lineBreak: false },
        )
        .text(`Page ${i + 1} of ${range.count}`, M, y, { width: W - M * 2, align: 'right', lineBreak: false });
    }
  }
}
