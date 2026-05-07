
import { createBlob } from '../../utils/audioUtils';
import { retryWithBackoff } from '../../utils/apiUtils';
import type { AIService, LiveSessionCallbacks, RecordingControls, ProcessTranscriptPrompts, CorrectionParams, AppointmentRequest, ChatTurn } from '../aiService';
import type { PrescriptionDetails, Vitals, PatientInfo } from '../../types';

interface OtherCloudConfig {
    streamingUrl: string;
    httpUrl: string;
    apiKey: string;
}

/**
 * This class implements the AIService interface for a generic, cloud-hosted AI model
 * that requires API key authentication.
 */
export class OtherCloudProvider implements AIService {
    private config: OtherCloudConfig;

    constructor(config: OtherCloudConfig) {
        this.config = config;
    }

    async startLiveSession(callbacks: LiveSessionCallbacks, systemInstruction: string, options?: { bypassWakeWord?: boolean }): Promise<RecordingControls> {
        let lastSpeakerTag: string | null = null;
        let currentUtteranceForSpeaker = '';

        const idealConstraints: MediaStreamConstraints = {
            audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        };

        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia(idealConstraints);
        } catch (error) {
            console.warn(`Could not get audio stream with ideal constraints. Falling back to default. Error:`, error);
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        
        callbacks.onStreamCreated?.(stream);

        const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const source = inputAudioContext.createMediaStreamSource(stream);
        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);

        // API key is often passed as a query parameter for WebSocket authentication.
        // Note: The exact method may vary by provider.
        const socket = new WebSocket(`${this.config.streamingUrl}?apiKey=${this.config.apiKey}`);
        let isConnectionOpen = false;

        socket.onopen = () => {
            isConnectionOpen = true;
            socket.send(JSON.stringify({ type: 'config', systemInstruction }));
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                if (!isConnectionOpen) return;
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                const pcmBlob = createBlob(inputData);
                socket.send(JSON.stringify({ type: 'audio', data: pcmBlob.data }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
        };

        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                const { text, speaker, is_final } = message;

                if (lastSpeakerTag !== null && speaker !== lastSpeakerTag && currentUtteranceForSpeaker.trim()) {
                    callbacks.onTurnComplete({ speaker: lastSpeakerTag, text: currentUtteranceForSpeaker.trim() });
                    currentUtteranceForSpeaker = '';
                }
                lastSpeakerTag = speaker;
                if (is_final) {
                    currentUtteranceForSpeaker += text;
                    callbacks.onTurnComplete({ speaker: speaker, text: currentUtteranceForSpeaker.trim() });
                    currentUtteranceForSpeaker = '';
                    lastSpeakerTag = null;
                    callbacks.onTranscriptionUpdate('');
                } else {
                    currentUtteranceForSpeaker += text;
                    callbacks.onTranscriptionUpdate(currentUtteranceForSpeaker);
                }
            } catch (e) {
                console.error("Failed to parse message from other-cloud WebSocket:", event.data);
            }
        };

        socket.onerror = (e) => {
            callbacks.onError('A connection error occurred with the other-cloud recording service.');
        };
        
        const cleanup = () => {
            isConnectionOpen = false;
            scriptProcessor.disconnect();
            source.disconnect();
            inputAudioContext.close();
            stream.getTracks().forEach(track => track.stop());
        };

        socket.onclose = () => cleanup();

        return {
            pause: () => scriptProcessor.disconnect(),
            resume: () => scriptProcessor.connect(inputAudioContext.destination),
            stop: () => {
                if (socket.readyState === WebSocket.OPEN) socket.close();
                else cleanup();
            }
        };
    }

    private async generateText(prompt: string): Promise<string> {
        const response = await fetch(this.config.httpUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                // Standard practice for many cloud APIs is to use a Bearer token.
                'Authorization': `Bearer ${this.config.apiKey}`,
            },
            body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Other Cloud API error: ${response.status} ${response.statusText} - ${errorBody}`);
        }

        const data = await response.json();
        if (!data.response) {
            throw new Error("Other Cloud API response is missing the 'response' field.");
        }
        return data.response;
    }

    async processTranscript(transcript: string, prompts: ProcessTranscriptPrompts): Promise<{ englishTranscript: string, summary: string, prescription: PrescriptionDetails, detectedLanguages: string }> {
        // Step 1: Polish transcript and detect languages from the raw transcript
        const englishTranscriptPrompt = prompts.englishTranscriptPromptTemplate.replace(/\$\{transcript\}/g, transcript);
        const languageDetectionPrompt = `Analyze the following transcript and list all spoken languages as a comma-separated string.\n\nTranscript:\n"""\n${transcript}\n"""`;

        const [englishTranscript, detectedLanguages] = await Promise.all([
            retryWithBackoff(() => this.generateText(englishTranscriptPrompt)),
            retryWithBackoff(() => this.generateText(languageDetectionPrompt))
        ]);
        
        // Step 2: Use the polished transcript to generate the summary and prescription
        const summaryPrompt = prompts.summaryPromptTemplate.replace(/\$\{transcript\}/g, englishTranscript);
        const prescriptionPrompt = prompts.prescriptionPromptTemplate.replace(/\$\{transcript\}/g, englishTranscript);

        const [summary, prescriptionJsonString] = await Promise.all([
            retryWithBackoff(() => this.generateText(summaryPrompt)),
            retryWithBackoff(() => this.generateText(prescriptionPrompt))
        ]);
        
        let prescription: PrescriptionDetails;
        try {
            prescription = JSON.parse(prescriptionJsonString);
        } catch (e) {
            console.error("Failed to parse prescription JSON from other cloud provider:", e);
            throw new Error("The other cloud model returned an invalid format for prescription details.");
        }

        return { englishTranscript, summary, prescription, detectedLanguages };
    }

    async getCorrectedPrescription(params: CorrectionParams): Promise<{ correctedContent: string }> {
        const { transcript, originalContent, sectionTitle, correctionText, promptTemplate } = params;
        const prompt = promptTemplate
            .replace(/\$\{transcript\}/g, transcript)
            .replace(/\$\{originalContent\}/g, originalContent)
            .replace(/\$\{sectionTitle\}/g, sectionTitle)
            .replace(/\$\{correctionText\}/g, correctionText);
        
        const correctedContent = await retryWithBackoff(() => this.generateText(prompt));
        return { correctedContent };
    }

    async generateTriageReport(vitals: Vitals, notes: string, promptTemplate: string): Promise<{ triageReport: string }> {
        const vitalsText = [
            vitals.bp && `- Blood Pressure: ${vitals.bp} mmHg`,
            vitals.pulse && `- Pulse: ${vitals.pulse} bpm`,
            vitals.spo2 && `- SpO2: ${vitals.spo2}%`,
            vitals.temp && `- Temperature: ${vitals.temp}°F`,
            vitals.weight && `- Weight: ${vitals.weight} Kgs`,
            vitals.glucose && `- Random Glucose: ${vitals.glucose} mg/dL`
        ].filter(Boolean).join('\n');

        const prompt = promptTemplate
            .replace(/\$\{vitals\}/g, vitalsText || 'Not provided.')
            .replace(/\$\{notes\}/g, notes || 'Not provided.');
            
        const triageReport = await retryWithBackoff(() => this.generateText(prompt));
        return { triageReport };
    }
    
    async extractIntakeData(transcript: string, promptTemplate: string): Promise<{ patientInfo: PatientInfo; vitals: Vitals; preliminaryNotes: string; }> {
        const prompt = promptTemplate.replace(/\$\{transcript\}/g, transcript);
        const jsonString = await retryWithBackoff(() => this.generateText(prompt));

        if (!jsonString) {
            throw new Error("Failed to extract intake data. The model returned an empty response.");
        }

        try {
            const parsedData = JSON.parse(jsonString);
            if (!parsedData.patientInfo || !parsedData.vitals || typeof parsedData.preliminaryNotes === 'undefined') {
                throw new Error("Extracted data from other cloud model is missing required fields.");
            }
            return {
                patientInfo: parsedData.patientInfo,
                vitals: parsedData.vitals,
                preliminaryNotes: parsedData.preliminaryNotes,
            };
        } catch (e) {
            console.error("Failed to parse JSON from other cloud intake data extraction:", jsonString, e);
            throw new Error("The other cloud AI model returned an invalid format for the intake data.");
        }
    }

    async extractAppointmentDetails(transcript: string, promptTemplate: string): Promise<AppointmentRequest> {
        const currentDate = new Date().toISOString().split('T')[0];
        const prompt = promptTemplate
            .replace(/\$\{transcript\}/g, transcript)
            .replace(/\$\{currentDate\}/g, currentDate);
        
        const jsonString = await retryWithBackoff(() => this.generateText(prompt));
        if (!jsonString) {
            throw new Error("Failed to extract appointment details from other cloud model. The model returned an empty response.");
        }

        try {
            const parsedData = JSON.parse(jsonString);
            if (!parsedData.patientName || typeof parsedData.requestedDate === 'undefined' || typeof parsedData.requestedTime === 'undefined' || typeof parsedData.reasonForVisit === 'undefined') {
                throw new Error("Extracted appointment data from other cloud model is missing required fields.");
            }
            return parsedData;
        } catch (e) {
            console.error("Failed to parse JSON from other cloud appointment extraction:", jsonString, e);
            throw new Error("The other cloud AI model returned an invalid format for the appointment data.");
        }
    }

    async getChatResponse(history: ChatTurn[], systemInstruction: string): Promise<string> {
        throw new Error("Conversational booking is not supported by this AI provider.");
    }

    async generateSpeech(text: string): Promise<string | undefined> {
        console.warn("generateSpeech is not implemented for this provider.");
        throw new Error("Text-to-speech functionality is not supported by the currently configured AI provider.");
    }

    async spellCheck(text: string): Promise<string> {
        if (!text.trim()) {
            return text;
        }
        try {
            const prompt = `Correct any spelling mistakes in the following text. Only return the corrected text, do not add any other commentary. Text: "${text}"`;
            return await this.generateText(prompt);
        } catch (error) {
            console.error("Other cloud spell check failed:", error);
            return text; // Fallback on error
        }
    }
}
