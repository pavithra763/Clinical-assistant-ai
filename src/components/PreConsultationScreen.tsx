import React, { useState } from 'react';
import { motion } from 'motion/react';
import type { Vitals, PatientInfo, Turn } from '../types';
import type { AIService } from '../services/aiService';
import { RecordButton } from './RecordButton';
import { TranscriptionDisplay } from './TranscriptionDisplay';
import { ErrorFeedback } from './ErrorFeedback';
import { 
  User, 
  Phone, 
  Users, 
  Activity, 
  Thermometer, 
  Weight, 
  Droplet, 
  ArrowLeft, 
  Heart,
  Stethoscope,
  ClipboardList
} from 'lucide-react';

interface PreConsultationScreenProps {
  patientInfo: PatientInfo;
  onPatientInfoChange: (info: PatientInfo) => void;
  vitals: Vitals;
  onVitalsChange: (vitals: Vitals) => void;
  preliminaryNotes: string;
  onPreliminaryNotesChange: (notes: string) => void;
  medicalHistory: string;
  onMedicalHistoryChange: (history: string) => void;
  onGenerateTriageReport: () => void;
  isGeneratingTriage: boolean;
  intakeRecordingStatus: 'idle' | 'recording' | 'paused';
  onToggleIntakeRecording: () => void;
  isProcessingIntake: boolean;
  intakeTranscriptionTurns: Turn[];
  onIntakeTurnsChange: (turns: Turn[]) => void;
  currentIntakeTranscription: string;
  onClearIntakeTranscription: () => void;
  aiService: AIService | null;
  doctorName: string;
  onBack: () => void;
  error?: string | null;
  onError?: (msg: string | null) => void;
}

const InputField: React.FC<{
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  unit?: string;
  disabled?: boolean;
}> = ({ label, icon, value, onChange, placeholder, unit, disabled }) => (
  <div className="space-y-1.5">
    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
      {icon} {label}
    </label>
    <div className="relative group">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
      />
      {unit && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 select-none">
          {unit}
        </span>
      )}
    </div>
  </div>
);

export const PreConsultationScreen: React.FC<PreConsultationScreenProps> = (props) => {
  const {
    patientInfo, onPatientInfoChange, vitals, onVitalsChange, preliminaryNotes, 
    onPreliminaryNotesChange, medicalHistory, onMedicalHistoryChange, onGenerateTriageReport, 
    isGeneratingTriage, intakeRecordingStatus, onToggleIntakeRecording, isProcessingIntake, 
    intakeTranscriptionTurns, currentIntakeTranscription, aiService, doctorName, onBack
  } = props;

  const isRecording = intakeRecordingStatus !== 'idle';
  const fieldsDisabled = isRecording || isProcessingIntake;
  const anyData = Object.values(patientInfo).some(v => v) || Object.values(vitals).some(v => v) || preliminaryNotes || medicalHistory;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <ErrorFeedback message={props.error} onDismiss={() => props.onError?.(null)} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-white">Clinical Intake</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Patient: <span className="font-bold text-slate-700 dark:text-slate-200">{patientInfo.name || 'Anonymous'}</span> • Assigned to <span className="font-bold text-blue-600 dark:text-blue-400">{doctorName}</span></p>
        </div>
        <button onClick={onBack} className="flex items-center gap-2 h-11 px-5 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition-all">
          <ArrowLeft size={18} /> Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12 space-y-8">
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 flex flex-col items-center gap-6 shadow-xl shadow-slate-200/50 dark:shadow-none">
             <div className="text-center space-y-2">
               <h3 className="text-lg font-bold text-slate-900 dark:text-white">{isRecording ? "Listening to Patient Detail..." : "Audio Clinical Intake"}</h3>
               <p className="text-sm text-slate-500">Enable AI-assisted data extraction for vitals and history</p>
             </div>
             <RecordButton 
               status={intakeRecordingStatus} 
               onClick={onToggleIntakeRecording} 
               disabled={isProcessingIntake}
               recordingText="Complete Intake"
               tooltipText={isRecording ? "Stop and extract medical data" : "Start spoken intake"}
             />
             <TranscriptionDisplay 
                turns={intakeTranscriptionTurns} 
                currentTranscription={currentIntakeTranscription} 
                isRecording={isRecording}
                aiService={aiService}
                onTurnsChange={props.onIntakeTurnsChange}
                onClearCurrentTranscription={props.onClearIntakeTranscription}
             />
             {isProcessingIntake && (
                <div className="flex items-center gap-3 px-6 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl font-bold italic animate-pulse">
                   <Activity size={18} className="animate-spin" />
                   Extracting Clinical Indicators...
                </div>
             )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"><User size={20}/></div>
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">Patient Identity</h4>
              </div>
              <div className="grid gap-4">
                <InputField label="Full Name" icon={<User size={12}/>} value={patientInfo.name} onChange={v => onPatientInfoChange({...patientInfo, name: v})} placeholder="Full legal name" disabled={fieldsDisabled} />
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Age" icon={<Activity size={12}/>} value={patientInfo.age} onChange={v => onPatientInfoChange({...patientInfo, age: v})} placeholder="Years" disabled={fieldsDisabled} />
                  <InputField label="Sex" icon={<Users size={12}/>} value={patientInfo.gender} onChange={v => onPatientInfoChange({...patientInfo, gender: v})} placeholder="M/F/O" disabled={fieldsDisabled} />
                </div>
                <InputField label="Contact" icon={<Phone size={12}/>} value={patientInfo.phone} onChange={v => onPatientInfoChange({...patientInfo, phone: v})} placeholder="+1 (555) 000-0000" disabled={fieldsDisabled} />
              </div>
            </section>

            <section className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-6">
               <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"><Heart size={20}/></div>
                <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">Vital Statistics</h4>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <InputField label="BP" icon={<Activity size={12}/>} value={vitals.bp} onChange={v => onVitalsChange({...vitals, bp: v})} placeholder="120/80" unit="mmHg" disabled={fieldsDisabled} />
                  <InputField label="Pulse" icon={<Activity size={12}/>} value={vitals.pulse} onChange={v => onVitalsChange({...vitals, pulse: v})} placeholder="72" unit="bpm" disabled={fieldsDisabled} />
                  <InputField label="SpO2" icon={<Activity size={12}/>} value={vitals.spo2} onChange={v => onVitalsChange({...vitals, spo2: v})} placeholder="98" unit="%" disabled={fieldsDisabled} />
                  <InputField label="Temp" icon={<Thermometer size={12}/>} value={vitals.temp} onChange={v => onVitalsChange({...vitals, temp: v})} placeholder="98.6" unit="°F" disabled={fieldsDisabled} />
                  <InputField label="Weight" icon={<Weight size={12}/>} value={vitals.weight} onChange={v => onVitalsChange({...vitals, weight: v})} placeholder="70" unit="kg" disabled={fieldsDisabled} />
                  <InputField label="Glucose" icon={<Droplet size={12}/>} value={vitals.glucose} onChange={v => onVitalsChange({...vitals, glucose: v})} placeholder="140" unit="mg/dL" disabled={fieldsDisabled} />
               </div>
            </section>
          </div>

          <section className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 space-y-6">
             <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Stethoscope size={14}/> Chief Complaint & Preliminary Notes
                </div>
                <textarea
                  value={preliminaryNotes}
                  onChange={e => onPreliminaryNotesChange(e.target.value)}
                  disabled={fieldsDisabled}
                  rows={4}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Patient reports acute lower back pain persisting for 3 days..."
                />
             </div>
             <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <ClipboardList size={14}/> Pertinent Medical History
                </div>
                <textarea
                  value={medicalHistory}
                  onChange={e => onMedicalHistoryChange(e.target.value)}
                  disabled={fieldsDisabled}
                  rows={4}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Known allergies to Penicillin, history of hypertension..."
                />
             </div>
          </section>

          <div className="flex justify-center pt-8">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onGenerateTriageReport}
              disabled={isGeneratingTriage || isRecording || isProcessingIntake || !anyData}
              className="group relative h-16 px-12 bg-blue-600 rounded-2xl font-display font-bold text-white shadow-xl shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl" />
              <div className="relative flex items-center gap-3">
                {isGeneratingTriage ? <Activity className="animate-spin" /> : <ClipboardList size={20} />}
                {isGeneratingTriage ? 'Compiling Triage Report...' : 'Finalize & Review'}
              </div>
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};
;