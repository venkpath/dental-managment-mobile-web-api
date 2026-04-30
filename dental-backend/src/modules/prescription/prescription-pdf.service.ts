import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { formatDoctorName } from '../../common/utils/name.util.js';

// Monochrome palette — single thin accent line, the rest is black on white
// with hairlines and a tinted patient card. Mirrors the Medicover sample.
const ACCENT = '#0d6efd';        // single thin underline + signature line
const TEXT_HEAD = '#0d1b2a';     // headings + key data
const TEXT_BODY = '#1f2937';     // regular body text
const TEXT_MUTED = '#6b7280';    // labels
const TEXT_FAINT = '#9ca3af';    // footer text
const HAIRLINE = '#e5e7eb';
const CARD_BG = '#f8fafc';
const TABLE_HEAD_BG = '#f1f5f9';

/**
 * Custom-template zone — coordinates are stored as fractions (0..1) of the
 * notepad image's natural dimensions so re-uploading a higher-DPI scan does
 * not silently break alignment. The renderer multiplies by page width/height.
 */
export interface PrescriptionTemplateZone {
  x: number;
  y: number;
  w: number;
  h: number;
  font_size?: number;
  align?: 'left' | 'center' | 'right';
  line_height?: number;
  /** Optional fixed text to print before the field value (e.g. "#", "+91 "). */
  prefix?: string;
  /** Optional fixed text to print after the field value (e.g. " yrs", " / M"). */
  suffix?: string;
  /**
   * If true, prepend a built-in label like "Patient: " / "Age: " before the
   * value. Defaults to **false** because most clinic pads already have those
   * labels pre-printed and we don't want to double-print them.
   */
  show_label?: boolean;
}

export interface PrescriptionTemplateConfig {
  version: 1;
  image: { width_px: number; height_px: number };
  page_size?: 'A4' | 'A5' | 'LETTER';
  zones: {
    patient_name: PrescriptionTemplateZone;
    age?: PrescriptionTemplateZone;
    gender?: PrescriptionTemplateZone;
    date: PrescriptionTemplateZone;
    mobile?: PrescriptionTemplateZone;
    patient_id?: PrescriptionTemplateZone;
    body: PrescriptionTemplateZone;
    signature?: PrescriptionTemplateZone;
  };
}

const PAGE_DIMS_PT: Record<NonNullable<PrescriptionTemplateConfig['page_size']>, [number, number]> = {
  A4: [595, 842],
  A5: [420, 595],
  LETTER: [612, 792],
};

export interface PrescriptionPdfData {
  id: string;
  created_at: Date;
  diagnosis?: string | null;
  instructions?: string | null;
  chief_complaint?: string | null;
  past_dental_history?: string | null;
  allergies_medical_history?: string | null;
  /** From the linked ClinicalVisit if any — printed in the Follow Up After section. */
  review_after_date?: string | Date | null;
  clinic: {
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    gst_number?: string | null;
  };
  branch: {
    name: string;
    phone?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
  };
  patient: {
    /** Patient UUID — used to derive a short human-readable UHID for printing. */
    id: string;
    first_name: string;
    last_name: string;
    phone?: string | null;
    email?: string | null;
    date_of_birth?: string | Date | null;
    /** Stored age in years — used as fallback when date_of_birth is null. */
    age?: number | null;
    gender?: string | null;
  };
  dentist: {
    name: string;
    specialization?: string | null;
    qualification?: string | null;
    license_number?: string | null;
    /** Pre-fetched signature image bytes — printed above the doctor's name. */
    signature_image?: Buffer | null;
  };
  items: Array<{
    medicine_name: string;
    dosage?: string | null;
    frequency?: string | null;
    duration?: string | null;
    morning?: number | null;
    afternoon?: number | null;
    evening?: number | null;
    night?: number | null;
    notes?: string | null;
  }>;
  /** Treatments performed during the linked consultation. Rendered above Rx. */
  treatments?: Array<{
    procedure: string;
    tooth_number?: string | null;
    notes?: string | null;
    status?: string | null;
  }>;
  /** Optional custom-notepad rendering. When set the PDF is generated with
   *  text overlaid onto the clinic's uploaded letterhead image instead of
   *  the default Smart Dental Desk layout. `withBackground=false` produces
   *  text-only output for clinics feeding their physical pre-printed pad
   *  through the printer. */
  template?: {
    config: PrescriptionTemplateConfig;
    imageBuffer: Buffer;
    withBackground: boolean;
  };
}

@Injectable()
export class PrescriptionPdfService {
  /** Top-level entry point — picks the custom-template renderer when a clinic
   *  branch has uploaded its own notepad, otherwise renders the default
   *  Smart Dental Desk layout. */
  async generate(data: PrescriptionPdfData): Promise<Buffer> {
    if (data.template?.config && data.template?.imageBuffer) {
      return this.generateCustomTemplate(data, data.template);
    }
    return this.generateDefault(data);
  }

  private async generateDefault(data: PrescriptionPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        info: {
          Title: `Prescription — ${data.patient.first_name} ${data.patient.last_name}`,
          Author: data.clinic.name,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = 595; // A4 width in points
      const H = 842; // A4 height in points
      const M = 40;  // page margin
      const CW = W - M * 2;

      const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      });

      // ─── HEADER ───
      // Clinic name (bold) + tagline; thin hairline below.
      doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(20)
        .text(data.clinic.name, M, 36, { width: CW * 0.7, lineBreak: false });
      doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(9)
        .text('Multi-speciality Dental Clinic', M, 60);

      // Right-aligned clinic contact lines (phone / email / address)
      const headerRX = M;
      const headerRW = CW;
      doc.fillColor(TEXT_BODY).fontSize(8.5).font('Helvetica');
      const phone = data.branch.phone || data.clinic.phone || '';
      const email = data.clinic.email || '';
      const addr = [
        data.branch.address || data.clinic.address,
        data.branch.city || data.clinic.city,
        data.branch.state || data.clinic.state,
      ].filter(Boolean).join(', ');

      let rY = 36;
      if (phone) {
        doc.text(phone, headerRX, rY, { width: headerRW, align: 'right' });
        rY += 12;
      }
      if (email) {
        doc.text(email, headerRX, rY, { width: headerRW, align: 'right' });
        rY += 12;
      }
      if (addr) {
        doc.fillColor(TEXT_MUTED).text(addr, headerRX, rY, { width: headerRW, align: 'right' });
      }

      // Thin accent line + hairline beneath header
      doc.rect(M, 88, CW, 1.5).fill(ACCENT);
      doc.rect(M, 89.5, CW, 0.5).fill(HAIRLINE);

      // ─── DOCUMENT TITLE ───
      doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(13)
        .text('PRESCRIPTION', M, 102, { width: CW, align: 'center', characterSpacing: 2 });

      // ─── PATIENT / DOCTOR CARD ───
      // Left column: patient details (Name, Age/Gender, Mobile, Visit Date, UHID)
      // Right column: doctor details (Name, Reg ID)
      // Hairline divider between the two columns to make ownership clear.
      const cardY = 124;
      const cardH = 110; // 5 rows on the left at ~18pt + padding
      doc.rect(M, cardY, CW, cardH).fill(CARD_BG).stroke(HAIRLINE);

      const patientName = `${data.patient.first_name} ${data.patient.last_name}`;
      const dateStr = fmtDate(new Date(data.created_at));

      // Calculate age
      let ageStr = '';
      if (data.patient.date_of_birth) {
        const dob = new Date(data.patient.date_of_birth);
        const now = new Date(data.created_at);
        const age = now.getFullYear() - dob.getFullYear() -
          (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
        ageStr = `${age} Years`;
      }
      const genderStr = data.patient.gender || '';
      const ageGender = [ageStr, genderStr].filter(Boolean).join(' / ') || '—';

      // Derive a short, stable, human-readable UHID from the patient UUID —
      // not the full 36-char string. Same patient always renders the same code.
      const uhid = `P-${data.patient.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;

      const drawKV = (label: string, value: string, x: number, y: number, labelW: number, valueW: number) => {
        doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(8.5)
          .text(label, x, y, { width: labelW });
        doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(9)
          .text(value || '—', x + labelW, y, { width: valueW, ellipsis: true, lineBreak: false });
      };

      // Layout: left column is wider (more rows + longer labels);
      // right column is narrower and holds just the doctor.
      const padX = 16;
      const dividerX = M + Math.round(CW * 0.6);

      // Vertical divider between patient and doctor columns
      doc.rect(dividerX, cardY + 10, 0.5, cardH - 20).fill(HAIRLINE);

      // ── LEFT: Patient ──
      const leftX = M + padX;
      const leftColW = dividerX - leftX - 12;
      const leftLabelW = 78;
      const leftValueW = leftColW - leftLabelW - 4;

      const rowGap = 18;
      const r0 = cardY + 12;
      drawKV('Patient',     patientName,                leftX, r0 + rowGap * 0, leftLabelW, leftValueW);
      drawKV('Age / Gender', ageGender,                 leftX, r0 + rowGap * 1, leftLabelW, leftValueW);
      drawKV('Mobile',      data.patient.phone || '—', leftX, r0 + rowGap * 2, leftLabelW, leftValueW);
      drawKV('Visit Date',  dateStr,                    leftX, r0 + rowGap * 3, leftLabelW, leftValueW);
      drawKV('UHID',        uhid,                       leftX, r0 + rowGap * 4, leftLabelW, leftValueW);

      // ── RIGHT: Doctor ──
      const rightX = dividerX + 12;
      const rightColW = M + CW - rightX - padX;
      const rightLabelW = 60;
      const rightValueW = rightColW - rightLabelW - 4;

      // Small "DOCTOR" eyebrow above the doctor block
      doc.fillColor(TEXT_MUTED).font('Helvetica-Bold').fontSize(7.5)
        .text('DOCTOR', rightX, cardY + 12, { characterSpacing: 1 });
      doc.rect(rightX, cardY + 24, 24, 1).fill(ACCENT);

      const drR0 = cardY + 32;
      drawKV('Name',   formatDoctorName(data.dentist.name),       rightX, drR0 + rowGap * 0, rightLabelW, rightValueW);
      drawKV('Reg ID', data.dentist.license_number || '—', rightX, drR0 + rowGap * 1, rightLabelW, rightValueW);

      // ─── HELPERS for section heading + body text ───
      let cursorY = cardY + cardH + 16;

      const sectionHeading = (label: string, y: number): number => {
        doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(10)
          .text(label.toUpperCase(), M, y, { characterSpacing: 1 });
        // Thin accent underline
        doc.rect(M, y + 14, 32, 1.2).fill(ACCENT);
        doc.rect(M + 32, y + 14, CW - 32, 0.5).fill(HAIRLINE);
        return y + 22;
      };

      const labeledLine = (label: string, value: string, y: number): number => {
        doc.fillColor(TEXT_MUTED).font('Helvetica-Bold').fontSize(8.5)
          .text(label, M, y, { continued: false });
        doc.fillColor(TEXT_BODY).font('Helvetica').fontSize(9);
        const valY = y + 11;
        const consumed = doc.heightOfString(value, { width: CW });
        doc.text(value, M, valY, { width: CW });
        return valY + consumed + 6;
      };

      // ─── ASSESSMENT SECTION ───
      const hasAssessment =
        !!(data.chief_complaint || data.diagnosis || data.past_dental_history || data.allergies_medical_history);
      if (hasAssessment) {
        cursorY = sectionHeading('Assessment', cursorY);
        if (data.chief_complaint) {
          cursorY = labeledLine('Chief Complaint', data.chief_complaint, cursorY);
        }
        if (data.diagnosis) {
          cursorY = labeledLine('Diagnosis', data.diagnosis, cursorY);
        }
        if (data.past_dental_history) {
          cursorY = labeledLine('Past Dental History', data.past_dental_history, cursorY);
        }
        if (data.allergies_medical_history) {
          cursorY = labeledLine('Allergies / Medical History', data.allergies_medical_history, cursorY);
        }
        cursorY += 6;
      }

      // ─── TREATMENTS PERFORMED ───
      const treatments = data.treatments || [];
      if (treatments.length > 0) {
        cursorY = sectionHeading('Treatments', cursorY);

        const tCols = [22, 220, 70, CW - 22 - 220 - 70];
        const tHeaders = ['#', 'Procedure', 'Tooth', 'Notes'];
        const tableW = tCols.reduce((a, b) => a + b, 0);

        // Header row
        doc.rect(M, cursorY, tableW, 18).fill(TABLE_HEAD_BG);
        let hx = M;
        doc.fillColor(TEXT_HEAD).fontSize(8).font('Helvetica-Bold');
        for (let i = 0; i < tHeaders.length; i++) {
          doc.text(tHeaders[i], hx + 6, cursorY + 5, {
            width: tCols[i] - 12,
            align: i === 0 || i === 2 ? 'center' : 'left',
            lineBreak: false,
          });
          hx += tCols[i];
        }
        doc.rect(M, cursorY + 18, tableW, 0.5).fill(HAIRLINE);
        cursorY += 18;

        // Data rows — height grows with notes
        for (let idx = 0; idx < treatments.length; idx++) {
          const t = treatments[idx];
          const procedureLines = Math.max(1, Math.ceil((t.procedure || '').length / 32));
          const noteLines = t.notes ? Math.max(1, Math.ceil((t.notes || '').length / 28)) : 0;
          const rowH = Math.max(20, procedureLines * 11 + noteLines * 10 + 8);

          if (idx % 2 === 1) {
            doc.rect(M, cursorY, tableW, rowH).fill(CARD_BG);
          }

          let bx = M;
          // # column
          doc.fillColor(TEXT_BODY).fontSize(8.5).font('Helvetica')
            .text(`${idx + 1}`, bx + 6, cursorY + 6, { width: tCols[0] - 12, align: 'center' });
          bx += tCols[0];

          // Procedure (bold) + status sub-line
          doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(8.5)
            .text(t.procedure || '—', bx + 6, cursorY + 5, { width: tCols[1] - 12 });
          if (t.status) {
            doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(7)
              .text(t.status.replace(/_/g, ' '), bx + 6, cursorY + 5 + procedureLines * 11, { width: tCols[1] - 12 });
          }
          bx += tCols[1];

          // Tooth
          doc.fillColor(TEXT_BODY).font('Helvetica').fontSize(8.5)
            .text(t.tooth_number || '—', bx + 6, cursorY + 6, { width: tCols[2] - 12, align: 'center' });
          bx += tCols[2];

          // Notes
          doc.fillColor(TEXT_BODY).font('Helvetica').fontSize(8.5)
            .text(t.notes || '—', bx + 6, cursorY + 5, { width: tCols[3] - 12 });

          cursorY += rowH;
          doc.rect(M, cursorY, tableW, 0.4).fill(HAIRLINE);
        }
        cursorY += 12;
      }

      // ─── Rx — MEDICINES ───
      cursorY = sectionHeading('Rx', cursorY);

      const items = data.items || [];
      if (items.length === 0) {
        doc.fillColor(TEXT_MUTED).font('Helvetica-Oblique').fontSize(9)
          .text('No medicines prescribed.', M, cursorY);
        cursorY += 16;
      } else {
        const colWidths = [26, 178, 60, 36, 64, 64, 87];
        const colHeaders = ['#', 'Medicine', 'Regime', 'Qty', 'Duration', 'Route', 'Remark'];
        const tableW = colWidths.reduce((a, b) => a + b, 0);

        // Header row
        doc.rect(M, cursorY, tableW, 18).fill(TABLE_HEAD_BG);
        let cx = M;
        doc.fillColor(TEXT_HEAD).fontSize(8).font('Helvetica-Bold');
        for (let i = 0; i < colHeaders.length; i++) {
          doc.text(colHeaders[i], cx + 6, cursorY + 5, {
            width: colWidths[i] - 12,
            align: i === 0 || i === 3 ? 'center' : 'left',
            lineBreak: false,
          });
          cx += colWidths[i];
        }
        // Hairline under header
        doc.rect(M, cursorY + 18, tableW, 0.5).fill(HAIRLINE);
        cursorY += 18;

        // Body rows — alternate very-faint shading
        for (let idx = 0; idx < items.length; idx++) {
          const item = items[idx];
          const m = item.morning ?? 0;
          const af = item.afternoon ?? 0;
          const ev = item.evening ?? 0;
          const n = item.night ?? 0;
          const hasDosePattern = m || af || ev || n;
          const regime = hasDosePattern
            ? `${m}-${af}-${ev}${n ? '-' + n : ''}`
            : (item.frequency || '—');
          const route = 'Per Oral';
          const remark = item.notes || 'After Food';

          // Estimate row height (medicine name may wrap)
          const medName = item.medicine_name || '';
          const medLines = Math.max(1, Math.ceil(medName.length / 26));
          const baseH = item.dosage ? medLines * 11 + 14 : medLines * 11 + 6;
          const rowH = Math.max(20, baseH);

          if (idx % 2 === 1) {
            doc.rect(M, cursorY, tableW, rowH).fill(CARD_BG);
          }

          let bx = M;
          doc.fillColor(TEXT_BODY).fontSize(8.5).font('Helvetica');

          // # column
          doc.text(`${idx + 1}`, bx + 6, cursorY + 6, { width: colWidths[0] - 12, align: 'center' });
          bx += colWidths[0];

          // Medicine
          doc.font('Helvetica-Bold').fillColor(TEXT_HEAD)
            .text(medName, bx + 6, cursorY + 5, { width: colWidths[1] - 12 });
          if (item.dosage) {
            doc.font('Helvetica').fontSize(7.5).fillColor(TEXT_MUTED)
              .text(item.dosage, bx + 6, cursorY + 5 + medLines * 11, { width: colWidths[1] - 12 });
          }
          bx += colWidths[1];

          doc.fillColor(TEXT_BODY).fontSize(8.5).font('Helvetica');
          doc.text(regime, bx + 6, cursorY + 6, { width: colWidths[2] - 12 });
          bx += colWidths[2];

          doc.text('', bx + 6, cursorY + 6, { width: colWidths[3] - 12, align: 'center' });
          bx += colWidths[3];

          doc.text(item.duration || '—', bx + 6, cursorY + 6, { width: colWidths[4] - 12 });
          bx += colWidths[4];

          doc.text(route, bx + 6, cursorY + 6, { width: colWidths[5] - 12 });
          bx += colWidths[5];

          doc.text(remark, bx + 6, cursorY + 6, { width: colWidths[6] - 12 });

          cursorY += rowH;
          // Hairline between rows
          doc.rect(M, cursorY, tableW, 0.4).fill(HAIRLINE);
        }
        cursorY += 12;
      }

      // ─── INSTRUCTIONS ───
      if (data.instructions) {
        cursorY = sectionHeading('General Instructions', cursorY);
        doc.fillColor(TEXT_BODY).font('Helvetica').fontSize(9);
        const lines = data.instructions.split('\n').filter((l) => l.trim());
        for (const line of lines) {
          doc.text(`• ${line.trim()}`, M + 4, cursorY, { width: CW - 4 });
          cursorY = doc.y + 2;
        }
        cursorY += 6;
      }

      // ─── FOLLOW UP ───
      cursorY += 4;
      doc.fillColor(TEXT_MUTED).font('Helvetica-Bold').fontSize(8.5)
        .text('FOLLOW UP ON', M, cursorY, { characterSpacing: 1 });
      const followUpValue = data.review_after_date
        ? ` : ${fmtDate(new Date(data.review_after_date))}`
        : ' : ___________________';
      doc.fillColor(TEXT_BODY).font('Helvetica').fontSize(9)
        .text(followUpValue, M + 110, cursorY);

      // ─── DOCTOR SIGNATURE BLOCK (right side) ───
      // Layout (top → bottom):
      //   1. Signature image (if uploaded) — above the line
      //   2. Thin accent baseline                     ← signature rests on this
      //   3. Dr. {name}     (bold)
      //   4. Reg No. {license_number}                 ← below the name
      //   5. Qualification · Specialization           (smaller, optional)
      const sigBoxW = 200;
      const sigBoxH = 28; // image area above the baseline
      const sigBlockY = Math.min(Math.max(cursorY + 60, H - 200), H - 160);
      const sigX = W - M - sigBoxW;
      const baselineY = sigBlockY + sigBoxH;

      // Signature image — draw above the baseline, centered, capped to box
      if (data.dentist.signature_image) {
        try {
          doc.image(data.dentist.signature_image, sigX, sigBlockY, {
            fit: [sigBoxW, sigBoxH],
            align: 'center',
            valign: 'bottom',
          });
        } catch {
          // Bad image format — skip silently rather than failing the whole PDF
        }
      }

      // Baseline (thin accent line, always drawn so the block reads as a signature area)
      doc.rect(sigX, baselineY, sigBoxW, 0.5).fill(ACCENT);

      // Doctor name
      doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(10)
        .text(formatDoctorName(data.dentist.name), sigX, baselineY + 6, { width: sigBoxW, align: 'center' });

      // Reg No. (printed BELOW the name, per requested layout)
      let metaY = baselineY + 20;
      if (data.dentist.license_number) {
        doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(8)
          .text(`Reg No. ${data.dentist.license_number}`, sigX, metaY, { width: sigBoxW, align: 'center' });
        metaY += 12;
      }

      // Qualification / Specialization (extra context, smaller)
      const subParts: string[] = [];
      if (data.dentist.qualification) subParts.push(data.dentist.qualification);
      if (data.dentist.specialization) subParts.push(data.dentist.specialization);
      if (subParts.length > 0) {
        doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(7.5)
          .text(subParts.join(' · '), sigX, metaY, { width: sigBoxW, align: 'center' });
      }

      // ─── FOOTER ───
      const footerY = H - 40;
      doc.rect(M, footerY - 10, CW, 0.5).fill(HAIRLINE);

      const colWf = CW / 3;
      doc.fillColor(TEXT_FAINT).font('Helvetica').fontSize(7.5);
      // Left
      doc.text(`${data.clinic.name}${data.dentist.license_number ? ` · Reg No. ${data.dentist.license_number}` : ''}`,
        M, footerY, { width: colWf, align: 'left' });
      // Center
      if (phone) {
        doc.text(phone, M + colWf, footerY, { width: colWf, align: 'center' });
      }
      // Right
      if (email) {
        doc.text(email, M + colWf * 2, footerY, { width: colWf, align: 'right' });
      }

      doc.end();
    });
  }

  /**
   * Render onto a clinic-specific notepad scan. Text is positioned at the
   * fractional zone coordinates the clinic configured in the template
   * designer. When the body content overflows the body zone, additional
   * pages are added (capped at 3) and the background is redrawn so each
   * page reads as a complete prescription sheet.
   *
   * `withBackground=false` produces text-only output for clinics that feed
   * their pre-printed physical pad through the printer.
   */
  private async generateCustomTemplate(
    data: PrescriptionPdfData,
    template: { config: PrescriptionTemplateConfig; imageBuffer: Buffer; withBackground: boolean },
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const { config, imageBuffer, withBackground } = template;
      const pageSize = config.page_size ?? 'A4';
      const [basePageW, basePageH] = PAGE_DIMS_PT[pageSize];
      const isLandscape = config.image.width_px > config.image.height_px;
      const pgW = isLandscape ? basePageH : basePageW;
      const pgH = isLandscape ? basePageW : basePageH;

      const doc = new PDFDocument({
        size: pageSize,
        layout: isLandscape ? 'landscape' : 'portrait',
        margin: 0,
        info: {
          Title: `Prescription — ${data.patient.first_name} ${data.patient.last_name}`,
          Author: data.clinic.name,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const drawBackground = () => {
        if (!withBackground) return;
        try {
          doc.image(imageBuffer, 0, 0, { width: pgW, height: pgH });
        } catch {
          // Bad image bytes — render text-only rather than failing the PDF.
        }
      };

      const fmtDate = (d: Date) => d.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      });

      // Built-in label per zone, used only when zone.show_label is true.
      // Kept short so it fits inside narrow header zones on most pads.
      const LABELS: Record<string, string> = {
        patient_name: 'Name: ',
        age: 'Age: ',
        gender: 'Sex: ',
        date: 'Date: ',
        mobile: 'Mobile: ',
        patient_id: 'ID: ',
      };

      const renderField = (
        zoneKey: string,
        zone: PrescriptionTemplateZone | undefined,
        value: string,
      ) => {
        if (!zone) return;
        const label = zone.show_label ? (LABELS[zoneKey] ?? '') : '';
        const composed = `${label}${zone.prefix ?? ''}${value ?? ''}${zone.suffix ?? ''}`;
        if (!composed.trim()) return;
        const x = zone.x * pgW;
        const y = zone.y * pgH;
        const w = zone.w * pgW;
        const h = zone.h * pgH;
        doc.fillColor('#000').font('Helvetica').fontSize(zone.font_size ?? 10);
        doc.text(composed, x, y, {
          width: w,
          height: h,
          lineBreak: false,
          ellipsis: true,
          align: zone.align ?? 'left',
        });
      };

      // Normalize gender to a single letter (M/F/O). Patient.gender is free
      // text in the DB, so handle common variants — full words, single letters,
      // and lowercase — without throwing on unexpected values.
      const shortGender = (g: string | null | undefined): string => {
        if (!g) return '';
        const s = g.trim().toLowerCase();
        if (s.startsWith('m')) return 'M';
        if (s.startsWith('f')) return 'F';
        if (s.startsWith('o')) return 'O';
        return g.charAt(0).toUpperCase();
      };

      // ── Page 1 background ──
      drawBackground();

      // ── Header fields (single-line, top of pad) ──
      const patientName = `${data.patient.first_name} ${data.patient.last_name}`;
      const dateStr = fmtDate(new Date(data.created_at));

      // Age comes from DOB if available, otherwise the stored `age` column.
      // Patients added with only an age (common for walk-ins) would otherwise
      // print blank in the Age zone.
      let ageStr = '';
      if (data.patient.date_of_birth) {
        const dob = new Date(data.patient.date_of_birth);
        const now = new Date(data.created_at);
        const age = now.getFullYear() - dob.getFullYear() -
          (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
        ageStr = `${age}`;
      } else if (typeof data.patient.age === 'number' && data.patient.age > 0) {
        ageStr = `${data.patient.age}`;
      }
      const uhid = `P-${data.patient.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;

      renderField('patient_name', config.zones.patient_name, patientName);
      renderField('age', config.zones.age, ageStr);
      renderField('gender', config.zones.gender, shortGender(data.patient.gender));
      renderField('date', config.zones.date, dateStr);
      renderField('mobile', config.zones.mobile, data.patient.phone ?? '');
      renderField('patient_id', config.zones.patient_id, uhid);

      // ── Body zone: assessment + treatments + Rx + instructions ──
      // Built as a queue of blocks so we can paginate cleanly when content
      // overflows the configured body height.
      // 'labeled' is a body line with a bold prefix (e.g. "Chief Complaint:")
      // followed by regular-weight content. Used for the Assessment section
      // so the field names stand out visually without needing full headings.
      type Block =
        | { kind: 'heading'; text: string }
        | { kind: 'line'; text: string }
        | { kind: 'labeled'; label: string; text: string }
        | { kind: 'spacer'; text: string };
      const blocks: Block[] = [];

      const pushAssessment = (label: string, value?: string | null) => {
        if (!value) return;
        blocks.push({ kind: 'labeled', label: `${label}: `, text: value });
      };

      const hasAnyAssessment = !!(
        data.chief_complaint || data.diagnosis ||
        data.past_dental_history || data.allergies_medical_history
      );
      if (hasAnyAssessment) {
        blocks.push({ kind: 'heading', text: 'Assessment' });
        pushAssessment('Chief Complaint', data.chief_complaint);
        pushAssessment('Diagnosis', data.diagnosis);
        pushAssessment('Past History', data.past_dental_history);
        pushAssessment('Allergies', data.allergies_medical_history);
        blocks.push({ kind: 'spacer', text: '' });
      }

      const treatments = data.treatments ?? [];
      if (treatments.length > 0) {
        blocks.push({ kind: 'heading', text: 'Treatments Performed' });
        for (const t of treatments) {
          const tooth = t.tooth_number ? ` (Tooth #${t.tooth_number})` : '';
          const notes = t.notes ? ` — ${t.notes}` : '';
          blocks.push({ kind: 'line', text: `• ${t.procedure}${tooth}${notes}` });
        }
        blocks.push({ kind: 'spacer', text: '' });
      }

      const items = data.items ?? [];
      if (items.length > 0) {
        blocks.push({ kind: 'heading', text: 'Rx' });
        items.forEach((item, idx) => {
          const m = item.morning ?? 0;
          const af = item.afternoon ?? 0;
          const ev = item.evening ?? 0;
          const n = item.night ?? 0;
          const hasDosePattern = m || af || ev || n;
          const regime = hasDosePattern
            ? `${m}-${af}-${ev}${n ? '-' + n : ''}`
            : (item.frequency ?? '');
          const parts = [
            item.medicine_name,
            item.dosage,
            regime,
            item.duration,
          ].filter((s) => s && String(s).trim().length > 0);
          const notes = item.notes ? ` (${item.notes})` : '';
          blocks.push({ kind: 'line', text: `${idx + 1}. ${parts.join(', ')}${notes}` });
        });
        blocks.push({ kind: 'spacer', text: '' });
      }

      if (data.instructions) {
        blocks.push({ kind: 'heading', text: 'General Instructions' });
        const lines = data.instructions.split('\n').map((l) => l.trim()).filter(Boolean);
        for (const line of lines) blocks.push({ kind: 'line', text: `• ${line}` });
        blocks.push({ kind: 'spacer', text: '' });
      }

      if (data.review_after_date) {
        blocks.push({
          kind: 'line',
          text: `Follow up on: ${fmtDate(new Date(data.review_after_date))}`,
        });
      }

      // Layout body blocks with manual pagination
      const body = config.zones.body;
      const bodyX = body.x * pgW;
      const bodyY = body.y * pgH;
      const bodyW = body.w * pgW;
      const bodyH = body.h * pgH;
      const fontSize = body.font_size ?? 10;
      // Section headings are noticeably larger AND bold so "Assessment",
      // "Rx", "Treatments Performed" etc. stand out from the body lines.
      const headingSize = Math.round(fontSize * 1.25) + 1;
      const lineGap = ((body.line_height ?? 1.3) - 1) * fontSize;

      const bodyBottom = bodyY + bodyH;
      const MAX_PAGES = 3;
      let pagesRendered = 1;
      let cursorY = bodyY;

      const measureBlock = (b: Block): number => {
        if (b.kind === 'spacer') return Math.max(4, fontSize * 0.4);
        const isHeading = b.kind === 'heading';
        doc.font(isHeading ? 'Helvetica-Bold' : 'Helvetica').fontSize(isHeading ? headingSize : fontSize);
        const measureText = b.kind === 'labeled' ? `${b.label}${b.text}` : b.text;
        const measured = doc.heightOfString(measureText || ' ', { width: bodyW, lineGap });
        return measured + (isHeading ? 8 : 2);
      };

      const drawBlock = (b: Block, y: number) => {
        if (b.kind === 'spacer') return;
        if (b.kind === 'heading') {
          doc.fillColor('#000').font('Helvetica-Bold').fontSize(headingSize);
          doc.text(b.text, bodyX, y + 4, { width: bodyW, lineGap });
          const textHeight = doc.heightOfString(b.text, { width: bodyW, lineGap });
          const underlineY = y + 4 + textHeight + 1;
          doc.moveTo(bodyX, underlineY)
            .lineTo(bodyX + Math.min(bodyW, 180), underlineY)
            .lineWidth(0.6)
            .strokeColor('#000')
            .stroke();
          return;
        }
        if (b.kind === 'labeled') {
          // Inline bold label, then continue with regular weight on the same
          // wrapped paragraph. PDFKit's `continued: true` handles the flow.
          doc.fillColor('#000').font('Helvetica-Bold').fontSize(fontSize);
          doc.text(b.label, bodyX, y, { width: bodyW, lineGap, continued: true });
          doc.fillColor('#1f2937').font('Helvetica').fontSize(fontSize);
          doc.text(b.text, { width: bodyW, lineGap });
          return;
        }
        doc.fillColor('#1f2937').font('Helvetica').fontSize(fontSize);
        doc.text(b.text, bodyX, y, { width: bodyW, lineGap });
      };

      for (const block of blocks) {
        const blockH = measureBlock(block);
        if (cursorY + blockH > bodyBottom) {
          if (pagesRendered >= MAX_PAGES) break;
          doc.addPage({
            size: pageSize,
            layout: isLandscape ? 'landscape' : 'portrait',
            margin: 0,
          });
          drawBackground();
          pagesRendered += 1;
          cursorY = bodyY;
        }
        drawBlock(block, cursorY);
        cursorY += blockH;
      }

      // ── Signature ──
      const sig = config.zones.signature;
      const docName = formatDoctorName(data.dentist.name);
      if (sig) {
        const sx = sig.x * pgW;
        const sy = sig.y * pgH;
        const sw = sig.w * pgW;
        const sh = sig.h * pgH;
        if (data.dentist.signature_image) {
          try {
            doc.image(data.dentist.signature_image, sx, sy, {
              fit: [sw, sh * 0.6],
              align: 'center',
            });
          } catch {
            // Bad signature bytes — fall through and just print the name.
          }
        }
        const nameY = sy + sh * 0.6;
        doc.fillColor('#000').font('Helvetica-Bold').fontSize(sig.font_size ?? 10)
          .text(docName, sx, nameY, { width: sw, align: sig.align ?? 'center' });
        if (data.dentist.license_number) {
          doc.fillColor('#666').font('Helvetica').fontSize((sig.font_size ?? 10) - 2)
            .text(`Reg No. ${data.dentist.license_number}`, sx, nameY + (sig.font_size ?? 10) + 2,
              { width: sw, align: sig.align ?? 'center' });
        }
      } else if (cursorY + fontSize * 3 < bodyBottom) {
        // No signature zone configured — append doctor sign-off as the last
        // line inside the body zone, right-aligned.
        cursorY += 6;
        doc.fillColor('#000').font('Helvetica-Bold').fontSize(fontSize)
          .text(`— ${docName}`, bodyX, cursorY, { width: bodyW, align: 'right' });
        if (data.dentist.license_number) {
          cursorY += fontSize + 2;
          doc.fillColor('#666').font('Helvetica').fontSize(fontSize - 1)
            .text(`Reg No. ${data.dentist.license_number}`, bodyX, cursorY,
              { width: bodyW, align: 'right' });
        }
      }

      doc.end();
    });
  }
}
