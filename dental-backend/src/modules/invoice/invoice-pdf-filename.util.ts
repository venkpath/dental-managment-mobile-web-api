/** WhatsApp / download filename for clinic invoice PDFs (matches web behaviour). */
export function clinicInvoicePdfFilename(
  invoiceNumber: string,
  variant: 'invoice' | 'receipt',
): string {
  const prefix = variant === 'receipt' ? 'Receipt' : 'Invoice';
  return `${prefix}-${invoiceNumber}.pdf`;
}

/** Paid or partially paid invoices are sent/downloaded as receipts. */
export function clinicInvoicePdfVariant(status: string): 'invoice' | 'receipt' {
  if (status === 'paid' || status === 'partially_paid' || status === 'partially_refunded') {
    return 'receipt';
  }
  return 'invoice';
}
