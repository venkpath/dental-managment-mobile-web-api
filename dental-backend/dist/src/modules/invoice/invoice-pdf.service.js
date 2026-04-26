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
exports.InvoicePdfService = void 0;
const common_1 = require("@nestjs/common");
const pdfkit_1 = __importDefault(require("pdfkit"));
const currency_util_js_1 = require("../../common/utils/currency.util.js");
const name_util_js_1 = require("../../common/utils/name.util.js");
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
let InvoicePdfService = class InvoicePdfService {
    async generate(data) {
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({
                size: 'A4',
                margin: 0,
                info: {
                    Title: `Invoice ${data.invoice_number}`,
                    Author: data.clinic.name,
                },
            });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            const W = doc.page.width;
            const H = doc.page.height;
            const M = 40;
            const CW = W - M * 2;
            const currencyCode = data.currency_code ?? 'INR';
            const currencyLocale = (0, currency_util_js_1.getCurrencyLocale)(currencyCode);
            const fmt = (n) => (0, currency_util_js_1.formatCurrencyAmountPdfSafe)(n, currencyCode);
            doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(20)
                .text(data.clinic.name, M, 36, { width: CW * 0.7, lineBreak: false });
            const subLine = data.branch.city ?? data.clinic.city ?? '';
            if (subLine) {
                doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(9)
                    .text(subLine, M, 60);
            }
            doc.fillColor(TEXT_BODY).fontSize(8.5).font('Helvetica');
            const phone = data.clinic.phone || data.branch.phone || '';
            const email = data.clinic.email || '';
            const addr = [
                data.branch.address || data.clinic.address,
                data.branch.city || data.clinic.city,
                data.branch.state || data.clinic.state,
            ].filter(Boolean).join(', ');
            let rY = 36;
            if (phone) {
                doc.text(phone, M, rY, { width: CW, align: 'right' });
                rY += 12;
            }
            if (email) {
                doc.text(email, M, rY, { width: CW, align: 'right' });
                rY += 12;
            }
            if (addr) {
                doc.fillColor(TEXT_MUTED).text(addr, M, rY, { width: CW, align: 'right' });
            }
            doc.rect(M, 88, CW, 1.5).fill(ACCENT);
            doc.rect(M, 89.5, CW, 0.5).fill(HAIRLINE);
            doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(13)
                .text('INVOICE', M, 102, { width: CW, align: 'center', characterSpacing: 2 });
            const metaY = 122;
            const dateStr = new Date(data.created_at).toLocaleDateString(currencyLocale, {
                day: '2-digit', month: 'short', year: 'numeric',
            });
            const metaItems = [
                ['Invoice #', data.invoice_number],
                ['Date', dateStr],
            ];
            if (data.gst_number)
                metaItems.push(['GST No', data.gst_number]);
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
            const cardY = 144;
            const cardH = 76;
            doc.rect(M, cardY, CW, cardH).fill(CARD_BG).stroke(HAIRLINE);
            const padX = 16;
            const colW = (CW - padX * 2) / 2;
            const labelW = 78;
            const valueW = colW - labelW - 8;
            const leftX = M + padX;
            const rightX = M + padX + colW + 8;
            const drawKV = (label, value, x, y) => {
                doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(8.5)
                    .text(label, x, y, { width: labelW });
                doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(9)
                    .text(value || '—', x + labelW, y, { width: valueW, ellipsis: true, lineBreak: false });
            };
            const r1 = cardY + 12;
            const r2 = cardY + 30;
            const r3 = cardY + 48;
            const patName = `${data.patient.first_name} ${data.patient.last_name}`;
            let ageDisplay = '';
            if (data.patient.date_of_birth) {
                const dob = new Date(data.patient.date_of_birth);
                const today = new Date();
                let years = today.getFullYear() - dob.getFullYear();
                const m = today.getMonth() - dob.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < dob.getDate()))
                    years--;
                const dobStr = dob.toLocaleDateString(currencyLocale);
                ageDisplay = `${years} yrs (${dobStr})`;
            }
            else if (data.patient.age != null) {
                ageDisplay = `${data.patient.age} yrs`;
            }
            drawKV('Patient', patName, leftX, r1);
            drawKV('Mobile', data.patient.phone || '—', leftX, r2);
            drawKV('Email', data.patient.email || '—', leftX, r3);
            drawKV('Doctor', data.dentist ? (0, name_util_js_1.formatDoctorName)(data.dentist.name) : '—', rightX, r1);
            drawKV('Age', ageDisplay || '—', rightX, r2);
            drawKV('Branch', data.branch.name || '—', rightX, r3);
            let cursorY = cardY + cardH + 22;
            const colDef = [
                { key: 'num', w: 28, align: 'center', head: '#' },
                { key: 'desc', w: 218, align: 'left', head: 'Description' },
                { key: 'tooth', w: 48, align: 'center', head: 'Tooth' },
                { key: 'qty', w: 36, align: 'center', head: 'Qty' },
                { key: 'unit', w: 80, align: 'right', head: 'Unit Price' },
                { key: 'amt', w: CW - 410, align: 'right', head: 'Amount' },
            ];
            const tableW = colDef.reduce((s, c) => s + c.w, 0);
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
            for (let idx = 0; idx < data.items.length; idx++) {
                const item = data.items[idx];
                const rowH = item.procedure ? 28 : 22;
                if (idx % 2 === 1) {
                    doc.rect(M, cursorY, tableW, rowH).fill(CARD_BG);
                }
                let bx = M;
                doc.fillColor(TEXT_BODY).fontSize(8.5).font('Helvetica')
                    .text(`${idx + 1}`, bx + 6, cursorY + 6, { width: colDef[0].w - 12, align: 'center' });
                bx += colDef[0].w;
                doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(8.5)
                    .text(item.description, bx + 6, cursorY + 5, { width: colDef[1].w - 12 });
                if (item.procedure) {
                    doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(7.5)
                        .text(item.procedure, bx + 6, cursorY + 16, { width: colDef[1].w - 12 });
                }
                bx += colDef[1].w;
                doc.fillColor(TEXT_BODY).font('Helvetica').fontSize(8.5)
                    .text(item.tooth_number || '—', bx + 6, cursorY + 6, { width: colDef[2].w - 12, align: 'center' });
                bx += colDef[2].w;
                doc.text(String(item.quantity), bx + 6, cursorY + 6, { width: colDef[3].w - 12, align: 'center' });
                bx += colDef[3].w;
                doc.text(fmt(Number(item.unit_price)), bx + 6, cursorY + 6, { width: colDef[4].w - 12, align: 'right' });
                bx += colDef[4].w;
                doc.font('Helvetica-Bold').fillColor(TEXT_HEAD)
                    .text(fmt(Number(item.total_price)), bx + 6, cursorY + 6, { width: colDef[5].w - 12, align: 'right' });
                cursorY += rowH;
                doc.rect(M, cursorY, tableW, 0.4).fill(HAIRLINE);
            }
            const totX = M + tableW - 240;
            const totW = 240;
            let totY = cursorY + 12;
            const totLines = [['Sub Total', fmt(data.total_amount)]];
            if (data.discount_amount > 0)
                totLines.push(['Discount', `-${fmt(data.discount_amount)}`]);
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
            doc.rect(totX, totY + 2, totW, 0.5).fill(HAIRLINE);
            totY += 8;
            doc.rect(totX, totY, totW, 26).fill(ACCENT);
            doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10)
                .text('TOTAL', totX + 12, totY + 9, { width: 80, characterSpacing: 1 });
            doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11)
                .text(fmt(data.net_amount), totX, totY + 8, { width: totW - 12, align: 'right' });
            const bottomY = totY + 44;
            const halfW = (CW - 20) / 2;
            const sectionH = (label, x, y, w) => {
                doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(10)
                    .text(label.toUpperCase(), x, y, { characterSpacing: 1 });
                doc.rect(x, y + 14, 32, 1.2).fill(ACCENT);
                doc.rect(x + 32, y + 14, w - 32, 0.5).fill(HAIRLINE);
            };
            sectionH('Payment Information', M, bottomY, halfW);
            const paidTotal = data.payments.reduce((s, p) => s + Number(p.amount), 0);
            const balance = Number(data.net_amount) - paidTotal;
            const pmtInfo = [
                ['Accepted Methods', 'Cash, Card, UPI'],
                ['Total Billed', fmt(data.net_amount)],
                ['Amount Paid', fmt(paidTotal)],
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
            }
            else {
                doc.rect(M, pY, 84, 20).fill(PAID_BG);
                doc.fillColor(PAID_FG).font('Helvetica-Bold').fontSize(9)
                    .text('FULLY PAID', M + 4, pY + 6, { width: 76, align: 'center', characterSpacing: 1 });
            }
            const histX = M + halfW + 20;
            sectionH('Payment History', histX, bottomY, halfW);
            let hY = bottomY + 24;
            if (data.payments.length === 0) {
                doc.fillColor(TEXT_MUTED).font('Helvetica-Oblique').fontSize(9)
                    .text('No payments yet.', histX, hY);
            }
            else {
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
            doc.fillColor(TEXT_FAINT).font('Helvetica-Oblique').fontSize(7.5)
                .text(`Thank you for choosing ${data.clinic.name} for your dental care.`, M, footerY + 12, { width: CW, align: 'center' });
            void ACCENT_SOFT;
            doc.end();
        });
    }
};
exports.InvoicePdfService = InvoicePdfService;
exports.InvoicePdfService = InvoicePdfService = __decorate([
    (0, common_1.Injectable)()
], InvoicePdfService);
//# sourceMappingURL=invoice-pdf.service.js.map