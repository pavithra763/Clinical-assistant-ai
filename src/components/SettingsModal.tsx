import React, { useState, useEffect } from 'react';
import type { AIProvider, AIProviderSettings, EhrSettings } from '../types';

export interface ReminderSettings {
    enabled: boolean;
    intervals: number[]; // in hours, e.g., [24, 1]
}

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (
        pharmacyNumber: string, 
        nursingStationNumber: string,
        patientNumber: string,
        clinicName: string,
        clinicAddress: string,
        dateTimeFormat: string,
        aiSettings: AIProviderSettings,
        whatsAppNumber: string,
        whatsAppToken: string,
        departmentContacts: { [key: string]: string },
        reminderSettings: ReminderSettings,
        ehrSettings: EhrSettings
    ) => void;
    initialPharmacyNumber: string;
    initialNursingStationNumber: string;
    initialPatientNumber: string;
    initialClinicName: string;
    initialClinicAddress: string;
    initialDateTimeFormat: string;
    initialAiSettings: AIProviderSettings;
    initialWhatsAppNumber: string;
    initialWhatsAppToken: string;
    initialDepartmentContacts: { [key: string]: string };
    initialReminderSettings: ReminderSettings;
    initialEhrSettings: EhrSettings;
    currentTheme: 'light' | 'dark';
    onThemeChange: (theme: 'light' | 'dark') => void;
}

const CloseIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"></path>
    </svg>
);

const predefinedDateFormats: { label: string; value: string }[] = [
    { label: 'August 23, 2024, 3:45 PM', value: 'MMMM D, YYYY, hh:mm A' },
    { label: '2024-08-23 15:45', value: 'YYYY-MM-DD HH:mm' },
    { label: '23/08/2024 3:45 PM', value: 'DD/MM/YYYY hh:mm A' },
    { label: 'Custom...', value: 'custom' },
];

const departmentFields: { key: string; label: string }[] = [
    { key: 'laboratory', label: 'Laboratory Services' },
    { key: 'imaging', label: 'Diagnostic Imaging' },
    { key: 'cardiology', label: 'Cardiology Diagnostics' },
    { key: 'therapy', label: 'Therapeutic Services' },
    { key: 'homecare', label: 'Home Healthcare' },
    { key: 'admissions', label: 'Admissions Office' },
];

const reminderIntervalOptions = [
    { value: 24, label: '24 hours before' },
    { value: 2, label: '2 hours before' },
    { value: 1, label: '1 hour before' },
    { value: 0.25, label: '15 minutes before' },
];

const TechnicalGuide: React.FC = () => (
    <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-lg p-4 space-y-4 prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-headings:text-slate-700 dark:prose-headings:text-slate-300 prose-code:bg-slate-200 dark:prose-code:bg-slate-600 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
        <h4>Production Integration Guide</h4>
        <p>To enable appointment booking via a real WhatsApp number, you must create a backend service to act as a bridge between the WhatsApp API and this application's AI logic. The "Process WhatsApp Booking" feature on the dashboard simulates this entire backend flow.</p>
        
        <h5>Architecture Overview</h5>
        <p>The data flows as follows:</p>
        <p><code>Patient's WhatsApp → Twilio → Your Backend Webhook → AI Service → Booking Logic → Twilio → Patient's WhatsApp</code></p>
    </div>
);


export const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, 
    onClose, 
    onSave, 
    initialPharmacyNumber, 
    initialNursingStationNumber,
    initialPatientNumber,
    initialClinicName,
    initialClinicAddress,
    initialDateTimeFormat,
    initialAiSettings,
    initialWhatsAppNumber,
    initialWhatsAppToken,
    initialDepartmentContacts,
    initialReminderSettings,
    initialEhrSettings,
    currentTheme, 
    onThemeChange 
}) => {
    // Local state for all form fields
    const [pharmacyNumber, setPharmacyNumber] = useState('');
    const [nursingStationNumber, setNursingStationNumber] = useState('');
    const [patientNumber, setPatientNumber] = useState('');
    const [clinicName, setClinicName] = useState('');
    const [clinicAddress, setClinicAddress] = useState('');
    const [selectedFormat, setSelectedFormat] = useState('');
    const [customFormat, setCustomFormat] = useState('');
    const [aiSettings, setAiSettings] = useState<AIProviderSettings>({ provider: 'gemini' });
    const [whatsAppNumber, setWhatsAppNumber] = useState('');
    const [whatsAppToken, setWhatsAppToken] = useState('');
    const [departmentContacts, setDepartmentContacts] = useState<{ [key: string]: string }>({});
    const [reminderSettings, setReminderSettings] = useState<ReminderSettings>({ enabled: false, intervals: [] });
    const [ehrSettings, setEhrSettings] = useState<EhrSettings>({ enabled: false, provider: 'generic-fhir', apiUrl: '', apiKey: '', autoPushData: false });

    // When the modal opens, synchronize its internal state with the props from App.tsx.
    useEffect(() => {
        if (isOpen) {
            setPharmacyNumber(initialPharmacyNumber);
            setNursingStationNumber(initialNursingStationNumber);
            setPatientNumber(initialPatientNumber);
            setClinicName(initialClinicName);
            setClinicAddress(initialClinicAddress);
            setAiSettings(initialAiSettings);
            setWhatsAppNumber(initialWhatsAppNumber);
            setWhatsAppToken(initialWhatsAppToken);
            setDepartmentContacts(initialDepartmentContacts || {});
            setReminderSettings(initialReminderSettings || { enabled: false, intervals: [24, 1] });
            setEhrSettings(initialEhrSettings || { enabled: false, provider: 'generic-fhir', apiUrl: '', apiKey: '', autoPushData: false });
            
            const isPredefined = predefinedDateFormats.some(f => f.value === initialDateTimeFormat);
            if (isPredefined) {
                setSelectedFormat(initialDateTimeFormat);
                setCustomFormat('');
            } else {
                setSelectedFormat('custom');
                setCustomFormat(initialDateTimeFormat);
            }
        }
    }, [isOpen, initialPharmacyNumber, initialNursingStationNumber, initialPatientNumber, initialClinicName, initialClinicAddress, initialDateTimeFormat, initialAiSettings, initialWhatsAppNumber, initialWhatsAppToken, initialDepartmentContacts, initialReminderSettings]);

    if (!isOpen) {
        return null;
    }

    const handleSave = () => {
        const formatToSave = selectedFormat === 'custom' ? customFormat : selectedFormat;
        const fullDepartmentContacts = { ...departmentContacts, nursing: nursingStationNumber };
        onSave(pharmacyNumber, nursingStationNumber, patientNumber, clinicName, clinicAddress, formatToSave, aiSettings, whatsAppNumber, whatsAppToken, fullDepartmentContacts, reminderSettings, ehrSettings);
    };

    const handleThemeToggle = () => {
        onThemeChange(currentTheme === 'light' ? 'dark' : 'light');
    };
    
    const handleAiSettingChange = (key: keyof AIProviderSettings, value: AIProviderSettings[keyof AIProviderSettings]) => {
        if (key === 'provider') {
            setAiSettings({ provider: value as AIProvider });
        } else {
            setAiSettings(prev => ({ ...prev, [key]: value }));
        }
    };

    const handleDepartmentContactChange = (key: string, value: string) => {
        setDepartmentContacts(prev => ({...prev, [key]: value}));
    };
    
    const handleReminderIntervalChange = (interval: number, checked: boolean) => {
        setReminderSettings(prev => {
            const newIntervals = new Set(prev.intervals);
            if (checked) {
                newIntervals.add(interval);
            } else {
                newIntervals.delete(interval);
            }
            return { ...prev, intervals: Array.from(newIntervals) };
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl m-4 max-h-[90vh] flex flex-col">
                <header className="flex justify-between items-center p-4 border-b dark:border-slate-700 flex-shrink-0">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Settings</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Close settings">
                        <CloseIcon className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                    </button>
                </header>
                <div className="p-6 space-y-6 overflow-y-auto">
                     {/* Clinic Info Section */}
                    <section>
                        <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 pb-2">Clinic Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                             <div>
                                <label htmlFor="clinic-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Clinic or Hospital Name</label>
                                <input type="text" id="clinic-name" value={clinicName} onChange={(e) => setClinicName(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm" placeholder="e.g., General Health Clinic"/>
                            </div>
                            <div>
                               <label htmlFor="clinic-address" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Address (Optional)</label>
                               <input type="text" id="clinic-address" value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm" placeholder="e.g., 123 Health St, Wellness City"/>
                           </div>
                        </div>
                    </section>

                    {/* Department Contacts Section */}
                     <section>
                        <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 pb-2">Department & Default Contacts</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                            <div>
                                <label htmlFor="nursing-station-number" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nursing Station WhatsApp</label>
                                <input type="tel" id="nursing-station-number" value={nursingStationNumber} onChange={(e) => setNursingStationNumber(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm" placeholder="+15557654321"/>
                            </div>
                            <div>
                                <label htmlFor="pharmacy-number" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Pharmacy WhatsApp</label>
                                <input type="tel" id="pharmacy-number" value={pharmacyNumber} onChange={(e) => setPharmacyNumber(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm" placeholder="+15551234567"/>
                            </div>
                             {departmentFields.map(field => (
                                <div key={field.key}>
                                    <label htmlFor={`contact-${field.key}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300">{field.label}</label>
                                    <input type="tel" id={`contact-${field.key}`} value={departmentContacts[field.key] || ''} onChange={(e) => handleDepartmentContactChange(field.key, e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm" placeholder="+1555..."/>
                                </div>
                             ))}
                            <div>
                                <label htmlFor="patient-number" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Patient/Caretaker WhatsApp (Default)</label>
                                <input type="tel" id="patient-number" value={patientNumber} onChange={(e) => setPatientNumber(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm" placeholder="+15559876543"/>
                            </div>
                        </div>
                    </section>
                    
                     {/* Automated Reminders Section */}
                    <section>
                        <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 pb-2">Automated Appointment Reminders</h3>
                        <div className="mt-4 space-y-4">
                            <div className="flex justify-between items-center">
                                <label htmlFor="reminder-enabled" className="block font-medium text-slate-700 dark:text-slate-300">Enable Reminders</label>
                                <button id="reminder-enabled" onClick={() => setReminderSettings(p => ({...p, enabled: !p.enabled}))} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 ${reminderSettings.enabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`} role="switch" aria-checked={reminderSettings.enabled}>
                                    <span className="sr-only">Toggle Reminders</span>
                                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${reminderSettings.enabled ? 'translate-x-6' : 'translate-x-1'}`}/>
                                </button>
                            </div>
                            <div className={`space-y-2 transition-opacity ${reminderSettings.enabled ? 'opacity-100' : 'opacity-50'}`}>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Send reminder at:</p>
                                {reminderIntervalOptions.map(option => (
                                    <div key={option.value} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id={`reminder-interval-${option.value}`}
                                            checked={reminderSettings.intervals.includes(option.value)}
                                            onChange={(e) => handleReminderIntervalChange(option.value, e.target.checked)}
                                            disabled={!reminderSettings.enabled}
                                            className="h-4 w-4 text-blue-600 border-slate-300 dark:border-slate-500 rounded focus:ring-blue-500"
                                        />
                                        <label htmlFor={`reminder-interval-${option.value}`} className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                                            {option.label}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* WhatsApp Integration Section */}
                    <section>
                        <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 pb-2 mb-4">WhatsApp Booking Integration (for Developers)</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="whatsapp-number" className="block text-sm font-medium text-slate-700 dark:text-slate-300">WhatsApp Business Phone Number (from Twilio)</label>
                                    <input type="tel" id="whatsapp-number" value={whatsAppNumber} onChange={(e) => setWhatsAppNumber(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., +15551234567"/>
                                </div>
                                <div>
                                    <label htmlFor="whatsapp-token" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Twilio Account SID / Auth Token</label>
                                    <input type="password" id="whatsapp-token" value={whatsAppToken} onChange={(e) => setWhatsAppToken(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500" placeholder="Paste your SID or token here"/>
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Enter your Twilio Account SID or Auth Token for your backend to use.</p>
                                </div>
                            </div>
                            <TechnicalGuide />
                        </div>
                    </section>
                    
                    {/* PDF & Export Section */}
                    <section>
                        <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 pb-2">PDF & Export Settings</h3>
                        <div>
                            <label htmlFor="date-format" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Date/Time Format</label>
                            <select id="date-format" value={selectedFormat} onChange={(e) => setSelectedFormat(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                               {predefinedDateFormats.map(f => (<option key={f.value} value={f.value}>{f.label}</option>))}
                            </select>
                        </div>
                        {selectedFormat === 'custom' && (
                            <div className="mt-4">
                                <label htmlFor="custom-date-format" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Custom Format</label>
                                <input type="text" id="custom-date-format" value={customFormat} onChange={(e) => setCustomFormat(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm" placeholder="e.g., YYYY-MM-DD"/>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Use tokens: YYYY, MMMM, MM, DD, D, HH, hh, mm, ss, A</p>
                            </div>
                        )}
                    </section>

                    {/* AI Provider Section */}
                    <section>
                        <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 pb-2">AI Provider</h3>
                        <div>
                            <label htmlFor="ai-provider" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Provider</label>
                            <select id="ai-provider" value={aiSettings.provider} onChange={(e) => handleAiSettingChange('provider', e.target.value as AIProvider)} className="mt-1 block w-full pl-3 pr-10 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                                <option value="gemini">Google Gemini</option>
                                <option value="self-hosted">Self-Hosted LLM</option>
                                <option value="other-cloud">Other Cloud LLM</option>
                            </select>
                        </div>
                        {aiSettings.provider === 'gemini' && (
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                                <div>
                                    <label htmlFor="temp" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Temperature ({aiSettings.temperature ?? 0.7})</label>
                                    <input type="range" id="temp" min="0" max="2" step="0.1" value={aiSettings.temperature ?? 0.7} onChange={(e) => handleAiSettingChange('temperature', parseFloat(e.target.value))} className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"/>
                                </div>
                                <div>
                                    <label htmlFor="top-p" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Top P ({aiSettings.topP ?? 0.9})</label>
                                    <input type="range" id="top-p" min="0" max="1" step="0.05" value={aiSettings.topP ?? 0.9} onChange={(e) => handleAiSettingChange('topP', parseFloat(e.target.value))} className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"/>
                                </div>
                                <div>
                                    <label htmlFor="max-tokens" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Max Tokens</label>
                                    <input type="number" id="max-tokens" value={aiSettings.maxTokens ?? 2048} onChange={(e) => handleAiSettingChange('maxTokens', parseInt(e.target.value))} className="mt-1 block w-full px-3 py-1 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md"/>
                                </div>
                                <div>
                                    <label htmlFor="ai-lang" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Interactive Language</label>
                                    <select id="ai-lang" value={aiSettings.preferredLanguage || 'English'} onChange={(e) => handleAiSettingChange('preferredLanguage', e.target.value)} className="mt-1 block w-full px-3 py-1 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md">
                                        <option value="English">English</option>
                                        <option value="Spanish">Spanish</option>
                                        <option value="French">French</option>
                                        <option value="Swahili">Swahili</option>
                                        <option value="Hindi">Hindi</option>
                                        <option value="Auto">Auto-Detect</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2 flex items-center gap-4">
                                     <div className="flex items-center">
                                        <input type="checkbox" id="medical-vocab" checked={aiSettings.enableMedicalVocabulary ?? true} onChange={(e) => handleAiSettingChange('enableMedicalVocabulary', e.target.checked)} className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500" />
                                        <label htmlFor="medical-vocab" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">Enhanced Medical Vocabulary</label>
                                     </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label htmlFor="wake-word" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Wake Word (Experimental)</label>
                                    <input type="text" id="wake-word" value={aiSettings.wakeWord || ''} onChange={(e) => handleAiSettingChange('wakeWord', e.target.value)} className="mt-1 block w-full px-3 py-1 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md" placeholder="e.g., 'Hello Clinic'"/>
                                </div>
                            </div>
                        )}
                        {aiSettings.provider === 'self-hosted' && (
                            <div className="mt-4 space-y-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                                <div>
                                    <label htmlFor="streaming-url" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Streaming URL (WebSocket)</label>
                                    <input type="text" id="streaming-url" value={aiSettings.streamingUrl || ''} onChange={(e) => handleAiSettingChange('streamingUrl', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-900 dark:text-slate-200" placeholder="ws://localhost:8080/transcribe"/>
                                </div>
                                <div>
                                    <label htmlFor="http-url" className="block text-sm font-medium text-slate-700 dark:text-slate-300">HTTP URL (REST API)</label>
                                    <input type="text" id="http-url" value={aiSettings.httpUrl || ''} onChange={(e) => handleAiSettingChange('httpUrl', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-slate-900 dark:text-slate-200" placeholder="http://localhost:11434/api/generate"/>
                                </div>
                            </div>
                        )}
                        {aiSettings.provider === 'other-cloud' && (
                           <div className="mt-4 space-y-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                                <div>
                                    <label htmlFor="cloud-streaming-url" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Streaming URL (WebSocket)</label>
                                    <input type="text" id="cloud-streaming-url" value={aiSettings.streamingUrl || ''} onChange={(e) => handleAiSettingChange('streamingUrl', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm" placeholder="wss://api.example.com/transcribe"/>
                                </div>
                                <div>
                                    <label htmlFor="cloud-http-url" className="block text-sm font-medium text-slate-700 dark:text-slate-300">HTTP URL (REST API)</label>
                                    <input type="text" id="cloud-http-url" value={aiSettings.httpUrl || ''} onChange={(e) => handleAiSettingChange('httpUrl', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm" placeholder="https://api.example.com/generate"/>
                                </div>
                                <div>
                                    <label htmlFor="cloud-api-key" className="block text-sm font-medium text-slate-700 dark:text-slate-300">API Key</label>
                                    <input type="password" id="cloud-api-key" value={aiSettings.cloudApiKey || ''} onChange={(e) => handleAiSettingChange('cloudApiKey', e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm" placeholder="Enter your API key"/>
                                </div>
                            </div>
                        )}
                    </section>
                    
                    {/* EHR Integration Section */}
                    <section>
                        <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-600 pb-2 mb-4">EHR / EMR Integration</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label htmlFor="ehr-enabled" className="block font-medium text-slate-700 dark:text-slate-300">Enable External EHR Integration</label>
                                <button id="ehr-enabled" onClick={() => setEhrSettings(p => ({...p, enabled: !p.enabled}))} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 ${ehrSettings.enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'}`} role="switch" aria-checked={ehrSettings.enabled}>
                                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${ehrSettings.enabled ? 'translate-x-6' : 'translate-x-1'}`}/>
                                </button>
                            </div>
                            {ehrSettings.enabled && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-emerald-50/30 dark:bg-emerald-900/10">
                                    <div>
                                        <label htmlFor="ehr-provider" className="block text-sm font-medium text-slate-700 dark:text-slate-300">EHR Provider</label>
                                        <select id="ehr-provider" value={ehrSettings.provider} onChange={(e) => setEhrSettings(p => ({...p, provider: e.target.value as any}))} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm">
                                            <option value="generic-fhir">Generic FHIR API</option>
                                            <option value="epic">Epic Systems</option>
                                            <option value="cerner">Oracle Cerner</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="ehr-url" className="block text-sm font-medium text-slate-700 dark:text-slate-300">API Endpoint URL</label>
                                        <input type="text" id="ehr-url" value={ehrSettings.apiUrl} onChange={(e) => setEhrSettings(p => ({...p, apiUrl: e.target.value}))} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm" placeholder="https://fhir-api.example.com/v4"/>
                                    </div>
                                    <div>
                                        <label htmlFor="ehr-key" className="block text-sm font-medium text-slate-700 dark:text-slate-300">API Key / Access Token</label>
                                        <input type="password" id="ehr-key" value={ehrSettings.apiKey} onChange={(e) => setEhrSettings(p => ({...p, apiKey: e.target.value}))} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm" placeholder="••••••••••••••••"/>
                                    </div>
                                    <div className="flex items-center h-full pt-6">
                                        <input type="checkbox" id="ehr-auto-push" checked={ehrSettings.autoPushData} onChange={(e) => setEhrSettings(p => ({...p, autoPushData: e.target.checked}))} className="h-4 w-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500" />
                                        <label htmlFor="ehr-auto-push" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">Auto-push data on consultation completion</label>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
                <footer className="flex justify-end items-center p-4 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-700 rounded-b-lg flex-shrink-0">
                    <button onClick={handleSave} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors duration-300 shadow-md">
                        Save Settings
                    </button>
                </footer>
            </div>
        </div>
    );
};