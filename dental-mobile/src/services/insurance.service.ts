import api from './api';

export type InsuranceType =
  | 'government_ehs' | 'corporate_ehs' | 'national_plan'
  | 'group_health' | 'private' | 'tpa' | string;

export interface InsuranceProvider {
  id: string;
  short_code: string;
  name: string;
  type?: InsuranceType;
  is_cghs_like?: boolean;
}

export interface InsurancePlan {
  id: string;
  plan_name: string;
  provider_id?: string;
  has_rate_card?: boolean;
}

export interface PatientInsurance {
  id: string;
  patient_id: string;
  provider?: InsuranceProvider;
  plan?: InsurancePlan;
  type?: InsuranceType;
  member_id?: string;
  beneficiary_no?: string;
  employee_id?: string;
  employer?: string;
  group_number?: string;
  dependent_relationship?: 'self' | 'spouse' | 'child' | 'parent' | 'other' | string;
  subscriber_name?: string;
  coverage_start?: string;
  coverage_end?: string;
  priority?: 'primary' | 'secondary' | 'tertiary' | string;
  is_active?: boolean;
  notes?: string;
  has_card_front?: boolean;
  has_card_back?: boolean;
  has_referral?: boolean;
  created_at?: string;
}

export interface EligibilityResult {
  is_eligible?: boolean;
  is_empanelled?: boolean;
  direct_billing?: boolean;
  pre_auth_required?: boolean;
  referral_required?: boolean;
  reasons?: string[];
  warnings?: string[];
  coverage_percent?: number;
}

export const insuranceService = {
  listForPatient: async (patientId: string): Promise<PatientInsurance[]> => {
    try {
      const { data } = await api.get<PatientInsurance[] | { data: PatientInsurance[] }>(
        '/insurance/patient-insurances',
        { params: { patient_id: patientId } },
      );
      return Array.isArray(data) ? data : (data?.data ?? []);
    } catch {
      return [];
    }
  },

  getEligibility: async (enrollmentId: string): Promise<EligibilityResult | null> => {
    try {
      const { data } = await api.get<EligibilityResult>(
        `/insurance/patient-insurances/${enrollmentId}/eligibility`,
      );
      return data;
    } catch {
      return null;
    }
  },
};
