
// services/providers/apiProvider.ts
import { api } from '../apiClient';
import type { AIService, LiveSessionCallbacks, RecordingControls, ProcessTranscriptPrompts, CorrectionParams, AppointmentRequest, ChatTurn } from '../aiService';
import type { PrescriptionDetails, Vitals, PatientInfo } from '../../types';
import { GeminiProvider } from './geminiProvider'; // Import for live session fallback

/**
 * This class implements the AIService interface by making calls to our secure FastAPI backend.
 * It acts as a proxy, ensuring no direct calls to external AI services are made from the client.
 * The backend handles the actual communication with the AI provider (e.g., Gemini).
 */
export class ApiProvider implements AIService {
    
    // The live session is the only feature that still needs a direct connection
    // from the browser for real-time audio. For this demo, we will re-use the GeminiProvider's logic.
    // In a full production system, this would likely connect to a backend WebSocket endpoint.
    async startLiveSession(callbacks: LiveSessionCallbacks, systemInstruction: string): Promise<RecordingControls> {
        // NOTE: This is a fallback solution for the demo.
        // It falls back to the direct GeminiProvider for live sessions.
        // In a real app, this would throw an error or connect to a backend WebSocket.
        // For this environment, we must assume process.env.API_KEY is available if we use GeminiProvider.
        if (!import.meta.env.VITE_API_KEY ) {
             console.error("Cannot start live session: API_KEY is not available for fallback GeminiProvider.");
             throw new Error("Live transcription service is not configured correctly. API key is missing.");
        }
        const geminiProvider = new GeminiProvider({ apiKey: import.meta.env.VITE_API_KEY });
        return geminiProvider.startLiveSession(callbacks, systemInstruction);
    }

    async processTranscript(transcript: string, prompts: ProcessTranscriptPrompts): Promise<{ englishTranscript: string, summary: string, prescription: PrescriptionDetails, detectedLanguages: string }> {
        return api.post('/ai/process-transcript', { transcript, prompts });
    }

    async getCorrectedPrescription(params: CorrectionParams): Promise<{ correctedContent: string }> {
        return api.post('/ai/correct-prescription', params);
    }

    async generateTriageReport(vitals: Vitals, notes: string, promptTemplate: string): Promise<{ triageReport: string }> {
        return api.post('/ai/generate-triage', { vitals, notes, prompt_template: promptTemplate });
    }

    async extractIntakeData(transcript: string, promptTemplate: string): Promise<{ patientInfo: PatientInfo; vitals: Vitals; preliminaryNotes: string; }> {
        const data = await api.post<{ patientInfo: PatientInfo; vitals: Vitals; preliminaryNotes: string; }>('/ai/extract-intake', { transcript, prompt_template: promptTemplate });
        
        // Data Normalization & Validation
        const { patientInfo, vitals } = data;

        // Ensure age is a numeric string
        if (patientInfo.age) {
            const numericAge = parseInt(patientInfo.age.toString().replace(/\D/g, ''), 10);
            patientInfo.age = isNaN(numericAge) ? "" : numericAge.toString();
        }

        // Basic format check for vitals
        const normalizeVital = (val: any) => {
            if (!val) return "";
            return val.toString().replace(/[^0-9./]/g, '');
        };

        vitals.bp = vitals.bp ? vitals.bp.toString().replace(/[^0-9/]/g, '') : "";
        vitals.pulse = normalizeVital(vitals.pulse);
        vitals.spo2 = normalizeVital(vitals.spo2);
        vitals.temp = normalizeVital(vitals.temp);
        vitals.weight = normalizeVital(vitals.weight);
        vitals.glucose = normalizeVital(vitals.glucose);

        return data;
    }

    async extractAppointmentDetails(transcript: string, promptTemplate: string): Promise<AppointmentRequest> {
        return api.post('/ai/extract-appointment', { transcript, prompt_template: promptTemplate });
    }
    
    async getChatResponse(history: ChatTurn[], systemInstruction: string): Promise<string> {
        // The backend endpoint might expect a slightly different structure.
        // Assuming it returns { "response": "..." }
        const result = await api.post<{ response: string }>('/ai/chat', { history, system_instruction: systemInstruction });
        return result.response;
    }

    async generateSpeech(text: string): Promise<string | undefined> {
        try {
            // Assuming backend returns { "audio_base64": "..." }
            const response = await api.post<{ audio_base64: string }>('/ai/generate-speech', { text });
            return response.audio_base64;
        } catch (error) {
            console.error("Error generating speech via API provider:", error);
            return undefined;
        }
    }

    async spellCheck(text: string): Promise<string> {
        if (!text.trim()) {
            return text;
        }
        try {
            const result = await api.post<{ corrected_text: string }>('/ai/spell-check', { text });
            return result.corrected_text || text;
        } catch (error) {
            console.error("API Provider spell check failed:", error);
            return text; // Fallback on error
        }
    }
}
