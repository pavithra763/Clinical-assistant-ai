import React from 'react';
import type { Appointment } from '../types';
import { Tooltip } from './Tooltip';
import { statusDisplayInfo } from '../utils/styleUtils';

interface AppointmentCardProps {
    appointment: Appointment;
    top: number;
    height: number;
    onEdit: (appointment: Appointment) => void;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment, top, height, onEdit }) => {
    const statusInfo = statusDisplayInfo[appointment.status];
    const time = new Date(appointment.appointmentTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

    const canEdit = appointment.status !== 'completed' && appointment.status !== 'in-consultation';

    const tooltipContent = `${appointment.patientName} at ${time} - ${statusInfo.text}. Reason: ${appointment.reasonForVisit || 'N/A'}`;

    return (
        <Tooltip text={tooltipContent} position="top">
            <div
                className={`absolute w-[95%] left-1/2 -translate-x-1/2 p-2 rounded-lg border-l-[4px] cursor-pointer hover:shadow-lg transition-all text-xs font-semibold overflow-hidden shadow-sm ${statusInfo.timelineClasses}`}
                style={{ top: `${top}px`, height: `${height}px`, minHeight: '40px' }}
                onClick={() => canEdit && onEdit(appointment)}
            >
                <div className="flex flex-col h-full gap-0.5">
                    <p className="truncate font-bold text-slate-800 dark:text-white leading-tight">{appointment.patientName}</p>
                    <p className="truncate text-[10px] opacity-70 font-medium">{appointment.patientInfo?.phone}</p>
                    {height > 35 && (
                        <p className="truncate text-[10px] italic opacity-60 mt-0.5 font-normal">
                           {appointment.reasonForVisit || 'Follow-up'}
                        </p>
                    )}
                    {height > 50 && appointment.notes && (
                        <p className="truncate text-[10px] text-blue-600 dark:text-blue-400 mt-1 font-bold italic">
                           Note: {appointment.notes}
                        </p>
                    )}
                    <div className="flex-1" />
                    <p className="text-[9px] font-bold text-right opacity-80">{time}</p>
                </div>
            </div>
        </Tooltip>
    );
};