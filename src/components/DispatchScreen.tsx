import React, { useState } from 'react';
import type { Appointment, PrescriptionDetails } from '../types';
import { DispatchConfirmModal } from './DispatchConfirmModal';
import { sendWhatsAppMessage } from '../utils/scheduleUtils';
import { ChevronDownIcon, ChevronUpIcon, UserIcon } from '../constants/icons';
import { ErrorFeedback } from './ErrorFeedback';

interface DispatchScreenProps {
    appointment: Appointment;
    doctorName: string;
    departmentContacts: { [key: string]: string };
    onBack: () => void;
    onError: (message: string) => void;
    onMarkAsDispatched: (appointmentId: string, sectionKey: keyof PrescriptionDetails) => void;
    clinicName: string;
}

// Map prescription keys to department contact keys defined in SettingsModal
const sectionToContactKey: { [key in keyof PrescriptionDetails]?: string } = {
    medicationPrescription: 'pharmacy',
    injections: 'nursing',
    therapeuticServices: 'therapy',
    laboratoryServices: 'laboratory',
    diagnosticImaging: 'imaging',
    cardioPulmonaryDiagnostics: 'cardiology',
    minorProcedures: 'nursing',
    homeHealthcare: 'homecare',
    admissionNotes: 'admissions'
};

const sectionTitles: { [key in keyof PrescriptionDetails]: string } = {
    medicationPrescription: 'Medication Prescription',
    injections: 'Injections',
    therapeuticServices: 'Therapeutic / Treatment Services',
    laboratoryServices: 'Clinical Laboratory Services',
    diagnosticImaging: 'Diagnostic Imaging (X-Ray, etc.)',
    cardioPulmonaryDiagnostics: 'Cardiac & Pulmonary Diagnostics',
    minorProcedures: 'Minor Procedures',
    preventiveSupportServices: 'Preventive & Support Services',
    homeHealthcare: 'Home Healthcare Instructions',
    admissionNotes: 'Admission Notes'
};

const CheckCircleIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 12.17l7.59-7.59L19 6l-9 9z"/></svg>
);

const DispatchCard: React.FC<{ title: string; content: string; onDispatch: () => void; isDispatchable: boolean; isDispatched: boolean; }> = ({ title, content, onDispatch, isDispatchable, isDispatched }) => (
    <div className={`bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg p-4 transition-colors border-l-4 ${isDispatched ? 'border-l-green-500 dark:border-l-green-400' : 'border-l-transparent'}`}>
        <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200">{title}</h4>
            <div className="flex items-center gap-4">
                 {isDispatched && (
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircleIcon className="w-4 h-4" />
                        Sent
                    </span>
                )}
                {isDispatchable && (
                    <button
                        onClick={onDispatch}
                        className={`font-semibold py-1 px-3 rounded-lg text-sm transition-colors ${
                            isDispatched 
                            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900'
                        }`}
                    >
                        {isDispatched ? 'Resend' : 'Dispatch'}
                    </button>
                )}
            </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{content}</p>
    </div>
);


export const DispatchScreen: React.FC<DispatchScreenProps> = ({ appointment, doctorName, departmentContacts, onBack, onError, onMarkAsDispatched, clinicName }) => {
    const [dispatchInfo, setDispatchInfo] = useState<{ title: string; content: string; number: string; sectionKey: keyof PrescriptionDetails } | null>(null);
    const [isSummaryOpen, setIsSummaryOpen] = useState(true);
    const [isTranscriptOpen, setIsTranscriptOpen] = useState(true);
    const [isPatientShareModalOpen, setIsPatientShareModalOpen] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);


    const handleDispatchClick = (sectionKey: keyof PrescriptionDetails) => {
        setLocalError(null);
        const contactKey = sectionToContactKey[sectionKey];
        const content = appointment.prescriptionDetails?.[sectionKey];
        if (!contactKey || !content) return;

        const number = departmentContacts[contactKey];
        if (!number) {
            setLocalError(`No contact number configured for the '${contactKey}' department. Please add it in Settings.`);
            onError(`No contact number configured for the '${contactKey}' department. Please add it in Settings.`);
            return;
        }

        setDispatchInfo({
            title: sectionTitles[sectionKey],
            content: content,
            number: number,
            sectionKey: sectionKey
        });
    };
    
    const generateDispatchMessage = (title: string, content: string): string => {
        const now = new Date();
        const timestamp = now.toLocaleString();
        const { patientInfo } = appointment;

        let message = `*MEDICAL ORDER DISPATCH*\n`;
        message += `*Clinic:* ${clinicName || 'N/A'}\n`;
        message += `*Dispatch Time:* ${timestamp}\n\n`;

        message += `*--- PATIENT DETAILS ---*\n`;
        message += `*Name:* ${patientInfo?.name || 'N/A'}\n`;
        if (patientInfo?.patientId) message += `*Patient ID:* ${patientInfo.patientId}\n`;
        if (patientInfo?.age) message += `*Age:* ${patientInfo.age}\n`;
        if (patientInfo?.gender) message += `*Gender:* ${patientInfo.gender}\n`;
        if (patientInfo?.phone) message += `*Phone:* ${patientInfo.phone}\n\n`;

        message += `*--- ORDER DETAILS ---*\n`;
        message += `*From:* ${doctorName}\n`;
        message += `*Order Type:* ${title}\n`;
        message += `*Details:*\n${content}`;
        
        return message;
    };

    const handleSendDispatch = (number: string) => {
        if (!dispatchInfo) return;
        setLocalError(null);
        const message = generateDispatchMessage(dispatchInfo.title, dispatchInfo.content);
        sendWhatsAppMessage(number, message, (err) => {
            setLocalError(err);
            onError(err);
        });
        onMarkAsDispatched(appointment.id, dispatchInfo.sectionKey);
        setDispatchInfo(null);
    };

    const handleDispatchAll = () => {
        setLocalError(null);
        let dispatchedCount = 0;
        
        dispatchableSections.forEach(key => {
            const content = appointment.prescriptionDetails?.[key];
            const isDispatchable = !!content && content.trim() !== 'Not mentioned.';
            const isDispatched = !!appointment.dispatchStatus?.[key];
            
            if (isDispatchable && !isDispatched) {
                const contactKey = sectionToContactKey[key];
                const number = contactKey ? departmentContacts[contactKey] : null;
                
                if (number) {
                    const message = generateDispatchMessage(sectionTitles[key], content);
                    sendWhatsAppMessage(number, message, (err) => {
                        setLocalError(prev => prev ? `${prev}\n${err}` : err);
                        onError(err);
                    });
                    onMarkAsDispatched(appointment.id, key);
                    dispatchedCount++;
                }
            }
        });

        if (dispatchedCount === 0) {
            setLocalError("No new orders to dispatch, or missing contact numbers.");
        }
    };

    const handleSendPatientShare = (number: string) => {
        if (!appointment.summary) return;
        setLocalError(null);
        const message = `*Summary of your consultation*\n\n${appointment.summary}`;
        sendWhatsAppMessage(number, message, (err) => {
            setLocalError(err);
            onError(err);
        });
        setIsPatientShareModalOpen(false);
    };


    const dispatchableSections = Object.keys(sectionToContactKey) as (keyof PrescriptionDetails)[];
    const hasDispatchableContent = dispatchableSections.some(key => {
        const content = appointment.prescriptionDetails?.[key];
        return !!content && content.trim() !== 'Not mentioned.';
    });
    
    const hasSummary = !!appointment.summary && appointment.summary.trim() !== '';
    const hasTranscript = !!appointment.englishTranscript && appointment.englishTranscript.trim() !== '';

    return (
        <>
            <DispatchConfirmModal
                isOpen={!!dispatchInfo}
                onClose={() => setDispatchInfo(null)}
                onSend={handleSendDispatch}
                title={dispatchInfo?.title || ''}
                content={dispatchInfo?.content || ''}
                initialNumber={dispatchInfo?.number || ''}
            />

            <DispatchConfirmModal
                isOpen={isPatientShareModalOpen}
                onClose={() => setIsPatientShareModalOpen(false)}
                onSend={handleSendPatientShare}
                title="Share Summary with Patient"
                content={appointment.summary || ''}
                initialNumber={appointment.patientInfo?.phone || ''}
            />

            <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 md:p-8 space-y-8 animate-fade-in">
                <ErrorFeedback message={localError} onDismiss={() => setLocalError(null)} />
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-slate-700 dark:text-slate-300">Dispatch Post-Consultation Orders</h2>
                        <p className="text-slate-500 dark:text-slate-400">Patient: <span className="font-semibold">{appointment.patientName}</span></p>
                    </div>
                    <button onClick={onBack} className="text-sm bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 transition-colors dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
                        Back to Dashboard
                    </button>
                </div>
                
                {hasTranscript && (
                    <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <button
                            onClick={() => setIsTranscriptOpen(!isTranscriptOpen)}
                            className="w-full flex justify-between items-center p-4 text-left"
                            aria-expanded={isTranscriptOpen}
                        >
                            <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">Full Consultation Transcript</h3>
                            {isTranscriptOpen ? <ChevronUpIcon className="w-6 h-6 text-slate-600 dark:text-slate-400" /> : <ChevronDownIcon className="w-6 h-6 text-slate-600 dark:text-slate-400" />}
                        </button>
                        {isTranscriptOpen && (
                            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                                <div className="prose prose-sm prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto">
                                    {appointment.englishTranscript}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {hasSummary && (
                    <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg">
                        <button
                            onClick={() => setIsSummaryOpen(!isSummaryOpen)}
                            className="w-full flex justify-between items-center p-4 text-left"
                            aria-expanded={isSummaryOpen}
                        >
                            <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">Doctor's Consultation Summary</h3>
                            {isSummaryOpen ? <ChevronUpIcon className="w-6 h-6 text-slate-600 dark:text-slate-400" /> : <ChevronDownIcon className="w-6 h-6 text-slate-600 dark:text-slate-400" />}
                        </button>
                        {isSummaryOpen && (
                            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                                <div className="prose prose-sm prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                                    {appointment.summary}
                                </div>
                                <div className="mt-4 flex justify-end">
                                     <button
                                        onClick={() => setIsPatientShareModalOpen(true)}
                                        className="flex items-center justify-center gap-2 rounded-lg bg-indigo-100 py-2 px-4 font-semibold text-indigo-800 transition-colors hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-900"
                                        disabled={!appointment.patientInfo?.phone}
                                    >
                                        <UserIcon className="w-5 h-5" />
                                        Share Summary with Patient
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-6">
                    <div className="flex justify-between items-center border-b dark:border-slate-600 pb-2">
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Dispatchable Orders</h3>
                        {hasDispatchableContent && (
                            <button 
                                onClick={handleDispatchAll}
                                className="text-xs bg-emerald-600 text-white font-bold py-1.5 px-4 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                            >
                                Dispatch All New
                            </button>
                        )}
                    </div>
                    
                    {hasDispatchableContent ? (
                        dispatchableSections.map(key => {
                            const content = appointment.prescriptionDetails?.[key];
                            const isDispatchable = !!content && content.trim() !== 'Not mentioned.';
                            const isDispatched = !!appointment.dispatchStatus?.[key];

                            if (!isDispatchable) return null;

                            return (
                                <DispatchCard
                                    key={key}
                                    title={sectionTitles[key]}
                                    content={content}
                                    isDispatchable={isDispatchable}
                                    isDispatched={isDispatched}
                                    onDispatch={() => handleDispatchClick(key)}
                                />
                            );
                        })
                    ) : (
                        <p className="text-center text-slate-500 dark:text-slate-400 py-8">No dispatchable orders were found in this patient's report.</p>
                    )}
                </div>
            </div>
        </>
    );
};