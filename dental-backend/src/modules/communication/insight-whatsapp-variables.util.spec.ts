import {
  buildInsightWhatsappVariables,
  validateInsightWhatsappVariables,
} from './insight-whatsapp-variables.util.js';

describe('insight-whatsapp-variables', () => {
  const base = {
    patientFirstName: 'Test',
    patientLastName: 'Recall Patient',
    clinicName: 'The Dentist Dental Clinic',
    clinicPhone: '+918330990642',
    bookingUrl: 'https://www.smartdentaldesk.com/booking/c1/b1',
    recallTreatment: 'Scaling',
    recallDueDays: 40,
    recallLastDate: new Date('2026-04-01'),
  };

  it('fills overdue recall template slots', () => {
    const vars = buildInsightWhatsappVariables({
      ...base,
      templateName: 'dental_treatment_followup_overdue',
    });
    expect(vars).toEqual({
      '1': 'Test Recall Patient',
      '2': 'Scaling',
      '3': 'The Dentist Dental Clinic',
      '4': '40',
      '5': base.bookingUrl,
      '6': '+918330990642',
    });
    expect(validateInsightWhatsappVariables(vars)).toBeNull();
  });

  it('fills soft re-engagement template slots', () => {
    const vars = buildInsightWhatsappVariables({
      ...base,
      templateName: 'dental_reengagement_soft',
    });
    expect(vars['2']).toBe('The Dentist Dental Clinic');
    expect(vars['3']).toBe(base.bookingUrl);
    expect(validateInsightWhatsappVariables(vars)).toBeNull();
  });
});
