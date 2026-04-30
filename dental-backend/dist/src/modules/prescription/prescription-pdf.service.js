"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrescriptionPdfService = void 0;
const common_1 = require("@nestjs/common");
const pdfkit_1 = __importDefault(require("pdfkit"));
const name_util_js_1 = require("../../common/utils/name.util.js");
const ACCENT = '#0d6efd';
const TEXT_HEAD = '#0d1b2a';
const TEXT_BODY = '#1f2937';
const TEXT_MUTED = '#6b7280';
const TEXT_FAINT = '#9ca3af';
const HAIRLINE = '#e5e7eb';
const CARD_BG = '#f8fafc';
const TABLE_HEAD_BG = '#f1f5f9';
const PAGE_DIMS_PT = {
    A4: [595, 842],
    A5: [420, 595],
    LETTER: [612, 792],
};
let PrescriptionPdfService = class PrescriptionPdfService {
    async generate(data) {
        if (data.template?.config && data.template?.imageBuffer) {
            return this.generateCustomTemplate(data, data.template);
        }
        return this.generateDefault(data);
    }
    async generateDefault(data) {
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({
                size: 'A4',
                margin: 0,
                info: {
                    Title: `Prescription — ${data.patient.first_name} ${data.patient.last_name}`,
                    Author: data.clinic.name,
                },
            });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            const W = 595;
            const H = 842;
            const M = 40;
            const CW = W - M * 2;
            const fmtDate = (d) => d.toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
            });
            doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(20)
                .text(data.clinic.name, M, 36, { width: CW * 0.7, lineBreak: false });
            doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(9)
                .text('Multi-speciality Dental Clinic', M, 60);
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
            doc.rect(M, 88, CW, 1.5).fill(ACCENT);
            doc.rect(M, 89.5, CW, 0.5).fill(HAIRLINE);
            doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(13)
                .text('PRESCRIPTION', M, 102, { width: CW, align: 'center', characterSpacing: 2 });
            const cardY = 124;
            const cardH = 110;
            doc.rect(M, cardY, CW, cardH).fill(CARD_BG).stroke(HAIRLINE);
            const patientName = `${data.patient.first_name} ${data.patient.last_name}`;
            const dateStr = fmtDate(new Date(data.created_at));
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
            const uhid = `P-${data.patient.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
            const drawKV = (label, value, x, y, labelW, valueW) => {
                doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(8.5)
                    .text(label, x, y, { width: labelW });
                doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(9)
                    .text(value || '—', x + labelW, y, { width: valueW, ellipsis: true, lineBreak: false });
            };
            const padX = 16;
            const dividerX = M + Math.round(CW * 0.6);
            doc.rect(dividerX, cardY + 10, 0.5, cardH - 20).fill(HAIRLINE);
            const leftX = M + padX;
            const leftColW = dividerX - leftX - 12;
            const leftLabelW = 78;
            const leftValueW = leftColW - leftLabelW - 4;
            const rowGap = 18;
            const r0 = cardY + 12;
            drawKV('Patient', patientName, leftX, r0 + rowGap * 0, leftLabelW, leftValueW);
            drawKV('Age / Gender', ageGender, leftX, r0 + rowGap * 1, leftLabelW, leftValueW);
            drawKV('Mobile', data.patient.phone || '—', leftX, r0 + rowGap * 2, leftLabelW, leftValueW);
            drawKV('Visit Date', dateStr, leftX, r0 + rowGap * 3, leftLabelW, leftValueW);
            drawKV('UHID', uhid, leftX, r0 + rowGap * 4, leftLabelW, leftValueW);
            const rightX = dividerX + 12;
            const rightColW = M + CW - rightX - padX;
            const rightLabelW = 60;
            const rightValueW = rightColW - rightLabelW - 4;
            doc.fillColor(TEXT_MUTED).font('Helvetica-Bold').fontSize(7.5)
                .text('DOCTOR', rightX, cardY + 12, { characterSpacing: 1 });
            doc.rect(rightX, cardY + 24, 24, 1).fill(ACCENT);
            const drR0 = cardY + 32;
            drawKV('Name', (0, name_util_js_1.formatDoctorName)(data.dentist.name), rightX, drR0 + rowGap * 0, rightLabelW, rightValueW);
            drawKV('Reg ID', data.dentist.license_number || '—', rightX, drR0 + rowGap * 1, rightLabelW, rightValueW);
            let cursorY = cardY + cardH + 16;
            const sectionHeading = (label, y) => {
                doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(10)
                    .text(label.toUpperCase(), M, y, { characterSpacing: 1 });
                doc.rect(M, y + 14, 32, 1.2).fill(ACCENT);
                doc.rect(M + 32, y + 14, CW - 32, 0.5).fill(HAIRLINE);
                return y + 22;
            };
            const labeledLine = (label, value, y) => {
                doc.fillColor(TEXT_MUTED).font('Helvetica-Bold').fontSize(8.5)
                    .text(label, M, y, { continued: false });
                doc.fillColor(TEXT_BODY).font('Helvetica').fontSize(9);
                const valY = y + 11;
                const consumed = doc.heightOfString(value, { width: CW });
                doc.text(value, M, valY, { width: CW });
                return valY + consumed + 6;
            };
            const hasAssessment = !!(data.chief_complaint || data.diagnosis || data.past_dental_history || data.allergies_medical_history);
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
            const treatments = data.treatments || [];
            if (treatments.length > 0) {
                cursorY = sectionHeading('Treatments', cursorY);
                const tCols = [22, 220, 70, CW - 22 - 220 - 70];
                const tHeaders = ['#', 'Procedure', 'Tooth', 'Notes'];
                const tableW = tCols.reduce((a, b) => a + b, 0);
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
                for (let idx = 0; idx < treatments.length; idx++) {
                    const t = treatments[idx];
                    const procedureLines = Math.max(1, Math.ceil((t.procedure || '').length / 32));
                    const noteLines = t.notes ? Math.max(1, Math.ceil((t.notes || '').length / 28)) : 0;
                    const rowH = Math.max(20, procedureLines * 11 + noteLines * 10 + 8);
                    if (idx % 2 === 1) {
                        doc.rect(M, cursorY, tableW, rowH).fill(CARD_BG);
                    }
                    let bx = M;
                    doc.fillColor(TEXT_BODY).fontSize(8.5).font('Helvetica')
                        .text(`${idx + 1}`, bx + 6, cursorY + 6, { width: tCols[0] - 12, align: 'center' });
                    bx += tCols[0];
                    doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(8.5)
                        .text(t.procedure || '—', bx + 6, cursorY + 5, { width: tCols[1] - 12 });
                    if (t.status) {
                        doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(7)
                            .text(t.status.replace(/_/g, ' '), bx + 6, cursorY + 5 + procedureLines * 11, { width: tCols[1] - 12 });
                    }
                    bx += tCols[1];
                    doc.fillColor(TEXT_BODY).font('Helvetica').fontSize(8.5)
                        .text(t.tooth_number || '—', bx + 6, cursorY + 6, { width: tCols[2] - 12, align: 'center' });
                    bx += tCols[2];
                    doc.fillColor(TEXT_BODY).font('Helvetica').fontSize(8.5)
                        .text(t.notes || '—', bx + 6, cursorY + 5, { width: tCols[3] - 12 });
                    cursorY += rowH;
                    doc.rect(M, cursorY, tableW, 0.4).fill(HAIRLINE);
                }
                cursorY += 12;
            }
            cursorY = sectionHeading('Rx', cursorY);
            const items = data.items || [];
            if (items.length === 0) {
                doc.fillColor(TEXT_MUTED).font('Helvetica-Oblique').fontSize(9)
                    .text('No medicines prescribed.', M, cursorY);
                cursorY += 16;
            }
            else {
                const colWidths = [26, 178, 60, 36, 64, 64, 87];
                const colHeaders = ['#', 'Medicine', 'Regime', 'Qty', 'Duration', 'Route', 'Remark'];
                const tableW = colWidths.reduce((a, b) => a + b, 0);
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
                doc.rect(M, cursorY + 18, tableW, 0.5).fill(HAIRLINE);
                cursorY += 18;
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
                    const medName = item.medicine_name || '';
                    const medLines = Math.max(1, Math.ceil(medName.length / 26));
                    const baseH = item.dosage ? medLines * 11 + 14 : medLines * 11 + 6;
                    const rowH = Math.max(20, baseH);
                    if (idx % 2 === 1) {
                        doc.rect(M, cursorY, tableW, rowH).fill(CARD_BG);
                    }
                    let bx = M;
                    doc.fillColor(TEXT_BODY).fontSize(8.5).font('Helvetica');
                    doc.text(`${idx + 1}`, bx + 6, cursorY + 6, { width: colWidths[0] - 12, align: 'center' });
                    bx += colWidths[0];
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
                    doc.rect(M, cursorY, tableW, 0.4).fill(HAIRLINE);
                }
                cursorY += 12;
            }
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
            cursorY += 4;
            doc.fillColor(TEXT_MUTED).font('Helvetica-Bold').fontSize(8.5)
                .text('FOLLOW UP ON', M, cursorY, { characterSpacing: 1 });
            const followUpValue = data.review_after_date
                ? ` : ${fmtDate(new Date(data.review_after_date))}`
                : ' : ___________________';
            doc.fillColor(TEXT_BODY).font('Helvetica').fontSize(9)
                .text(followUpValue, M + 110, cursorY);
            const sigBoxW = 200;
            const sigBoxH = 28;
            const sigBlockY = Math.min(Math.max(cursorY + 60, H - 200), H - 160);
            const sigX = W - M - sigBoxW;
            const baselineY = sigBlockY + sigBoxH;
            if (data.dentist.signature_image) {
                try {
                    doc.image(data.dentist.signature_image, sigX, sigBlockY, {
                        fit: [sigBoxW, sigBoxH],
                        align: 'center',
                        valign: 'bottom',
                    });
                }
                catch {
                }
            }
            doc.rect(sigX, baselineY, sigBoxW, 0.5).fill(ACCENT);
            doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(10)
                .text((0, name_util_js_1.formatDoctorName)(data.dentist.name), sigX, baselineY + 6, { width: sigBoxW, align: 'center' });
            let metaY = baselineY + 20;
            if (data.dentist.license_number) {
                doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(8)
                    .text(`Reg No. ${data.dentist.license_number}`, sigX, metaY, { width: sigBoxW, align: 'center' });
                metaY += 12;
            }
            const subParts = [];
            if (data.dentist.qualification)
                subParts.push(data.dentist.qualification);
            if (data.dentist.specialization)
                subParts.push(data.dentist.specialization);
            if (subParts.length > 0) {
                doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(7.5)
                    .text(subParts.join(' · '), sigX, metaY, { width: sigBoxW, align: 'center' });
            }
            const footerY = H - 40;
            doc.rect(M, footerY - 10, CW, 0.5).fill(HAIRLINE);
            const colWf = CW / 3;
            doc.fillColor(TEXT_FAINT).font('Helvetica').fontSize(7.5);
            doc.text(`${data.clinic.name}${data.dentist.license_number ? ` · Reg No. ${data.dentist.license_number}` : ''}`, M, footerY, { width: colWf, align: 'left' });
            if (phone) {
                doc.text(phone, M + colWf, footerY, { width: colWf, align: 'center' });
            }
            if (email) {
                doc.text(email, M + colWf * 2, footerY, { width: colWf, align: 'right' });
            }
            doc.end();
        });
    }
    async generateCustomTemplate(data, template) {
        return new Promise((resolve, reject) => {
            const { config, imageBuffer, withBackground } = template;
            const pageSize = config.page_size ?? 'A4';
            const [basePageW, basePageH] = PAGE_DIMS_PT[pageSize];
            const isLandscape = config.image.width_px > config.image.height_px;
            const pgW = isLandscape ? basePageH : basePageW;
            const pgH = isLandscape ? basePageW : basePageH;
            const doc = new pdfkit_1.default({
                size: pageSize,
                layout: isLandscape ? 'landscape' : 'portrait',
                margin: 0,
                info: {
                    Title: `Prescription — ${data.patient.first_name} ${data.patient.last_name}`,
                    Author: data.clinic.name,
                },
            });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            const drawBackground = () => {
                if (!withBackground)
                    return;
                try {
                    doc.image(imageBuffer, 0, 0, { width: pgW, height: pgH });
                }
                catch {
                }
            };
            const fmtDate = (d) => d.toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
            });
            const renderField = (zone, value) => {
                if (!zone || !value)
                    return;
                const x = zone.x * pgW;
                const y = zone.y * pgH;
                const w = zone.w * pgW;
                const h = zone.h * pgH;
                doc.fillColor('#000').font('Helvetica').fontSize(zone.font_size ?? 10);
                doc.text(value, x, y, {
                    width: w,
                    height: h,
                    lineBreak: false,
                    ellipsis: true,
                    align: zone.align ?? 'left',
                });
            };
            drawBackground();
            const patientName = `${data.patient.first_name} ${data.patient.last_name}`;
            const dateStr = fmtDate(new Date(data.created_at));
            let ageStr = '';
            if (data.patient.date_of_birth) {
                const dob = new Date(data.patient.date_of_birth);
                const now = new Date(data.created_at);
                const age = now.getFullYear() - dob.getFullYear() -
                    (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
                ageStr = `${age}`;
            }
            const uhid = `P-${data.patient.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
            renderField(config.zones.patient_name, patientName);
            renderField(config.zones.age, ageStr);
            renderField(config.zones.gender, data.patient.gender ?? '');
            renderField(config.zones.date, dateStr);
            renderField(config.zones.mobile, data.patient.phone ?? '');
            renderField(config.zones.patient_id, uhid);
            const blocks = [];
            const assessmentLines = [];
            if (data.chief_complaint)
                assessmentLines.push(`Chief Complaint: ${data.chief_complaint}`);
            if (data.diagnosis)
                assessmentLines.push(`Diagnosis: ${data.diagnosis}`);
            if (data.past_dental_history)
                assessmentLines.push(`Past History: ${data.past_dental_history}`);
            if (data.allergies_medical_history)
                assessmentLines.push(`Allergies: ${data.allergies_medical_history}`);
            if (assessmentLines.length) {
                blocks.push({ kind: 'heading', text: 'Assessment' });
                for (const line of assessmentLines)
                    blocks.push({ kind: 'line', text: line });
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
                for (const line of lines)
                    blocks.push({ kind: 'line', text: `• ${line}` });
                blocks.push({ kind: 'spacer', text: '' });
            }
            if (data.review_after_date) {
                blocks.push({
                    kind: 'line',
                    text: `Follow up on: ${fmtDate(new Date(data.review_after_date))}`,
                });
            }
            const body = config.zones.body;
            const bodyX = body.x * pgW;
            const bodyY = body.y * pgH;
            const bodyW = body.w * pgW;
            const bodyH = body.h * pgH;
            const fontSize = body.font_size ?? 10;
            const headingSize = fontSize + 1;
            const lineGap = ((body.line_height ?? 1.3) - 1) * fontSize;
            const bodyBottom = bodyY + bodyH;
            const MAX_PAGES = 3;
            let pagesRendered = 1;
            let cursorY = bodyY;
            const measureBlock = (b) => {
                if (b.kind === 'spacer')
                    return Math.max(4, fontSize * 0.4);
                const isHeading = b.kind === 'heading';
                doc.font(isHeading ? 'Helvetica-Bold' : 'Helvetica').fontSize(isHeading ? headingSize : fontSize);
                const measured = doc.heightOfString(b.text || ' ', { width: bodyW, lineGap });
                return measured + (isHeading ? 4 : 2);
            };
            const drawBlock = (b, y) => {
                if (b.kind === 'spacer')
                    return;
                const isHeading = b.kind === 'heading';
                doc.fillColor(isHeading ? '#000' : '#1f2937')
                    .font(isHeading ? 'Helvetica-Bold' : 'Helvetica')
                    .fontSize(isHeading ? headingSize : fontSize);
                doc.text(b.text, bodyX, y, { width: bodyW, lineGap });
            };
            for (const block of blocks) {
                const blockH = measureBlock(block);
                if (cursorY + blockH > bodyBottom) {
                    if (pagesRendered >= MAX_PAGES)
                        break;
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
            const sig = config.zones.signature;
            const docName = (0, name_util_js_1.formatDoctorName)(data.dentist.name);
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
                    }
                    catch {
                    }
                }
                const nameY = sy + sh * 0.6;
                doc.fillColor('#000').font('Helvetica-Bold').fontSize(sig.font_size ?? 10)
                    .text(docName, sx, nameY, { width: sw, align: sig.align ?? 'center' });
                if (data.dentist.license_number) {
                    doc.fillColor('#666').font('Helvetica').fontSize((sig.font_size ?? 10) - 2)
                        .text(`Reg No. ${data.dentist.license_number}`, sx, nameY + (sig.font_size ?? 10) + 2, { width: sw, align: sig.align ?? 'center' });
                }
            }
            else if (cursorY + fontSize * 3 < bodyBottom) {
                cursorY += 6;
                doc.fillColor('#000').font('Helvetica-Bold').fontSize(fontSize)
                    .text(`— ${docName}`, bodyX, cursorY, { width: bodyW, align: 'right' });
                if (data.dentist.license_number) {
                    cursorY += fontSize + 2;
                    doc.fillColor('#666').font('Helvetica').fontSize(fontSize - 1)
                        .text(`Reg No. ${data.dentist.license_number}`, bodyX, cursorY, { width: bodyW, align: 'right' });
                }
            }
            doc.end();
        });
    }
};
exports.PrescriptionPdfService = PrescriptionPdfService;
exports.PrescriptionPdfService = PrescriptionPdfService = __decorate([
    (0, common_1.Injectable)()
], PrescriptionPdfService);
//# sourceMappingURL=prescription-pdf.service.js.map