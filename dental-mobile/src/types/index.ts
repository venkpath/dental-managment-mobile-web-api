export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'DENTIST' | 'RECEPTIONIST' | 'STAFF';
  branch_id?: string;
  clinic_id: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  clinicId: string | null;
  branchId: string | null;
  isAuthenticated: boolean;
  setClinicId: (clinicId: string) => void;
  login: (token: string, user: User, clinicId: string, branchId?: string) => void;
  logout: () => void;
}

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  date_of_birth?: string;
  blood_group?: string;
  medical_history?: Record<string, unknown>;
  notes?: string;
  created_at: string;
  branch?: { name: string };
}

export interface Appointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  patient: { id: string; first_name: string; last_name: string; phone: string };
  dentist: { id: string; name: string };
  branch?: { name: string };
}

export interface Treatment {
  id: string;
  tooth_number?: string;
  diagnosis: string;
  procedure: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
  cost: number;
  notes?: string;
  patient: { id: string; first_name: string; last_name: string };
  dentist: { id: string; name: string };
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

export interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  net_amount: number;
  tax_amount: number;
  discount_amount: number;
  status: 'pending' | 'partially_paid' | 'paid';
  patient: { id: string; first_name: string; last_name: string; phone: string };
  branch?: { name: string };
  items?: InvoiceItem[];
  payments?: InvoicePayment[];
  installment_plan?: InstallmentPlan;
  created_at: string;
}

export interface DashboardSummary {
  today_appointments: number;
  today_revenue: number;
  pending_invoices: number;
  low_inventory_count: number;
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

export type RootStackParamList = {
  Login: undefined;
  App: undefined;
  Profile: undefined;
};

export type TabParamList = {
  Dashboard: undefined;
  Patients: undefined;
  Appointments: undefined;
  Billing: undefined;
};

export type PatientStackParamList = {
  PatientList: undefined;
  PatientDetail: { patientId: string };
  AddPatient: undefined;
  EditPatient: { patientId: string };
  PatientTreatments: { patientId: string; patientName: string };
  AddTreatment: { patientId: string; patientName: string };
  EditTreatment: { treatmentId: string };
  PatientPrescriptions: { patientId: string; patientName: string };
};

export type AppointmentStackParamList = {
  AppointmentList: undefined;
  AppointmentDetail: { appointmentId: string };
  BookAppointment: { patientId?: string };
};

export type BillingStackParamList = {
  InvoiceList: undefined;
  InvoiceDetail: { invoiceId: string };
  QuickInvoice: { patientId?: string };
};
