
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getAiService, type RecordingControls } from './services/geminiService';
import { TranscriptionDisplay } from './components/TranscriptionDisplay';
import { ResultsDisplay } from './components/ResultsDisplay';
import { Header } from './Header';
import { ErrorBanner } from './components/ErrorBanner';
import { CustomPrompts } from './components/CustomPrompts';
import { defaultPrompts, type Prompts } from './prompts/defaultPrompts';
import type { Turn, AIProviderSettings, PrescriptionDetails, Vitals, PatientInfo, Doctor, Appointment, Role, User, Permission, AppointmentStatus, ConsultationRecord, AuditLog, EhrSettings } from './types';
import { SettingsModal, type ReminderSettings } from './components/SettingsModal';
import { ShareModal } from './components/ShareModal';
import { AudioVisualizer } from './components/AudioVisualizer';
import type { AIService } from './services/aiService';
import { PreConsultationScreen } from './components/PreConsultationScreen';
import { TriageReviewScreen } from './components/TriageReviewScreen';
import { RecordButton } from './components/RecordButton';
import { ClinicConfigScreen } from './components/ClinicConfigScreen';
import { PatientBookingScreen } from './components/PatientBookingScreen';
import { AppointmentsDashboard } from './components/AppointmentsDashboard';
import { DispatchScreen } from './components/DispatchScreen';
import { EditAppointmentModal } from './components/EditAppointmentModal';
import { generateDoctorReminderMessage, generatePatientReminderMessage, sendWhatsAppMessage } from './utils/scheduleUtils';
import { RBACScreen } from './components/RBACScreen';
import { AccessDenied } from './components/AccessDenied';
import { LoginScreen } from './components/LoginScreen';
import { AlertIcon, ArrowLeftIcon } from './constants/icons';
import { getFriendlyErrorMessage } from './utils/apiUtils';
import { PreConsultationSummary } from './components/PreConsultationSummary';
import type { DoctorSchedule as DoctorScheduleType } from './types';
import { APP_NAME } from './constants/appConfig';
import { ConsultationHistoryViewer } from './components/ConsultationHistoryViewer';
import { UserSwitcherModal } from './components/UserSwitcherModal';
import { ehrService } from './services/ehrService';

export type AppMode = 'patient-booking' | 'clinic-admin';
type ConsultationState = 'dashboard' | 'config' | 'rbac' | 'nurse-intake' | 'triage-review' | 'doctor-consultation' | 'dispatch-orders';

const APP_STORAGE_KEY = 'clinicalApp_v1';

const getInitialData = () => {
    const defaultRoles: Role[] = [
        { id: 'admin', name: 'Admin', permissions: new Set<Permission>(['viewDashboard', 'manageAppointments', 'manageClinicConfig', 'manageUsersAndRoles', 'performIntake', 'startConsultation', 'dispatchOrders'])},
        { id: 'doctor', name: 'Doctor', permissions: new Set<Permission>(['viewDashboard', 'startConsultation', 'dispatchOrders'])},
        { id: 'nurse', name: 'Nurse', permissions: new Set<Permission>(['viewDashboard', 'performIntake', 'dispatchOrders'])},
        { id: 'receptionist', name: 'Receptionist', permissions: new Set<Permission>(['viewDashboard', 'manageAppointments'])},
    ];
    const defaultUsers: User[] = [
        { id: 'user-admin', name: 'Admin User', roleId: 'admin', email: 'admin@clinic.com' },
        { id: 'user-doctor', name: 'Dr. Emily Carter', roleId: 'doctor', email: 'ecarter@clinic.com' },
        { id: 'user-nurse', name: 'Nurse Michael Chen', roleId: 'nurse', email: 'mchen@clinic.com' },
        { id: 'user-receptionist', name: 'Sarah Lee', roleId: 'receptionist', email: 'slee@clinic.com' },
    ];
    const defaultDoctors: Doctor[] = [
        { id: 'doc-1', name: 'Dr. Emily Carter', specialty: 'Cardiology', isAvailable: true, phone: '555-0101' },
        { id: 'doc-2', name: 'Dr. Ben Hanson', specialty: 'Pediatrics', isAvailable: true, phone: '555-0102' },
    ];
    const defaultPatients: PatientInfo[] = [
        { name: 'John Doe', age: '45', gender: 'Male', phone: '555-0001' },
        { name: 'Jane Smith', age: '32', gender: 'Female', phone: '555-0002' },
        { name: 'Robert Wilson', age: '62', gender: 'Male', phone: '555-0003' },
        { name: 'Emily Taylor', age: '28', gender: 'Female', phone: '555-0004' },
    ];
    return {
        roles: defaultRoles,
        users: defaultUsers,
        doctors: defaultDoctors,
        appointments: [],
        patients: defaultPatients,
        schedules: {},
        consultationHistory: [],
        pharmacyNumber: '', nursingStationNumber: '', patientNumber: '',
        clinicName: APP_NAME, clinicAddress: '', dateTimeFormat: 'MMMM D, YYYY, hh:mm A',
        aiProviderSettings: { provider: 'gemini' } as AIProviderSettings,
        prompts: defaultPrompts,
        whatsAppNumber: '', whatsAppToken: '',
        departmentContacts: {},
        reminderSettings: { enabled: true, intervals: [24, 1] } as ReminderSettings,
    };
};

export const App: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
        const savedTheme = localStorage.getItem('theme');
        return (savedTheme === 'dark' || savedTheme === 'light') ? savedTheme : 'light';
    }
    return 'light';
  });
  const [consultationState, setConsultationState] = useState<ConsultationState>('dashboard');
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<PatientInfo[]>([]);
  const [{ roles, users }, setRbacData] = useState<{ roles: Role[], users: User[] }>({ roles: [], users: []});
  const setRoles = (newRoles: Role[]) => setRbacData(prev => ({...prev, roles: newRoles}));
  const setUsers = (newUsers: User[]) => setRbacData(prev => ({...prev, users: newUsers}));

  const [activeAppointment, setActiveAppointment] = useState<Appointment | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [englishTranscript, setEnglishTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [prescriptionDetails, setPrescriptionDetails] = useState<PrescriptionDetails | null>(null);
  const [detectedLanguages, setDetectedLanguages] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [correctionTarget, setCorrectionTarget] = useState<keyof PrescriptionDetails | null>(null);
  const [isMicRecordingForCorrection, setIsMicRecordingForCorrection] = useState(false);
  const [isProcessingCorrection, setIsProcessingCorrection] = useState(false);
  const [currentCorrectionText, setCurrentCorrectionText] = useState('');
  const [summaryFeedback, setSummaryFeedback] = useState<'up' | 'down' | null>(null);
  const [prescriptionFeedback, setPrescriptionFeedback] = useState<{ [key in keyof PrescriptionDetails]?: 'up' | 'down' }>({});
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [patientInfo, setPatientInfo] = useState<PatientInfo>({ name: '', age: '', gender: '', phone: '' });
  const [vitals, setVitals] = useState<Vitals>({ bp: '', pulse: '', spo2: '', temp: '', weight: '', glucose: '' });
  const [preliminaryNotes, setPreliminaryNotes] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [triageReport, setTriageReport] = useState('');
  const [isGeneratingTriage, setIsGeneratingTriage] = useState(false);
  const [intakeRecordingStatus, setIntakeRecordingStatus] = useState<'idle' | 'recording' | 'paused'>('idle');
  const [isProcessingIntake, setIsProcessingIntake] = useState(false);
  const [intakeTranscriptionTurns, setIntakeTranscriptionTurns] = useState<Turn[]>([]);
  const [currentIntakeTranscription, setCurrentIntakeTranscription] = useState('');
  
  const [activeDoctorId, setActiveDoctorId] = useState<string | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<'pharmacy' | 'nursing' | 'patient' | null>(null);
  
  const [pharmacyNumber, setPharmacyNumber] = useState('');
  const [nursingStationNumber, setNursingStationNumber] = useState('');
  const [patientNumber, setPatientNumber] = useState('');
  const [clinicName, setClinicName] = useState(APP_NAME);
  const [clinicAddress, setClinicAddress] = useState('');
  const [dateTimeFormat, setDateTimeFormat] = useState('MMMM D, YYYY, hh:mm A');
  const [aiProviderSettings, setAiProviderSettings] = useState<AIProviderSettings>({ provider: 'gemini' });
  const [prompts, setPrompts] = useState<Prompts>(defaultPrompts);
  const [whatsAppNumber, setWhatsAppNumber] = useState('');
  const [whatsAppToken, setWhatsAppToken] = useState('');
  const [departmentContacts, setDepartmentContacts] = useState<{ [key: string]: string }>({});
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [ehrSettings, setEhrSettings] = useState<EhrSettings>({
    enabled: false,
    provider: 'generic-fhir',
    apiUrl: '',
    apiKey: '',
    autoPushData: false
  });
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>({ enabled: true, intervals: [24, 1] });
  const [schedules, setSchedules] = useState<{ [doctorId: string]: DoctorScheduleType }>({});
  
  const [consultationHistory, setConsultationHistory] = useState<ConsultationRecord[]>([]);
  const [viewingConsultationRecord, setViewingConsultationRecord] = useState<ConsultationRecord | null>(null);

  const [appMode, setAppMode] = useState<AppMode>('clinic-admin');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAppLoaded, setIsAppLoaded] = useState(false);

  const recordingControlsRef = useRef<RecordingControls | null>(null);
  const fullTranscriptRef = useRef<Turn[]>([]);
  const currentTranscriptionRef = useRef('');
  const intakeTranscriptRef = useRef<Turn[]>([]);
  const currentIntakeTranscriptionRef = useRef('');

  const activeAiService = useMemo(() => {
    try {
      return getAiService(aiProviderSettings);
    } catch (err) {
      return null;
    }
  }, [aiProviderSettings]);

  useEffect(() => {
    if (!isAppLoaded) return;
    try {
      getAiService(aiProviderSettings);
      setError(null);
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    }
  }, [aiProviderSettings, isAppLoaded]);

  useEffect(() => {
    try {
        const savedState = localStorage.getItem(APP_STORAGE_KEY);
        const initialData = getInitialData();
        
        if (savedState) {
            const parsedState = JSON.parse(savedState);
            setAppointments(parsedState.appointments || initialData.appointments);
            setDoctors(parsedState.doctors || initialData.doctors);
            setPatients(parsedState.patients || initialData.patients);
            setConsultationHistory(parsedState.consultationHistory || initialData.consultationHistory);
            
            const loadedRoles = (parsedState.roles || initialData.roles).map((r: any) => ({
                ...r,
                permissions: new Set(Array.isArray(r.permissions) ? r.permissions : Array.from(r.permissions || []))
            }));
            
            setRbacData({
                roles: loadedRoles,
                users: parsedState.users || initialData.users,
            });
            
            setSchedules(parsedState.schedules || initialData.schedules);
            setPharmacyNumber(parsedState.pharmacyNumber || initialData.pharmacyNumber);
            setNursingStationNumber(parsedState.nursingStationNumber || initialData.nursingStationNumber);
            setPatientNumber(parsedState.patientNumber || initialData.patientNumber);
            setClinicName(parsedState.clinicName || initialData.clinicName);
            setClinicAddress(parsedState.clinicAddress || initialData.clinicAddress);
            setDateTimeFormat(parsedState.dateTimeFormat || initialData.dateTimeFormat);
            setAiProviderSettings(parsedState.aiProviderSettings || initialData.aiProviderSettings);
            setPrompts(parsedState.prompts || initialData.prompts);
            setWhatsAppNumber(parsedState.whatsAppNumber || initialData.whatsAppNumber);
            setWhatsAppToken(parsedState.whatsAppToken || initialData.whatsAppToken);
            setDepartmentContacts(parsedState.departmentContacts || initialData.departmentContacts);
            setReminderSettings(parsedState.reminderSettings || initialData.reminderSettings);
            setEhrSettings(parsedState.ehrSettings || { enabled: false, provider: 'generic-fhir', apiUrl: '', apiKey: '', autoPushData: false });
            setAuditLogs(parsedState.auditLogs || []);
            setTheme(parsedState.theme || (localStorage.getItem('theme') as 'light' | 'dark') || 'light');
        } else {
            setAppointments(initialData.appointments);
            setDoctors(initialData.doctors);
            setPatients(initialData.patients);
            setConsultationHistory(initialData.consultationHistory);
            setRbacData({ roles: initialData.roles, users: initialData.users });
            setSchedules(initialData.schedules);
            // Default settings already handle the rest via state initialization if they are truthy
        }
        
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            try {
                setCurrentUser(JSON.parse(savedUser));
            } catch {
                localStorage.removeItem('currentUser');
            }
        }
    } catch (e) {
        console.error("Failed to load state from localStorage", e);
        const initialData = getInitialData();
        setRbacData({ roles: initialData.roles, users: initialData.users });
    } finally {
        setIsAppLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isAppLoaded || !reminderSettings.enabled) return;

    const checkReminders = () => {
      const now = new Date();
      let hasChanges = false;

      setAppointments(prev => {
        const updated = prev.map(app => {
          if (app.status !== 'booked') return app;

          const appTime = new Date(app.appointmentTime);
          const diffMs = appTime.getTime() - now.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);

          const remindersSent = { ...(app.remindersSent || {}) };
          let sentSomething = false;

          reminderSettings.intervals.forEach(targetHours => {
            // Check if we are within the target interval
            // Use a smaller margin of error for smaller intervals
            const marginOfError = targetHours <= 1 ? 0.1 : 0.5; 
            
            if (diffHours > 0 && diffHours <= targetHours && diffHours >= targetHours - marginOfError && !remindersSent[targetHours]) {
              const doctor = doctors.find(d => d.id === app.doctorId);
              const doctorName = doctor?.name || 'your doctor';
              
              const patientMsg = generatePatientReminderMessage(app, doctorName, clinicName);
              const patientPhone = app.patientInfo?.phone || '';
              if (patientPhone) {
                  sendWhatsAppMessage(patientPhone, patientMsg, (err) => console.error('Patient Reminder Error:', err));
              }
              
              // Only send to doctor if it's a short-term reminder
              if (targetHours <= 2) {
                  const docMsg = generateDoctorReminderMessage(app, doctorName);
                  const doctorPhone = doctor?.phone || '';
                  if (doctorPhone) {
                      sendWhatsAppMessage(doctorPhone, docMsg, (err) => console.error('Doctor Reminder Error:', err));
                  }
              }

              remindersSent[targetHours] = true;
              sentSomething = true;
            }
          });

          if (sentSomething) {
            hasChanges = true;
            return { ...app, remindersSent };
          }
          return app;
        });

        if (hasChanges) return updated;
        return prev;
      });
    };

    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [reminderSettings, doctors, clinicName, isAppLoaded]);
// In App.tsx, add this useEffect after isAppLoaded is true
useEffect(() => {
    if (!isAppLoaded) return;
    fetch(`${import.meta.env.VITE_API_BASE_URL}/doctors`)
        .then(r => r.json())
        .then(data => setDoctors(data.map((d: any) => ({
            id: d.id,
            name: d.name,
            specialty: d.specialty,
            phone: d.phone,
            isAvailable: d.is_available ?? true,
        }))))
        .catch(err => console.error('Failed to load doctors:', err));
}, [isAppLoaded]);
  useEffect(() => {
    if (!isAppLoaded) return;
    try {
        localStorage.setItem('theme', theme);
        const stateToSave = {
            theme,
            appointments, doctors, patients, consultationHistory,
            roles: roles.map(r => ({ ...r, permissions: Array.from(r.permissions)})),
            users,
            schedules, pharmacyNumber, nursingStationNumber, patientNumber, clinicName,
            clinicAddress, dateTimeFormat, aiProviderSettings, prompts,
            whatsAppNumber, whatsAppToken, departmentContacts, reminderSettings,
            ehrSettings, auditLogs
        };
        localStorage.setItem(APP_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
        console.error("Failed to save state to localStorage", e);
    }
  }, [appointments, doctors, patients, consultationHistory, roles, users, schedules, pharmacyNumber, nursingStationNumber, patientNumber, clinicName, clinicAddress, dateTimeFormat, aiProviderSettings, prompts, whatsAppNumber, whatsAppToken, departmentContacts, reminderSettings, isAppLoaded]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleUpdateAppointment = async (updatedAppointment: Appointment) => {
    setAppointments(prev => prev.map(app => app.id === updatedAppointment.id ? updatedAppointment : app));
    setEditingAppointment(null);
    logAction('Update Appointment', `Updated appointment for ${updatedAppointment.patientName}`, updatedAppointment.id, 'appointment');
  };
  
  const handleLoginAttempt = async (username: string, pass: string): Promise<User | null> => {
    const user = users.find(u => u.name.toLowerCase() === username.toLowerCase());
    // For this demo, we'll accept a common password 'admin' for any user.
    if (user && pass === 'admin') {
        setCurrentUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        return user;
    }
    setError('Invalid username or password.');
    return null;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setConsultationState('dashboard');
  };

  const handleUserSwitch = (user: User) => {
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      setIsUserSwitcherOpen(false);
      logAction('User Switch', `Switched to user: ${user.name} (${user.roleId})`, user.id, 'user');
  };

  const handleModeChange = (mode: AppMode) => setAppMode(mode);
  const handleCheckUserExists = (username: string): boolean => {
    return users.some(u => u.name.toLowerCase() === username.toLowerCase());
  };

  const logAction = useCallback((action: string, details: string, entityId?: string, entityType?: AuditLog['entityType']) => {
    const userToLog = currentUser || { id: 'system', name: 'System' };
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId: userToLog.id,
      userName: userToLog.name,
      action,
      details,
      entityId,
      entityType
    };
    setAuditLogs(prev => [newLog, ...prev].slice(0, 500)); 
  }, [currentUser]);

  // Global Error Logging
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      logAction('System Error', `Runtime Error: ${event.message} at ${event.filename}:${event.lineno}`, undefined, 'system');
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      logAction('System Error', `Unhandled Promise Rejection: ${event.reason}`, undefined, 'system');
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [logAction]);

  const handleSaveSettings = (
      newPharmacyNumber: string, newNursingStationNumber: string, newPatientNumber: string,
      newClinicName: string, newClinicAddress: string, newDateTimeFormat: string,
      newAiSettings: AIProviderSettings, newWhatsAppNumber: string, newWhatsAppToken: string,
      newDepartmentContacts: { [key: string]: string }, newReminderSettings: ReminderSettings,
      newEhrSettings?: EhrSettings
  ) => {
      setPharmacyNumber(newPharmacyNumber);
      setNursingStationNumber(newNursingStationNumber);
      setPatientNumber(newPatientNumber);
      setClinicName(newClinicName);
      setClinicAddress(newClinicAddress);
      setDateTimeFormat(newDateTimeFormat);
      setAiProviderSettings(newAiSettings);
      setWhatsAppNumber(newWhatsAppNumber);
      setWhatsAppToken(newWhatsAppToken);
      setDepartmentContacts(newDepartmentContacts);
      setReminderSettings(newReminderSettings);
      if (newEhrSettings) setEhrSettings(newEhrSettings);
      setIsSettingsOpen(false);
      
      logAction('Update Settings', 'Clinic configuration updated');
  };

  const handleShare = (target: 'pharmacy' | 'nursing' | 'patient') => {
      setShareTarget(target);
      setIsShareModalOpen(true);
  };

  const handleSendShare = (number: string, saveAsDefault: boolean) => {
      let message = '';
      if (shareTarget === 'pharmacy') {
          message = `*Medication Prescription*\n\n${prescriptionDetails?.medicationPrescription || 'Not available.'}`;
          if (saveAsDefault) setPharmacyNumber(number);
      } else if (shareTarget === 'nursing') {
          const nursingTasks = [ prescriptionDetails?.injections, prescriptionDetails?.minorProcedures ].filter(Boolean).join('\n\n');
          message = `*Nursing Orders*\n\n${nursingTasks || 'No specific nursing orders.'}`;
          if (saveAsDefault) setNursingStationNumber(number);
      } else if (shareTarget === 'patient') {
          message = `*Consultation Summary*\n\n${summary || 'Summary not available.'}`;
          if (saveAsDefault) setPatientNumber(number);
      }
      sendWhatsAppMessage(number, message, (err) => setError(err));
      setIsShareModalOpen(false);
  };
  
  const hasPermission = (permission: Permission): boolean => {
      if (!currentUser) return false;
      const userRole = roles.find(r => r.id === currentUser.roleId);
      if (!userRole) return false;
      return userRole.permissions.has(permission);
  };

  // --- Consultation Flow Handlers ---

  const handleNewConsultation = () => {
    setIsRecording(false);
    setIsPaused(false);
    setIsFinalized(false);
    setTurns([]);
    setCurrentTranscription('');
    setEnglishTranscript('');
    setSummary('');
    setPrescriptionDetails(null);
    setDetectedLanguages('');
    recordingControlsRef.current?.stop();
    recordingControlsRef.current = null;
    setStream(null);
  };

  const handleSaveAndFinishConsultation = async () => {
    if (!activeAppointment || !isFinalized) return;

    const newRecord: ConsultationRecord = {
      id: `consult-${Date.now()}`,
      appointmentId: activeAppointment.id,
      consultationDate: new Date().toISOString(),
      patientName: activeAppointment.patientName,
      doctorId: activeAppointment.doctorId,
      turns: turns,
      englishTranscript: englishTranscript,
      summary: summary,
      prescriptionDetails: prescriptionDetails,
      detectedLanguages: detectedLanguages,
    };
    setConsultationHistory(prev => [...prev, newRecord]);

    setAppointments(prev => prev.map(app => 
        app.id === activeAppointment.id ? { ...app, status: 'completed' } : app
    ));

    if (ehrSettings.enabled && ehrSettings.autoPushData) {
      try {
        await ehrService.pushConsultationData({ ...activeAppointment, summary, prescriptionDetails } as Appointment, ehrSettings);
        logAction('EHR Push', `Consultation data pushed to EHR for ${activeAppointment.patientName}`, activeAppointment.id, 'consultation');
      } catch (err) {
        console.error('EHR Push Failed:', err);
      }
    }

    logAction('Complete Consultation', `Consultation completed for ${activeAppointment.patientName}`, activeAppointment.id, 'consultation');

    handleNewConsultation();
    setConsultationState('dashboard');
  };
  
  const handleToggleRecording = async () => {
    if (isFinalized) {
      handleSaveAndFinishConsultation();
      return;
    }
    const aiService = activeAiService;
    if (!aiService) {
      setError("AI Service is not available. Please check your settings.");
      return;
    }

    if (isRecording) {
      if (isPaused) {
        recordingControlsRef.current?.resume();
        setIsPaused(false);
      } else {
        recordingControlsRef.current?.pause();
        setIsPaused(true);
      }
    } else {
      setIsRecording(true);
      setIsPaused(false);
      setTurns([]);
      setCurrentTranscription('');
      fullTranscriptRef.current = [];
      currentTranscriptionRef.current = '';

      try {
        const controls = await aiService.startLiveSession({
          onTranscriptionUpdate: (text) => {
            currentTranscriptionRef.current = text;
            setCurrentTranscription(text);
          },
          onTurnComplete: (turn) => {
            fullTranscriptRef.current.push(turn);
            setTurns([...fullTranscriptRef.current]);
            currentTranscriptionRef.current = '';
            setCurrentTranscription('');
          },
          onError: (err) => {
            setError(err);
            setIsRecording(false);
          },
          onStreamCreated: (mediaStream) => setStream(mediaStream),
        }, prompts.liveSystemInstruction);

        recordingControlsRef.current = {
            ...controls,
            stop: async () => {
                controls.stop();
                setIsRecording(false);
                setIsFinalized(true);
                setIsLoading(true);
                
                // Add any pending transcription as a final turn if it exists
                const finalTurns = [...fullTranscriptRef.current];
                if (currentTranscriptionRef.current.trim()) {
                    finalTurns.push({ 
                        speaker: 'User', 
                        text: currentTranscriptionRef.current.trim(), 
                        timestamp: new Date().toLocaleTimeString() 
                    });
                }
                
                const rawTranscript = finalTurns.map(t => `${t.speaker}: ${t.text}`).join('\n');

                try {
                    const results = await aiService.processTranscript(rawTranscript, {
                        englishTranscriptPromptTemplate: prompts.englishTranscriptPromptTemplate,
                        summaryPromptTemplate: prompts.summaryPromptTemplate,
                        prescriptionPromptTemplate: prompts.prescriptionPromptTemplate
                    });
                    setEnglishTranscript(results.englishTranscript);
                    setSummary(results.summary);
                    setPrescriptionDetails(results.prescription);
                    setDetectedLanguages(results.detectedLanguages);
                } catch (err) {
                    setError(getFriendlyErrorMessage(err, 'generating results'));
                } finally {
                    setIsLoading(false);
                }
            }
        };
      } catch (err) {
        setError(getFriendlyErrorMessage(err, 'starting recording'));
        setIsRecording(false);
      }
    }
  };
  
  // Nurse Intake Handlers
  const handleToggleIntakeRecording = async () => {
    const aiService = activeAiService;
    if (!aiService) {
      setError("AI Service is not available. Please check your settings.");
      return;
    }

    if (intakeRecordingStatus === 'recording') {
      recordingControlsRef.current?.stop();
      return;
    }

    setIntakeRecordingStatus('recording');
    setIntakeTranscriptionTurns([]);
    setCurrentIntakeTranscription('');
    intakeTranscriptRef.current = [];
    currentIntakeTranscriptionRef.current = '';

    try {
      const controls = await aiService.startLiveSession({
        onTranscriptionUpdate: (text) => {
          currentIntakeTranscriptionRef.current = text;
          setCurrentIntakeTranscription(text);
        },
        onTurnComplete: (turn) => {
          intakeTranscriptRef.current.push(turn);
          setIntakeTranscriptionTurns([...intakeTranscriptRef.current]);
          currentIntakeTranscriptionRef.current = '';
          setCurrentIntakeTranscription('');
        },
        onError: (err) => {
          setError(err);
          setIntakeRecordingStatus('idle');
        },
        onStreamCreated: (mediaStream) => setStream(mediaStream),
      }, prompts.liveSystemInstruction, { bypassWakeWord: true });

      recordingControlsRef.current = {
        ...controls,
        stop: async () => {
          controls.stop();
          setIntakeRecordingStatus('idle');
          setIsProcessingIntake(true);
          
          const finalTurns = [...intakeTranscriptRef.current];
          if (currentIntakeTranscriptionRef.current.trim()) {
              finalTurns.push({ 
                  speaker: 'User', 
                  text: currentIntakeTranscriptionRef.current.trim(), 
                  timestamp: new Date().toLocaleTimeString() 
              });
          }
          
          const rawTranscript = finalTurns.map(t => `${t.speaker}: ${t.text}`).join('\n');

          try {
            const results = await aiService.extractIntakeData(rawTranscript, prompts.intakeDataExtractionPromptTemplate);
            // Deep merge/update
            setPatientInfo(prev => ({ 
              ...prev, 
              ...results.patientInfo,
              // Ensure name doesn't get overwritten with empty if we already had it
              name: results.patientInfo.name || prev.name
            }));
            setVitals(prev => ({ ...prev, ...results.vitals }));
            setPreliminaryNotes(results.preliminaryNotes);
          } catch (err) {
            setError(getFriendlyErrorMessage(err, 'extracting intake data'));
          } finally {
            setIsProcessingIntake(false);
            setStream(null);
          }
        }
      };
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'starting intake recording'));
      setIntakeRecordingStatus('idle');
    }
  };

  const handleGenerateTriageReport = async () => {
    const aiService = activeAiService;
    if (!aiService) return;

    setIsGeneratingTriage(true);
    try {
      const { triageReport: report } = await aiService.generateTriageReport(vitals, preliminaryNotes, prompts.nurseTriageReportPromptTemplate);
      setTriageReport(report);
      setConsultationState('triage-review');
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'generating triage report'));
    } finally {
      setIsGeneratingTriage(false);
    }
  };

  const handleFinalizeIntake = () => {
    if (!activeAppointment) return;

    const updatedAppointment: Appointment = {
      ...activeAppointment,
      patientInfo: { ...patientInfo },
      vitals: { ...vitals },
      preliminaryNotes,
      medicalHistory,
      triageReport,
      status: 'booked' // Keep as booked but now with intake data
    };

    setAppointments(prev => prev.map(app => app.id === updatedAppointment.id ? updatedAppointment : app));
    setConsultationState('dashboard');
    setActiveAppointment(null);
    // Reset intake fields for next time
    setPatientInfo({ name: '', age: '', gender: '', phone: '' });
    setVitals({ bp: '', pulse: '', spo2: '', temp: '', weight: '', glucose: '' });
    setPreliminaryNotes('');
    setMedicalHistory('');
    setTriageReport('');
  };
  const handleCorrectionAction = () => {};
  const handleStartCorrection = (sectionKey: keyof PrescriptionDetails) => { setCorrectionTarget(sectionKey) };
  const handlePrescriptionFeedback = (sectionKey: keyof PrescriptionDetails, feedback: 'up' | 'down') => {
      setPrescriptionFeedback(prev => ({...prev, [sectionKey]: prev[sectionKey] === feedback ? undefined : feedback }));
  };
  const handleMarkAsDispatched = (appointmentId: string, sectionKey: keyof PrescriptionDetails) => {
      setAppointments(prev => prev.map(app => {
          if (app.id === appointmentId) {
              const newStatus = { ...(app.dispatchStatus || {}), [sectionKey]: true };
              return { ...app, dispatchStatus: newStatus };
          }
          return app;
      }));
  };
  const handleCancelAppointment = (appointmentId: string) => {
      setAppointments(prev => prev.map(app => app.id === appointmentId ? { ...app, status: 'cancelled' } : app));
      logAction('Cancel Appointment', `Cancelled appointment ID: ${appointmentId}`, appointmentId, 'appointment');
  };

  const handleBulkCancelAppointments = (ids: string[]) => {
      setAppointments(prev => prev.map(app => ids.includes(app.id) ? { ...app, status: 'cancelled' } : app));
      logAction('Bulk Cancel', `Cancelled ${ids.length} appointments`, ids.join(','), 'appointment');
  };

  const handleBulkMarkAsDispatched = (ids: string[]) => {
      setAppointments(prev => prev.map(app => {
          if (ids.includes(app.id)) {
              // Mark all sections as dispatched
              const allDispatched: { [key in keyof PrescriptionDetails]?: boolean } = {};
              if (app.prescriptionDetails) {
                  Object.keys(app.prescriptionDetails).forEach(k => {
                      if (app.prescriptionDetails?.[k as keyof PrescriptionDetails] && app.prescriptionDetails[k as keyof PrescriptionDetails] !== 'Not mentioned.') {
                          allDispatched[k as keyof PrescriptionDetails] = true;
                      }
                  });
              }
              return { ...app, dispatchStatus: allDispatched, status: 'dispatched' };
          }
          return app;
      }));
      logAction('Bulk Dispatch', `Marked ${ids.length} appointments as dispatched`, ids.join(','), 'appointment');
  };

  // Auto-redirect to setup if no doctors configured
  useEffect(() => {
    if (isAppLoaded && currentUser && doctors.length === 0 && hasPermission('manageClinicConfig') && consultationState === 'dashboard') {
      setConsultationState('config');
    }
  }, [doctors.length, currentUser, isAppLoaded, hasPermission, consultationState]);

  const renderContent = () => {
    switch(consultationState) {
        case 'dashboard':
            if (!hasPermission('viewDashboard')) return <AccessDenied onBack={() => setAppMode('patient-booking')} />;
            return <AppointmentsDashboard 
                appointments={appointments} doctors={doctors}
                activeDoctorId={activeDoctorId} onActiveDoctorChange={setActiveDoctorId}
                onStartIntake={(app) => { 
                    if (!hasPermission('performIntake')) return;
                    setActiveAppointment(app); 
                    setPatientInfo(app.patientInfo || { name: app.patientName, age: '', gender: '', phone: '' });
                    setVitals(app.vitals || { bp: '', pulse: '', spo2: '', temp: '', weight: '', glucose: '' });
                    setPreliminaryNotes(app.preliminaryNotes || '');
                    setMedicalHistory(app.medicalHistory || '');
                    setTriageReport(app.triageReport || '');
                    setConsultationState('nurse-intake'); 
                }}
                onManageClinic={() => {
                    if (hasPermission('manageClinicConfig')) setConsultationState('config');
                }}
                onManageUsers={() => {
                   if (hasPermission('manageUsersAndRoles')) setConsultationState('rbac');
                }}
                aiService={activeAiService} prompts={prompts} schedules={schedules}
                onAppointmentsChange={setAppointments} onError={setError}
                currentUser={currentUser} roles={roles} hasPermission={hasPermission}
                onStartConsultation={(app) => { 
                    if (!hasPermission('startConsultation')) return;
                    setActiveAppointment(app); handleNewConsultation(); setConsultationState('doctor-consultation'); 
                }}
                onStartDispatch={(app) => { 
                    if (!hasPermission('dispatchOrders')) return;
                    setActiveAppointment(app); setConsultationState('dispatch-orders'); 
                }}
                onEditAppointment={(app) => {
                    if (hasPermission('manageAppointments')) setEditingAppointment(app);
                }}
                onCancelAppointment={handleCancelAppointment} onEditIntake={() => {}}
                onBulkCancel={handleBulkCancelAppointments}
                onBulkDispatch={handleBulkMarkAsDispatched}
                patients={patients} onPatientsChange={setPatients}
                consultationHistory={consultationHistory}
                onViewRecord={setViewingConsultationRecord}
                auditLogs={auditLogs}
                lang={aiProviderSettings.preferredLanguage || 'English'}
                />;
        case 'config':
            if (!hasPermission('manageClinicConfig')) return <AccessDenied onBack={() => setConsultationState('dashboard')} />;
            return <ClinicConfigScreen doctors={doctors} schedules={schedules} onSave={(d, s) => {setDoctors(d); setSchedules(s);}} onBack={() => setConsultationState('dashboard')} />;
        case 'rbac':
            if (!hasPermission('manageUsersAndRoles')) return <AccessDenied onBack={() => setConsultationState('dashboard')} />;
            return <RBACScreen users={users} roles={roles} onSave={(r, u) => setRbacData({roles: r, users: u})} onBack={() => setConsultationState('dashboard')} />;
        case 'nurse-intake':
            if (!hasPermission('performIntake') || !activeAppointment) return <AccessDenied onBack={() => setConsultationState('dashboard')} />;
            return <PreConsultationScreen
                patientInfo={patientInfo} onPatientInfoChange={setPatientInfo}
                vitals={vitals} onVitalsChange={setVitals}
                preliminaryNotes={preliminaryNotes} onPreliminaryNotesChange={setPreliminaryNotes}
                medicalHistory={medicalHistory} onMedicalHistoryChange={setMedicalHistory}
                onGenerateTriageReport={handleGenerateTriageReport} isGeneratingTriage={isGeneratingTriage}
                intakeRecordingStatus={intakeRecordingStatus} onToggleIntakeRecording={handleToggleIntakeRecording}
                isProcessingIntake={isProcessingIntake} intakeTranscriptionTurns={intakeTranscriptionTurns}
                onIntakeTurnsChange={setIntakeTranscriptionTurns}
                currentIntakeTranscription={currentIntakeTranscription}
                onClearIntakeTranscription={() => setCurrentIntakeTranscription('')}
                aiService={activeAiService}
                doctorName={doctors.find(d => d.id === activeAppointment.doctorId)?.name || 'N/A'}
                onBack={() => setConsultationState('dashboard')} 
                error={error}
                onError={setError}
            />;
        case 'triage-review':
            if (!hasPermission('performIntake') || !activeAppointment) return <AccessDenied onBack={() => setConsultationState('dashboard')} />;
            return <TriageReviewScreen
                patientInfo={patientInfo} vitals={vitals} preliminaryNotes={preliminaryNotes}
                triageReport={triageReport} onFinalizeIntake={handleFinalizeIntake}
                doctorName={doctors.find(d => d.id === activeAppointment.doctorId)?.name || 'N/A'}
                onBack={() => setConsultationState('nurse-intake')} />;
        case 'doctor-consultation':
             if (!hasPermission('startConsultation') || !activeAppointment) return <AccessDenied onBack={() => setConsultationState('dashboard')} />;
             const activeDoctor = doctors.find(d => d.id === activeAppointment.doctorId);
             return (
                 <div className="max-w-4xl mx-auto space-y-8">
                      <div className="flex justify-between items-start">
                         <div>
                             <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Doctor Consultation</h2>
                             <p className="text-slate-500 dark:text-slate-400">with {activeDoctor?.name || 'Unknown Doctor'}</p>
                         </div>
                         <button onClick={() => { recordingControlsRef.current?.stop(); setConsultationState('dashboard');}} className="text-sm bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 transition-colors dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 flex items-center gap-2"><ArrowLeftIcon className="w-4 h-4" /> Back to Dashboard</button>
                     </div>
                     <PreConsultationSummary
                         patientInfo={activeAppointment.patientInfo || patientInfo}
                         vitals={activeAppointment.vitals || vitals}
                         preliminaryNotes={activeAppointment.preliminaryNotes || preliminaryNotes}
                         medicalHistory={activeAppointment.medicalHistory || medicalHistory}
                         triageReport={activeAppointment.triageReport || triageReport}
                         appointmentTime={activeAppointment.appointmentTime}
                     />
                      <div className="flex flex-col items-center justify-center space-y-6">
                         <RecordButton 
                            status={isRecording ? (isPaused ? 'paused' : 'recording') : 'idle'} 
                             onClick={handleToggleRecording}
                             disabled={isLoading || !!correctionTarget}
                             stoppedText={isFinalized ? 'Save & Finish' : 'Start Recording'}
                             recordingText={isPaused ? 'Resume' : 'Pause'}
                             pausedText="Resume"
                         />
                         <AudioVisualizer stream={stream} />
                     </div>
         
                      <TranscriptionDisplay
                        turns={turns}
                        currentTranscription={currentTranscription}
                        isRecording={isRecording}
                        aiService={activeAiService}
                        onTurnsChange={setTurns}
                        onClearCurrentTranscription={() => setCurrentTranscription('')}
                     />
         
                     <ResultsDisplay
                         englishTranscript={englishTranscript}
                         summary={summary}
                         prescriptionDetails={prescriptionDetails}
                         detectedLanguages={detectedLanguages}
                         isLoading={isLoading}
                         correctionTarget={correctionTarget}
                         isMicRecordingForCorrection={isMicRecordingForCorrection}
                         isProcessingCorrection={isProcessingCorrection}
                         currentCorrectionText={currentCorrectionText}
                         onCorrectionTextChange={setCurrentCorrectionText}
                         onStartCorrection={handleStartCorrection}
                         onCorrectionAction={handleCorrectionAction}
                         summaryFeedback={summaryFeedback}
                         onSummaryFeedback={setSummaryFeedback}
                         prescriptionFeedback={prescriptionFeedback}
                         onPrescriptionFeedback={handlePrescriptionFeedback}
                         onShare={handleShare}
                         onNewConsultation={handleSaveAndFinishConsultation}
                         doctorName={activeDoctor?.name || 'Clinic Doctor'}
                         clinicName={clinicName}
                         clinicAddress={clinicAddress}
                         dateTimeFormat={dateTimeFormat}
                         aiService={activeAiService}
                         error={error}
                         onError={setError}
                     />
                     <CustomPrompts prompts={prompts} onPromptsChange={setPrompts} disabled={isRecording || isLoading} />
                 </div>
             );
        case 'dispatch-orders':
            if (!hasPermission('dispatchOrders') || !activeAppointment) return <AccessDenied onBack={() => setConsultationState('dashboard')} />;
            return <DispatchScreen
                appointment={activeAppointment}
                doctorName={doctors.find(d => d.id === activeAppointment.doctorId)?.name || 'N/A'}
                departmentContacts={{ ...departmentContacts, pharmacy: pharmacyNumber, nursing: nursingStationNumber }}
                onBack={() => setConsultationState('dashboard')}
                onError={setError}
                onMarkAsDispatched={handleMarkAsDispatched}
                clinicName={clinicName}
            />;
        default:
            return <div>Dashboard</div>;
    }
  }

  if (!isAppLoaded) {
      return <div className="min-h-screen flex items-center justify-center dark:bg-slate-900"><p className="text-slate-500 dark:text-slate-400">Loading application...</p></div>;
  }

  if (appMode === 'patient-booking') {
      return (
        <div className="min-h-screen font-sans">
            <Header 
                onSettingsClick={() => setIsSettingsOpen(true)} 
                onUserSwitcherClick={() => setIsUserSwitcherOpen(true)}
                appMode={appMode} 
                onModeChange={handleModeChange} 
                onLogout={handleLogout} 
                currentUser={currentUser} 
                hasPermission={hasPermission} 
                aiProviderSettings={aiProviderSettings}
                onLanguageChange={(lang) => setAiProviderSettings(prev => ({...prev, preferredLanguage: lang}))}
                theme={theme}
                onToggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
            />
            <main className="container mx-auto px-4 py-6 md:py-8 lg:px-8 max-w-7xl">
                 <PatientBookingScreen 
                    aiService={activeAiService} schedules={schedules} appointments={appointments}
                    doctors={doctors} onAppointmentsChange={setAppointments} prompts={prompts}
                    onError={setError} patients={patients} onPatientsChange={setPatients}
                 />
            </main>
        </div>
      );
  }

  if (!currentUser) {
      return <LoginScreen onLogin={handleLoginAttempt} onCheckUserExists={handleCheckUserExists} />;
  }

  return (
    <div className="min-h-screen font-sans">
      <Header 
        onSettingsClick={() => setIsSettingsOpen(true)} 
        onUserSwitcherClick={() => setIsUserSwitcherOpen(true)}
        appMode={appMode} 
        onModeChange={handleModeChange} 
        onLogout={handleLogout} 
        currentUser={currentUser} 
        hasPermission={hasPermission} 
        aiProviderSettings={aiProviderSettings}
        onLanguageChange={(lang) => setAiProviderSettings(prev => ({...prev, preferredLanguage: lang}))}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
      />
      <main className="container mx-auto px-4 py-6 md:py-8 lg:px-8 max-w-7xl">
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
        <AnimatePresence mode="wait">
          <motion.div
            key={consultationState}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        initialPharmacyNumber={pharmacyNumber} initialNursingStationNumber={nursingStationNumber}
        initialPatientNumber={patientNumber} initialClinicName={clinicName}
        initialClinicAddress={clinicAddress} initialDateTimeFormat={dateTimeFormat}
        initialAiSettings={aiProviderSettings} initialWhatsAppNumber={whatsAppNumber}
        initialWhatsAppToken={whatsAppToken} initialDepartmentContacts={departmentContacts}
        initialReminderSettings={reminderSettings} 
        initialEhrSettings={ehrSettings}
        currentTheme={theme} onThemeChange={setTheme}
      />
       {editingAppointment && (
          <EditAppointmentModal
            isOpen={!!editingAppointment}
            onClose={() => setEditingAppointment(null)}
            onSave={handleUpdateAppointment}
            appointmentToEdit={editingAppointment}
            doctors={doctors}
          />
        )}
        <ShareModal
            isOpen={isShareModalOpen}
            target={shareTarget!}
            initialNumber={shareTarget === 'pharmacy' ? pharmacyNumber : (shareTarget === 'nursing' ? nursingStationNumber : (activeAppointment?.patientInfo?.phone || patientNumber))}
            onClose={() => setIsShareModalOpen(false)}
            onSend={handleSendShare}
        />
        {viewingConsultationRecord && (
          <ConsultationHistoryViewer
              record={viewingConsultationRecord}
              doctorName={doctors.find(d => d.id === viewingConsultationRecord.doctorId)?.name || 'Unknown Doctor'}
              onClose={() => setViewingConsultationRecord(null)}
              clinicName={clinicName}
              clinicAddress={clinicAddress}
          />
      )}
      <AnimatePresence>
        {isUserSwitcherOpen && (
            <UserSwitcherModal 
                isOpen={isUserSwitcherOpen}
                onClose={() => setIsUserSwitcherOpen(false)}
                users={users}
                roles={roles}
                currentUser={currentUser}
                onSelectUser={handleUserSwitch}
                lang={aiProviderSettings.preferredLanguage || 'English'}
            />
        )}
      </AnimatePresence>
    </div>
  );
};