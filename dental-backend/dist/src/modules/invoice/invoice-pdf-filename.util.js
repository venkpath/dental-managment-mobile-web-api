"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clinicInvoicePdfFilename = clinicInvoicePdfFilename;
exports.clinicInvoicePdfVariant = clinicInvoicePdfVariant;
function clinicInvoicePdfFilename(invoiceNumber, variant) {
    const prefix = variant === 'receipt' ? 'Receipt' : 'Invoice';
    return `${prefix}-${invoiceNumber}.pdf`;
}
function clinicInvoicePdfVariant(status) {
    if (status === 'paid' || status === 'partially_paid' || status === 'partially_refunded') {
        return 'receipt';
    }
    return 'invoice';
}
//# sourceMappingURL=invoice-pdf-filename.util.js.map