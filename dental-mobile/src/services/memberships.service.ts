import api from './api';

export type MembershipBenefitType =
  | 'included_service'
  | 'discount_percentage'
  | 'discount_flat'
  | 'credit'
  | string;

export interface MembershipBenefit {
  id: string;
  title: string;
  description?: string;
  benefit_type?: MembershipBenefitType;
  treatment_label?: string;
  coverage_scope?: string;
  included_quantity?: number;
  remaining_quantity?: number;
  total_quantity?: number;
  discount_percentage?: number;
  discount_amount?: number;
  credit_amount?: number;
  display_order?: number;
  is_active?: boolean;
}

export interface MembershipUsage {
  id: string;
  patient_name?: string;
  patient?: { first_name: string; last_name: string };
  benefit_title?: string;
  benefit?: { title: string };
  used_at?: string;
  used_on?: string;
  discount_applied?: number;
  quantity_used?: number;
}

export interface MembershipEnrollmentMember {
  id?: string;
  patient_id: string;
  relation_label?: string;
  is_primary?: boolean;
  patient?: { id: string; first_name: string; last_name: string; phone?: string };
}

export interface MembershipEnrollment {
  id: string;
  enrollment_number?: string;
  status?: 'active' | 'expired' | 'cancelled' | 'paused' | string;
  membership_plan_id?: string;
  membership_plan?: MembershipPlan;
  branch?: { id: string; name: string };
  branch_id?: string;
  primary_patient_id?: string;
  primary_patient?: { id: string; first_name: string; last_name: string; phone?: string };
  start_date?: string;
  end_date?: string;
  amount_paid?: number | string;
  members?: MembershipEnrollmentMember[];
  benefits?: MembershipBenefit[];
  usages?: MembershipUsage[];
  recent_usages?: MembershipUsage[];
  notes?: string;
  created_at?: string;
}

export interface PatientMembershipSummary {
  active?: MembershipEnrollment[];
  past?: MembershipEnrollment[];
  primary?: MembershipEnrollment | null;
}

export interface MembershipPlanBenefit {
  id?: string;
  title: string;
  description?: string;
  benefit_type?: MembershipBenefitType;
  treatment_label?: string;
  coverage_scope?: string;
  included_quantity?: number;
  discount_percentage?: number;
  discount_amount?: number;
  credit_amount?: number;
  display_order?: number;
  is_active?: boolean;
}

export interface MembershipPlan {
  id: string;
  code?: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  duration_months?: number;
  max_members?: number;
  covered_members_limit?: number;
  grace_period_days?: number;
  is_active?: boolean;
  terms_and_conditions?: string;
  benefits?: MembershipPlanBenefit[];
  _count?: { enrollments?: number };
}

export interface CreatePlanPayload {
  code?: string;
  name: string;
  description?: string;
  category?: string;
  price?: number;
  duration_months?: number;
  covered_members_limit?: number;
  grace_period_days?: number;
  is_active?: boolean;
  terms_and_conditions?: string;
  benefits: MembershipPlanBenefit[];
}

export interface CreateEnrollmentPayload {
  membership_plan_id: string;
  branch_id: string;
  primary_patient_id: string;
  start_date: string;
  end_date?: string;
  amount_paid?: number;
  notes?: string;
  members?: Array<{ patient_id: string; relation_label?: string }>;
}

export interface UpdateEnrollmentPayload {
  status?: 'active' | 'expired' | 'cancelled' | 'paused';
  start_date?: string;
  end_date?: string;
  amount_paid?: number;
  notes?: string;
}

function normalizePlan(raw: MembershipPlan): MembershipPlan {
  return {
    ...raw,
    price: Number(raw.price ?? 0),
    max_members: raw.covered_members_limit ?? raw.max_members ?? 1,
    duration_months: raw.duration_months ?? 12,
  };
}

function normalizeEnrollment(raw: MembershipEnrollment): MembershipEnrollment {
  const start = raw.start_date;
  const end = raw.end_date;
  return {
    ...raw,
    start_date: typeof start === 'string' ? start.split('T')[0] : start,
    end_date: typeof end === 'string' ? end.split('T')[0] : end,
    amount_paid: raw.amount_paid != null ? Number(raw.amount_paid) : undefined,
    membership_plan: raw.membership_plan ? normalizePlan(raw.membership_plan as MembershipPlan) : undefined,
  };
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

  listPlans: async (): Promise<MembershipPlan[]> => {
    try {
      const { data } = await api.get<MembershipPlan[] | { data: MembershipPlan[] }>('/memberships/plans');
      const rows = Array.isArray(data) ? data : (data?.data ?? []);
      return rows.map(normalizePlan);
    } catch {
      return [];
    }
  },

  getPlan: async (planId: string): Promise<MembershipPlan | null> => {
    const plans = await membershipsService.listPlans();
    return plans.find((p) => p.id === planId) ?? null;
  },

  createPlan: async (payload: CreatePlanPayload): Promise<MembershipPlan> => {
    const { data } = await api.post<MembershipPlan>('/memberships/plans', payload);
    return normalizePlan(data);
  },

  updatePlan: async (planId: string, payload: Partial<CreatePlanPayload>): Promise<MembershipPlan> => {
    const { data } = await api.patch<MembershipPlan>(`/memberships/plans/${planId}`, payload);
    return normalizePlan(data);
  },

  listEnrollments: async (params?: {
    patient_id?: string;
    branch_id?: string;
    status?: string;
  }): Promise<MembershipEnrollment[]> => {
    try {
      const { data } = await api.get<MembershipEnrollment[]>('/memberships/enrollments', { params });
      const rows = Array.isArray(data) ? data : [];
      return rows.map(normalizeEnrollment);
    } catch {
      return [];
    }
  },

  getEnrollment: async (enrollmentId: string): Promise<MembershipEnrollment | null> => {
    const list = await membershipsService.listEnrollments();
    return list.find((e) => e.id === enrollmentId) ?? null;
  },

  createEnrollment: async (payload: CreateEnrollmentPayload): Promise<MembershipEnrollment> => {
    const { data } = await api.post<MembershipEnrollment>('/memberships/enrollments', payload);
    return normalizeEnrollment(data);
  },

  updateEnrollment: async (
    enrollmentId: string,
    payload: UpdateEnrollmentPayload,
  ): Promise<MembershipEnrollment> => {
    const { data } = await api.patch<MembershipEnrollment>(
      `/memberships/enrollments/${enrollmentId}`,
      payload,
    );
    return normalizeEnrollment(data);
  },
};
