export interface User {
  id: string;
  name: string;
  email: string;
  /** Backend values: SuperAdmin, Admin, Dentist, Receptionist, Staff, Consultant */
  role: string;
  branch_id?: string;
  clinic_id: string;
  /** Signed S3 URL from GET /users/:id — not returned on login */
  profile_photo_url?: string | null;
}

export interface AuthState {
  token: string | null;
  /** Long-lived token used to silently mint a new access token after PIN/biometric unlock. */
  refreshToken: string | null;
  user: User | null;
  clinicId: string | null;
  clinicName: string | null;
  /** Resolved URL for clinic-uploaded logo; null = use app default mark */
  clinicLogoUrl: string | null;
  branchId: string | null;
  isAuthenticated: boolean;
  setClinicId: (clinicId: string) => void;
  patchUser: (partial: Partial<User>) => void;
  login: (token: string, user: User, clinicId: string, branchId?: string, clinicName?: string, refreshToken?: string) => void;
  /** Replace access (+ refresh) tokens after a silent refresh; keeps the session otherwise intact. */
  setTokens: (token: string, refreshToken?: string | null) => Promise<void>;
  updateBranding: (clinicName: string, clinicLogoUrl: string | null) => Promise<void>;
  /** Ends session; PIN / face unlock stay on this device. */
  logout: () => void;
  /** Removes PIN and saved login hint on this device. */
  logoutAndForgetDevice: () => void;
}

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  gender?: 'Male' | 'Female' | 'Other';
  date_of_birth?: string;
  age?: number;
  blood_group?: string;
  allergies?: string;
  medical_history?: Record<string, unknown>;
  notes?: string;
  branch_id?: string;
  profile_photo_url?: string | null;
  created_at: string;
  branch?: { id?: string; name: string };
}

export type AppointmentStatus =
  | 'scheduled'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes?: string;
  patient_id?: string;
  dentist_id?: string;
  branch_id?: string;
  patient: { id: string; first_name: string; last_name: string; phone: string };
  dentist: { id: string; name: string };
  branch?: { id?: string; name: string };
}

export interface PrescriptionMedicine {
  id?: string;
  medicine_name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  morning?: number;
  afternoon?: number;
  evening?: number;
  night?: number;
  route?: string;
  purpose?: string;
  warnings?: string;
  notes?: string;
}

export interface Prescription {
  id: string;
  diagnosis?: string;
  chief_complaint?: string;
  past_dental_history?: string;
  allergies_medical_history?: string;
  instructions?: string;
  interactions?: string;
  dietary_advice?: string;
  post_procedure_instructions?: string;
  follow_up?: string;
  created_at: string;
  patient?: { id: string; first_name: string; last_name: string; phone: string };
  dentist?: { id: string; name: string } | null;
  branch?: { name: string } | null;
  items?: PrescriptionMedicine[];
}

/** Matches backend enum values stored in DB (planned | in_progress | completed). */
export type TreatmentStatus = 'planned' | 'in_progress' | 'completed';

export interface Treatment {
  id: string;
  tooth_number?: string;
  diagnosis: string;
  procedure: string;
  status: TreatmentStatus;
  cost: number;
  notes?: string;
  patient: { id: string; first_name: string; last_name: string; phone?: string };
  dentist: { id: string; name: string };
  branch?: { name: string } | null;
  created_at: string;
}

export interface InvoicePayment {
  id: string;
  amount: number;
  method: 'cash' | 'card' | 'upi';
  notes?: string;
  paid_at: string;
  installment_item_id?: string;
}

export interface InvoiceItem {
  id: string;
  item_type: 'treatment' | 'service' | 'pharmacy';
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface InstallmentItem {
  id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  paid_at?: string;
}

export interface InstallmentPlan {
  id: string;
  total_amount: number;
  num_installments: number;
  notes?: string;
  items: InstallmentItem[];
}

export interface InvoiceRefund {
  id: string;
  amount: number;
  method: 'cash' | 'card' | 'upi' | 'bank_transfer';
  reason?: string;
  payment_id?: string;
  refunded_at: string;
}

export type ExpensePaymentMode = 'cash' | 'bank_transfer' | 'upi' | 'card' | 'cheque';

export interface ExpenseCategory {
  id: string;
  name: string;
  icon?: string | null;
  is_default: boolean;
  is_active: boolean;
}

export interface Expense {
  id: string;
  title: string;
  amount: number | string;
  date: string;
  payment_mode?: ExpensePaymentMode | string | null;
  vendor?: string | null;
  receipt_url?: string | null;
  notes?: string | null;
  is_recurring: boolean;
  recurring_frequency?: string | null;
  category_id: string;
  branch_id?: string | null;
  created_at: string;
  updated_at?: string;
  category?: ExpenseCategory;
  branch?: { id: string; name: string } | null;
  user?: { id: string; name: string };
}

export type InvoiceLifecycleStatus = 'draft' | 'issued' | 'cancelled';
export type CoverageCategory = 'preventive' | 'basic' | 'major' | 'ortho' | 'emergency';

export interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  net_amount: number;
  tax_amount: number;
  discount_amount: number;
  status: 'pending' | 'partially_paid' | 'paid' | 'partially_refunded' | 'refunded';
  lifecycle_status?: InvoiceLifecycleStatus;
  treatment_date?: string | null;
  tax_percentage?: number | null;
  insurance_covered_amount?: number | null;
  patient_copay_amount?: number | null;
  patient: { id: string; first_name: string; last_name: string; phone: string };
  branch?: { id?: string; name: string };
  dentist?: { id: string; name: string } | null;
  gst_number?: string | null;
  patient_insurance?: {
    id: string;
    provider?: { name: string; short_code?: string };
    plan?: { plan_name: string };
    member_id?: string;
  } | null;
  items?: InvoiceItem[];
  payments?: InvoicePayment[];
  refunds?: InvoiceRefund[];
  installment_plan?: InstallmentPlan;
  created_at: string;
}

export interface AvailableSlot {
  start_time: string;
  end_time: string;
  available: boolean;
}

export interface DashboardSummary {
  today_appointments: number;
  today_revenue: number;
  pending_invoices: number;
  outstanding_amount: number;
  low_inventory_count: number;
  this_month_revenue: number;
  this_month_expenses: number;
  this_month_refunds: number;
  net_profit: number;
  new_patients_this_month: number;
}

export interface TodayPaymentLine {
  invoice_number: string;
  method: string;
  amount: number;
  paid_at: string;
}

export interface PaymentBreakdown {
  cash: number;
  card: number;
  upi: number;
  other: number;
  total: number;
  clinic_date?: string;
  payments?: TodayPaymentLine[];
}

export interface SparklineDay {
  date: string;
  revenue: number;
  appointments: number;
  expenses: number;
}

export interface DashboardBootstrap {
  summary: DashboardSummary;
  sparklines: {
    daily: SparklineDay[];
    trends: {
      today_revenue_vs_yesterday: number | null;
      today_appointments_vs_yesterday: number | null;
      outstanding_vs_last_month: number | null;
      month_revenue_vs_last_month: number | null;
    };
  };
  today_appointments: {
    data: Appointment[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export type AuthStackParamList = {
  Welcome: undefined;
  Login: { identifier?: string } | undefined;
  Register: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Lock: undefined;
  SetupLock: undefined;
  App: undefined;
  Profile: undefined;
  Notifications: undefined;
  Prescriptions: undefined;
  Treatments: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  Patients: undefined;
  Appointments: undefined;
  WhatsApp: undefined;
  Billing: undefined;
};

export type PatientStackParamList = {
  PatientList: undefined;
  PatientDetail: { patientId: string };
  AddPatient: undefined;
  EditPatient: { patientId: string };
  PatientTreatments: { patientId: string; patientName: string };
  TreatmentDetail: { treatmentId: string };
  AddTreatment: { patientId: string; patientName: string };
  EditTreatment: { treatmentId: string };
  PatientPrescriptions: { patientId: string; patientName: string };
  NewPrescription: {
    patientId: string;
    patientName: string;
    visitId?: string;
    prefillDiagnosis?: string;
    prefillMedications?: Array<{
      drug_name: string;
      dosage?: string;
      frequency?: string;
      duration?: string;
      route?: string;
      purpose?: string;
      instructions?: string;
    }>;
  };
  ConsultationDetail: { visitId: string; patientName?: string };
  StartConsultation: {
    patientId: string;
    patientName: string;
    visitId?: string;
    prefill?: {
      chiefComplaint?: string;
      diagnosis?: string;
      examination?: string;
      treatmentPlan?: string;
    };
    thenWritePrescription?: {
      diagnosis: string;
      medications: Array<{
        drug_name: string;
        dosage?: string;
        frequency?: string;
        duration?: string;
        route?: string;
        purpose?: string;
        instructions?: string;
      }>;
    };
  };
  PatientDentalChart: { patientId: string; patientName: string };
  SignConsent: { consentId: string; consentTitle?: string; defaultName?: string };
  NewConsent: { patientId: string };
  EnrollMembership: { patientId?: string; patientName?: string };
  EditPrescription: { prescriptionId: string };
};

export type AppointmentStackParamList = {
  AppointmentList: { view?: 'list' | 'calendar' } | undefined;
  AppointmentDetail: { appointmentId: string };
  BookAppointment: { patientId?: string };
};

export interface ClinicUser {
  id: string;
  clinic_id: string;
  branch_id?: string | null;
  branch?: { id: string; name: string } | null;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  status: string;
  email_verified?: boolean;
  phone_verified?: boolean;
  is_doctor?: boolean;
  license_number?: string | null;
  profile_photo_url?: string | null;
  listed_in_directory?: boolean;
  bio?: string | null;
  years_experience?: number | null;
  consultation_fee?: number | string | null;
  languages_spoken?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Branch {
  id: string;
  clinic_id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  map_url?: string | null;
  photo_url?: string | null;
  book_now_url?: string | null;
  working_start_time?: string | null;
  working_end_time?: string | null;
  lunch_start_time?: string | null;
  lunch_end_time?: string | null;
  slot_duration?: number | null;
  default_appt_duration?: number | null;
  working_days?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface BranchScheduling {
  working_start_time: string;
  working_end_time: string;
  lunch_start_time: string | null;
  lunch_end_time: string | null;
  slot_duration: number;
  default_appt_duration: number;
  buffer_minutes?: number;
  advance_booking_days?: number;
  working_days: string;
  room_cleaning_duration_minutes?: number;
}

export type BillingStackParamList = {
  MoreMenu: undefined;
  InvoiceList: undefined;
  InvoiceDetail: { invoiceId: string };
  EditInvoice: { invoiceId: string };
  QuickInvoice: { patientId?: string };
  PrescriptionList: undefined;
  PrescriptionDetail: { prescriptionId: string };
  EditPrescription: { prescriptionId: string };
  TreatmentList: undefined;
  TreatmentDetail: { treatmentId: string };
  EditTreatment: { treatmentId: string };
  ExpenseList: undefined;
  AddExpense: undefined;
  EditExpense: { expenseId: string };
  ExpenseDetail: { expenseId: string };
  ExpenseAdvisor: undefined;
  ExpenseCategories: undefined;
  BranchScheduling: { branchId: string };
  StaffList: undefined;
  AddStaff: undefined;
  EditStaff: { userId: string };
  StaffDetail: { userId: string };
  BranchList: undefined;
  AddBranch: undefined;
  EditBranch: { branchId: string };
  BranchDetail: { branchId: string };
  Reports: undefined;
  MembershipList: undefined;
  MembershipPlanDetail: { planId: string };
  AddMembershipPlan: undefined;
  EditMembershipPlan: { planId: string };
  MembershipEnrollmentDetail: { enrollmentId: string };
  EditMembershipEnrollment: { enrollmentId: string };
  EnrollMembership: { patientId?: string; patientName?: string };
  Communications: undefined;
  CampaignList: undefined;
  CampaignDetail: { campaignId: string };
  CreateCampaign: undefined;
  AIInsights: undefined;
  ClinicBilling: undefined;
  PlatformInvoices: undefined;
  /** @deprecated Use ClinicBilling */
  BillingGuide: undefined;
  SettingsGuide: undefined;
};

export type WhatsAppStackParamList = {
  ConversationList: undefined;
  ChatThread: { phone: string; name: string; patientId: string | null };
  NewConversation: undefined;
};
