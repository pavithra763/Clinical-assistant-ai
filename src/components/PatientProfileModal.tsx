
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Phone, Mail, MapPin, Calendar, Clock, ChevronRight, FileText, Shield, HeartPulse } from 'lucide-react';
import type { PatientInfo, Appointment } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

interface PatientProfileModalProps {
  patient: PatientInfo;
  appointments: Appointment[];
  isOpen: boolean;
  onClose: () => void;
}

export const PatientProfileModal: React.FC<PatientProfileModalProps> = ({ patient, appointments, isOpen, onClose }) => {
  const patientAppointments = appointments.filter(a => a.patientInfo?.phone === patient.phone || a.patientName === patient.name);
  const upcoming = patientAppointments.filter(a => new Date(a.appointmentTime) >= new Date() && a.status !== 'cancelled').sort((a, b) => new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime());
  const history = patientAppointments.filter(a => new Date(a.appointmentTime) < new Date() || a.status === 'completed' || a.status === 'cancelled').sort((a, b) => new Date(b.appointmentTime).getTime() - new Date(a.appointmentTime).getTime());

  const vitalsData = useMemo(() => {
    return patientAppointments
      .filter(a => a.vitals && (a.vitals.pulse || a.vitals.spo2 || a.vitals.temp))
      .sort((a, b) => new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime())
      .map(a => ({
        date: new Date(a.appointmentTime).toLocaleDateString(),
        pulse: a.vitals?.pulse ? parseInt(a.vitals.pulse) : null,
        spo2: a.vitals?.spo2 ? parseInt(a.vitals.spo2) : null,
        temp: a.vitals?.temp ? parseFloat(a.vitals.temp) : null
      }));
  }, [patientAppointments]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <header className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
              <User size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{patient.name}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Patient Profile: {patient.patientId || 'N/A'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
             <ChevronRight className="rotate-90 w-6 h-6 text-slate-500" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar: Details */}
          <div className="space-y-6">
            <section className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Contact & Info</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone size={18} className="text-blue-500" />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{patient.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail size={18} className="text-blue-500" />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{patient.email || 'No email provided'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin size={18} className="text-blue-500" />
                  <span className="text-slate-700 dark:text-slate-300 font-medium text-sm">{patient.address || 'No address provided'}</span>
                </div>
                <div className="pt-2 flex gap-4">
                   <div>
                     <p className="text-[10px] text-slate-400 uppercase">Age</p>
                     <p className="font-bold dark:text-white">{patient.age} yrs</p>
                   </div>
                   <div>
                     <p className="text-[10px] text-slate-400 uppercase">Gender</p>
                     <p className="font-bold dark:text-white">{patient.gender}</p>
                   </div>
                </div>
              </div>
            </section>

            {patient.externalEhrId && (
              <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-xl flex items-center gap-3">
                <Shield size={20} className="text-emerald-500" />
                <div>
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">EHR Linked</p>
                  <p className="text-[10px] text-emerald-600/70 dark:text-emerald-500">ID: {patient.externalEhrId}</p>
                </div>
              </div>
            )}

            {vitalsData.length > 0 && (
                <section className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <HeartPulse size={14} />
                        Vitals Trends
                    </h3>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={vitalsData}>
                                <XAxis dataKey="date" hide />
                                <YAxis hide domain={['auto', 'auto']} />
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Line type="monotone" dataKey="pulse" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Pulse" />
                                <Line type="monotone" dataKey="spo2" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="SpO2" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </section>
            )}
          </div>

          {/* Main Content: Appointments */}
          <div className="lg:col-span-2 space-y-8">
             <section>
               <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                 <Calendar className="text-blue-500" size={20} />
                 Upcoming Appointments
               </h3>
               {upcoming.length > 0 ? (
                 <div className="space-y-3">
                   {upcoming.map(app => (
                     <div key={app.id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <div>
                           <p className="font-bold text-slate-800 dark:text-white">{new Date(app.appointmentTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                           <p className="text-sm text-slate-500">{new Date(app.appointmentTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} • {app.reasonForVisit}</p>
                        </div>
                        <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded text-[10px] font-bold uppercase">{app.status}</span>
                     </div>
                   ))}
                 </div>
               ) : (
                 <p className="text-sm text-slate-400 italic">No upcoming appointments found.</p>
               )}
             </section>

             <section>
               <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                 <Clock className="text-slate-400" size={20} />
                 Consultation History
               </h3>
               {history.length > 0 ? (
                 <div className="space-y-3">
                   {history.map(app => (
                     <div key={app.id} className="p-4 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all flex justify-between items-center cursor-pointer group">
                        <div className="flex items-center gap-4">
                           <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-colors">
                              <FileText size={18} />
                           </div>
                           <div>
                              <p className="font-bold text-slate-800 dark:text-white">{new Date(app.appointmentTime).toLocaleDateString()}</p>
                              <p className="text-xs text-slate-500">{app.status === 'completed' ? 'Recorded Consultation' : 'Missed/Cancelled'}</p>
                           </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-400 transition-colors" />
                     </div>
                   ))}
                 </div>
               ) : (
                 <p className="text-sm text-slate-400 italic">No history found.</p>
               )}
             </section>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
