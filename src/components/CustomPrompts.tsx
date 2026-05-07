import React, { useState } from 'react';
import type { Prompts } from '../prompts/defaultPrompts';
import { defaultPrompts } from '../prompts/defaultPrompts';
import { ChevronDownIcon, ChevronUpIcon } from '../constants/icons';

interface CustomPromptsProps {
  prompts: Prompts;
  onPromptsChange: (newPrompts: Prompts) => void;
  disabled: boolean;
}

const PromptTextarea: React.FC<{ label: string; value: string; onChange: (value: string) => void; disabled: boolean }> = ({ label, value, onChange, disabled }) => {
    const id = React.useId();
    const descriptionId = `${id}-description`;

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
            <p id={descriptionId} className="text-xs text-slate-500 dark:text-slate-400 mb-2">You can use placeholders like <code className="bg-slate-200 dark:bg-slate-600 px-1 py-0.5 rounded text-xs">{`\${transcript}`}</code> which will be replaced automatically.</p>
            <textarea
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                rows={6}
                className="w-full p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-sm"
                aria-describedby={descriptionId}
            />
        </div>
    );
};

export const CustomPrompts: React.FC<CustomPromptsProps> = ({ prompts, onPromptsChange, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleReset = () => {
        onPromptsChange(defaultPrompts);
    };
    
    const handlePromptChange = (promptKey: keyof Prompts, value: string) => {
        onPromptsChange({ ...prompts, [promptKey]: value });
    };

    return (
        <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
                aria-expanded={isOpen}
            >
                <span>Customize AI Prompts</span>
                {isOpen ? <ChevronUpIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" /> : <ChevronDownIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />}
            </button>
            {isOpen && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-6">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Modify the instructions sent to the AI to customize its behavior. Be careful, as changes can significantly affect the results.
                    </p>
                    <PromptTextarea
                        label="Live Transcription System Instruction"
                        value={prompts.liveSystemInstruction}
                        onChange={(val) => handlePromptChange('liveSystemInstruction', val)}
                        disabled={disabled}
                    />
                    <PromptTextarea
                        label="Transcript Polishing Prompt Template"
                        value={prompts.englishTranscriptPromptTemplate}
                        onChange={(val) => handlePromptChange('englishTranscriptPromptTemplate', val)}
                        disabled={disabled}
                    />
                    <PromptTextarea
                        label="Summary Generation Prompt Template"
                        value={prompts.summaryPromptTemplate}
                        onChange={(val) => handlePromptChange('summaryPromptTemplate', val)}
                        disabled={disabled}
                    />
                    <PromptTextarea
                        label="Prescription Extraction Prompt Template"
                        value={prompts.prescriptionPromptTemplate}
                        onChange={(val) => handlePromptChange('prescriptionPromptTemplate', val)}
                        disabled={disabled}
                    />
                    <PromptTextarea
                        label="Correction Prompt Template"
                        value={prompts.correctionPromptTemplate}
                        onChange={(val) => handlePromptChange('correctionPromptTemplate', val)}
                        disabled={disabled}
                    />
                    <PromptTextarea
                        label="Nurse Triage Report Prompt Template"
                        value={prompts.nurseTriageReportPromptTemplate}
                        onChange={(val) => handlePromptChange('nurseTriageReportPromptTemplate', val)}
                        disabled={disabled}
                    />
                    <PromptTextarea
                        label="Intake Data Extraction Prompt Template"
                        value={prompts.intakeDataExtractionPromptTemplate}
                        onChange={(val) => handlePromptChange('intakeDataExtractionPromptTemplate', val)}
                        disabled={disabled}
                    />
                    <PromptTextarea
                        label="Appointment Extraction Prompt Template"
                        value={prompts.appointmentExtractionPromptTemplate}
                        onChange={(val) => handlePromptChange('appointmentExtractionPromptTemplate', val)}
                        disabled={disabled}
                    />
                    <PromptTextarea
                        label="Conversational Booking System Prompt"
                        value={prompts.conversationalBookingSystemPrompt}
                        onChange={(val) => handlePromptChange('conversationalBookingSystemPrompt', val)}
                        disabled={disabled}
                    />
                    <div className="flex justify-end">
                        <button
                            onClick={handleReset}
                            disabled={disabled}
                            className="text-sm bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500"
                        >
                            Reset to Defaults
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};