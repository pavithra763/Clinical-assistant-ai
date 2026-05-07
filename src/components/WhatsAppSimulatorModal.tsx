import React, { useState, useRef, useEffect } from 'react';
import type { AIService, RecordingControls, AppointmentRequest } from '../services/aiService';
import type { Prompts } from '../prompts/defaultPrompts';
import type { Appointment, Doctor, DoctorSchedule, PatientInfo } from '../types';
import { findAvailableSlot, generateAppointmentConfirmationMessage, sendWhatsAppMessage } from '../utils/scheduleUtils';
import { CheckCircleIcon, CloseIcon, MicIcon } from '../constants/icons';
import { findOrCreatePatient } from '../utils/patientUtils';

interface WhatsAppSimulatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    aiService: AIService;
    prompts: Prompts;
    schedules: { [doctorId: string]: DoctorSchedule };
    appointments: Appointment[];
    doctors: Doctor[];
    onAppointmentsChange: (appointments: Appointment[]) => void;
    onError: (message: string) => void;
    patients: PatientInfo[];
    onPatientsChange: (patients: PatientInfo[]) => void;
}

export const WhatsAppSimulatorModal: React.FC<WhatsAppSimulatorModalProps> = ({ isOpen, onClose, aiService, prompts, schedules, appointments, doctors, onAppointmentsChange, onError, patients, onPatientsChange }) => {
    const [inputValue, setInputValue] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [bookedAppointment, setBookedAppointment] = useState<Appointment | null>(null);
    const recordingControlsRef = useRef<RecordingControls | null>(null);

    useEffect(() => {
        if (!isOpen) {
            const timer = setTimeout(() => {
                setInputValue('');
                setIsRecording(false);
                setIsProcessing(false);
                setErrorMessage(null);
                setBookedAppointment(null);
                if (recordingControlsRef.current) {
                    recordingControlsRef.current.stop();
                    recordingControlsRef.current = null;
                }
            }, 300); // Delay reset to allow for closing animation
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const showTempError = (message: string) => {
        setErrorMessage(message);
        setTimeout(() => setErrorMessage(null), 5000);
    };

    const handleProcessBooking = async () => {
        const requestText = inputValue;
        if (!requestText.trim()) return;

        setIsProcessing(true);
        setErrorMessage(null);
        try {
            const extractedDetails: AppointmentRequest = await aiService.extractAppointmentDetails(requestText, prompts.appointmentExtractionPromptTemplate);

            const phone = extractedDetails.patientPhone?.trim();
            if (!extractedDetails.patientName.trim() || !extractedDetails.requestedDate.trim() || !extractedDetails.requestedTime.trim() || !phone) {
                showTempError("AI couldn't extract key details (name, phone, date, time). Please try rephrasing, e.g., 'Book appointment for John Doe at 555-123-4567 for a fever tomorrow morning.'");
                setIsProcessing(false);
                return;
            }
            
            const patientRequestInfo = {
                name: extractedDetails.patientName,
                phone: phone,
                age: extractedDetails.patientAge || '',
                gender: extractedDetails.patientGender || '',
            };

            const { finalPatientInfo, updatedPatientList } = findOrCreatePatient(patientRequestInfo, patients);
            if (updatedPatientList) {
                onPatientsChange(updatedPatientList);
            }

            const slotInfo = findAvailableSlot(extractedDetails, schedules, appointments, doctors);

            if (slotInfo) {
                const { date, doctorId, room } = slotInfo;
                const newAppointment: Appointment = {
                    id: Date.now().toString(),
                    patientName: finalPatientInfo.name,
                    appointmentTime: date.toISOString(),
                    reasonForVisit: extractedDetails.reasonForVisit || 'Not specified',
                    status: 'booked',
                    source: 'whatsapp',
                    doctorId,
                    room,
                    patientInfo: finalPatientInfo
                };
                onAppointmentsChange([...appointments, newAppointment]);
                setBookedAppointment(newAppointment);
            } else {
                showTempError(`No available slots for ${extractedDetails.requestedDate} in the ${extractedDetails.requestedTime}.`);
            }

        } catch (err) {
            const msg = err instanceof Error ? err.message : 'An unknown error occurred';
            onError(`Failed to process booking request: ${msg}`);
            showTempError('An unexpected error occurred. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleMicClick = async () => {
        if (isRecording) {
            recordingControlsRef.current?.stop();
            recordingControlsRef.current = null;
            setIsRecording(false);
        } else {
            setIsRecording(true);
            try {
                let fullTranscript = '';
                const controls = await aiService.startLiveSession({
                    onTranscriptionUpdate: (text) => setInputValue(text),
                    onTurnComplete: (turn) => {
                        fullTranscript += turn.text + ' ';
                        setInputValue(fullTranscript);
                    },
                    onError: (err) => { onError(err); setIsRecording(false); },
                }, "You are a receptionist booking a medical appointment. Transcribe the user's request clearly.");
                recordingControlsRef.current = controls;
            } catch(err) {
                onError(err instanceof Error ? err.message : 'Failed to start microphone');
                setIsRecording(false);
            }
        }
    };

    const handleSendConfirmation = () => {
        if (!bookedAppointment) return;
        const doctorName = doctors.find(d => d.id === bookedAppointment.doctorId)?.name || 'the doctor';
        const message = generateAppointmentConfirmationMessage(bookedAppointment, doctorName);
        sendWhatsAppMessage(bookedAppointment.patientInfo?.phone || '', message, onError);
        onClose();
    };

    if (!isOpen) return null;

    const renderBookingForm = () => (
        <>
            <header className="flex justify-between items-center p-4 border-b dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Process Incoming WhatsApp Booking</h2>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Close">
                    <CloseIcon className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                </button>
            </header>
            <div className="p-6 space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    Simulate a message received from a patient. Enter their request as text or record an audio message.
                </p>
                <div className="relative">
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder='e.g., "Hi, I need an appointment for John Doe tomorrow morning for a fever with the cardiologist. My number is 555-123-4567"'
                        rows={4}
                        className="w-full p-2 pr-12 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        disabled={isRecording || isProcessing}
                    />
                     <button 
                        onClick={handleMicClick} 
                        className={`absolute top-2 right-2 p-2 rounded-full transition-colors ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                        disabled={isProcessing}
                    >
                        <MicIcon className="w-5 h-5" />
                    </button>
                </div>
                {errorMessage && (
                    <div className="p-3 rounded-md text-sm bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200">
                        {errorMessage}
                    </div>
                )}
            </div>
            <footer className="flex justify-end items-center p-4 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-700 rounded-b-lg space-x-3">
                <button
                    onClick={onClose}
                    className="bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 transition-colors"
                >
                    Cancel
                </button>
                <button
                    onClick={handleProcessBooking}
                    disabled={!inputValue.trim() || isProcessing || isRecording}
                    className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isProcessing ? 'Processing...' : 'Process & Book'}
                </button>
            </footer>
        </>
    );

    const renderConfirmation = () => {
        if (!bookedAppointment) return null;
        const date = new Date(bookedAppointment.appointmentTime);
        const friendlyDate = date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
        const friendlyTime = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
        const doctorName = doctors.find(d => d.id === bookedAppointment.doctorId)?.name;

        return (
            <>
                <header className="flex justify-between items-center p-4 border-b dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <CheckCircleIcon className="w-6 h-6 text-green-500"/>
                        Appointment Booked Successfully
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Close">
                        <CloseIcon className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                    </button>
                </header>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">An appointment has been created with the following details:</p>
                    <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-sm space-y-2">
                        <p><strong>Patient:</strong> {bookedAppointment.patientName}</p>
                        <p><strong>Doctor:</strong> {doctorName || 'N/A'}</p>
                        <p><strong>Date:</strong> {friendlyDate}</p>
                        <p><strong>Time:</strong> {friendlyTime}</p>
                        <p><strong>Room:</strong> {bookedAppointment.room}</p>
                        <p><strong>Reason:</strong> {bookedAppointment.reasonForVisit}</p>
                        {bookedAppointment.patientInfo?.phone && <p><strong>Phone:</strong> {bookedAppointment.patientInfo.phone}</p>}
                    </div>
                </div>
                <footer className="flex justify-end items-center p-4 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-700 rounded-b-lg space-x-3">
                    <button
                        onClick={onClose}
                        className="bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 transition-colors"
                    >
                        Close
                    </button>
                    <button
                        onClick={handleSendConfirmation}
                        className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors shadow-md"
                    >
                        Send WhatsApp Confirmation
                    </button>
                </footer>
            </>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg m-4 transition-all">
                {bookedAppointment ? renderConfirmation() : renderBookingForm()}
            </div>
        </div>
    );
};