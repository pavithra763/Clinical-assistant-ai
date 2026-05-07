import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { AIService } from '../services/aiService';
import type { DoctorSchedule, Appointment, Doctor, PatientInfo } from '../types';
import type { Prompts } from '../prompts/defaultPrompts';
import type { RecordingControls, AppointmentRequest, ChatTurn } from '../services/aiService';
import { findAvailableSlot, generateAppointmentConfirmationMessage, sendWhatsAppMessage } from '../utils/scheduleUtils';
import { findOrCreatePatient } from '../utils/patientUtils';
import { CalendarIcon, MicrophoneIcon, StopIcon } from '../constants/icons';
import { ErrorFeedback } from './ErrorFeedback';

interface PatientBookingScreenProps {
    aiService: AIService | null;
    schedules: { [doctorId: string]: DoctorSchedule };
    appointments: Appointment[];
    doctors: Doctor[];
    onAppointmentsChange: (appointments: Appointment[]) => void;
    prompts: Prompts;
    onError: (message: string) => void;
    patients: PatientInfo[];
    onPatientsChange: (patients: PatientInfo[]) => void;
}

interface ChatMessage {
    sender: 'user' | 'bot';
    text: string;
    appointment?: Appointment;
    doctorName?: string;
}

const WhatsAppIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} viewBox="0 0 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zM12.04 20.13c-1.53 0-3.03-.4-4.36-1.15l-.31-.18-3.24.85.87-3.15-.2-.33c-.83-1.38-1.27-2.98-1.27-4.64 0-4.54 3.69-8.23 8.24-8.23 4.54 0 8.23 3.69 8.23 8.23 0 4.54-3.69 8.23-8.23 8.23zm4.52-6.14c-.25-.12-1.47-.73-1.7-.82-.22-.09-.38-.12-.54.12-.16.25-.64.82-.79.98-.14.16-.29.18-.54.06s-1.05-.39-2-1.23c-.74-.66-1.23-1.47-1.38-1.72s-.02-.38.11-.51c.11-.11.25-.29.38-.43s.16-.25.25-.42.04-.33-.02-.61c-.06-.29-.54-1.3-.74-1.78-.2-.48-.4-.42-.55-.42h-.53c-.16 0-.42.06-.64.31-.22.25-.86.85-.86 2.07s.88 2.4 1 2.56.86 1.39 2.09 2.02c.3.15.54.25.72.32.4.18.77.15 1.06.09.33-.06.97-.64 1.22-1.22.25-.58.25-1.08.18-1.22z"/></svg>
);

const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const BookingForm: React.FC<{
    doctors: Doctor[];
    onFormSubmit: (request: AppointmentRequest) => void;
    isProcessing: boolean;
    aiService: AIService | null;
    prompts: Prompts;
    onError: (msg: string) => void;
}> = ({ doctors, onFormSubmit, isProcessing, aiService, prompts, onError }) => {
    const [formData, setFormData] = useState<Omit<AppointmentRequest, 'patientAge' | 'patientGender'>>({
        patientName: '',
        patientPhone: '',
        requestedDoctor: '',
        requestedDate: getLocalDateString(new Date()),
        requestedTime: 'morning',
        reasonForVisit: '',
    });
    const [isVoiceFilling, setIsVoiceFilling] = useState(false);
    const [voiceTranscription, setVoiceTranscription] = useState('');
    const recordingControlsRef = useRef<RecordingControls | null>(null);

    const handleToggleVoiceFill = async () => {
        if (isVoiceFilling) {
            recordingControlsRef.current?.stop();
            return;
        }

        if (!aiService) return;

        setIsVoiceFilling(true);
        setVoiceTranscription('');
        let fullVoiceTranscript = '';

        try {
            const controls = await aiService.startLiveSession({
                onTranscriptionUpdate: text => setVoiceTranscription(text),
                onTurnComplete: turn => { if (turn.text.trim()) fullVoiceTranscript += turn.text + ' ' },
                onError: err => {
                    onError(err);
                    setIsVoiceFilling(false);
                }
            }, "Extract appointment details: Name, Phone, Doctor, Date, Time, Reason.", { bypassWakeWord: true });

            recordingControlsRef.current = {
                ...controls,
                stop: async () => {
                    controls.stop();
                    setIsVoiceFilling(false);
                    recordingControlsRef.current = null;
                    const finalTranscript = (fullVoiceTranscript + voiceTranscription).trim();
                    setVoiceTranscription('');

                    if (finalTranscript) {
                        try {
                            const details = await aiService.extractAppointmentDetails(finalTranscript, prompts.appointmentExtractionPromptTemplate);
                            setFormData(prev => ({
                                ...prev,
                                patientName: details.patientName || prev.patientName,
                                patientPhone: details.patientPhone || prev.patientPhone,
                                requestedDoctor: details.requestedDoctor || prev.requestedDoctor,
                                requestedDate: details.requestedDate || prev.requestedDate,
                                requestedTime: details.requestedTime || prev.requestedTime,
                                reasonForVisit: details.reasonForVisit || prev.reasonForVisit,
                            }));
                        } catch (e) {
                            console.error("Voice fill extraction failed", e);
                        }
                    }
                }
            };
        } catch (e) {
            setIsVoiceFilling(false);
            console.error("Failed to start voice fill", e);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onFormSubmit(formData as AppointmentRequest);
    };
    
    const inputClasses = "mt-1 block w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm";

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 text-slate-800 dark:text-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="patientName" className="text-sm font-medium">Full Name</label>
                    <input type="text" name="patientName" id="patientName" value={formData.patientName} onChange={handleChange} className={inputClasses} required />
                </div>
                <div>
                    <label htmlFor="patientPhone" className="text-sm font-medium">Phone Number</label>
                    <input type="tel" name="patientPhone" id="patientPhone" value={formData.patientPhone} onChange={handleChange} className={inputClasses} required />
                </div>
                <div>
                    <label htmlFor="requestedDoctor" className="text-sm font-medium">Doctor/Specialty</label>
                    <select name="requestedDoctor" id="requestedDoctor" value={formData.requestedDoctor} onChange={handleChange} className={inputClasses}>
                        <option value="">Any Available Doctor</option>
                        {doctors.filter(d => d.isAvailable).map(doc => (
                            <option key={doc.id} value={doc.name}>{doc.name} ({doc.specialty})</option>
                        ))}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label htmlFor="requestedDate" className="text-sm font-medium">Date</label>
                        <input type="date" name="requestedDate" id="requestedDate" value={formData.requestedDate} onChange={handleChange} className={inputClasses} min={getLocalDateString(new Date())} required />
                    </div>
                    <div>
                        <label htmlFor="requestedTime" className="text-sm font-medium">Time</label>
                        <select name="requestedTime" id="requestedTime" value={formData.requestedTime} onChange={handleChange} className={inputClasses}>
                            <option value="morning">Morning (8am-12pm)</option>
                            <option value="afternoon">Afternoon (12pm-5pm)</option>
                            <option value="evening">Evening (5pm-9pm)</option>
                        </select>
                    </div>
                </div>
            </div>
            <div>
                <label htmlFor="reasonForVisit" className="text-sm font-medium">Reason for Visit</label>
                <textarea name="reasonForVisit" id="reasonForVisit" value={formData.reasonForVisit} onChange={handleChange} rows={3} className={inputClasses} />
            </div>
            <div className="flex gap-2">
                <button type="button" onClick={handleToggleVoiceFill} className={`flex-1 flex justify-center items-center gap-2 py-3 px-4 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-medium transition-all ${isVoiceFilling ? 'bg-red-500 text-white animate-pulse' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                    {isVoiceFilling ? <StopIcon className="w-5 h-5" /> : <MicrophoneIcon className="w-5 h-5" />}
                    {isVoiceFilling ? (voiceTranscription || 'Listening...') : 'Fill via Voice'}
                </button>
                <button type="submit" disabled={isProcessing || isVoiceFilling} className="flex-[2] flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all">
                    <CalendarIcon className="w-5 h-5" />
                    {isProcessing ? 'Finding Slot...' : 'Find & Book Appointment'}
                </button>
            </div>
        </form>
    );
};

export const PatientBookingScreen: React.FC<PatientBookingScreenProps> = ({ aiService, schedules, appointments, doctors, onAppointmentsChange, prompts, onError, patients, onPatientsChange }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [bookingMode, setBookingMode] = useState<'chat' | 'form'>('chat');
    const [textInput, setTextInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording'>('idle');
    const [currentTranscription, setCurrentTranscription] = useState('');
    const [localError, setLocalError] = useState<string | null>(null);

    const recordingControlsRef = useRef<RecordingControls | null>(null);
    const chatContainerRef = useRef<HTMLDivElement | null>(null);
    const fullTranscriptRef = useRef('');
    const currentTranscriptionRef = useRef('');

    const addMessage = useCallback((sender: 'user' | 'bot', text: string, appointment?: Appointment, doctorName?: string) => {
        setMessages(prev => [...prev, { sender, text, appointment, doctorName }]);
    }, []);

    useEffect(() => {
        addMessage('bot', "Hello! I'm an AI assistant. How can I help you book an appointment today?");
    }, [addMessage]);
    
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const systemPrompt = useMemo(() => {
        const availableDoctors = doctors.filter(d => d.isAvailable);
        const doctorsContext = availableDoctors.length > 0
            ? availableDoctors.map(d => `- ${d.name} (Specialty: ${d.specialty})`).join('\n')
            : "There are currently no doctors available.";
        
        return prompts.conversationalBookingSystemPrompt
            .replace(/\$\{currentDate\}/g, new Date().toDateString())
            .replace(/\$\{doctorsContext\}/g, doctorsContext);
    }, [doctors, prompts]);

    const processBookingRequest = useCallback(async (details: AppointmentRequest) => {
        const patientRequestInfo = { name: details.patientName, phone: details.patientPhone || '', age: details.patientAge, gender: details.patientGender };
        const { finalPatientInfo, updatedPatientList } = findOrCreatePatient(patientRequestInfo, patients);
        if (updatedPatientList) onPatientsChange(updatedPatientList);

        const slotInfo = findAvailableSlot(details, schedules, appointments, doctors);
        if (slotInfo) {
            const { date, doctorId, room } = slotInfo;
            const doctor = doctors.find(d => d.id === doctorId);
            if (!doctor) { addMessage('bot', "I'm sorry, there was an error finding that doctor. Please try again."); return; }
            const newAppointment: Appointment = { id: Date.now().toString(), patientName: finalPatientInfo.name, appointmentTime: date.toISOString(), reasonForVisit: details.reasonForVisit || 'Not specified', status: 'booked', source: 'patient-portal', doctorId, room, patientInfo: finalPatientInfo };
            onAppointmentsChange([...appointments, newAppointment]);
            const friendlyDate = date.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            const friendlyTime = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
            addMessage('bot', `Great! I've booked an appointment for ${finalPatientInfo.name} with ${doctor.name} on ${friendlyDate} at ${friendlyTime} in ${room}.`, newAppointment, doctor.name);
        } else {
            addMessage('bot', "I'm sorry, but I couldn't find any available slots for that time. Could you suggest another day or time?");
        }
    }, [patients, schedules, appointments, doctors, onPatientsChange, onAppointmentsChange, addMessage]);
    
    const handleSendMessage = useCallback(async (text: string) => {
        if (!text.trim() || !aiService) return;

        addMessage('user', text);
        setTextInput('');
        setIsProcessing(true);

        const chatHistory: ChatTurn[] = messages.map(msg => ({
            role: msg.sender === 'bot' ? 'model' : 'user',
            text: msg.text
        }));
        chatHistory.push({ role: 'user', text });

        try {
            const botResponse = await aiService.getChatResponse(chatHistory, systemPrompt);
            
            // Look for JSON anywhere in the response
            const jsonMatch = botResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const cleanJson = jsonMatch[0].trim();
                    const parsedJson = JSON.parse(cleanJson);
                    
                    let details: AppointmentRequest | null = null;
                    if (parsedJson.action === 'bookAppointment' && parsedJson.details) {
                        details = parsedJson.details;
                    } else if (parsedJson.patientName && parsedJson.requestedDate) {
                        // AI returned details directly without the wrapper
                        details = parsedJson;
                    }

                    if (details) {
                        await processBookingRequest(details);
                        return; // Done
                    }
                } catch (e) {
                    console.warn("Found possible JSON but failed to parse:", e);
                }
            }
            
            // If no JSON or parsing failed, it's just a chat message
            addMessage('bot', botResponse);
        } catch (err) {
            const errorMessage = "I'm sorry, I encountered an issue. Could you please try again?";
            const friendlyErr = err instanceof Error ? err.message : 'Unknown AI service error';
            setLocalError(friendlyErr);
            onError(friendlyErr);
            addMessage('bot', errorMessage);
        } finally {
            setIsProcessing(false);
        }
    }, [aiService, messages, systemPrompt, addMessage, processBookingRequest, onError]);

    const handleToggleRecording = useCallback(async () => {
        setLocalError(null);
        if (recordingStatus === 'recording') {
            recordingControlsRef.current?.stop();
            return;
        }

        if (!aiService) { 
            setLocalError('AI service is not available.');
            onError('AI service is not available.'); 
            return; 
        }

        setRecordingStatus('recording');
        setCurrentTranscription('');
        fullTranscriptRef.current = '';
        currentTranscriptionRef.current = '';

        try {
            const controls = await aiService.startLiveSession({
                onTranscriptionUpdate: text => {
                    currentTranscriptionRef.current = text;
                    setCurrentTranscription(text);
                },
                onTurnComplete: turn => { 
                    if (turn.text.trim()) { 
                        fullTranscriptRef.current += turn.text + ' '; 
                        currentTranscriptionRef.current = '';
                        setCurrentTranscription('');
                    } 
                },
                onError: err => {
                    onError(err);
                    addMessage('bot', "Sorry, there was a connection issue during recording.");
                    setRecordingStatus('idle');
                },
            }, "Transcribe the user's appointment request.", { bypassWakeWord: true });

            recordingControlsRef.current = {
                ...controls,
                stop: () => {
                    controls.stop();
                    setRecordingStatus('idle');
                    recordingControlsRef.current = null;
                    const finalTranscript = (fullTranscriptRef.current + currentTranscriptionRef.current).trim();
                    setCurrentTranscription('');
                    currentTranscriptionRef.current = '';
                    fullTranscriptRef.current = '';

                    if (!finalTranscript) {
                        addMessage('bot', "I didn't catch that. Could you please repeat?");
                    } else {
                        handleSendMessage(finalTranscript);
                    }
                }
            };
        } catch (err) {
            if (err instanceof DOMException && err.name === "NotAllowedError") addMessage('bot', "I can't access the microphone. Please grant permission in your browser.");
            else addMessage('bot', "I couldn't start the microphone. Please ensure it's connected and not in use.");
            onError(`Failed to start recording: ${err instanceof Error ? err.message : 'Unknown mic error'}`);
            setRecordingStatus('idle');
        }
    }, [recordingStatus, aiService, onError, addMessage, handleSendMessage, currentTranscription]);

    const handleFormSubmit = async (request: AppointmentRequest) => {
        setIsProcessing(true);
        addMessage('user', `Booking request via form for ${request.patientName}.`);
        await processBookingRequest(request);
        setIsProcessing(false);
    };
    
    const handleSendConfirmation = (appointment?: Appointment, doctorName?: string) => {
        if (!appointment || !doctorName) return;
        const message = generateAppointmentConfirmationMessage(appointment, doctorName);
        sendWhatsAppMessage(appointment.patientInfo?.phone || '', message, onError);
    };

    const SendIcon = (props: { className?: string }) => (
        <svg {...props} fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path></svg>
    );

    return (
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-lg flex flex-col h-[80vh]">
            <ErrorFeedback message={localError} onDismiss={() => setLocalError(null)} />
            <div className="p-4 border-b dark:border-slate-700">
                <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300 text-center">Book an Appointment</h2>
                <div className="text-center mt-2">
                    <button onClick={() => setBookingMode(bookingMode === 'chat' ? 'form' : 'chat')} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                        {bookingMode === 'chat' ? 'Prefer to use a form?' : 'Prefer the chat assistant?'}
                    </button>
                </div>
            </div>

            {bookingMode === 'chat' ? (
                <>
                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-none'}`}>
                                   {msg.text}
                                   {msg.appointment && (
                                        <div className="mt-3 pt-3 border-t border-slate-300 dark:border-slate-600">
                                            <p className="text-sm mb-2">I can send a confirmation via WhatsApp.</p>
                                            <button onClick={() => handleSendConfirmation(msg.appointment, msg.doctorName)} className="w-full bg-green-600 text-white font-semibold py-2 px-3 rounded-lg hover:bg-green-700 shadow flex items-center justify-center gap-2 text-sm">
                                                <WhatsAppIcon className="w-4 h-4" />
                                                Send WhatsApp Confirmation
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isProcessing && (
                            <div className="flex justify-start"><div className="max-w-xs p-3 rounded-2xl bg-slate-200 dark:bg-slate-700 rounded-bl-none"><span className="animate-pulse">Thinking...</span></div></div>
                        )}
                    </div>
                     {recordingStatus === 'recording' && (
                        <div className="p-4 border-t dark:border-slate-700 text-center">
                            <p className="text-slate-500 dark:text-slate-400 italic">
                                {currentTranscription || 'Listening...'}
                                <span className="inline-block align-middle w-0.5 h-4 ml-1 bg-blue-500 animate-pulse" aria-hidden="true"></span>
                            </p>
                        </div>
                    )}
                    <div className="p-4 border-t dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && textInput.trim() && handleSendMessage(textInput)}
                    placeholder={isProcessing || recordingStatus === 'recording' ? "Please wait..." : "Type or record your message..."}
                    className="flex-1 w-full px-4 py-2 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isProcessing || recordingStatus === 'recording'}
                />
                {(textInput.trim() && recordingStatus === 'idle') ? (
                    <button
                        onClick={() => handleSendMessage(textInput)}
                        disabled={isProcessing}
                        className="bg-blue-600 text-white rounded-full p-2.5 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all"
                        aria-label="Send message"
                    >
                        <SendIcon className="w-6 h-6" />
                    </button>
                ) : (
                    <button
                        onClick={handleToggleRecording}
                        disabled={isProcessing}
                        className={`text-white rounded-full p-2.5 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all shadow-md ${recordingStatus === 'recording' ? 'bg-red-500 animate-pulse scale-110' : 'bg-blue-600'}`}
                        aria-label={recordingStatus === 'recording' ? "Stop recording" : "Start recording"}
                    >
                        {recordingStatus === 'recording' 
                            ? <StopIcon className="w-6 h-6" />
                            : <MicrophoneIcon className="w-6 h-6" />
                        }
                    </button>
                )}
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex-1 overflow-y-auto">
                    <BookingForm doctors={doctors} onFormSubmit={handleFormSubmit} isProcessing={isProcessing} aiService={aiService} prompts={prompts} onError={onError} />
                </div>
            )}
        </div>
    );
};
