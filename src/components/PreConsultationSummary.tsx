import React, { useState } from 'react';
import type { PatientInfo, Vitals } from '../types';
import { ChevronDownIcon, ChevronUpIcon } from '../constants/icons';

interface PreConsultationSummaryProps {
    patientInfo: PatientInfo;
    vitals: Vitals;
    preliminaryNotes: string;
    medicalHistory: string;
    triageReport: string;
    appointmentTime: string;
}

const DetailItem: React.FC<{ label: string; value: string | undefined | null }> = ({ label, value }) => {
    if (!value) return null;
    return (
        <div>
            <span className="font-semibold text-slate-600 dark:text-slate-400">{label}:</span>
            <span className="ml-2 text-slate-800 dark:text-slate-200">{value}</span>
        </div>
    );
};

const Section: React.FC<{ title: string; children: React.ReactNode; hasContent: boolean }> = ({ title, children, hasContent }) => {
    if (!hasContent) return null;
    return (
        <div>
            <h4 className="font-semibold text-md text-slate-700 dark:text-slate-300 mb-2 border-b border-slate-200 dark:border-slate-600 pb-1">{title}</h4>
            <div className="prose prose-sm prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                {children}
            </div>
        </div>
    );
};

export const PreConsultationSummary: React.FC<PreConsultationSummaryProps> = ({ patientInfo, vitals, preliminaryNotes, medicalHistory, triageReport, appointmentTime }) => {
    const [isOpen, setIsOpen] = useState(true);
    
    const formattedTime = appointmentTime ? new Date(appointmentTime).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) : 'N/A';
    
    const hasVitals = Object.values(vitals).some(v => v);
    
    return (
        <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left"
                aria-expanded={isOpen}
            >
                <div>
                    <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-200">Pre-Consultation Report</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">For patient: {patientInfo.name || 'N/A'}</p>
                </div>
                {isOpen ? <ChevronUpIcon className="w-6 h-6 text-slate-600 dark:text-slate-400" /> : <ChevronDownIcon className="w-6 h-6 text-slate-600 dark:text-slate-400" />}
            </button>
            {isOpen && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                        <DetailItem label="Age" value={patientInfo.age} />
                        <DetailItem label="Gender" value={patientInfo.gender} />
                        <DetailItem label="Phone" value={patientInfo.phone} />
                        <DetailItem label="Appointment" value={formattedTime} />
                    </div>
                    
                    <Section title="Vital Signs" hasContent={hasVitals}>
                        <ul className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1">
                            {vitals.bp && <li><strong>BP:</strong> {vitals.bp} mmHg</li>}
                            {vitals.pulse && <li><strong>Pulse:</strong> {vitals.pulse} bpm</li>}
                            {vitals.spo2 && <li><strong>SpO2:</strong> {vitals.spo2}%</li>}
                            {vitals.temp && <li><strong>Temp:</strong> {vitals.temp}°F</li>}
                            {vitals.weight && <li><strong>Weight:</strong> {vitals.weight} Kgs</li>}
                            {vitals.glucose && <li><strong>Glucose:</strong> {vitals.glucose} mg/dL</li>}
                        </ul>
                    </Section>
                    
                    <Section title="Medical History" hasContent={!!medicalHistory}>
                        <p>{medicalHistory}</p>
                    </Section>

                    <Section title="Chief Complaint / Preliminary Notes" hasContent={!!preliminaryNotes}>
                        <p>{preliminaryNotes}</p>
                    </Section>
                    
                    <Section title="Nurse's Triage Report" hasContent={!!triageReport}>
                        <div dangerouslySetInnerHTML={{ __html: triageReport.replace(/\n/g, '<br />') }} />
                    </Section>
                </div>
            )}
        </div>
    );
};