// ============================================================================
// BotMedical SaaS & Clinical Database TypeScript Interfaces
// Architecture: Database-First Multi-Tenant Role-Based Access Control (RBAC)
// ============================================================================

export type UserRoleCode = 'super_admin' | 'clinic_admin' | 'doctor' | 'staff' | 'patient';

export type UserStatus = 'active' | 'suspended' | 'pending';

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'in_consultation'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type TriageStage = 'emergency' | 'follow_up' | 'concluded';

export type PaymentStatus = 'pending' | 'paid' | 'mock_success' | 'failed' | 'refunded';

export interface Tenant {
  id: string;
  name: string;
  code: string;
  brandName?: string;
  licenseNumber?: string;
  hotline?: string;
  address?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
  isVerified: boolean;
  tenantId?: string;
  phone?: string;
  avatarUrl?: string;
  status: UserStatus;
  createdAt: number;
  updatedAt: number;
  roles?: UserRoleCode[];
}

export interface Role {
  id: string;
  name: string;
  code: UserRoleCode;
  description?: string;
  isSystem: boolean;
  createdAt: number;
}

export interface Permission {
  id: string;
  name: string;
  code: string;
  category: string;
  description?: string;
  createdAt: number;
}

export interface SpecialtyRecord {
  id: string;
  tenantId?: string;
  name: string;
  category: string;
  shortDesc?: string;
  fullDesc?: string;
  commonSymptoms?: string[];
  chiefDoctorName?: string;
  iconName?: string;
  diseasesCovered: number;
  isActive: boolean;
  createdAt: number;
}

export interface DoctorRecord {
  id: string;
  tenantId?: string;
  userId?: string;
  name: string;
  title: string;
  specialtyId: string;
  experienceYears: number;
  education?: string;
  hospitalAffiliation?: string;
  bio?: string;
  availableDays?: string[];
  consultationFee: number;
  isActive: boolean;
  createdAt: number;
}

export interface ServiceRecord {
  id: string;
  tenantId?: string;
  specialtyId?: string;
  name: string;
  code: string;
  serviceType: 'consultation' | 'lab_test' | 'imaging' | 'package';
  price: number;
  discountPrice?: number;
  description?: string;
  isActive: boolean;
  createdAt: number;
}

export interface AppointmentRecord {
  id: string;
  tenantId?: string;
  userId?: string;
  specialtyId: string;
  doctorId?: string;
  serviceId?: string;
  appointmentDate: string;
  appointmentTime: string;
  patientName: string;
  patientPhone: string;
  notes?: string;
  queueNumber?: number;
  status: AppointmentStatus;
  checkinAt?: number;
  completedAt?: number;
  cancellationReason?: string;
  createdAt: number;
}

export interface ChatChannel {
  id: string;
  tenantId?: string;
  channelType: 'doctor_patient' | 'support_triage';
  patientId: string;
  doctorId?: string;
  appointmentId?: string;
  status: 'active' | 'closed' | 'waiting_doctor';
  lastMessageText?: string;
  lastMessageAt?: number;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderRole: 'patient' | 'doctor' | 'staff' | 'system';
  messageType: 'text' | 'image' | 'system_event' | 'triage_card';
  content: string;
  attachmentUrl?: string;
  isRead: boolean;
  createdAt: number;
}

export interface AiTriageSession {
  id: string;
  tenantId?: string;
  userId?: string;
  sessionToken?: string;
  stage: TriageStage;
  chiefComplaint?: string;
  isEmergency: boolean;
  emergencyRuleId?: string;
  recommendedSpecialtyId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AiTriageLog {
  id: string;
  sessionId: string;
  turnIndex: number;
  userMessage: string;
  botReply: string;
  stage: TriageStage;
  extractedSymptoms?: any[];
  topCandidates?: any[];
  latencyMs?: number;
  createdAt: number;
}

export interface ConsultationRecord {
  id: string;
  appointmentId: string;
  doctorId: string;
  patientId?: string;
  clinicalNotes?: string;
  preliminaryDiagnosis?: string;
  treatmentPlan?: string;
  prescriptionSummary?: string;
  createdAt: number;
}

export interface InvoiceRecord {
  id: string;
  tenantId?: string;
  appointmentId: string;
  userId?: string;
  amount: number;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  transactionCode?: string;
  demoNotes?: string;
  paidAt?: number;
  createdAt: number;
}
