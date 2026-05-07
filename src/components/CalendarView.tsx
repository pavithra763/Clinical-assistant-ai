import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import type { Appointment, Doctor } from '../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User as UserIcon,
  Stethoscope
} from 'lucide-react';

interface CalendarViewProps {
  appointments: Appointment[];
  doctors: Doctor[];
  activeDoctorId: string | null;
  onEditAppointment: (appointment: Appointment) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ 
  appointments, 
  doctors, 
  activeDoctorId,
  onEditAppointment 
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Padding for first week
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    // Days of the month
    for (let i = 1; i <= lastDate; i++) {
        days.push(new Date(year, month, i));
    }
    return days;
  }, [currentMonth]);

  const appointmentsByDate = useMemo(() => {
    const map: { [key: string]: Appointment[] } = {};
    appointments.forEach(app => {
      if (activeDoctorId && app.doctorId !== activeDoctorId) return;
      if (app.status === 'cancelled') return;
      
      const dateKey = new Date(app.appointmentTime).toISOString().split('T')[0];
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(app);
    });
    return map;
  }, [appointments, activeDoctorId]);

  const changeMonth = (offset: number) => {
    const newMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1);
    setCurrentMonth(newMonth);
  };

  const monthLabel = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden mt-2">
      <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <h3 className="font-bold text-slate-900 dark:text-white">{monthLabel}</h3>
        <div className="flex gap-1">
          <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors">
            Today
          </button>
          <button onClick={() => changeMonth(1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
        {dayLabels.map(label => (
          <div key={label} className="py-2 text-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-fr">
        {daysInMonth.map((date, idx) => {
          if (!date) return <div key={`empty-${idx}`} className="h-24 sm:h-32 bg-slate-50/30 dark:bg-slate-900/10 border-b border-r border-slate-100 dark:border-slate-800" />;
          
          const dateKey = date.toISOString().split('T')[0];
          const dayAppointments = appointmentsByDate[dateKey] || [];
          const isToday = date.toDateString() === new Date().toDateString();

          return (
            <div key={dateKey} className="h-24 sm:h-32 p-1 sm:p-2 border-b border-r border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors overflow-y-auto">
              <div className="flex justify-between items-center mb-1">
                <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                  {date.getDate()}
                </span>
                {dayAppointments.length > 0 && (
                  <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-bold">
                    {dayAppointments.length}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {dayAppointments.slice(0, 3).map(app => (
                  <button
                    key={app.id}
                    onClick={() => onEditAppointment(app)}
                    className="w-full text-left p-1 text-[10px] rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-400 dark:hover:border-blue-500 transition-colors truncate"
                  >
                    <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{app.patientName}</div>
                    <div className="text-slate-500 dark:text-slate-400 font-mono">
                      {new Date(app.appointmentTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </div>
                  </button>
                ))}
                {dayAppointments.length > 3 && (
                  <div className="text-[9px] text-center text-slate-400 font-bold">
                    + {dayAppointments.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
