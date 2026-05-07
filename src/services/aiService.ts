
import type { Turn, PrescriptionDetails, Vitals, PatientInfo, Doctor } from '../types';

export interface LiveSessionCallbacks {
  onTranscriptionUpdate: (text: string) => void;
  onTurnComplete: (turn: Turn) => void;
  onError: (error: string) => void;
  onStreamCreated?: (stream: MediaStream) => void;
}

export interface RecordingControls {
    pause: () => void;
    resume: () => void;
    stop: () => void;
}

export interface ProcessTranscriptPrompts {
    englishTranscriptPromptTemplate: string;
    summaryPromptTemplate: string;
    prescriptionPromptTemplate: string;
}

export interface CorrectionParams {
  transcript: string;
  originalContent: string;
  sectionTitle: string;
  correctionText: string;
  promptTemplate: string;
}

export interface AppointmentRequest {
    patientName: string;
    patientAge?: string;
    patientGender?: string;
    patientPhone?: string;
    requestedDate: string; // e.g., "today", "2024-08-28"
    requestedTime: string; // e.g., "morning", "3pm"
    requestedDoctor?: string; // e.g., "Dr. Smith" or "cardiologist"
    reasonForVisit: string;
    isUrgent?: boolean;
}

export interface ChatTurn {
    role: 'user' | 'model';
    text: string;
}

/**
 * This is the core interface that all AI providers (e.g., Gemini, Self-Hosted) must implement.
 * By programming to this interface, the main application can switch between providers
 * without changing its core logic.
 */
export interface AIService {
    /**
     * Starts a real-time audio transcription session.
     * @param callbacks - Functions to call for transcription updates, completed turns, and errors.
     * @param systemInstruction - The initial instruction for the AI model.
     * @returns An object with controls to pause, resume, and stop the recording.
     */
    startLiveSession(callbacks: LiveSessionCallbacks, systemInstruction: string, options?: { bypassWakeWord?: boolean }): Promise<RecordingControls>;
    
    /**
     * Performs post-processing on a completed transcript to generate analytical content.
     * @param transcript - The full, raw transcript text.
     * @param prompts - The prompt templates for each generation task.
     * @returns An object containing the polished transcript, summary, prescription, and detected languages.
     */
    processTranscript(transcript: string, prompts: ProcessTranscriptPrompts): Promise<{ 
        englishTranscript: string, 
        summary: string, 
        prescription: PrescriptionDetails, 
        detectedLanguages: string 
    }>;

    /**
     * Generates a corrected prescription based on user feedback.
     * @param params - An object containing the context and the correction text.
     * @returns An object with the new, corrected prescription.
     */
    getCorrectedPrescription(params: CorrectionParams): Promise<{ correctedContent: string }>;

    /**
     * Generates a triage report based on preliminary patient data.
     * @param vitals - The patient's vital signs.
     * @param notes - The preliminary notes or chief complaint.
     * @param promptTemplate - The prompt template for generating the report.
     * @returns An object containing the generated triage report string.
     */
    generateTriageReport(vitals: Vitals, notes: string, promptTemplate: string): Promise<{ triageReport: string }>;

    /**
     * Extracts structured patient data from an intake transcript.
     * @param transcript - The transcript from the nurse's intake conversation.
     * @param promptTemplate - The prompt template for data extraction.
     * @returns An object containing the extracted patient info, vitals, and notes.
     */
    extractIntakeData(transcript: string, promptTemplate: string): Promise<{ patientInfo: PatientInfo; vitals: Vitals; preliminaryNotes: string; }>;

    /**
     * Extracts appointment details from a user's request.
     * @param transcript - The user's spoken or typed request.
     * @param promptTemplate - The prompt template for appointment data extraction.
     * @returns An object containing the extracted patient name, date, time, and reason for visit.
     */
    extractAppointmentDetails(transcript: string, promptTemplate: string): Promise<AppointmentRequest>;

    /**
     * Gets a response from a conversational chat model.
     * @param history The history of the conversation so far.
     * @param systemInstruction The guiding instruction for the AI model.
     * @returns A promise that resolves with the AI's next response text.
     */
    getChatResponse(history: ChatTurn[], systemInstruction: string): Promise<string>;

    /**
     * Converts a string of text into playable audio data.
     * @param text The text to convert to speech.
     * @returns A promise that resolves with the base64 encoded audio string, or undefined if it fails.
     */
    generateSpeech(text: string): Promise<string | undefined>;

    /**
     * Performs a quick spelling correction on a small piece of text.
     * @param text The text to be spell-checked.
     * @returns A promise that resolves with the corrected text string.
     */
    spellCheck(text: string): Promise<string>;
}
