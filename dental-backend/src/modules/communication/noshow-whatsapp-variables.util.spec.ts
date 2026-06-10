import {
  buildNoshowFollowupVariables,
  validateNoshowFollowupVariables,
} from './noshow-whatsapp-variables.util.js';

describe('noshow-whatsapp-variables', () => {
  it('fills all Meta slots for dental_noshow_followup', () => {
    const vars = buildNoshowFollowupVariables({
      patientFirstName: 'Parthiban',
      patientLastName: 'B',
      clinicName: 'DENTICARE DENTAL & IMPLANT CLINIC',
      clinicPhone: '+919710779946',
    });
    expect(vars).toMatchObject({
      '1': 'Parthiban B',
      '2': 'DENTICARE DENTAL & IMPLANT CLINIC',
      '3': '+919710779946',
    });
    expect(validateNoshowFollowupVariables(vars)).toBeNull();
  });

  it('reports missing clinic name', () => {
    const vars = buildNoshowFollowupVariables({
      patientFirstName: 'Test',
      patientLastName: 'Patient',
      clinicName: '',
      clinicPhone: '9876543210',
    });
    expect(validateNoshowFollowupVariables(vars)).toContain('{{2}}');
  });
});
