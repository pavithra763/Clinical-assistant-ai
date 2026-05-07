import React from 'react';
import type { ConsultationRecord, PrescriptionDetails, Turn } from '../types';
import { BeakerIcon, HeartPulseIcon, ClipboardListIcon, CloseIcon, DocumentTextIcon, LanguageIcon, PillIcon, SyringeIcon } from '../constants/icons';

interface ConsultationHistoryViewerProps {
    record: ConsultationRecord;
    doctorName: string;
    clinicName: string;
    clinicAddress: string;
    onClose: () => void;
}

const getSpeakerColor = (speaker: string): string => {
  const speakerColors = [
    'text-sky-600 dark:text-sky-400',
    'text-emerald-600 dark:text-emerald-400',
    'text-amber-600 dark:text-amber-400',
    'text-rose-600 dark:text-rose-400',
    'text-indigo-600 dark:text-indigo-400',
  ];
  const speakerNum = parseInt(speaker.replace('Speaker ', ''), 10);
  if (isNaN(speakerNum)) {
    return 'text-slate-900 dark:text-slate-100';
  }
  return speakerColors[(speakerNum - 1) % speakerColors.length];
};

const SectionCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; isScrollable?: boolean; hasContent?: boolean }> = ({ title, icon, children, isScrollable, hasContent = true }) => {
    if (!hasContent) return null;
    return (
        <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-lg p-6">
            <div className="flex items-center mb-3">
                {icon}
                <h4 className="text-md font-semibold text-slate-800 dark:text-slate-200">{title}</h4>
            </div>
            <div className={`prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 whitespace-pre-wrap pl-10 ${isScrollable ? 'max-h-96 overflow-y-auto' : ''}`}>
                {children}
            </div>
        </div>
    );
};

const prescriptionSections: { [key in keyof PrescriptionDetails]: { title: string; icon: React.ReactNode; } } = {
    medicationPrescription: { title: 'Medication Prescription', icon: <PillIcon className="w-6 h-6 mr-4 text-slate-500 dark:text-slate-400 flex-shrink-0" /> },
    injections: { title: 'Injections', icon: <SyringeIcon className="w-6 h-6 mr-4 text-slate-500 dark:text-slate-400 flex-shrink-0" /> },
    therapeuticServices: { title: 'Therapeutic / Treatment Services', icon: <ClipboardListIcon className="w-6 h-6 mr-4 text-slate-500 dark:text-slate-400 flex-shrink-0" /> },
    laboratoryServices: { title: 'Clinical Laboratory Services', icon: <BeakerIcon className="w-6 h-6 mr-4 text-slate-500 dark:text-slate-400 flex-shrink-0" /> },
    diagnosticImaging: { title: 'Diagnostic Imaging (X-Ray, etc.)', icon: <DocumentTextIcon className="w-6 h-6 mr-4 text-slate-500 dark:text-slate-400 flex-shrink-0" /> },
    cardioPulmonaryDiagnostics: { title: 'Cardiac & Pulmonary Diagnostics', icon: <HeartPulseIcon className="w-6 h-6 mr-4 text-slate-500 dark:text-slate-400 flex-shrink-0" /> },
    minorProcedures: { title: 'Minor Procedures', icon: <ClipboardListIcon className="w-6 h-6 mr-4 text-slate-500 dark:text-slate-400 flex-shrink-0" /> },
    preventiveSupportServices: { title: 'Preventive & Support Services', icon: <ClipboardListIcon className="w-6 h-6 mr-4 text-slate-500 dark:text-slate-400 flex-shrink-0" /> },
    homeHealthcare: { title: 'Home Healthcare Instructions', icon: <ClipboardListIcon className="w-6 h-6 mr-4 text-slate-500 dark:text-slate-400 flex-shrink-0" /> },
    admissionNotes: { title: 'Admission Notes', icon: <DocumentTextIcon className="w-6 h-6 mr-4 text-slate-500 dark:text-slate-400 flex-shrink-0" /> }
};

export const ConsultationHistoryViewer: React.FC<ConsultationHistoryViewerProps> = ({ record, doctorName, clinicName, clinicAddress, onClose }) => {
    const consultationDate = new Date(record.consultationDate).toLocaleString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
    
    const iconClasses = "w-6 h-6 mr-4 text-slate-500 dark:text-slate-400 flex-shrink-0";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl m-4 max-h-[90vh] flex flex-col">
                <header className="flex justify-between items-center p-4 border-b dark:border-slate-700 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Consultation Report</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {record.patientName} with {doctorName} on {consultationDate}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Close">
                        <CloseIcon className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                    </button>
                </header>
                <div className="p-6 space-y-6 overflow-y-auto">
                    {record.detectedLanguages && (
                        <div className="flex items-center bg-sky-50 text-sky-800 dark:bg-sky-900/70 dark:text-sky-300 p-3 rounded-lg border border-sky-200 dark:border-sky-800">
                            <LanguageIcon className="w-5 h-5 mr-3 flex-shrink-0" />
                            <p className="text-sm"><span className="font-semibold">Languages Detected:</span> {record.detectedLanguages}</p>
                        </div>
                    )}
                    
                    <SectionCard title="Original Transcription" icon={<DocumentTextIcon className={iconClasses} />} isScrollable={true} hasContent={record.turns.length > 0}>
                         <div className="space-y-3 font-sans">
                            {record.turns.map((turn: Turn, index: number) => (
                                <div key={index} className="flex gap-3 items-start">
                                    <span className="font-mono text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 mt-1">
                                    [{turn.timestamp || '00:00:00'}]
                                    </span>
                                    <p>
                                    <span className={`font-semibold ${getSpeakerColor(turn.speaker)}`}>{turn.speaker}: </span>
                                    {turn.text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </SectionCard>

                    <SectionCard title="Final English Transcript" icon={<DocumentTextIcon className={iconClasses} />} isScrollable={true} hasContent={!!record.englishTranscript}>
                        <p>{record.englishTranscript}</p>
                    </SectionCard>
                    
                    <SectionCard title="Consultation Summary" icon={<ClipboardListIcon className={iconClasses} />} hasContent={!!record.summary}>
                        <p>{record.summary}</p>
                    </SectionCard>

                    {record.prescriptionDetails && Object.entries(record.prescriptionDetails).map(([key, value]) => {
                        const sectionKey = key as keyof PrescriptionDetails;
                        if (typeof value !== 'string' || !value || value.trim() === 'Not mentioned.') return null;

                        const sectionConfig = prescriptionSections[sectionKey];
                        if (!sectionConfig) return null;

                        return (
                            <SectionCard key={key} title={sectionConfig.title} icon={sectionConfig.icon}>
                                <p>{value}</p>
                            </SectionCard>
                        );
                    })}
                </div>
                <footer className="flex justify-end items-center p-4 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-700 rounded-b-lg flex-shrink-0">
                    <button onClick={onClose} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-300 shadow-md">
                        Close Viewer
                    </button>
                </footer>
            </div>
        </div>
    );
};
