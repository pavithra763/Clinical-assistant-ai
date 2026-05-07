import React from 'react';
import type { Vitals, PatientInfo } from '../types';

interface TriageReviewScreenProps {
    patientInfo: PatientInfo;
    vitals: Vitals;
    preliminaryNotes: string;
    triageReport: string;
    onFinalizeIntake: () => void;
    doctorName: string;
    onBack: () => void;
}

const DataDisplayCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-lg p-4">
        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">{title}</h4>
        <div className="text-sm text-slate-600 dark:text-slate-300 space-y-1">{children}</div>
    </div>
);

export const TriageReviewScreen: React.FC<TriageReviewScreenProps> = ({
    patientInfo,
    vitals,
    preliminaryNotes,
    triageReport,
    onFinalizeIntake,
    doctorName,
    onBack
}) => {
    
    const vitalsList = Object.entries({
        "Blood Pressure": `${vitals.bp || 'N/A'} mmHg`,
        "Pulse": `${vitals.pulse || 'N/A'} bpm`,
        "SpO2": `${vitals.spo2 || 'N/A'}%`,
        "Temperature": `${vitals.temp || 'N/A'}°F`,
        "Weight": `${vitals.weight || 'N/A'} Kgs`,
        "Random Glucose": `${vitals.glucose || 'N/A'} mg/dL`
    }).filter(([, value]) => !value.startsWith('N/A'));

    const patientInfoList = Object.entries({
        "Name": patientInfo.name,
        "Age": patientInfo.age,
        "Gender": patientInfo.gender,
        "Phone": patientInfo.phone
    }).filter(([, value]) => value);

    return (
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 md:p-8 space-y-8 animate-fade-in">
            <div className="text-center">
                <h2 className="text-xl md:text-2xl font-bold text-slate-700 dark:text-slate-300 mb-1">Triage Report Review</h2>
                <p className="text-slate-500 dark:text-slate-400">Reviewing intake for <span className="font-semibold">{patientInfo.name}</span> (appointment with <span className="font-semibold">{doctorName}</span>).</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Entered Data */}
                <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b dark:border-slate-600 pb-2">Entered Information</h3>
                    {patientInfoList.length > 0 && (
                        <DataDisplayCard title="Patient Details">
                            {patientInfoList.map(([key, value]) => <p key={key}><strong>{key}:</strong> {value}</p>)}
                        </DataDisplayCard>
                    )}
                    {vitalsList.length > 0 && (
                         <DataDisplayCard title="Vital Signs">
                            {vitalsList.map(([key, value]) => <p key={key}><strong>{key}:</strong> {value}</p>)}
                        </DataDisplayCard>
                    )}
                    {preliminaryNotes && (
                        <DataDisplayCard title="Chief Complaint / Preliminary Notes">
                            <p className="whitespace-pre-wrap">{preliminaryNotes}</p>
                        </DataDisplayCard>
                    )}
                </div>

                {/* Right Column: AI Report */}
                <div className="space-y-6">
                     <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b dark:border-slate-600 pb-2">AI-Generated Triage Report</h3>
                     <div className="bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-lg p-4 prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-200">
                         {triageReport ? (
                            <div dangerouslySetInnerHTML={{ __html: triageReport.replace(/\n/g, '<br />') }} />
                         ) : (
                            <p>No report generated.</p>
                         )}
                     </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center items-center gap-4 pt-4">
                <button
                    onClick={onBack}
                    className="w-full max-w-xs bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-lg hover:bg-slate-300 transition-colors duration-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
                >
                    Back to Edit
                </button>
                <button
                    onClick={onFinalizeIntake}
                    className="w-full max-w-xs bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-colors duration-300 shadow-md text-lg"
                >
                    Finalize Intake
                </button>
            </div>
        </div>
    );
};