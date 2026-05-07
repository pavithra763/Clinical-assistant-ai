import React, { useState, useEffect, useMemo } from 'react';
import type { Appointment, Doctor } from '../types';
import { ErrorFeedback } from './ErrorFeedback';

interface EditAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (appointment: Appointment) => void;
    appointmentToEdit: Appointment;
    doctors: Doctor[];
}

const CloseIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"></path>
    </svg>
);

// Helper to get YYYY-MM-DD from an ISO string, respecting local timezone
const getLocalDateString = (isoString?: string): string => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};


export const EditAppointmentModal: React.FC<EditAppointmentModalProps> = ({ isOpen, onClose, onSave, appointmentToEdit, doctors }) => {
    const [formData, setFormData] = useState<Appointment>(appointmentToEdit);
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        setFormData(appointmentToEdit);
        setLocalError(null);
    }, [appointmentToEdit]);

    const timeParts = useMemo(() => {
        if (!formData.appointmentTime) {
            return { hour: '09', minute: '00', period: 'AM' };
        }
        const date = new Date(formData.appointmentTime);
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';

        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'

        return {
            hour: String(hours).padStart(2, '0'),
            minute: String(minutes).padStart(2, '0'),
            period: period,
        };
    }, [formData.appointmentTime]);


    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name.startsWith('patientInfo.')) {
            const field = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                patientInfo: {
                    ...(prev.patientInfo!),
                    [field]: value,
                }
            }));
        } else if (['appointmentDate', 'appointmentHour', 'appointmentMinute', 'appointmentPeriod'].includes(name)) {
            const datePart = name === 'appointmentDate' 
                ? value 
                : getLocalDateString(formData.appointmentTime) || getLocalDateString(new Date().toISOString());

            const timeValues = { ...timeParts };
            
            if (name === 'appointmentHour') timeValues.hour = value;
            if (name === 'appointmentMinute') timeValues.minute = value;
            if (name === 'appointmentPeriod') timeValues.period = value;

            let hour12 = parseInt(timeValues.hour, 10);
            let hour24 = hour12;
            if (timeValues.period === 'PM' && hour12 < 12) {
                hour24 += 12;
            }
            if (timeValues.period === 'AM' && hour12 === 12) { // 12 AM is 00:xx
                hour24 = 0;
            }
            
            const minute = parseInt(timeValues.minute, 10);
            const [year, month, day] = datePart.split('-').map(Number);
            const newDateTime = new Date(year, month - 1, day, hour24, minute);

            setFormData(prev => ({ ...prev, appointmentTime: newDateTime.toISOString() }));
        }
        else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const inputClasses = "mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500";
    
    const dateValue = getLocalDateString(formData.appointmentTime);
    
    const hourOptions = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
    const minuteOptions = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70" aria-modal="true" role="dialog">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl m-4 max-h-[90vh] flex flex-col">
                <header className="flex justify-between items-center p-4 border-b dark:border-slate-700 flex-shrink-0">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Edit Appointment</h2>
                    <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Close">
                        <CloseIcon className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                    </button>
                </header>

                <div className="p-6 space-y-4 overflow-y-auto">
                    <ErrorFeedback message={localError} onDismiss={() => setLocalError(null)} />
                    {/* Appointment Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="patientName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Patient Name</label>
                            <input type="text" name="patientName" id="patientName" value={formData.patientName} onChange={handleChange} className={inputClasses} required />
                        </div>
                        <div>
                            <label htmlFor="appointmentDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Appointment Date</label>
                            <input type="date" name="appointmentDate" id="appointmentDate" value={dateValue} onChange={handleChange} className={inputClasses} required />
                        </div>
                         <div>
                            <label htmlFor="appointmentHour" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Appointment Time</label>
                            <div className="mt-1 flex gap-2">
                                <select name="appointmentHour" id="appointmentHour" value={timeParts.hour} onChange={handleChange} className={`${inputClasses} mt-0`}>
                                    {hourOptions.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                                <select name="appointmentMinute" value={timeParts.minute} onChange={handleChange} className={`${inputClasses} mt-0`}>
                                    {minuteOptions.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <select name="appointmentPeriod" value={timeParts.period} onChange={handleChange} className={`${inputClasses} mt-0`}>
                                    <option value="AM">AM</option>
                                    <option value="PM">PM</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="doctorId" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Doctor</label>
                            <select name="doctorId" id="doctorId" value={formData.doctorId} onChange={handleChange} className={inputClasses} required>
                                {doctors.map(doc => <option key={doc.id} value={doc.id}>{doc.name} - {doc.specialty}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="room" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Room</label>
                            <input type="text" name="room" id="room" value={formData.room} onChange={handleChange} className={inputClasses} />
                        </div>
                        <div className="md:col-span-2">
                             <label htmlFor="reasonForVisit" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Reason for Visit</label>
                            <textarea name="reasonForVisit" id="reasonForVisit" value={formData.reasonForVisit || ''} onChange={handleChange} rows={2} className={inputClasses} />
                        </div>
                        <div className="md:col-span-2">
                             <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Appointment Notes (Administrative)</label>
                            <textarea name="notes" id="notes" value={formData.notes || ''} onChange={handleChange} rows={2} className={`${inputClasses} border-blue-200 dark:border-blue-900/50`} placeholder="Brief administrative notes..."/>
                        </div>
                    </div>
                    
                    {/* Patient Info */}
                    <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 border-t pt-4 dark:border-slate-600">Patient Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="patientInfo.age" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Age</label>
                            <input type="text" name="patientInfo.age" id="patientInfo.age" value={formData.patientInfo?.age || ''} onChange={handleChange} className={inputClasses} />
                        </div>
                         <div>
                            <label htmlFor="patientInfo.gender" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Gender</label>
                            <input type="text" name="patientInfo.gender" id="patientInfo.gender" value={formData.patientInfo?.gender || ''} onChange={handleChange} className={inputClasses} />
                        </div>
                         <div>
                            <label htmlFor="patientInfo.phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Phone</label>
                            <input type="tel" name="patientInfo.phone" id="patientInfo.phone" value={formData.patientInfo?.phone || ''} onChange={handleChange} className={inputClasses} />
                        </div>
                    </div>
                </div>

                <footer className="flex justify-end items-center p-4 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-700 rounded-b-lg flex-shrink-0">
                    <button type="button" onClick={onClose} className="bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 transition-colors">
                        Cancel
                    </button>
                    <button type="submit" className="ml-3 bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md">
                        Save Changes
                    </button>
                </footer>
            </form>
        </div>
    );
};
