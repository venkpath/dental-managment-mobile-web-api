import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

const TEAL = '#0d6efd';
const TEAL_DARK = '#0a58ca';
const WHITE = '#ffffff';
const TEXT_DARK = '#1e293b';
const TEXT_MID = '#475569';
const TEXT_LIGHT = '#94a3b8';
const BORDER = '#dee2e6';
const BG_LIGHT = '#f8f9fa';
const RX_COLOR = '#1a1a2e';

export interface PrescriptionPdfData {
  id: string;
  created_at: Date;
  diagnosis?: string | null;
  instructions?: string | null;
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
    first_name: string;
    last_name: string;
    phone?: string | null;
    email?: string | null;
    date_of_birth?: string | Date | null;
    gender?: string | null;
    mr_number?: string | null;
  };
  dentist: {
    name: string;
    specialization?: string | null;
    qualification?: string | null;
    license_number?: string | null;
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
}

@Injectable()
export class PrescriptionPdfService {
  async generate(data: PrescriptionPdfData): Promise<Buffer> {
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
      const margin = 36;
      const contentWidth = W - margin * 2;

      /* ─── HEADER BAND ─── */
      doc.rect(0, 0, W, 88).fill(TEAL_DARK);

      // Clinic name & speciality
      doc.fillColor(WHITE).fontSize(18).font('Helvetica-Bold')
        .text(data.clinic.name, margin, 18, { width: contentWidth * 0.65, lineBreak: false });
      doc.fillColor('#cfe2ff').fontSize(9).font('Helvetica')
        .text('Multi-speciality Dental Clinic', margin, 38);

      // Clinic contact (top right)
      const contactX = W - margin - 180;
      doc.fillColor(WHITE).fontSize(8).font('Helvetica');
      if (data.branch.phone || data.clinic.phone) {
        doc.text(`📞 ${data.branch.phone || data.clinic.phone}`, contactX, 18, { width: 180, align: 'right' });
      }
      if (data.clinic.email) {
        doc.text(`✉  ${data.clinic.email}`, contactX, 30, { width: 180, align: 'right' });
      }
      const addr = [
        data.branch.address || data.clinic.address,
        data.branch.city || data.clinic.city,
        data.branch.state || data.clinic.state,
      ].filter(Boolean).join(', ');
      if (addr) {
        doc.text(addr, contactX, 42, { width: 180, align: 'right' });
      }
      if (data.clinic.gst_number) {
        doc.fillColor('#cfe2ff').text(`GST: ${data.clinic.gst_number}`, contactX, 54, { width: 180, align: 'right' });
      }

      /* ─── PATIENT INFO STRIP ─── */
      doc.rect(0, 88, W, 2).fill(TEAL);
      doc.rect(0, 90, W, 72).fill('#eaf4fb');

      const patientName = `${data.patient.first_name} ${data.patient.last_name}`;
      const dateStr = new Date(data.created_at).toLocaleDateString('en-IN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });
      const timeStr = new Date(data.created_at).toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true,
      });

      // Calculate age
      let ageStr = '';
      if (data.patient.date_of_birth) {
        const dob = new Date(data.patient.date_of_birth);
        const now = new Date(data.created_at);
        const age = now.getFullYear() - dob.getFullYear() -
          (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
        ageStr = `${age} Years`;
      }

      // Left block: Name, MR No, Doctor
      const pInfoY = 98;
      const labelX = margin;
      const valX = margin + 72;
      doc.fillColor(TEXT_MID).fontSize(8).font('Helvetica');
      doc.text('Name', labelX, pInfoY);
      doc.text('MR No.', labelX, pInfoY + 13);
      doc.text('Dr. Name', labelX, pInfoY + 26);

      doc.fillColor(TEXT_DARK).font('Helvetica-Bold').fontSize(8);
      doc.text(`: ${patientName}`, valX, pInfoY, { width: 160 });
      doc.font('Helvetica').fillColor(TEXT_DARK);
      doc.text(`: ${data.patient.mr_number || data.id.slice(0, 8).toUpperCase()}`, valX, pInfoY + 13);
      doc.text(`: Dr. ${data.dentist.name}`, valX, pInfoY + 26);

      // Right block: Age/Gender, Date/Time, Consultation No
      const midX = W / 2 + 20;
      const val2X = midX + 90;
      doc.fillColor(TEXT_MID).font('Helvetica').fontSize(8);
      doc.text('Age / Gender', midX, pInfoY);
      doc.text('Date / Time', midX, pInfoY + 13);
      doc.text('Consultation No.', midX, pInfoY + 26);

      doc.fillColor(TEXT_DARK).font('Helvetica');
      const genderStr = data.patient.gender ? `/ ${data.patient.gender}` : '';
      doc.text(`: ${ageStr}${genderStr}`, val2X, pInfoY);
      doc.text(`: ${dateStr} ${timeStr}`, val2X, pInfoY + 13);
      doc.text(`: ${data.id.slice(0, 12).toUpperCase()}`, val2X, pInfoY + 26);

      doc.rect(0, 162, W, 1).fill(BORDER);

      /* ─── BODY: two columns ─── */
      let bodyY = 170;
      const leftColW = contentWidth * 0.62;
      const rightColX = margin + leftColW + 14;
      const rightColW = contentWidth - leftColW - 14;

      /* ─── DIAGNOSIS (right column) ─── */
      doc.fillColor(TEXT_DARK).fontSize(9).font('Helvetica-Bold')
        .text('Diagnosis :', rightColX, bodyY);
      bodyY += 14;
      doc.rect(rightColX, bodyY - 2, rightColW, 0.5).fill(BORDER);

      let diagY = bodyY + 4;
      if (data.diagnosis) {
        const diagnoses = data.diagnosis.split(/[,;\n]+/);
        for (const d of diagnoses) {
          const trimmed = d.trim();
          if (trimmed) {
            doc.fillColor(TEXT_MID).fontSize(8).font('Helvetica')
              .text(`• ${trimmed}`, rightColX + 4, diagY, { width: rightColW - 4 });
            diagY += 12;
          }
        }
      }

      /* ─── Rx SYMBOL ─── */
      const rxY = 172;
      doc.fillColor(RX_COLOR).fontSize(32).font('Helvetica-Bold')
        .text('Rx', margin, rxY, { lineBreak: false });

      /* ─── MEDICINES TABLE ─── */
      const tableStartY = rxY + 42;
      const colWidths = [28, 160, 52, 30, 55, 55, 62];
      const colHeaders = ['Sr.No.', 'Medicine Name', 'Regime', 'Qty', 'Duration', 'Route', 'Remark'];
      const tableW = colWidths.reduce((a, b) => a + b, 0);

      // Header row
      doc.rect(margin, tableStartY, tableW, 18).fill(TEAL_DARK);
      let colX = margin;
      doc.fillColor(WHITE).fontSize(7.5).font('Helvetica-Bold');
      for (let i = 0; i < colHeaders.length; i++) {
        doc.text(colHeaders[i], colX + 3, tableStartY + 5, {
          width: colWidths[i] - 6,
          align: i === 0 ? 'center' : 'left',
        });
        colX += colWidths[i];
      }

      // Data rows
      let rowY = tableStartY + 18;
      const items = data.items || [];
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        const rowBg = idx % 2 === 0 ? WHITE : BG_LIGHT;

        // Calculate regime string (e.g. "1-0-1") and route
        const m = item.morning ?? 0;
        const af = item.afternoon ?? 0;
        const ev = item.evening ?? 0;
        const n = item.night ?? 0;
        const hasDosePattern = m || af || ev || n;
        const regime = hasDosePattern ? `${m}-${af}-${ev}${n ? '-' + n : ''}` : (item.frequency || '');
        const route = 'Per Oral';
        const remark = item.notes || 'After Food';

        // Estimate row height
        const medNameLines = Math.ceil((item.medicine_name?.length || 0) / 24);
        const rowH = Math.max(22, medNameLines * 12 + 8);

        doc.rect(margin, rowY, tableW, rowH).fill(rowBg);
        // Column borders
        let bx = margin;
        for (const cw of colWidths) {
          doc.rect(bx, tableStartY, cw, rowY - tableStartY + rowH).stroke(BORDER);
          bx += cw;
        }
        doc.rect(margin, tableStartY, tableW, rowY - tableStartY + rowH).stroke(BORDER);

        colX = margin;
        doc.fillColor(TEXT_DARK).fontSize(8).font('Helvetica');

        // Sr.No
        doc.text(`${idx + 1}`, colX + 3, rowY + 6, { width: colWidths[0] - 6, align: 'center' });
        colX += colWidths[0];

        // Medicine Name (bold) + dosage sub-text
        doc.font('Helvetica-Bold').text(item.medicine_name, colX + 3, rowY + 4, { width: colWidths[1] - 6 });
        if (item.dosage) {
          doc.fillColor(TEXT_MID).font('Helvetica').fontSize(7)
            .text(`(${item.dosage})`, colX + 3, rowY + 14, { width: colWidths[1] - 6 });
        }
        colX += colWidths[1];

        doc.fillColor(TEXT_DARK).fontSize(8).font('Helvetica');
        // Regime
        doc.text(regime, colX + 3, rowY + 6, { width: colWidths[2] - 6 });
        colX += colWidths[2];

        // Qty (blank — to be filled)
        doc.text('', colX + 3, rowY + 6, { width: colWidths[3] - 6 });
        colX += colWidths[3];

        // Duration
        doc.text(item.duration || '', colX + 3, rowY + 6, { width: colWidths[4] - 6 });
        colX += colWidths[4];

        // Route
        doc.text(route, colX + 3, rowY + 6, { width: colWidths[5] - 6 });
        colX += colWidths[5];

        // Remark
        doc.text(remark, colX + 3, rowY + 6, { width: colWidths[6] - 6 });

        rowY += rowH;
      }

      /* ─── INSTRUCTIONS / PLAN OF TREATMENT ─── */
      let planY = rowY + 16;
      if (data.instructions) {
        doc.fillColor(TEXT_DARK).fontSize(9).font('Helvetica-Bold')
          .text('Plan Of Treatment', margin, planY);
        doc.rect(margin, planY + 12, contentWidth, 0.5).fill(BORDER);
        planY += 18;

        const lines = data.instructions.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed) {
            doc.fillColor(TEXT_MID).fontSize(8).font('Helvetica')
              .text(trimmed, margin + 8, planY, { width: contentWidth - 8 });
            planY += 13;
          }
        }
        planY += 4;
      }

      /* ─── FOLLOW UP ─── */
      planY += 10;
      doc.fillColor(TEXT_DARK).fontSize(9).font('Helvetica-Bold')
        .text('Follow Up After', margin, planY, { continued: true })
        .fillColor(TEXT_MID).font('Helvetica')
        .text(' : ___________________');

      /* ─── DOCTOR SIGNATURE (bottom right) ─── */
      const sigY = Math.max(planY + 40, H - 160);
      const sigX = W - margin - 200;

      doc.rect(sigX - 8, sigY - 8, 208, 110).fill('#f0f7ff').stroke('#cfe2ff');
      doc.fillColor(TEXT_DARK).fontSize(10).font('Helvetica-Bold')
        .text(`Dr. ${data.dentist.name}`, sigX, sigY, { width: 200, align: 'center' });
      if (data.dentist.specialization) {
        doc.fillColor(TEAL).fontSize(8.5).font('Helvetica')
          .text(data.dentist.specialization, sigX, sigY + 15, { width: 200, align: 'center' });
      }
      if (data.dentist.qualification) {
        doc.fillColor(TEXT_MID).fontSize(8).font('Helvetica')
          .text(data.dentist.qualification, sigX, sigY + 27, { width: 200, align: 'center' });
      }
      if (data.dentist.license_number) {
        doc.fillColor(TEXT_MID).fontSize(8)
          .text(`Reg No. : ${data.dentist.license_number}`, sigX, sigY + 39, { width: 200, align: 'center' });
      }
      doc.moveTo(sigX, sigY + 56).lineTo(sigX + 200, sigY + 56).stroke('#cfe2ff');
      doc.fillColor(TEXT_LIGHT).fontSize(7.5).font('Helvetica')
        .text('Authorised Signature', sigX, sigY + 60, { width: 200, align: 'center' });

      /* ─── END OF PRESCRIPTION ─── */
      const endY = Math.max(sigY + 120, H - 80);
      doc.fillColor(TEXT_LIGHT).fontSize(7.5).font('Helvetica')
        .text('— — — — — — — — — — — End of Prescription — — — — — — — — — — —', 0, endY, {
          width: W,
          align: 'center',
        });

      /* ─── FOOTER ─── */
      const footerH = 52;
      const footerY = H - footerH;
      doc.rect(0, footerY, W, footerH).fill(TEXT_DARK);

      // Three columns
      const colWf = W / 3;

      // Col 1: Book Appointment
      doc.fillColor(WHITE).fontSize(8).font('Helvetica-Bold')
        .text('Book an Appointment', margin, footerY + 10, { width: colWf - margin });
      if (data.branch.phone || data.clinic.phone) {
        doc.fillColor(TEXT_LIGHT).fontSize(8).font('Helvetica')
          .text(data.branch.phone || data.clinic.phone || '', margin, footerY + 24, { width: colWf - margin });
      }

      // Col 2: Address (centered)
      doc.fillColor(WHITE).fontSize(8).font('Helvetica-Bold')
        .text('Address', colWf, footerY + 10, { width: colWf, align: 'center' });
      const fullAddr = [
        data.branch.address || data.clinic.address,
        data.branch.city || data.clinic.city,
        data.branch.state || data.clinic.state,
      ].filter(Boolean).join(', ');
      if (fullAddr) {
        doc.fillColor(TEXT_LIGHT).fontSize(7).font('Helvetica')
          .text(fullAddr, colWf, footerY + 23, { width: colWf, align: 'center' });
      }

      // Col 3: Visit Us (right aligned)
      doc.fillColor(WHITE).fontSize(8).font('Helvetica-Bold')
        .text('Visit Us', W - colWf, footerY + 10, { width: colWf - margin, align: 'right' });
      if (data.clinic.email) {
        doc.fillColor(TEXT_LIGHT).fontSize(7.5).font('Helvetica')
          .text(data.clinic.email, W - colWf, footerY + 24, { width: colWf - margin, align: 'right' });
      }

      doc.end();
    });
  }
}
