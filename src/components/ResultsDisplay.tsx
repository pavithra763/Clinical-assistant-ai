import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CorrectionInput } from './CorrectionInput';
import { Tooltip } from './Tooltip';
import { ErrorFeedback } from './ErrorFeedback';
import { downloadAsFile, downloadAsPdf } from '../utils/exportUtils';
import type { PrescriptionDetails } from '../types';
import { decode, decodeAudioData } from '../utils/audioUtils';
import type { AIService } from '../services/aiService';
import { 
  FileText, 
  Clipboard, 
  Pill, 
  ThumbsUp, 
  ThumbsDown, 
  Download, 
  User, 
  Hospital, 
  Syringe, 
  Beaker, 
  HeartPulse, 
  Volume2, 
  Square, 
  Languages,
  Share2,
  ChevronDown
} from 'lucide-react';

interface ResultsDisplayProps {
  englishTranscript: string;
  summary: string;
  prescriptionDetails: PrescriptionDetails | null;
  detectedLanguages: string;
  isLoading: boolean;
  correctionTarget: keyof PrescriptionDetails | null;
  isMicRecordingForCorrection: boolean;
  isProcessingCorrection: boolean;
  currentCorrectionText: string;
  onCorrectionTextChange: (text: string) => void;
  onStartCorrection: (sectionKey: keyof PrescriptionDetails) => void;
  onCorrectionAction: () => void;
  summaryFeedback: 'up' | 'down' | null;
  onSummaryFeedback: (feedback: 'up' | 'down' | null) => void;
  prescriptionFeedback: { [key in keyof PrescriptionDetails]?: 'up' | 'down' };
  onPrescriptionFeedback: (sectionKey: keyof PrescriptionDetails, feedback: 'up' | 'down') => void;
  onShare: (target: 'pharmacy' | 'nursing' | 'patient') => void;
  onNewConsultation: () => void;
  doctorName: string;
  clinicName: string;
  clinicAddress: string;
  dateTimeFormat: string;
  aiService: AIService | null;
  error?: string | null;
  onError?: (msg: string | null) => void;
}

const MiniSpinner: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`w-5 h-5 border-2 border-slate-300 dark:border-slate-600 border-t-blue-500 rounded-full animate-spin ${className}`} />
);

const LoadingSpinner: React.FC<{ text: string }> = ({ text }) => (
  <div role="status" className="flex flex-col items-center justify-center p-12 space-y-6">
    <div className="relative">
      <div className="w-20 h-20 border-4 border-blue-100 rounded-full dark:border-blue-900/30"></div>
      <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-blue-600 rounded-full animate-spin"></div>
    </div>
    <div className="text-center">
      <p className="text-xl font-bold text-slate-900 dark:text-white">{text}</p>
      <p className="text-slate-500 text-sm mt-1">Applying medical context & summarizing...</p>
    </div>
  </div>
);

const ResultCard: React.FC<{ title: string; icon: React.ReactNode; content: string; children?: React.ReactNode; isScrollable?: boolean }> = ({ title, icon, content, children, isScrollable }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="group relative bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 transition-all hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none"
  >
    <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              {icon}
            </div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h4>
        </div>
        <div className="flex items-center gap-2">{children}</div>
    </div>
    <div className={`prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed ${isScrollable ? 'max-h-96 overflow-y-auto pr-2' : ''}`}>
        {content}
    </div>
  </motion.div>
);

const VoiceFeedbackButton: React.FC<{
  sectionKey: string;
  audioState: { sectionKey: string | null; status: 'idle' | 'loading' | 'playing' | 'error' };
  onClick: () => void;
  disabled: boolean;
}> = ({ sectionKey, audioState, onClick, disabled }) => {
    const isThisSectionActive = audioState.sectionKey === sectionKey;
    
    return (
        <Tooltip text={isThisSectionActive && audioState.status === 'playing' ? "Stop playback" : "Read aloud"}>
            <button
                onClick={onClick}
                disabled={disabled || (isThisSectionActive && audioState.status === 'loading')}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all ${isThisSectionActive && audioState.status === 'playing' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}
            >
                {isThisSectionActive && audioState.status === 'loading' ? <MiniSpinner /> : (isThisSectionActive && audioState.status === 'playing' ? <Square size={16} /> : <Volume2 size={18} />)}
            </button>
        </Tooltip>
    );
};

export const ResultsDisplay: React.FC<ResultsDisplayProps> = (props) => {
  const { 
    englishTranscript, summary, prescriptionDetails, detectedLanguages, isLoading, 
    correctionTarget, isMicRecordingForCorrection, isProcessingCorrection, currentCorrectionText,
    onCorrectionTextChange, onStartCorrection, onCorrectionAction, summaryFeedback, onSummaryFeedback,
    prescriptionFeedback, onPrescriptionFeedback, onShare, onNewConsultation, doctorName,
    clinicName, clinicAddress, dateTimeFormat, aiService 
  } = props;

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [audioState, setAudioState] = useState<{ sectionKey: string | null; status: 'idle' | 'loading' | 'playing' | 'error' }>({ sectionKey: null, status: 'idle' });
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
        if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setIsExportMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const stopCurrentAudio = () => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
    setAudioState({ sectionKey: null, status: 'idle' });
  };

  const handlePlayAudio = async (sectionKey: string, textToRead: string) => {
    if (audioState.sectionKey === sectionKey && audioState.status === 'playing') {
      stopCurrentAudio();
      return;
    }
    stopCurrentAudio();
    if (!aiService) return;
    setAudioState({ sectionKey, status: 'loading' });

    try {
      const base64Audio = await aiService.generateSpeech(textToRead);
      if (!base64Audio) throw new Error("No audio data");
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const audioContext = audioContextRef.current;
      const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();
      audioSourceRef.current = source;
      setAudioState({ sectionKey, status: 'playing' });
      source.onended = () => { if (audioSourceRef.current === source) stopCurrentAudio(); };
    } catch (err) {
      console.error("Audio failed:", err);
      setAudioState({ sectionKey, status: 'error' });
      setTimeout(() => setAudioState({ sectionKey: null, status: 'idle'}), 3000);
    }
  };

  const handleExport = (type: 'transcript' | 'summary' | 'prescription' | 'all' | 'pdf') => {
    const timestamp = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
    if (type === 'pdf') {
        const px = prescriptionDetails ? Object.entries(prescriptionDetails)
            .filter(([, v]) => typeof v === 'string' && v && v !== 'Not mentioned.')
            .map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1').toUpperCase()}\n\n${v}`).join('\n\n---\n\n') : '';
        downloadAsPdf(`report-${timestamp}.pdf`, summary, px, doctorName, clinicName, clinicAddress, dateTimeFormat);
    } else {
        const contentMap = {
            transcript: englishTranscript,
            summary: summary,
            prescription: prescriptionDetails ? Object.entries(prescriptionDetails).map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1').toUpperCase()}\n---\n${v}`).join('\n\n') : '',
            all: `# Clinical Report\n\n## Transcript\n${englishTranscript}\n\n## Summary\n${summary}`
        };
        downloadAsFile(`${type}-${timestamp}.${type === 'all' ? 'md' : 'txt'}`, contentMap[type as keyof typeof contentMap]);
    }
    setIsExportMenuOpen(false);
  };

  if (isLoading) return <LoadingSpinner text="Clinical AI Synthesis..." />;
  if (!englishTranscript && !summary && !prescriptionDetails) return null;

  const isActionDisabled = !!correctionTarget || isProcessingCorrection;
  
  const prescriptionSections: { [key in keyof PrescriptionDetails]: { title: string; icon: React.ReactNode; } } = {
      medicationPrescription: { title: 'Prescription', icon: <Pill size={20} /> },
      injections: { title: 'Injections', icon: <Syringe size={20} /> },
      therapeuticServices: { title: 'Therapeutic Services', icon: <Clipboard size={20} /> },
      laboratoryServices: { title: 'Lab Services', icon: <Beaker size={20} /> },
      diagnosticImaging: { title: 'Imaging (X-Ray/CT)', icon: <FileText size={20} /> },
      cardioPulmonaryDiagnostics: { title: 'Cardiopulmonary', icon: <HeartPulse size={20} /> },
      minorProcedures: { title: 'Minor Procedures', icon: <Clipboard size={20} /> },
      preventiveSupportServices: { title: 'Preventive', icon: <Clipboard size={20} /> },
      homeHealthcare: { title: 'Home Care', icon: <Clipboard size={20} /> },
      admissionNotes: { title: 'Admission Notes', icon: <FileText size={20} /> }
  };

  return (
    <div className="space-y-8">
       <ErrorFeedback message={props.error} onDismiss={() => props.onError?.(null)} />
       <div className="flex items-center justify-between">
         <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-white">Clinical Assessment</h3>
         <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase dark:bg-blue-900/20 dark:text-blue-400">
           <Languages size={14} />
           {detectedLanguages || 'English'}
         </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-6">
                {englishTranscript && <ResultCard icon={<FileText size={22} />} title="Transcription Record" content={englishTranscript} isScrollable={true} />}
            </div>
            
            <div className="lg:col-span-5 space-y-6">
                {summary && (
                    <ResultCard icon={<Clipboard size={22} />} title="Executive Summary" content={summary}>
                        <div className="flex items-center gap-2">
                            <VoiceFeedbackButton sectionKey="summary" audioState={audioState} onClick={() => handlePlayAudio('summary', summary)} disabled={!aiService || isActionDisabled} />
                            <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1" />
                            <Tooltip text={summaryFeedback === 'up' ? "Undo like" : "Helpful"}>
                                <button onClick={() => onSummaryFeedback(summaryFeedback === 'up' ? null : 'up')} className={`h-9 w-9 flex items-center justify-center rounded-lg transition-all ${summaryFeedback === 'up' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-none' : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 dark:bg-slate-800'}`}>
                                    <ThumbsUp size={16} />
                                </button>
                            </Tooltip>
                            <Tooltip text={summaryFeedback === 'down' ? "Undo dislike" : "Not helpful"}>
                                <button onClick={() => onSummaryFeedback(summaryFeedback === 'down' ? null : 'down')} className={`h-9 w-9 flex items-center justify-center rounded-lg transition-all ${summaryFeedback === 'down' ? 'bg-rose-600 text-white shadow-lg shadow-rose-200 dark:shadow-none' : 'bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800'}`}>
                                    <ThumbsDown size={16} />
                                </button>
                            </Tooltip>
                        </div>
                    </ResultCard>
                )}

                {prescriptionDetails && Object.entries(prescriptionDetails).map(([key, value]) => {
                    const sectionKey = key as keyof PrescriptionDetails;
                    if (typeof value !== 'string' || !value || value.trim() === 'Not mentioned.') return null;
                    const config = prescriptionSections[sectionKey];
                    if (!config) return null;

                    return (
                        <div key={key} className="space-y-4">
                            <ResultCard icon={config.icon} title={config.title} content={value}>
                                 <div className="flex items-center gap-2">
                                    <VoiceFeedbackButton sectionKey={sectionKey} audioState={audioState} onClick={() => handlePlayAudio(sectionKey, value)} disabled={!aiService || isActionDisabled} />
                                    <button onClick={() => onStartCorrection(sectionKey)} disabled={isActionDisabled} className="h-9 px-4 text-xs font-bold uppercase tracking-wider text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30 dark:hover:bg-blue-900/20">Correct</button>
                                </div>
                            </ResultCard>
                            {correctionTarget === sectionKey && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2 overflow-hidden">
                                    <CorrectionInput id={`c-${key}`} isCorrecting={isMicRecordingForCorrection} isProcessing={isProcessingCorrection} currentText={currentCorrectionText} onTextChange={onCorrectionTextChange} onToggleRecord={onCorrectionAction} />
                                </motion.div>
                            )}
                        </div>
                    );
                })}
            </div>
       </div>

       <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 border-t border-slate-200 dark:border-slate-800">
            <button onClick={onNewConsultation} className="w-full sm:w-auto h-12 px-8 rounded-xl bg-slate-200 text-slate-900 font-bold hover:bg-slate-300 transition-all dark:bg-slate-800 dark:text-white">Dismiss & Next</button>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative" ref={exportMenuRef}>
                    <button onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} className="flex items-center gap-2 h-12 px-6 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all dark:bg-slate-100 dark:text-slate-950">
                        <Download size={18} />
                        Export Report
                        <ChevronDown size={14} />
                    </button>
                    <AnimatePresence>
                        {isExportMenuOpen && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full right-0 mb-3 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50">
                                {['pdf', 'all', 'transcript', 'summary', 'prescription'].map((t) => (
                                    <button key={t} onClick={() => handleExport(t as any)} className="w-full text-left px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors uppercase tracking-wide">
                                        Export as {t === 'pdf' ? 'Professional PDF' : t}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex items-center gap-2">
                    {[
                        { t: 'patient' as const, label: 'Patient', icon: <User size={18} />, color: 'bg-emerald-600' },
                        { t: 'nursing' as const, label: 'Nurse', icon: <Hospital size={18} />, color: 'bg-blue-600' },
                        { t: 'pharmacy' as const, label: 'Pharma', icon: <Pill size={18} />, color: 'bg-indigo-600' }
                    ].map(btn => (
                        <Tooltip key={btn.t} text={`Share with ${btn.label}`}>
                            <button onClick={() => onShare(btn.t)} className={`h-12 w-12 flex items-center justify-center rounded-xl text-white shadow-lg transition-all hover:-translate-y-1 active:translate-y-0 ${btn.color}`}>
                                {btn.icon}
                            </button>
                        </Tooltip>
                    ))}
                </div>
            </div>
       </div>
    </div>
  );
};
