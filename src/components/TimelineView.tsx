import React from 'react';
import type { Appointment, Doctor, DoctorSchedule, TimeSlot } from '../types';
import { AppointmentCard } from './AppointmentCard';

interface TimelineViewProps {
    appointments: Appointment[];
    schedules: { [doctorId: string]: DoctorSchedule };
    doctors: Doctor[];
    activeDoctorId: string | null;
    onEditAppointment: (appointment: Appointment) => void;
    onBookSlot?: (doctorId: string, time: Date) => void;
}

const TIMELINE_START_HOUR = 8;
const TIMELINE_END_HOUR = 20;
const PIXELS_PER_HOUR = 160;

const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

const timeToYPosition = (time: string): number => {
    const minutes = timeToMinutes(time);
    const startOffsetMinutes = TIMELINE_START_HOUR * 60;
    const minutesFromStart = minutes - startOffsetMinutes;
    return (minutesFromStart / 60) * PIXELS_PER_HOUR;
};

const durationToHeight = (minutes: number): number => {
    return (minutes / 60) * PIXELS_PER_HOUR;
};

export const TimelineView: React.FC<TimelineViewProps> = ({ appointments, schedules, doctors, activeDoctorId, onEditAppointment, onBookSlot }) => {
    if (!activeDoctorId) {
        return (
            <div className="flex items-center justify-center h-96 text-center text-slate-500 dark:text-slate-400">
                <p>Please select a doctor to view their timeline schedule for today.</p>
            </div>
        );
    }
    
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const doctorSchedule = schedules[activeDoctorId]?.[today] || [];
    const doctorAppointments = appointments.filter(app => app.doctorId === activeDoctorId);
    
    const hours = Array.from({ length: TIMELINE_END_HOUR - TIMELINE_START_HOUR }, (_, i) => TIMELINE_START_HOUR + i);

    return (
        <div className="flex w-full overflow-x-auto" style={{ minHeight: `${(TIMELINE_END_HOUR - TIMELINE_START_HOUR) * PIXELS_PER_HOUR + 40}px` }}>
            {/* Hour markers */}
            <div className="w-16 flex-shrink-0 text-right pr-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
                {hours.map(hour => (
                    <div key={hour} className="relative" style={{ height: `${PIXELS_PER_HOUR}px` }}>
                        <span className="absolute -top-2">
                            {hour > 12 ? hour - 12 : hour}{hour >= 12 ? 'pm' : 'am'}
                        </span>
                    </div>
                ))}
            </div>

            {/* Timeline track */}
            <div className="relative flex-1 bg-slate-50 dark:bg-slate-900/40 rounded-lg min-w-[300px]">
                {/* Horizontal hour lines */}
                {hours.map(hour => (
                    <div key={`line-${hour}`} className="absolute w-full border-t border-slate-200 dark:border-slate-700" style={{ top: `${(hour - TIMELINE_START_HOUR) * PIXELS_PER_HOUR}px` }}></div>
                ))}
                
                {/* Doctor's schedule slots */}
                {doctorSchedule.map((slot, index) => {
                    const isAvailable = slot.type !== 'unavailable';
                    const slotStart = timeToYPosition(slot.startTime);
                    const slotHeight = durationToHeight(timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime));
                    
                    const handleSlotClick = () => {
                        if (isAvailable && onBookSlot && activeDoctorId) {
                            const [hours, minutes] = slot.startTime.split(':').map(Number);
                            const startTime = new Date();
                            startTime.setHours(hours, minutes, 0, 0);
                            onBookSlot(activeDoctorId, startTime);
                        }
                    };

                    return (
                        <div
                            key={`slot-${index}`}
                            className={`group absolute w-full rounded-md p-2 text-xs transition-all ${
                                isAvailable 
                                    ? 'bg-green-500/5 dark:bg-green-500/10 hover:bg-green-500/20 cursor-pointer border-l-2 border-transparent hover:border-green-500' 
                                    : 'bg-slate-500/10 dark:bg-slate-500/10 text-slate-400'
                            }`}
                            style={{ top: `${slotStart}px`, height: `${slotHeight}px` }}
                            onClick={handleSlotClick}
                        >
                            <div className="flex justify-between items-start">
                                <span className={`font-semibold ${isAvailable ? 'text-green-700 dark:text-green-300' : 'text-slate-600 dark:text-slate-400'}`}>
                                    {isAvailable ? `${slot.room} - Available` : 'Unavailable'}
                                </span>
                                {isAvailable && (
                                    <span className="text-[10px] text-green-600 dark:text-green-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold">
                                        Click to book
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Patient appointments */}
                {doctorAppointments.map(app => {
                    const appDate = new Date(app.appointmentTime);
                    const timeString = `${appDate.getHours().toString().padStart(2, '0')}:${appDate.getMinutes().toString().padStart(2, '0')}`;
                    
                    return (
                        <AppointmentCard
                            key={app.id}
                            appointment={app}
                            top={timeToYPosition(timeString)}
                            height={durationToHeight(15)} // Assuming 15-minute appointments
                            onEdit={onEditAppointment}
                        />
                    );
                })}

                {doctorSchedule.length === 0 && doctorAppointments.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-center text-slate-500 dark:text-slate-400">
                        <p>This doctor has no schedule or appointments for today.</p>
                    </div>
                )}
            </div>
        </div>
    );
};