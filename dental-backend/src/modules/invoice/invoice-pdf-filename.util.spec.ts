import { clinicInvoicePdfFilename, clinicInvoicePdfVariant } from './invoice-pdf-filename.util.js';

describe('invoice-pdf-filename.util', () => {
  it('builds receipt filename for paid invoices', () => {
    expect(clinicInvoicePdfVariant('paid')).toBe('receipt');
    expect(clinicInvoicePdfFilename('INV-20260601-0001', 'receipt')).toBe(
      'Receipt-INV-20260601-0001.pdf',
    );
  });

  it('builds invoice filename for unpaid invoices', () => {
    expect(clinicInvoicePdfVariant('pending')).toBe('invoice');
    expect(clinicInvoicePdfFilename('INV-20260601-0001', 'invoice')).toBe(
      'Invoice-INV-20260601-0001.pdf',
    );
  });
});
