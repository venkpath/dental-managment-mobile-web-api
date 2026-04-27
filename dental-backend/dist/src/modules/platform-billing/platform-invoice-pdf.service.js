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
exports.PlatformInvoicePdfService = void 0;
const common_1 = require("@nestjs/common");
const pdfkit_1 = __importDefault(require("pdfkit"));
const platform_billing_constants_js_1 = require("./platform-billing.constants.js");
const ACCENT = '#0d6efd';
const TEXT_HEAD = '#0d1b2a';
const TEXT_BODY = '#1f2937';
const TEXT_MUTED = '#6b7280';
const TEXT_FAINT = '#9ca3af';
const HAIRLINE = '#e5e7eb';
const CARD_BG = '#f8fafc';
const TABLE_HEAD_BG = '#f1f5f9';
const PAID_BG = '#dcfce7';
const PAID_FG = '#15803d';
const fmtINR = (n) => {
    return `Rs. ${Number(n).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
});
let PlatformInvoicePdfService = class PlatformInvoicePdfService {
    async generate(data) {
        return new Promise((resolve, reject) => {
            const doc = new pdfkit_1.default({
                size: 'A4',
                margin: 0,
                info: {
                    Title: `Smart Dental Desk Invoice ${data.invoice_number}`,
                    Author: platform_billing_constants_js_1.PLATFORM_BILLER.legalName,
                    Subject: `Subscription invoice for ${data.bill_to.name}`,
                },
            });
            const chunks = [];
            doc.on('data', (c) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            const W = doc.page.width;
            const H = doc.page.height;
            const M = 40;
            const CW = W - M * 2;
            doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(22)
                .text(platform_billing_constants_js_1.PLATFORM_BILLER.brandName, M, 36, { width: CW * 0.65, lineBreak: false });
            doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(9)
                .text(`by ${platform_billing_constants_js_1.PLATFORM_BILLER.legalName}`, M, 62);
            doc.fillColor(TEXT_BODY).fontSize(8.5).font('Helvetica');
            let rY = 36;
            doc.font('Helvetica-Bold').text(`GSTIN: ${platform_billing_constants_js_1.PLATFORM_BILLER.gstin}`, M, rY, { width: CW, align: 'right' });
            rY += 12;
            doc.font('Helvetica').fillColor(TEXT_BODY)
                .text(platform_billing_constants_js_1.PLATFORM_BILLER.phone, M, rY, { width: CW, align: 'right' });
            rY += 12;
            doc.fillColor(TEXT_MUTED)
                .text(platform_billing_constants_js_1.PLATFORM_BILLER.addressOneLine, M, rY, { width: CW, align: 'right' });
            doc.rect(M, 96, CW, 1.5).fill(ACCENT);
            doc.rect(M, 97.5, CW, 0.5).fill(HAIRLINE);
            doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(13)
                .text('TAX INVOICE', M, 110, { width: CW, align: 'center', characterSpacing: 2 });
            if (data.status === 'paid') {
                const badgeW = 60;
                const badgeH = 18;
                const badgeX = W - M - badgeW;
                const badgeY = 134;
                doc.rect(badgeX, badgeY, badgeW, badgeH).fill(PAID_BG);
                doc.fillColor(PAID_FG).font('Helvetica-Bold').fontSize(8)
                    .text('PAID', badgeX, badgeY + 5, { width: badgeW, align: 'center', characterSpacing: 1 });
            }
            doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(9)
                .text('Invoice #', M, 134, { lineBreak: false });
            doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(9)
                .text(data.invoice_number, M + 50, 134, { lineBreak: false });
            doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(9)
                .text('Date', M, 148, { lineBreak: false });
            doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(9)
                .text(fmtDate(data.issued_at), M + 50, 148, { lineBreak: false });
            const cardY = 172;
            const cardH = 90;
            const cardW = (CW - 16) / 2;
            doc.rect(M, cardY, cardW, cardH).fill(CARD_BG).stroke(HAIRLINE);
            doc.fillColor(TEXT_MUTED).font('Helvetica-Bold').fontSize(8)
                .text('BILL TO', M + 12, cardY + 10, { characterSpacing: 1 });
            doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(11)
                .text(data.bill_to.name, M + 12, cardY + 24, { width: cardW - 24 });
            const billLines = [];
            if (data.bill_to.address)
                billLines.push(data.bill_to.address);
            const cityState = [data.bill_to.city, data.bill_to.state].filter(Boolean).join(', ');
            if (cityState || data.bill_to.pincode) {
                billLines.push([cityState, data.bill_to.pincode].filter(Boolean).join(' - '));
            }
            if (data.bill_to.phone)
                billLines.push(`Phone: ${data.bill_to.phone}`);
            if (data.bill_to.email)
                billLines.push(`Email: ${data.bill_to.email}`);
            if (data.bill_to.gstin)
                billLines.push(`GSTIN: ${data.bill_to.gstin}`);
            doc.fillColor(TEXT_BODY).font('Helvetica').fontSize(8.5);
            let billY = cardY + 42;
            for (const line of billLines) {
                doc.text(line, M + 12, billY, { width: cardW - 24, ellipsis: true, lineBreak: false });
                billY += 10;
            }
            const supX = M + cardW + 16;
            doc.rect(supX, cardY, cardW, cardH).fill(CARD_BG).stroke(HAIRLINE);
            doc.fillColor(TEXT_MUTED).font('Helvetica-Bold').fontSize(8)
                .text('SUPPLIED BY', supX + 12, cardY + 10, { characterSpacing: 1 });
            doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(11)
                .text(`${platform_billing_constants_js_1.PLATFORM_BILLER.brandName}`, supX + 12, cardY + 24);
            doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(8.5)
                .text(`by ${platform_billing_constants_js_1.PLATFORM_BILLER.legalName}`, supX + 12, cardY + 38);
            doc.fillColor(TEXT_BODY).font('Helvetica').fontSize(8.5)
                .text(platform_billing_constants_js_1.PLATFORM_BILLER.addressOneLine, supX + 12, cardY + 52, { width: cardW - 24 });
            doc.text(`Phone: ${platform_billing_constants_js_1.PLATFORM_BILLER.phone}`, supX + 12, cardY + 72, { width: cardW - 24 });
            let cursorY = cardY + cardH + 24;
            const colDef = [
                { w: 28, align: 'center', head: '#' },
                { w: 280, align: 'left', head: 'Description' },
                { w: 90, align: 'center', head: 'Period' },
                { w: 60, align: 'center', head: 'Qty' },
                { w: CW - 458, align: 'right', head: 'Amount' },
            ];
            const tableW = colDef.reduce((s, c) => s + c.w, 0);
            doc.rect(M, cursorY, tableW, 22).fill(TABLE_HEAD_BG);
            let cx = M;
            doc.fillColor(TEXT_HEAD).fontSize(8).font('Helvetica-Bold');
            for (const c of colDef) {
                doc.text(c.head.toUpperCase(), cx + 6, cursorY + 7, {
                    width: c.w - 12, align: c.align, characterSpacing: 0.5,
                });
                cx += c.w;
            }
            doc.rect(M, cursorY + 22, tableW, 0.5).fill(HAIRLINE);
            cursorY += 22;
            const rowH = 36;
            cx = M;
            doc.fillColor(TEXT_BODY).font('Helvetica').fontSize(9)
                .text('1', cx + 6, cursorY + 12, { width: colDef[0].w - 12, align: 'center' });
            cx += colDef[0].w;
            doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(9.5)
                .text(`${data.plan_name} Plan`, cx + 6, cursorY + 8, { width: colDef[1].w - 12 });
            doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(8)
                .text(`${data.billing_cycle === 'yearly' ? 'Yearly' : 'Monthly'} subscription · SAC 998314`, cx + 6, cursorY + 22, { width: colDef[1].w - 12 });
            cx += colDef[1].w;
            doc.fillColor(TEXT_BODY).font('Helvetica').fontSize(8)
                .text(fmtDate(data.period_start), cx + 6, cursorY + 10, { width: colDef[2].w - 12, align: 'center' });
            doc.fillColor(TEXT_MUTED).fontSize(7.5)
                .text('to', cx + 6, cursorY + 19, { width: colDef[2].w - 12, align: 'center' });
            doc.fillColor(TEXT_BODY).fontSize(8)
                .text(fmtDate(data.period_end), cx + 6, cursorY + 26, { width: colDef[2].w - 12, align: 'center' });
            cx += colDef[2].w;
            doc.fillColor(TEXT_BODY).font('Helvetica').fontSize(9)
                .text('1', cx + 6, cursorY + 12, { width: colDef[3].w - 12, align: 'center' });
            cx += colDef[3].w;
            doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(10)
                .text(fmtINR(data.subtotal), cx + 6, cursorY + 12, { width: colDef[4].w - 12, align: 'right' });
            cursorY += rowH;
            doc.rect(M, cursorY, tableW, 0.5).fill(HAIRLINE);
            const totW = 260;
            const totX = M + tableW - totW;
            let totY = cursorY + 14;
            const totLines = [
                ['Subtotal', fmtINR(data.subtotal)],
            ];
            if (data.cgst_amount > 0 || data.sgst_amount > 0) {
                const halfRate = (data.tax_rate / 2).toFixed(1);
                totLines.push([`CGST (${halfRate}%)`, fmtINR(data.cgst_amount)]);
                totLines.push([`SGST (${halfRate}%)`, fmtINR(data.sgst_amount)]);
            }
            else {
                totLines.push([`IGST (${Number(data.tax_rate).toFixed(1)}%)`, fmtINR(data.igst_amount || data.tax_amount)]);
            }
            for (const [label, val] of totLines) {
                doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(9)
                    .text(label, totX, totY, { width: 130 });
                doc.fillColor(TEXT_BODY).font('Helvetica').fontSize(9)
                    .text(val, totX + 130, totY, { width: totW - 130, align: 'right' });
                totY += 15;
            }
            doc.rect(totX, totY + 2, totW, 0.5).fill(HAIRLINE);
            totY += 8;
            doc.rect(totX, totY, totW, 28).fill(ACCENT);
            doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10)
                .text('TOTAL', totX + 14, totY + 10, { width: 80, characterSpacing: 1 });
            doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(12)
                .text(fmtINR(data.total_amount), totX, totY + 9, { width: totW - 14, align: 'right' });
            const refY = totY + 50;
            doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(10)
                .text('PAYMENT INFORMATION', M, refY, { characterSpacing: 1 });
            doc.rect(M, refY + 14, 32, 1.2).fill(ACCENT);
            doc.rect(M + 32, refY + 14, CW - 32, 0.5).fill(HAIRLINE);
            let pY = refY + 24;
            const drawKV = (label, value) => {
                doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(8.5)
                    .text(label, M, pY, { width: 130 });
                doc.fillColor(TEXT_HEAD).font('Helvetica-Bold').fontSize(9)
                    .text(value, M + 130, pY, { width: CW - 130 });
                pY += 14;
            };
            drawKV('Status', data.status === 'paid' ? 'Paid' : data.status === 'refunded' ? 'Refunded' : 'Pending');
            if (data.razorpay_payment_id) {
                drawKV('Payment Reference', data.razorpay_payment_id);
            }
            drawKV('Payment Method', 'Razorpay (Card / UPI / Netbanking)');
            drawKV('Amount in Words', `${numberToWordsINR(Number(data.total_amount))} Only`);
            const declY = H - 110;
            doc.fillColor(TEXT_MUTED).font('Helvetica-Bold').fontSize(8)
                .text('DECLARATION', M, declY, { characterSpacing: 1 });
            doc.fillColor(TEXT_BODY).font('Helvetica').fontSize(8)
                .text('We declare that this invoice shows the actual price of the services described and that all particulars are true and correct. ' +
                'This is a computer-generated invoice and does not require a signature.', M, declY + 14, { width: CW * 0.7 });
            const sigX = M + CW * 0.72;
            const sigW = CW - CW * 0.72;
            doc.rect(sigX, declY + 14, sigW, 1).fill(HAIRLINE);
            doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(8)
                .text(`For ${platform_billing_constants_js_1.PLATFORM_BILLER.legalName}`, sigX, declY + 22, { width: sigW, align: 'center' });
            doc.fillColor(TEXT_FAINT).fontSize(7.5)
                .text('Authorized Signatory', sigX, declY + 36, { width: sigW, align: 'center' });
            const footerY = H - 40;
            doc.rect(M, footerY - 10, CW, 0.5).fill(HAIRLINE);
            doc.fillColor(TEXT_FAINT).font('Helvetica-Oblique').fontSize(7.5)
                .text(`Thank you for choosing ${platform_billing_constants_js_1.PLATFORM_BILLER.brandName}. For billing queries: ${platform_billing_constants_js_1.PLATFORM_BILLER.email}`, M, footerY, { width: CW, align: 'center' });
            doc.end();
        });
    }
};
exports.PlatformInvoicePdfService = PlatformInvoicePdfService;
exports.PlatformInvoicePdfService = PlatformInvoicePdfService = __decorate([
    (0, common_1.Injectable)()
], PlatformInvoicePdfService);
function numberToWordsINR(amount) {
    const rupees = Math.floor(amount);
    const paise = Math.round((amount - rupees) * 100);
    let words = `Indian Rupees ${integerToWordsIN(rupees)}`;
    if (paise > 0) {
        words += ` and ${integerToWordsIN(paise)} Paise`;
    }
    return words;
}
function integerToWordsIN(n) {
    if (n === 0)
        return 'Zero';
    if (n < 0)
        return `Negative ${integerToWordsIN(-n)}`;
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const twoDigit = (num) => {
        if (num < 20)
            return ones[num];
        const t = Math.floor(num / 10);
        const o = num % 10;
        return o === 0 ? tens[t] : `${tens[t]} ${ones[o]}`;
    };
    const threeDigit = (num) => {
        if (num < 100)
            return twoDigit(num);
        const h = Math.floor(num / 100);
        const r = num % 100;
        return r === 0 ? `${ones[h]} Hundred` : `${ones[h]} Hundred ${twoDigit(r)}`;
    };
    const crore = Math.floor(n / 10_000_000);
    let rem = n % 10_000_000;
    const lakh = Math.floor(rem / 100_000);
    rem = rem % 100_000;
    const thousand = Math.floor(rem / 1_000);
    rem = rem % 1_000;
    const parts = [];
    if (crore > 0)
        parts.push(`${twoDigit(crore)} Crore`);
    if (lakh > 0)
        parts.push(`${twoDigit(lakh)} Lakh`);
    if (thousand > 0)
        parts.push(`${twoDigit(thousand)} Thousand`);
    if (rem > 0)
        parts.push(threeDigit(rem));
    return parts.join(' ');
}
//# sourceMappingURL=platform-invoice-pdf.service.js.map