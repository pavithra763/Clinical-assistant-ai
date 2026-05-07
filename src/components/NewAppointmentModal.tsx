import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Appointment, Doctor, PatientInfo, DoctorSchedule } from '../types';
import type { AIService, RecordingControls } from '../services/aiService';
import type { Prompts } from '../prompts/defaultPrompts';
import { findOrCreatePatient } from '../utils/patientUtils';
import { CloseIcon } from '../constants/icons';
import { RecordButton } from './RecordButton';
import { findAvailableSlot, checkAppointmentConflict } from '../utils/scheduleUtils';
import { ErrorFeedback } from './ErrorFeedback';

interface NewAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (appointment: Appointment) => void;
    doctors: Doctor[];
    patients: PatientInfo[];
    onPatientsChange: (patients: PatientInfo[]) => void;
    aiService: AIService | null;
    prompts: Prompts;
    schedules: { [doctorId: string]: DoctorSchedule };
    appointments: Appointment[];
    preFilledDoctorId?: string;
    preFilledTime?: Date;
}

const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const NewAppointmentModal: React.FC<NewAppointmentModalProps> = ({ isOpen, onClose, onSave, doctors, patients, onPatientsChange, aiService, prompts, schedules, appointments, preFilledDoctorId, preFilledTime }) => {
    const [patientName, setPatientName] = useState('');
    const [patientPhone, setPatientPhone] = useState('');
    const [patientAge, setPatientAge] = useState('');
    const [patientGender, setPatientGender] = useState('');
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<PatientInfo[]>([]);
    
    const [appointmentDate, setAppointmentDate] = useState(getLocalDateString(new Date()));
    const [appointmentHour, setAppointmentHour] = useState('09');
    const [appointmentMinute, setAppointmentMinute] = useState('00');
    const [appointmentPeriod, setAppointmentPeriod] = useState('AM');
    const [doctorId, setDoctorId] = useState(doctors.length > 0 ? doctors[0].id : '');
    const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');

    const specialties = useMemo(() => {
        const s = new Set(doctors.map(d => d.specialty));
        return Array.from(s).sort();
    }, [doctors]);

    const filteredDoctors = useMemo(() => {
        if (specialtyFilter === 'all') return doctors.filter(d => d.isAvailable);
        return doctors.filter(d => d.isAvailable && d.specialty === specialtyFilter);
    }, [doctors, specialtyFilter]);
    const [room, setRoom] = useState('Room 1');
    const [reasonForVisit, setReasonForVisit] = useState('');
    
    const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording'>('idle');
    const [isProcessing, setIsProcessing] = useState(false);
    const recordingControlsRef = useRef<RecordingControls | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [audioTranscript, setAudioTranscript] = useState('');
    const [showTranscriptConfirmation, setShowTranscriptConfirmation] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (preFilledDoctorId) setDoctorId(preFilledDoctorId);
            if (preFilledTime) {
                setAppointmentDate(getLocalDateString(preFilledTime));
                const hours = preFilledTime.getHours();
                const minutes = preFilledTime.getMinutes();
                const period = hours >= 12 ? 'PM' : 'AM';
                let hour12 = hours % 12;
                hour12 = hour12 ? hour12 : 12;
                setAppointmentHour(String(hour12).padStart(2, '0'));
                setAppointmentMinute(String(minutes).padStart(2, '0'));
                setAppointmentPeriod(period);
            }
        }
    }, [isOpen, preFilledDoctorId, preFilledTime]);

    useEffect(() => {
        if (patientName.length > 1 && !selectedPatientId) {
            setSuggestions(patients.filter(p => p.name.toLowerCase().includes(patientName.toLowerCase())));
        } else {
            setSuggestions([]);
        }
    }, [patientName, patients, selectedPatientId]);

    const handlePatientSelect = (patient: PatientInfo) => {
        setSelectedPatientId(patient.patientId || null);
        setPatientName(patient.name);
        setPatientPhone(patient.phone);
        setPatientAge(patient.age);
        setPatientGender(patient.gender);
        setSuggestions([]);
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPatientName(e.target.value);
        setSelectedPatientId(null); // Clear selection if name is changed manually
    };
    
    const resetForm = () => {
        setPatientName('');
        setPatientPhone('');
        setPatientAge('');
        setPatientGender('');
        setSelectedPatientId(null);
        setAppointmentDate(getLocalDateString(new Date()));
        setAppointmentHour('09');
        setAppointmentMinute('00');
        setAppointmentPeriod('AM');
        setDoctorId(doctors.length > 0 ? doctors[0].id : '');
        setRoom('Room 1');
        setReasonForVisit('');
        setError(null);
        setSuccessMessage(null);
        setShowTranscriptConfirmation(false);
        setAudioTranscript('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!patientName.trim() || !patientPhone.trim()) {
            setError('Patient Name and Phone are required.');
            return;
        }
        
        const patientRequestInfo = { name: patientName, phone: patientPhone, age: patientAge, gender: patientGender };
        const { finalPatientInfo, updatedPatientList } = findOrCreatePatient(patientRequestInfo, patients);

        if (updatedPatientList) {
            onPatientsChange(updatedPatientList);
        }

        let hour12 = parseInt(appointmentHour, 10);
        let hour24 = hour12;
        if (appointmentPeriod === 'PM' && hour12 < 12) hour24 += 12;
        if (appointmentPeriod === 'AM' && hour12 === 12) hour24 = 0;
        
        const minute = parseInt(appointmentMinute, 10);
        const [year, month, day] = appointmentDate.split('-').map(Number);
        const newDateTime = new Date(year, month - 1, day, hour24, minute);

        const conflict = checkAppointmentConflict(doctorId, newDateTime, 15, appointments, schedules);
        if (conflict) {
            setError(conflict);
            return;
        }
        
        const newAppointment: Appointment = {
            id: `appt-${Date.now()}`,
            patientName: finalPatientInfo.name,
            patientInfo: finalPatientInfo,
            appointmentTime: newDateTime.toISOString(),
            doctorId,
            room,
            reasonForVisit,
            status: 'booked',
            source: 'patient-portal',
        };

        onSave(newAppointment);
        resetForm();
    };
    
    const handleConfirmTranscript = async () => {
        setShowTranscriptConfirmation(false);
        setIsProcessing(true);
        setError(null);
        setSuccessMessage(null);
        try {
            if (!aiService) throw new Error("AI Service is not available.");
            const details = await aiService.extractAppointmentDetails(audioTranscript, prompts.appointmentExtractionPromptTemplate);
            
            const slotInfo = findAvailableSlot(details, schedules, appointments, doctors);

            if (slotInfo) {
                const { date, doctorId, room } = slotInfo;
                
                setAppointmentDate(getLocalDateString(date));
                const hours = date.getHours();
                const minutes = date.getMinutes();
                const period = hours >= 12 ? 'PM' : 'AM';
                let hour12 = hours % 12;
                hour12 = hour12 ? hour12 : 12;
                
                setAppointmentHour(String(hour12).padStart(2, '0'));
                setAppointmentMinute(String(minutes).padStart(2, '0'));
                setAppointmentPeriod(period);
                setDoctorId(doctorId);
                setRoom(room);
                setSuccessMessage(`Found available slot: ${date.toLocaleString()}. Please review and save.`);
            } else {
                setError(`No slots available for the requested time. Please choose another time or doctor.`);
            }
            
            setPatientName(details.patientName || '');
            setPatientPhone(details.patientPhone || '');
            setPatientAge(details.patientAge || '');
            setPatientGender(details.patientGender || '');
            setReasonForVisit(details.reasonForVisit || '');

            if (details.requestedDoctor && !slotInfo) {
                const lowerReqDoctor = details.requestedDoctor.toLowerCase();
                const foundDoctor = doctors.find(d => d.name.toLowerCase().includes(lowerReqDoctor) || d.specialty.toLowerCase().includes(lowerReqDoctor));
                if (foundDoctor) setDoctorId(foundDoctor.id);
            }

        } catch (e) {
            setError('Could not extract details from audio. Please enter manually.');
        } finally {
            setIsProcessing(false);
            setAudioTranscript('');
        }
    };

    const handleToggleRecording = async () => {
        if (recordingStatus === 'recording') {
            recordingControlsRef.current?.stop();
        } else {
            if (!aiService) {
                setError("Audio booking service is not available.");
                return;
            }
            setRecordingStatus('recording');
            let fullTranscript = '';

            try {
                const controls = await aiService.startLiveSession({
                    onTranscriptionUpdate: () => {},
                    onTurnComplete: (turn) => { fullTranscript += turn.text + ' '; },
                    onError: (err) => {
                        setError(`Recording error: ${err}`);
                        setRecordingStatus('idle');
                    },
                }, "You are a receptionist booking a medical appointment. Your task is to listen to the request, which may be in multiple languages, and you MUST translate and transcribe it into English. Extract all relevant details for booking.");

                recordingControlsRef.current = {
                    ...controls,
                    stop: async () => {
                        controls.stop();
                        setRecordingStatus('idle');
                        if (!fullTranscript.trim()) return;
                        
                        setAudioTranscript(fullTranscript);
                        setShowTranscriptConfirmation(true);
                    }
                };
            } catch(err) {
                setError("Could not start microphone. Please check permissions.");
                setRecordingStatus('idle');
            }
        }
    };
    
    if (!isOpen) return null;

    const inputClasses = "mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500";
    const hourOptions = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
    const minuteOptions = ['00', '15', '30', '45'];

    const areFieldsDisabled = recordingStatus === 'recording' || isProcessing || showTranscriptConfirmation;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70" aria-modal="true" role="dialog">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-3xl m-4 max-h-[90vh] flex flex-col">
                <header className="flex justify-between items-center p-4 border-b dark:border-slate-700 flex-shrink-0">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">New Appointment</h2>
                    <button type="button" onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Close">
                        <CloseIcon className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                    </button>
                </header>
                <div className="p-6 space-y-4 overflow-y-auto">
                    <ErrorFeedback message={error} onDismiss={() => setError(null)} />
                    {successMessage && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 dark:bg-green-900/20 dark:border-green-900/50 dark:text-green-300">
                            {successMessage}
                        </div>
                    )}
                     <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between gap-4">
                        <div>
                            <h3 className="font-semibold text-slate-700 dark:text-slate-300">Book with Audio</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Record the patient's request to auto-fill the form.</p>
                        </div>
                        <div className="flex items-center gap-4">
                           {isProcessing && (
                               <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                   <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
                                   Processing...
                               </div>
                           )}
                           <RecordButton
                                status={recordingStatus}
                                onClick={handleToggleRecording}
                                disabled={isProcessing || showTranscriptConfirmation}
                                stoppedText="Start Recording"
                                recordingText="Stop & Process"
                           />
                        </div>
                    </div>

                    {showTranscriptConfirmation && (
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/50 border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-lg space-y-3 animate-fade-in">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-200">Confirm Audio Transcription</h4>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Please review the transcribed request. Click "Confirm" to auto-fill the form with these details.</p>
                            <blockquote className="p-3 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 italic text-slate-700 dark:text-slate-300 max-h-24 overflow-y-auto">
                                "{audioTranscript}"
                            </blockquote>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowTranscriptConfirmation(false);
                                        setAudioTranscript('');
                                    }}
                                    className="bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmTranscript}
                                    className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50"
                                >
                                    Confirm & Fill Form
                                </button>
                            </div>
                        </div>
                    )}

                    <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 border-b pt-2 pb-2 dark:border-slate-600">Patient Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <label htmlFor="patientName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Patient Name*</label>
                            <input type="text" id="patientName" value={patientName} onChange={handleNameChange} className={inputClasses} disabled={areFieldsDisabled} required />
                            {suggestions.length > 0 && (
                                <ul className="absolute z-10 w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md mt-1 shadow-lg max-h-40 overflow-y-auto">
                                    {suggestions.map(p => (
                                        <li key={p.patientId} onClick={() => handlePatientSelect(p)} className="px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600">
                                            {p.name} ({p.phone})
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div>
                            <label htmlFor="patientPhone" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Phone*</label>
                            <input type="tel" id="patientPhone" value={patientPhone} onChange={e => setPatientPhone(e.target.value)} className={inputClasses} disabled={areFieldsDisabled} required />
                        </div>
                        <div>
                            <label htmlFor="patientAge" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Age</label>
                            <input type="text" id="patientAge" value={patientAge} onChange={e => setPatientAge(e.target.value)} className={inputClasses} disabled={areFieldsDisabled} />
                        </div>
                        <div>
                            <label htmlFor="patientGender" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Gender</label>
                            <input type="text" id="patientGender" value={patientGender} onChange={e => setPatientGender(e.target.value)} className={inputClasses} disabled={areFieldsDisabled} />
                        </div>
                    </div>
                    <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 border-b pt-4 pb-2 dark:border-slate-600">Appointment Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="appointmentDate" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Date*</label>
                            <input type="date" id="appointmentDate" value={appointmentDate} onChange={e => setAppointmentDate(e.target.value)} className={inputClasses} disabled={areFieldsDisabled} required />
                        </div>
                        <div>
                            <label htmlFor="appointmentHour" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Time*</label>
                            <div className="mt-1 flex gap-2">
                                <select id="appointmentHour" value={appointmentHour} onChange={e => setAppointmentHour(e.target.value)} className={`${inputClasses} mt-0`} disabled={areFieldsDisabled}>
                                    {hourOptions.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                                <select value={appointmentMinute} onChange={e => setAppointmentMinute(e.target.value)} className={`${inputClasses} mt-0`} disabled={areFieldsDisabled}>
                                    {minuteOptions.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <select value={appointmentPeriod} onChange={e => setAppointmentPeriod(e.target.value)} className={`${inputClasses} mt-0`} disabled={areFieldsDisabled}>
                                    <option value="AM">AM</option>
                                    <option value="PM">PM</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="doctorId" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Doctor*</label>
                            <div className="flex flex-col sm:flex-row gap-2 mt-1">
                                <select 
                                    className="flex-1 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-slate-200 outline-none focus:ring-blue-500 focus:border-blue-500"
                                    value={specialtyFilter}
                                    onChange={(e) => setSpecialtyFilter(e.target.value)}
                                    disabled={areFieldsDisabled}
                                >
                                    <option value="all">All Specialties</option>
                                    {specialties.map((s: string) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                                <select 
                                    id="doctorId" 
                                    value={doctorId} 
                                    onChange={e => setDoctorId(e.target.value)} 
                                    className="flex-2 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-slate-200 outline-none focus:ring-blue-500 focus:border-blue-500" 
                                    disabled={areFieldsDisabled} 
                                    required
                                >
                                    <option value="">Choose a Doctor...</option>
                                    {filteredDoctors.map((doc: Doctor) => (
                                        <option key={doc.id} value={doc.id}>{doc.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="room" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Room</label>
                            <input type="text" id="room" value={room} onChange={e => setRoom(e.target.value)} className={inputClasses} disabled={areFieldsDisabled} />
                        </div>
                         <div className="md:col-span-2">
                            <label htmlFor="reasonForVisit" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Reason for Visit</label>
                            <textarea id="reasonForVisit" value={reasonForVisit} onChange={e => setReasonForVisit(e.target.value)} rows={3} className={inputClasses} disabled={areFieldsDisabled} />
                        </div>
                    </div>
                </div>
                 <footer className="flex justify-end items-center p-4 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-700 rounded-b-lg flex-shrink-0">
                    <button type="button" onClick={onClose} className="bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 transition-colors">
                        Cancel
                    </button>
                    <button type="submit" className="ml-3 bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md" disabled={areFieldsDisabled}>
                        Create Appointment
                    </button>
                </footer>
            </form>
        </div>
    );
};