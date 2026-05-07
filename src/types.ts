import type { Blob } from '@google/genai';

export interface Turn {
  speaker: string;
  text: string;
  timestamp?: string;
}

export interface PrescriptionDetails {
  medicationPrescription: string;
  injections: string;
  therapeuticServices: string;
  laboratoryServices: string;
  diagnosticImaging: string;
  cardioPulmonaryDiagnostics: string;
  minorProcedures: string;
  preventiveSupportServices: string;
  homeHealthcare: string;
  admissionNotes: string;
}

export interface Vitals {
  bp: string;
  pulse: string;
  spo2: string;
  temp: string;
  weight: string;
  glucose: string;
}

export interface PatientInfo {
  patientId?: string;
  name: string;
  age: string;
  gender: string;
  phone: string;
  email?: string;
  address?: string;
  externalEhrId?: string;
}

export type AIProvider = 'gemini' | 'self-hosted' | 'other-cloud';

export interface AIProviderSettings {
    provider: AIProvider;
    streamingUrl?: string; 
    httpUrl?: string;
    cloudApiKey?: string;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    preferredLanguage?: string;
    enableMedicalVocabulary?: boolean;
    wakeWord?: string;
}

export interface EhrSettings {
  enabled: boolean;
  provider: 'generic-fhir' | 'epic' | 'cerner';
  apiUrl: string;
  apiKey: string;
  autoPushData: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  entityId?: string;
  entityType?: 'appointment' | 'user' | 'config' | 'consultation' | 'system';
}

// --- New & Updated Types for Multi-Doctor Clinic ---

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  isAvailable: boolean;
  phone?: string;
}

export interface TimeSlot {
  startTime: string; // e.g., "09:00"
  endTime: string;   // e.g., "12:00"
  maxPatients: number;
  room: string; // e.g., "Room 101" or "Consultation A"
  type?: 'available' | 'unavailable'; // To distinguish between patient slots and breaks.
}

export interface DoctorSchedule {
  [day: string]: TimeSlot[]; // e.g., { "Monday": [{...}], "Tuesday": [] }
}

export type AppointmentStatus = 'booked' | 'intake' | 'waiting-for-doctor' | 'in-consultation' | 'completed' | 'rescheduled' | 'cancelled' | 'dispatched';

export interface Appointment {
  id: string; 
  patientName: string;
  appointmentTime: string; // ISO string format
  reasonForVisit: string;
  status: AppointmentStatus;
  doctorId: string; // Link appointment to a specific doctor
  room: string; // The room assigned for this appointment
  source?: 'whatsapp' | 'patient-portal';
  patientInfo?: PatientInfo;
  vitals?: Vitals;
  preliminaryNotes?: string;
  medicalHistory?: string;
  triageReport?: string;
  summary?: string;
  englishTranscript?: string;
  prescriptionDetails?: PrescriptionDetails;
  dispatchStatus?: { [key: string]: boolean };
  remindersSent?: { [intervalInHours: number]: boolean };
  notes?: string;
}

// --- New Types for Role-Based Access Control (RBAC) ---

export type RoleName = 'Admin' | 'Doctor' | 'Nurse' | 'Receptionist' | 'Staff';

export type Permission = 
  | 'viewDashboard'
  | 'manageAppointments' // Create, edit, cancel appointments
  | 'manageClinicConfig' // Access to the main clinic config screen (doctors, schedules)
  | 'manageUsersAndRoles' // Access to the RBAC screen
  | 'performIntake' // Access to the nurse intake screen
  | 'startConsultation' // Access to the doctor consultation screen
  | 'dispatchOrders'; // Access to the post-consultation dispatch screen

export interface Role {
  id: string; // e.g., 'role-doctor'
  name: RoleName;
  permissions: Set<Permission>;
}

export interface User {
  id: string; // e.g., 'user-123'
  name: string; // e.g., 'Dr. Emily Carter'
  roleId: string;
  password?: string;
  email?: string;
}

export interface ConsultationRecord {
    id: string;
    appointmentId: string;
    consultationDate: string;
    patientName: string;
    doctorId: string;
    turns: Turn[];
    englishTranscript: string;
    summary: string;
    prescriptionDetails: PrescriptionDetails | null;
    detectedLanguages: string;
}