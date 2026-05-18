import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Appointment, AppointmentStatus, Doctor, DoctorSchedule, Role, User, Permission, PatientInfo, ConsultationRecord, AuditLog } from '../types';
import { WhatsAppSimulatorModal } from './WhatsAppSimulatorModal';
import type { AIService } from '../services/aiService';
import type { Prompts } from '../prompts/defaultPrompts';
import { statusDisplayInfo } from '../utils/styleUtils';
import { TimelineView } from './TimelineView';
import { Pagination } from './Pagination';
import { PatientProfileModal } from './PatientProfileModal';
import { t } from '../utils/i18n';
import { 
  Calendar, 
  Edit2, 
  Search, 
  Shield, 
  Trash2, 
  Users, 
  User as UserIcon,
  MessageCircle, 
  Plus, 
  FileText,
  Clock,
  MapPin,
  Stethoscope,
  ChevronRight
} from 'lucide-react';
import { Tooltip } from './Tooltip';
import { NewAppointmentModal } from './NewAppointmentModal';
import { CalendarView } from './CalendarView';
import { ErrorFeedback } from './ErrorFeedback';

interface AppointmentsDashboardProps {
  appointments: Appointment[];
  doctors: Doctor[];
  activeDoctorId: string | null;
  onActiveDoctorChange: (doctorId: string | null) => void;
  onStartIntake: (appointment: Appointment) => void;
  onManageClinic: () => void;
  onManageUsers: () => void;
  aiService: AIService | null;
  prompts: Prompts;
  schedules: { [doctorId: string]: DoctorSchedule };
  onAppointmentsChange: (appointments: Appointment[]) => void;
  onError: (message: string) => void;
  currentUser: User | null;
  roles: Role[];
  hasPermission: (permission: Permission) => boolean;
  onStartConsultation: (appointment: Appointment) => void;
  onStartDispatch: (appointment: Appointment) => void;
  onEditAppointment: (appointment: Appointment) => void;
  onCancelAppointment: (appointmentId: string) => void;
  onBulkCancel?: (ids: string[]) => void;
  onBulkDispatch?: (ids: string[]) => void;
  onEditIntake: (appointment: Appointment) => void;
  patients: PatientInfo[];
  onPatientsChange: (patients: PatientInfo[]) => void;
  consultationHistory: ConsultationRecord[];
  onViewRecord: (record: ConsultationRecord) => void;
  auditLogs: AuditLog[];
  lang?: string;
}

const StatusBadge: React.FC<{ status: Appointment['status'] }> = ({ status }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shadow-sm ${statusDisplayInfo[status].badgeClasses}`}>
    {statusDisplayInfo[status].text}
  </span>
);


// const DoctorsOnDuty: React.FC<{ doctors: Doctor[], schedules: { [doctorId: string]: DoctorSchedule } }> = ({ doctors, schedules }) => {
//     const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

//     const onDuty = doctors.filter(doctor => {
//         const doctorSchedule = schedules[doctor.id];
//         return doctor.isAvailable && doctorSchedule && doctorSchedule[today] && doctorSchedule[today].length > 0;
//     });

//     return (
//         <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 shadow-sm">
//             <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
//                 Doctors on Duty Today ({today})
//             </h4>
//             {onDuty.length > 0 ? (
//                 <div className="mt-3 flex flex-wrap gap-2">
//                     {onDuty.map(doc => (
//                         <div key={doc.id} className="flex items-center gap-2 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 shadow-sm dark:bg-blue-900/20 dark:text-blue-300">
//                             <span className="font-bold">{doc.name}</span>
//                             <span className="text-blue-300 dark:text-blue-700">|</span>
//                             <span>{doc.specialty}</span>
//                         </div>
//                     ))}
//                 </div>
//             ) : (
//                 <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 italic">
//                     No doctors are scheduled to be on duty today.
//                 </p>
//             )}
//         </div>
//     );
// };


const DoctorsOnDuty: React.FC<{ 
    doctors: Doctor[], 
    schedules: { [doctorId: string]: DoctorSchedule } 
}> = ({ doctors, schedules }) => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    
const [doctorSlots, setDoctorSlots] = useState<
    { doctor: Doctor; slots: { start: string; end: string; room: string }[] }[]
>([]);

    useEffect(() => {
        const fetchSlots = async () => {
            try {
                const res = await fetch(
                    `${import.meta.env.VITE_API_BASE_URL}/doctor-schedules/?day_of_week=${today}`
                );
                if (!res.ok) return;
                const data = await res.json();
                // data is an array of { doctor_id, start_time, end_time, room, ... }

                // Group slots by doctor_id
                const grouped: Record<string, typeof data> = {};
                for (const slot of data) {
                    if (!grouped[slot.doctor_id]) grouped[slot.doctor_id] = [];
                    grouped[slot.doctor_id].push(slot);
                }

                // Match with doctor details
                const result = Object.entries(grouped).map(([doctorId, slots]) => ({
                    doctor: doctors.find(d => d.id === doctorId)!,
                    slots: slots.map(s => ({
                        start: s.start_time.slice(0, 5),   // "09:00"
                        end:   s.end_time.slice(0, 5),     // "10:00"
                        room:  s.room,
                    })),
                })).filter(item => item.doctor); // drop unmatched
                
                setDoctorSlots(result);
            } catch (err) {
                console.error('Failed to fetch doctor schedules', err);
            }
        };

        fetchSlots();
    }, [today, doctors]);

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 shadow-sm">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Doctors on Duty Today ({today})
            </h4>

            {doctorSlots.length > 0 ? (
                <div className="mt-3 flex flex-col gap-3">
                    {doctorSlots.map(({ doctor, slots }) => (
                        <div key={doctor.id} className="rounded-lg border border-blue-100 bg-blue-50 p-3 dark:border-blue-900/30 dark:bg-blue-900/10">
                            {/* Doctor header */}
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                                    {doctor.name}
                                </span>
                                <span className="text-blue-300">|</span>
                                <span className="text-xs text-blue-600 dark:text-blue-400">
                                    {doctor.specialty}
                                </span>
                            </div>

                            {/* Time slots */}
                            <div className="flex flex-wrap gap-1.5">
                                {slots.map((slot, i) => (
                                    <span
                                        key={i}
                                        className="inline-flex items-center gap-1 rounded-md bg-white border border-blue-200 px-2 py-0.5 text-xs text-blue-700 dark:bg-slate-900 dark:border-blue-800 dark:text-blue-300"
                                    >
                                        <Clock size={11} />
                                        {slot.start}–{slot.end}
                                        <span className="text-blue-300 dark:text-blue-700 ml-1">
                                            {slot.room}
                                        </span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 italic">
                    No doctors are scheduled to be on duty today.
                </p>
            )}
        </div>
    );
};

const DoctorSelection: React.FC<{
    doctors: Doctor[];
    activeDoctorId: string | null;
    onSelectDoctor: (id: string | null) => void;
}> = ({ doctors, activeDoctorId, onSelectDoctor }) => {
    const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');
    
    const specialties = useMemo(() => {
        const s = new Set(doctors.map(d => d.specialty));
        return Array.from(s).sort();
    }, [doctors]);

    const filteredDoctors = useMemo(() => {
        if (specialtyFilter === 'all') return doctors.filter(d => d.isAvailable);
        return doctors.filter(d => d.isAvailable && d.specialty === specialtyFilter);
    }, [doctors, specialtyFilter]);

    return (
        <div className="flex items-center gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <select
                    value={specialtyFilter}
                    onChange={e => setSpecialtyFilter(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-sm font-semibold text-slate-700 shadow-sm transition-all focus:border-blue-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                >
                    <option value="all">All Specialties</option>
                    {specialties.map(s => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
                <select
                    id="doctor-select"
                    value={activeDoctorId || ''}
                    onChange={e => onSelectDoctor(e.target.value || null)}
                    className="rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-sm font-semibold text-slate-900 shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                >
                    <option value="">{specialtyFilter === 'all' ? 'Full Clinic View' : `All ${specialtyFilter}s`}</option>
                    {filteredDoctors.map(doc => (
                        <option key={doc.id} value={doc.id}>
                            {doc.name}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export const AppointmentsDashboard: React.FC<AppointmentsDashboardProps> = ({ appointments, doctors, activeDoctorId, onActiveDoctorChange, onStartIntake, onManageClinic, onManageUsers, aiService, prompts, schedules, onAppointmentsChange, onError, currentUser, roles, hasPermission, onStartConsultation, onStartDispatch, onEditAppointment, onCancelAppointment, onBulkCancel, onBulkDispatch, onEditIntake, patients, onPatientsChange, consultationHistory, onViewRecord, auditLogs, lang = 'English' }) => {
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'timeline' | 'calendar' | 'patients' | 'audit'>('list');
  const [preFilledDoctorId, setPreFilledDoctorId] = useState<string | undefined>(undefined);
  const [preFilledTime, setPreFilledTime] = useState<Date | undefined>(undefined);
  const [timeFrame, setTimeFrame] = useState<'today' | 'past'>('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [auditSearchTerm, setAuditSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [selectedPatientForProfile, setSelectedPatientForProfile] = useState<PatientInfo | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const ITEMS_PER_PAGE = 10;
  const [formattedPatients, setFormattedPatients] = useState<any[]>([]);
  const currentUserRole = useMemo(() => roles.find(r => r.id === currentUser?.roleId), [currentUser, roles]);

  useEffect(() => {
    if (currentUserRole?.name === 'Doctor' && currentUser) {
      const matchedDoctor = doctors.find(d => d.name === currentUser.name);
      if (matchedDoctor && matchedDoctor.id !== activeDoctorId) {
        onActiveDoctorChange(matchedDoctor.id);
      }
    }
  }, [currentUser?.id, currentUserRole?.id, doctors, onActiveDoctorChange, activeDoctorId]);

useEffect(() => {
  const fetchPatients = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/patients/`);

      if (!response.ok) {
        console.log("fetcheddata",response.json())
        throw new Error("Failed to fetch patients");
      }

      const data = await response.json();
           console.log(data,"fetched data")
      const formattedPatients = data.map((patient: any) => ({
        patientId: patient.id,
        name: patient.name,
        age: patient.age,
        gender: patient.gender,
        phone: patient.phone,
        email: patient.email,
        address: patient.address,
      }));

      console.log(formattedPatients);
setFormattedPatients(formattedPatients)
    //   onPatientsChange(formattedPatients);

    } catch (error) {
    //   console.error("Error fetching patients:", error);
    }
  };

  fetchPatients();
}, []);

  const filteredAppointments = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const baseAppointments = timeFrame === 'today'
      ? appointments.filter(a => new Date(a.appointmentTime) >= todayStart)
      : appointments.filter(a => new Date(a.appointmentTime) < todayStart && (a.status === 'completed' || a.status === 'cancelled'));

    baseAppointments.sort((a, b) => {
        const timeA = new Date(a.appointmentTime).getTime();
        const timeB = new Date(b.appointmentTime).getTime();
        return timeFrame === 'today' ? timeA - timeB : timeB - timeA;
    });

    const doctorFiltered = activeDoctorId
        ? baseAppointments.filter(app => app.doctorId === activeDoctorId)
        : baseAppointments;

    const filteredByStatus = statusFilter === 'all'
        ? doctorFiltered
        : doctorFiltered.filter(app => app.status === statusFilter);

    const roleFiltered = filteredByStatus.filter(app => {
        if (!currentUserRole) return false;
        if (['Nurse', 'Doctor'].includes(currentUserRole.name) && app.status === 'cancelled' && statusFilter === 'all') return false;
        if (timeFrame === 'past' && currentUserRole.name === 'Doctor') return app.doctorId === activeDoctorId;
        
        switch (currentUserRole.name) {
            case 'Nurse': return ['booked', 'intake', 'waiting-for-doctor', 'completed', 'dispatched'].includes(app.status);
            case 'Doctor': return ['waiting-for-doctor', 'in-consultation'].includes(app.status);
            case 'Staff': return ['booked', 'waiting-for-doctor', 'in-consultation', 'completed', 'dispatched'].includes(app.status);
            default: return true;
        }
    });

    if (!searchTerm.trim()) return roleFiltered;
    const s = searchTerm.toLowerCase();
    return roleFiltered.filter(app => 
        app.patientName.toLowerCase().includes(s) ||
        (app.patientInfo?.phone || '').includes(s) ||
        (doctors.find(d => d.id === app.doctorId)?.name || '').toLowerCase().includes(s) ||
        (app.reasonForVisit || '').toLowerCase().includes(s)
    );
  }, [timeFrame, appointments, currentUserRole, activeDoctorId, searchTerm, doctors, statusFilter]);

  const filteredPatients = useMemo(() => {
    if (!searchTerm.trim()) return patients;
    const s = searchTerm.toLowerCase();
    return patients.filter(p => 
      p.name.toLowerCase().includes(s) || 
      p.phone.includes(s)
    );
  }, [patients, searchTerm]);
  
  const paginatedAppointments = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAppointments.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAppointments, currentPage]);

  const filteredAuditLogs = useMemo(() => {
    const term = auditSearchTerm.toLowerCase();
    const base = auditLogs.filter(log => 
        log.userName.toLowerCase().includes(term) ||
        log.action.toLowerCase().includes(term) ||
        log.details.toLowerCase().includes(term) ||
        (log.entityId && log.entityId.toLowerCase().includes(term))
    );
    return [...base].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [auditLogs, auditSearchTerm]);

  const paginatedAuditLogs = useMemo(() => {
    const startIndex = (auditPage - 1) * ITEMS_PER_PAGE;
    return filteredAuditLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAuditLogs, auditPage]);

  const auditTotalPages = Math.ceil(filteredAuditLogs.length / ITEMS_PER_PAGE);

  const toggleSelect = (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedIds(next);
  };

  const toggleSelectAll = () => {
      if (selectedIds.size === paginatedAppointments.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(paginatedAppointments.map(a => a.id)));
      }
  };

  const totalPages = Math.ceil(filteredAppointments.length / ITEMS_PER_PAGE);

  const getEmptyStateMessage = () => {
    if (searchTerm) return "No appointments match your search criteria. Try a different filter.";
    if (activeDoctorId) return "This doctor has no scheduled appointments in this time frame.";
    return "The clinic schedule is clear for now.";
  };

  const getActionForAppointment = (appointment: Appointment) => {
    if (timeFrame === 'past' || appointment.status === 'cancelled') return null;
    
    if (appointment.status === 'completed' && hasPermission('dispatchOrders')) {
        return <button onClick={() => onStartDispatch(appointment)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 dark:shadow-none">Dispatch Orders</button>;
    }
    
    if (appointment.status === 'booked' && hasPermission('performIntake')) {
        return <button onClick={() => onStartIntake(appointment)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 dark:shadow-none">Patient Intake</button>;
    }
    
    if (appointment.status === 'waiting-for-doctor' && hasPermission('startConsultation') && appointment.doctorId === activeDoctorId) {
        return <button onClick={() => onStartConsultation(appointment)} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-200 transition-all hover:bg-emerald-700 dark:shadow-none">Join Consultation</button>;
    }
    
    if (appointment.status === 'in-consultation' && hasPermission('startConsultation') && appointment.doctorId === activeDoctorId) {
        return <button onClick={() => onStartConsultation(appointment)} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-orange-200 transition-all hover:bg-orange-700 dark:shadow-none">Resume</button>;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <ErrorFeedback message={localError} onDismiss={() => setLocalError(null)} />
      
      {aiService && (
        <WhatsAppSimulatorModal 
            isOpen={isSimulatorOpen} 
            onClose={() => setIsSimulatorOpen(false)} 
            aiService={aiService} 
            prompts={prompts} 
            schedules={schedules} 
            appointments={appointments} 
            doctors={doctors} 
            onAppointmentsChange={onAppointmentsChange} 
            onError={(msg) => { setLocalError(msg); onError(msg); }} 
            patients={patients} 
            onPatientsChange={onPatientsChange} 
        />
      )}

      <NewAppointmentModal 
        isOpen={isNewAppointmentModalOpen} 
        onClose={() => {
            setIsNewAppointmentModalOpen(false);
            setPreFilledDoctorId(undefined);
            setPreFilledTime(undefined);
        }} 
        onSave={(n) => { 
            onAppointmentsChange([...appointments, n]); 
            setIsNewAppointmentModalOpen(false); 
            setPreFilledDoctorId(undefined);
            setPreFilledTime(undefined);
        }} 
        doctors={doctors} 
        patients={patients} 
        onPatientsChange={onPatientsChange} 
        aiService={aiService} 
        prompts={prompts} 
        schedules={schedules} 
        appointments={appointments}
        preFilledDoctorId={preFilledDoctorId}
        preFilledTime={preFilledTime}
      />

      <div className="space-y-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-white">
            {t('dashboard', lang)}
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            Viewing as: <span className="font-bold text-slate-900 dark:text-white">{currentUserRole?.name}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {hasPermission('manageAppointments') && (
            <button 
              onClick={() => setIsNewAppointmentModalOpen(true)} 
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 sm:px-5 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-700"
            >
              <Calendar size={18} />
              <span className="hidden xs:inline">{t('new_appointment', lang)}</span>
              <span className="xs:hidden">New</span>
            </button>
          )}
          <button 
            onClick={() => setIsSimulatorOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-lg bg-green-50 px-4 sm:px-5 py-2.5 text-sm font-bold text-green-700 border border-green-200 transition-all hover:bg-green-100 dark:bg-green-900/20 dark:border-green-900/30 dark:text-green-400 shadow-sm"
          >
            <MessageCircle size={18} />
            <span className="hidden xs:inline">{t('whatsapp_booking', lang)}</span>
            <span className="xs:hidden">Booking</span>
          </button>
          {hasPermission('manageClinicConfig') && (
            <button 
              onClick={onManageClinic}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 sm:px-5 py-2.5 text-sm font-bold text-slate-700 border border-slate-200 transition-all hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 shadow-sm"
            >
              <Calendar size={18} />
              <span className="hidden sm:inline">{t('manage_clinic', lang)}</span>
              <span className="sm:hidden">Clinic</span>
            </button>
          )}
          {hasPermission('manageUsersAndRoles') && (
            <button 
              onClick={onManageUsers}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 sm:px-5 py-2.5 text-sm font-bold text-slate-700 border border-slate-200 transition-all hover:bg-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 shadow-sm"
            >
              <Shield size={18} />
              <span className="hidden sm:inline">{t('manage_users', lang)}</span>
              <span className="sm:hidden">Users</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                            <div className="relative flex-1">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                                    <Search size={18} />
                                </div>
                                <input 
                                    type="text" 
                                    placeholder={t('search_placeholder', lang)}
                                    value={searchTerm} 
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="block w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2.5 pl-11 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                                />
                            </div>

            <div className="flex flex-wrap items-center gap-4">
                <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <button 
                onClick={() => setViewMode('list')} 
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm dark:bg-slate-800 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                {t('list', lang)}
            </button>
            <button 
                onClick={() => setViewMode('timeline')} 
                disabled={timeFrame === 'past' || !activeDoctorId}
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'timeline' ? 'bg-white shadow-sm dark:bg-slate-800 text-blue-600' : 'text-slate-500 hover:text-slate-700'} disabled:opacity-30`}
            >
                {t('timeline', lang)}
            </button>
                </div>

                <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <button 
                onClick={() => setTimeFrame('today')} 
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${timeFrame === 'today' ? 'bg-white shadow-sm dark:bg-slate-800 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                {t('today', lang)}
            </button>
            <button 
                onClick={() => setTimeFrame('past')} 
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${timeFrame === 'past' ? 'bg-white shadow-sm dark:bg-slate-800 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                {t('past', lang)}
            </button>
                </div>
            </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            {timeFrame === 'today' && <div className="w-full md:w-auto"><DoctorsOnDuty doctors={doctors} schedules={schedules} /></div>}
            
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 ml-auto">
                {viewMode === 'list' && (
                    <div className="flex items-center gap-2">
                        <label htmlFor="status-filter" className="hidden sm:inline text-sm font-medium text-slate-500 dark:text-slate-400">Status:</label>
                        <select 
                            id="status-filter"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-sm font-semibold text-slate-900 shadow-sm focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        >
                            <option value="all">All Statuses</option>
                            <option value="booked">Booked</option>
                            <option value="intake">Intake</option>
                            <option value="waiting-for-doctor">Waiting for Doctor</option>
                            <option value="in-consultation">In Consultation</option>
                            <option value="completed">Completed</option>
                            <option value="dispatched">Dispatched</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                )}
                
                {['Admin', 'Receptionist', 'Nurse'].includes(currentUserRole?.name || '') && viewMode !== 'patients' && (
                    <div className="flex items-center gap-2">
                        <label className="hidden sm:inline text-sm font-medium text-slate-500 dark:text-slate-400">Doctor:</label>
                        <DoctorSelection doctors={doctors} activeDoctorId={activeDoctorId} onSelectDoctor={onActiveDoctorChange} />
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="relative">
        <AnimatePresence mode="wait">
            {viewMode === 'timeline' && timeFrame === 'today' && activeDoctorId ? (
                <motion.div 
                    key="timeline"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                >
                    <TimelineView 
                        appointments={filteredAppointments} 
                        schedules={schedules} 
                        doctors={doctors} 
                        activeDoctorId={activeDoctorId} 
                        onEditAppointment={onEditAppointment} 
                        onBookSlot={(doctorId, time) => {
                            setPreFilledDoctorId(doctorId);
                            setPreFilledTime(time);
                            setIsNewAppointmentModalOpen(true);
                        }}
                    />
                </motion.div>
            ) : viewMode === 'patients' ? (
                <motion.div
                    key="patients"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid gap-4"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredPatients.map(patient => (
                            <div 
                                key={patient.patientId || patient.phone} 
                                onClick={() => setSelectedPatientForProfile(patient)}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex items-center gap-4 shadow-sm hover:border-blue-300 dark:hover:border-blue-900 cursor-pointer transition-all group"
                            >
                                <div className="h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <UserIcon size={24} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-800 dark:text-white capitalize">{patient.name || 'Anonymous'}</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{patient.phone}</p>
                                    <div className="flex gap-2 mt-1">
                                        {patient.age && <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 rounded uppercase font-bold text-slate-600 dark:text-slate-400">{patient.age} yrs</span>}
                                        {patient.gender && <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 rounded uppercase font-bold text-slate-600 dark:text-slate-400">{patient.gender}</span>}
                                    </div>
                                </div>
                                <ChevronRight className="text-slate-300 group-hover:text-blue-500 transition-colors" size={20} />
                            </div>
                        ))}
                    </div>
                </motion.div>
            ) : viewMode === 'audit' ? (
                <motion.div
                    key="audit"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">System Audit Logs</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Track important user and system actions</p>
                        </div>
                        <div className="relative flex-1 max-w-md">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                                <Search size={14} />
                            </div>
                            <input 
                                type="text"
                                placeholder="Search logs..."
                                value={auditSearchTerm}
                                onChange={(e) => setAuditSearchTerm(e.target.value)}
                                className="block w-full rounded-lg border border-slate-200 bg-slate-50/50 py-1.5 pl-9 pr-4 text-xs outline-none focus:border-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                            />
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden dark:bg-slate-900 dark:border-slate-800">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 dark:bg-slate-800 dark:border-slate-800">
                                        <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider dark:text-slate-400">Timestamp</th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider dark:text-slate-400">User</th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider dark:text-slate-400">Action</th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-600 uppercase tracking-wider dark:text-slate-400">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {paginatedAuditLogs.length > 0 ? (
                                        paginatedAuditLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                                    {new Date(log.timestamp).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{log.userName}</span>
                                                        <span className="text-[10px] text-slate-400 dark:text-slate-500">ID: {log.userId}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
                                                        ${log.action.includes('Delete') || log.action.includes('Cancel') ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 
                                                            log.action.includes('Create') || log.action.includes('Update') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                                            'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                                                    {log.details}
                                                    {log.entityId && (
                                                        <span className="ml-1 text-[10px] text-slate-400 font-mono">({log.entityType}: {log.entityId})</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-20 text-center text-slate-400 dark:text-slate-600 italic">No audit logs found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {auditTotalPages > 1 && (
                        <Pagination currentPage={auditPage} totalPages={auditTotalPages} onPageChange={setAuditPage} />
                    )}
                </motion.div>
                ) : viewMode === 'calendar' ? (
                <motion.div
                    key="calendar"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                >
                    <CalendarView 
                        appointments={appointments} 
                        doctors={doctors} 
                        activeDoctorId={activeDoctorId} 
                        onEditAppointment={onEditAppointment} 
                    />
                </motion.div>
            ) : (
                <motion.div 
                    key="list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid gap-3"
                >
                    {/* {paginatedAppointments.length > 0 && selectedIds.size > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900 p-3 rounded-xl flex items-center justify-between mb-4 animate-in fade-in slide-in-from-top-2">
                             <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-blue-700 dark:text-blue-400">{selectedIds.size} selected</span>
                                <button onClick={() => setSelectedIds(new Set())} className="text-xs text-blue-600 hover:underline">Clear</button>
                             </div>
                              <div className="flex gap-2">
                                {onBulkCancel && (
                                    <button 
                                        onClick={() => { onBulkCancel(Array.from(selectedIds)); setSelectedIds(new Set()); }}
                                        className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-200"
                                    >
                                        {t('cancel_all', lang)}
                                    </button>
                                )}
                                {onBulkDispatch && (
                                    <button 
                                        onClick={() => { onBulkDispatch(Array.from(selectedIds)); setSelectedIds(new Set()); }}
                                        className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-3 py-1 rounded-lg text-xs font-bold hover:bg-emerald-200"
                                    >
                                        {t('mark_dispatched', lang)}
                                    </button>
                                )}
                             </div>
                        </div>
                    )} */}
                    {/* {paginatedAppointments.length > 0 && (
                        <div className="flex items-center gap-2 mb-2 px-2">
                            <input 
                                type="checkbox" 
                                checked={selectedIds.size === paginatedAppointments.length && paginatedAppointments.length > 0} 
                                onChange={toggleSelectAll}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-xs text-slate-500">Select All on Page</span>
                        </div>
                    )} */}
                    {/* <div>{paginatedAppointments}</div>
                     */}

{/*                      
                    {formattedPatients.length > 0 ? formattedPatients.map((app, idx) => (
                        <motion.div
                            key={app.patientId}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={`group relative flex flex-col items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-900 dark:hover:shadow-none sm:flex-row sm:items-center ${app.status === 'cancelled' ? 'opacity-50 grayscale' : ''} ${selectedIds.has(app.id) ? 'border-blue-400 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-900/10' : ''}`}
                        >
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                <input 
                                    type="checkbox" 
                                    checked={selectedIds.has(app.id)}
                                    onChange={() => toggleSelect(app.id)}
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 transition-colors group-hover:bg-blue-50 group-hover:text-blue-500 dark:bg-slate-900 dark:group-hover:bg-blue-900/20">
                                    <UserIcon size={24} />
                                </div>
                            </div>

                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-3">
                                    <h4 className="text-lg font-bold text-slate-950 dark:text-white">
                                        {app.patientName}
                                    </h4>
                                    <div className="flex gap-2">
                                        <StatusBadge status={app.status}/>x x
                                        {app.source === 'whatsapp' && (
                                            <div className="flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase text-green-600 dark:bg-green-900/20 dark:text-green-400">
                                                <MessageCircle size={10} />
                                                Mobile
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
                                    <div className="flex items-center gap-1.5">
                                        <Clock size={14} className="text-slate-300" />
                                        {new Date(app.appointmentTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Stethoscope size={14} className="text-slate-300" />
                                        {doctors.find(d => d.id === app.doctorId)?.name}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <MapPin size={14} className="text-slate-300" />
                                        {app.room || 'TBD'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex w-full items-center justify-between border-t border-slate-100 pt-4 sm:w-auto sm:border-none sm:pt-0">
                                <div className="flex items-center gap-1">
                                    {consultationHistory.find(r => r.appointmentId === app.id) && (
                                        <button onClick={() => onViewRecord(consultationHistory.find(r => r.appointmentId === app.id)!)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-900">
                                            <FileText size={20} />
                                        </button>
                                    )}
                                    {hasPermission('manageAppointments') && !['completed', 'cancelled'].includes(app.status) && (
                                        <button onClick={() => onEditAppointment(app)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-900">
                                            <Edit2 size={20} />
                                        </button>
                                    )}
                                    {hasPermission('manageAppointments') && !['completed', 'cancelled', 'in-consultation'].includes(app.status) && (
                                        <button onClick={() => onCancelAppointment(app.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                                            <Trash2 size={20} />
                                        </button>
                                    )}
                                </div>
                                <div className="ml-4">
                                    {getActionForAppointment(app)}
                                </div>
                            </div>
                        </motion.div>
                    ))  */}
                    
                    {formattedPatients.length > 0 ? (
  formattedPatients.map((patient, idx) => (
    <motion.div
      key={patient.patientId}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
      className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950"
    >
      {/* Profile Icon */}
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
        <UserIcon size={28} />
      </div>

      {/* Patient Details */}
      <div className="flex-1 space-y-2">
        
        {/* Name */}
        <div className="flex items-center gap-2">
          <Users size={16} className="text-slate-400" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {patient.name}
          </h3>
        </div>

        {/* Age */}
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Calendar size={15} className="text-slate-400" />
          <span>Age: {patient.age}</span>
        </div>

        {/* Gender */}
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <UserIcon size={15} className="text-slate-400" />
          <span>Gender: {patient.gender}</span>
        </div>

        {/* Phone */}
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <MessageCircle size={15} className="text-slate-400" />
          <span>{patient.phone}</span>
        </div>

      </div>
    </motion.div>
  ))
) 
                    
                    : (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="rounded-full bg-slate-50 p-6 dark:bg-slate-900">
                                <Calendar size={48} className="text-slate-200 dark:text-slate-800" />
                            </div>
                            <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Nothing to see here</h3>
                            <p className="mt-1 max-w-xs text-center text-slate-500 dark:text-slate-400">{getEmptyStateMessage()}</p>
                        </div>
                    )}
                    {filteredAppointments.length > ITEMS_PER_PAGE && (
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    )}
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedPatientForProfile && (
          <PatientProfileModal 
            isOpen={true} 
            onClose={() => setSelectedPatientForProfile(null)} 
            patient={selectedPatientForProfile}
            appointments={appointments}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
