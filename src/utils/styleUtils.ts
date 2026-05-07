
import { AppointmentStatus } from '../types';

export const statusDisplayInfo: Record<AppointmentStatus, { text: string, badgeClasses: string, timelineClasses: string }> = {
  'booked': { 
    text: 'Booked', 
    badgeClasses: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    timelineClasses: 'bg-blue-500'
  },
  'intake': { 
    text: 'Nurse Intake', 
    badgeClasses: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    timelineClasses: 'bg-amber-500'
  },
  'waiting-for-doctor': { 
    text: 'Waiting for Doctor', 
    badgeClasses: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    timelineClasses: 'bg-emerald-500'
  },
  'in-consultation': { 
    text: 'In Consultation', 
    badgeClasses: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    timelineClasses: 'bg-indigo-500'
  },
  'completed': { 
    text: 'Completed', 
    badgeClasses: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400',
    timelineClasses: 'bg-slate-400'
  },
  'rescheduled': { 
    text: 'Rescheduled', 
    badgeClasses: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    timelineClasses: 'bg-purple-500'
  },
  'cancelled': { 
    text: 'Cancelled', 
    badgeClasses: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
    timelineClasses: 'bg-rose-500'
  },
  'dispatched': { 
    text: 'Dispatched', 
    badgeClasses: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
    timelineClasses: 'bg-teal-500'
  },
};
