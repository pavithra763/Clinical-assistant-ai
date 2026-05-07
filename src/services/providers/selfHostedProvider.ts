
import { createBlob } from '../../utils/audioUtils';
import { retryWithBackoff } from '../../utils/apiUtils';
import type { AIService, LiveSessionCallbacks, RecordingControls, ProcessTranscriptPrompts, CorrectionParams, AppointmentRequest, ChatTurn } from '../aiService';
import type { PrescriptionDetails, Vitals, PatientInfo } from '../../types';

interface SelfHostedConfig {
    streamingUrl: string;
    httpUrl: string;
}

/**
 * This class implements the AIService interface for a generic, self-hosted AI model.
 * It communicates with two user-defined endpoints:
 * 1. A WebSocket for real-time speech-to-text.
 * 2. An HTTP endpoint for text generation tasks (summarization, etc.).
 */
export class SelfHostedProvider implements AIService {
    private config: SelfHostedConfig;

    constructor(config: SelfHostedConfig) {
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

        const socket = new WebSocket(this.config.streamingUrl);
        let isConnectionOpen = false;

        socket.onopen = () => {
            console.log('Self-hosted WebSocket session opened.');
            isConnectionOpen = true;
            // Send system instruction upon connection
            socket.send(JSON.stringify({ type: 'config', systemInstruction }));

            if (inputAudioContext.state === 'suspended') {
                inputAudioContext.resume();
            }

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                if (!isConnectionOpen) return;
                const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                // For self-hosted, we send the raw base64 data directly.
                const pcmBlob = createBlob(inputData);
                socket.send(JSON.stringify({ type: 'audio', data: pcmBlob.data }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
        };

        /**
         * EXPECTED WEBSOCKET MESSAGE FORMAT from the self-hosted server:
         * The server should send back JSON strings with the following structure:
         * {
         *   "text": "transcribed text segment",
         *   "speaker": "Speaker A", // A consistent identifier for the speaker
         *   "is_final": true // `true` if this is the end of a turn/sentence, `false` for intermediate results
         * }
         */
        socket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                const { text, speaker, is_final } = message;

                if (lastSpeakerTag !== null && speaker !== lastSpeakerTag && currentUtteranceForSpeaker.trim()) {
                    callbacks.onTurnComplete({
                        speaker: lastSpeakerTag,
                        text: currentUtteranceForSpeaker.trim(),
                    });
                    currentUtteranceForSpeaker = '';
                }

                lastSpeakerTag = speaker;
                
                if (is_final) {
                    currentUtteranceForSpeaker += text;
                    callbacks.onTurnComplete({
                        speaker: speaker,
                        text: currentUtteranceForSpeaker.trim(),
                    });
                    currentUtteranceForSpeaker = '';
                    lastSpeakerTag = null;
                    callbacks.onTranscriptionUpdate('');
                } else {
                    currentUtteranceForSpeaker += text;
                    callbacks.onTranscriptionUpdate(currentUtteranceForSpeaker);
                }

            } catch (e) {
                console.error("Failed to parse message from self-hosted WebSocket:", event.data);
            }
        };

        socket.onerror = (e) => {
            console.error('Self-hosted WebSocket error:', e);
            callbacks.onError('A connection error occurred with the self-hosted recording service.');
        };
        
        const cleanup = () => {
            isConnectionOpen = false;
            scriptProcessor.disconnect();
            source.disconnect();
            inputAudioContext.close();
            stream.getTracks().forEach(track => track.stop());
        };

        socket.onclose = (e) => {
            console.log(`Self-hosted WebSocket session closed. Code: ${e.code}, Reason: ${e.reason}`);
            cleanup();
        };

        return {
            pause: () => scriptProcessor.disconnect(),
            resume: () => scriptProcessor.connect(inputAudioContext.destination),
            stop: () => {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.close();
                } else {
                    cleanup();
                }
            }
        };
    }

    /**
     * Sends a prompt to the self-hosted HTTP endpoint for text generation.
     * EXPECTED HTTP API CONTRACT:
     * - URL: The user-configured `httpUrl`
     * - Method: POST
     * - Headers: { 'Content-Type': 'application/json' }
     * - Request Body: { "prompt": "Your full prompt text here" }
     * - Success Response (200 OK): { "response": "The model's generated text" }
     */
    private async generateText(prompt: string): Promise<string> {
        const response = await fetch(this.config.httpUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Self-hosted API error: ${response.status} ${response.statusText} - ${errorBody}`);
        }

        const data = await response.json();
        if (!data.response) {
            throw new Error("Self-hosted API response is missing the 'response' field.");
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
            console.error("Failed to parse prescription JSON from self-hosted provider:", e);
            throw new Error("The self-hosted model returned an invalid format for prescription details.");
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
                throw new Error("Extracted data from self-hosted model is missing required fields.");
            }
            return {
                patientInfo: parsedData.patientInfo,
                vitals: parsedData.vitals,
                preliminaryNotes: parsedData.preliminaryNotes,
            };
        } catch (e) {
            console.error("Failed to parse JSON from self-hosted intake data extraction:", jsonString, e);
            throw new Error("The self-hosted AI model returned an invalid format for the intake data.");
        }
    }

    async extractAppointmentDetails(transcript: string, promptTemplate: string): Promise<AppointmentRequest> {
        const currentDate = new Date().toISOString().split('T')[0];
        const prompt = promptTemplate
            .replace(/\$\{transcript\}/g, transcript)
            .replace(/\$\{currentDate\}/g, currentDate);
        
        const jsonString = await retryWithBackoff(() => this.generateText(prompt));
        if (!jsonString) {
            throw new Error("Failed to extract appointment details from self-hosted model. The model returned an empty response.");
        }

        try {
            const parsedData = JSON.parse(jsonString);
            if (!parsedData.patientName || typeof parsedData.requestedDate === 'undefined' || typeof parsedData.requestedTime === 'undefined' || typeof parsedData.reasonForVisit === 'undefined') {
                throw new Error("Extracted appointment data from self-hosted model is missing required fields.");
            }
            return parsedData;
        } catch (e) {
            console.error("Failed to parse JSON from self-hosted appointment extraction:", jsonString, e);
            throw new Error("The self-hosted AI model returned an invalid format for the appointment data.");
        }
    }

    async getChatResponse(history: ChatTurn[], systemInstruction: string): Promise<string> {
        throw new Error("Conversational booking is not supported by the self-hosted AI provider.");
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
            console.error("Self-hosted spell check failed:", error);
            return text; // Fallback on error
        }
    }
}
