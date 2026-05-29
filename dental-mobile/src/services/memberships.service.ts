import api from './api';

export interface MembershipBenefit {
  id: string;
  title: string;
  description?: string;
  remaining_quantity?: number;
  total_quantity?: number;
  discount_percentage?: number;
  discount_amount?: number;
  credit_amount?: number;
}

export interface MembershipUsage {
  id: string;
  patient_name?: string;
  patient?: { first_name: string; last_name: string };
  benefit_title?: string;
  used_at: string;
  discount_applied?: number;
  quantity_used?: number;
}

export interface MembershipEnrollment {
  id: string;
  enrollment_number?: string;
  status?: 'active' | 'expired' | 'cancelled' | string;
  membership_plan?: { id: string; name: string; price?: number };
  branch?: { id: string; name: string };
  start_date?: string;
  end_date?: string;
  amount_paid?: number;
  members?: Array<{ patient_id: string; first_name?: string; last_name?: string; is_primary?: boolean }>;
  benefits?: MembershipBenefit[];
  recent_usages?: MembershipUsage[];
  notes?: string;
}

export interface PatientMembershipSummary {
  active?: MembershipEnrollment[];
  past?: MembershipEnrollment[];
  primary?: MembershipEnrollment | null;
}

export const membershipsService = {
  getPatientSummary: async (patientId: string): Promise<PatientMembershipSummary> => {
    try {
      const { data } = await api.get<PatientMembershipSummary>(`/memberships/patients/${patientId}/summary`);
      return data ?? { active: [], past: [] };
    } catch {
      return { active: [], past: [] };
    }
  },
};
