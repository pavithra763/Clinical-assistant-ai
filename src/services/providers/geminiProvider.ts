
import { GoogleGenAI, Modality, type Blob, type LiveServerMessage, type GenerateContentResponse, type Content } from '@google/genai';
import { createBlob } from '../../utils/audioUtils';
import { retryWithBackoff } from '../../utils/apiUtils';
import type { AIService, LiveSessionCallbacks, RecordingControls, ProcessTranscriptPrompts, CorrectionParams, AppointmentRequest, ChatTurn } from '../aiService';
import type { Turn, PrescriptionDetails, Vitals, PatientInfo } from '../../types';

/**
 * This class is the implementation of the AIService interface for the Google Gemini API.
 * It handles all Gemini-specific logic, from real-time audio streaming to text generation.
 */
export class GeminiProvider implements AIService {
    private ai: GoogleGenAI;
    private settings: { 
      temperature?: number, 
      topP?: number, 
      maxTokens?: number,
      preferredLanguage?: string,
      enableMedicalVocabulary?: boolean,
      wakeWord?: string 
    } = {};

    constructor(config: { apiKey: string, settings?: { 
      temperature?: number, 
      topP?: number, 
      maxTokens?: number,
      preferredLanguage?: string,
      enableMedicalVocabulary?: boolean,
      wakeWord?: string 
    } }) {
        if (!config.apiKey) {
            throw new Error("GeminiProvider requires an API key.");
        }
        this.ai = new GoogleGenAI({ apiKey: config.apiKey });
        if (config.settings) {
            this.settings = config.settings;
        }
    }

    private getSpeakerLabel(tag: number): string {
      if (tag <= 0 || tag > 26) return `Speaker ${tag}`;
      return `Speaker ${String.fromCharCode(64 + tag)}`;
    }

    private getGenerationConfig(override: any = {}) {
        return {
            temperature: this.settings.temperature,
            topP: this.settings.topP,
            maxOutputTokens: override.maxOutputTokens || this.settings.maxTokens,
            ...override
        };
    }

    private formatDuration(duration: { seconds?: number | null, nanos?: number | null }): string {
        if (!duration || typeof duration.seconds !== 'number') {
            return '00:00:00';
        }
        const totalSeconds = duration.seconds;
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
    
        return [hours, minutes, seconds]
            .map(v => String(v).padStart(2, '0'))
            .join(':');
    }

    async startLiveSession(callbacks: LiveSessionCallbacks, systemInstruction: string, options?: { bypassWakeWord?: boolean }): Promise<RecordingControls> {
        let lastSpeakerTag: number | null = null;
        let currentUtteranceForSpeaker = '';
        let lastProcessedTimestamp = '00:00:00';
        let wakeWordDetected = !this.settings.wakeWord || options?.bypassWakeWord; // If no wake word is set or bypassed, it's auto-detected

        const medicalLexicon = [
            "Lisinopril", "Metformin", "Amlodipine", "Atorvastatin", "Albuterol",
            "Hypotension", "Hypertension", "Tachycardia", "Bradycardia", "Dyspnea",
            "Myocardial Infarction", "Cerebrovascular Accident", "Diabetes Mellitus",
            "Gastroesophageal Reflux Disease", "Chronic Obstructive Pulmonary Disease",
            "Subcutaneous", "Intramuscular", "Intravenous", "Pro re nata (PRN)",
            "Bis in die (BID)", "Ter in die (TID)", "Quater in die (QID)", "Lidocaine",
            "Epinephrine", "Fentanyl", "Propofol", "Oxycodone", "Hydrocodone"
        ].join(', ');

        const enhancedSystemInstruction = `
            ${this.settings.enableMedicalVocabulary ? `Use domain-specific medical vocabulary. Pay special attention to these terms and their correct spellings: ${medicalLexicon}. Prioritize clinical terms and medical jargon where appropriate.` : ""}
            ${this.settings.preferredLanguage ? `The primary language for transcription and interaction is ${this.settings.preferredLanguage}. Be ready to transcribe and understand multiple languages within a single consultation, but the final English transcription must use formal medical English.` : ""}
            ${(this.settings.wakeWord && !options?.bypassWakeWord) ? `CRITICAL: You are in "LISTEN" mode. Do NOT generate ANY transcription or response until you hear the exact wake-word: "${this.settings.wakeWord}". Once you hear "${this.settings.wakeWord}", switch to "PROCESS" mode and begin transcribing everything from that point onwards.` : "You are in \"PROCESS\" mode. Transcribe everything accurately."}
            
            ${systemInstruction}
        `.trim();
        
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
        if (inputAudioContext.state === 'suspended') {
            await inputAudioContext.resume();
        }
        const source = inputAudioContext.createMediaStreamSource(stream);
        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
        
        const sessionPromise = (this.ai as any).live.connect({
            model: 'gemini-3.1-flash-live-preview',
            config: {
                systemInstruction: enhancedSystemInstruction,
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},
            },
            callbacks: {
                onopen: () => {
                    console.log("Live session opened");
                },
                onmessage: (message: any) => {
                    const serverContent = message.serverContent;
                    if (!serverContent) return;

                    // Handle input transcription (user speaking)
                    const transcriptionResult = serverContent.inputTranscription || serverContent.inputAudioTranscription;
                    
                    if (transcriptionResult) {
                        const text = transcriptionResult.text || "";
                        const speakerTag = transcriptionResult.speakerTag || 1;
                        const resultEndTimeOffset = transcriptionResult.resultEndTimeOffset;
                        
                        console.log("Transcription piece:", text);
                        
                        // Wake-word detection logic
                        if (!wakeWordDetected && this.settings.wakeWord) {
                            if (text.toLowerCase().includes(this.settings.wakeWord.toLowerCase())) {
                                wakeWordDetected = true;
                                console.log("Wake word detected!");
                            } else {
                                return; // Ignore until wake word is detected
                            }
                        }

                        const currentTimestamp = this.formatDuration(resultEndTimeOffset);

                        if (lastSpeakerTag !== null && speakerTag !== lastSpeakerTag && currentUtteranceForSpeaker.trim()) {
                            callbacks.onTurnComplete({
                                speaker: this.getSpeakerLabel(lastSpeakerTag),
                                text: currentUtteranceForSpeaker.trim(),
                                timestamp: lastProcessedTimestamp,
                            });
                            currentUtteranceForSpeaker = '';
                        }
                        lastSpeakerTag = speakerTag;
                        currentUtteranceForSpeaker += text;
                        lastProcessedTimestamp = currentTimestamp;
                        callbacks.onTranscriptionUpdate(currentUtteranceForSpeaker);
                    }

                    // Handle model output (AI speaking)
                    if (serverContent.modelTurn) {
                        const parts = serverContent.modelTurn.parts;
                        if (parts && parts.length > 0 && parts[0].inlineData) {
                             // This is for audio output playback if needed
                             // Currently callbacks don't have onAudioOutput, but we log for debug
                             // callbacks.onAudioOutput?.(parts[0].inlineData.data);
                        }
                    }

                    if (serverContent.turnComplete) {
                        if (lastSpeakerTag !== null && currentUtteranceForSpeaker.trim()) {
                            callbacks.onTurnComplete({
                                speaker: this.getSpeakerLabel(lastSpeakerTag),
                                text: currentUtteranceForSpeaker.trim(),
                                timestamp: lastProcessedTimestamp,
                            });
                        }
                        lastSpeakerTag = null;
                        currentUtteranceForSpeaker = '';
                        callbacks.onTranscriptionUpdate('');
                    }
                },
                onerror: (e: any) => {
                    console.error('Live session error:', e);
                    callbacks.onError('A connection error occurred during recording.');
                },
                onclose: (e: any) => {
                    console.log(`Live session closed. Code: ${e.code}, Reason: ${e.reason}`);
                    scriptProcessor.disconnect();
                    source.disconnect();
                    inputAudioContext.close();
                    stream.getTracks().forEach(track => track.stop());
                },
            },
        });

        const session = await sessionPromise;
        
        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const pcmBlob = createBlob(inputData);
            
            try {
                session.sendRealtimeInput({ 
                    audio: {
                        data: pcmBlob.data,
                        mimeType: pcmBlob.mimeType
                    }
                });
            } catch (e) {
                console.error("Error sending audio data:", e);
            }
        };

        source.connect(scriptProcessor);
        scriptProcessor.connect(inputAudioContext.destination);

        return {
            pause: () => scriptProcessor.disconnect(),
            resume: () => scriptProcessor.connect(inputAudioContext.destination),
            stop: () => session.close(),
        };
    }

    async processTranscript(transcript: string, prompts: ProcessTranscriptPrompts): Promise<{ englishTranscript: string, summary: string, prescription: PrescriptionDetails, detectedLanguages: string }> {
        try {
            // Step 1: Polish the transcript and detect languages from the raw transcript. These can run in parallel.
            const languageContext = this.settings.preferredLanguage ? `The consultation may involve ${this.settings.preferredLanguage}. Ensure the final English transcript is accurate and clinical.` : "";
            const medicalContext = this.settings.enableMedicalVocabulary ? "Use precise medical terminology during transcription and summarization." : "";

            const englishTranscriptPrompt = `${languageContext} ${medicalContext}\n\n` + prompts.englishTranscriptPromptTemplate.replace(/\$\{transcript\}/g, transcript);
            const languageDetectionPrompt = `Analyze the following diarized medical consultation transcript and identify all the languages spoken. List the detected languages as a comma-separated string. For example: "English, Spanish". If only one language is detected, just state the language name. (Context: User's preferred language is ${this.settings.preferredLanguage || 'not specified'}).\n\nTranscript:\n"""\n${transcript}\n"""`;

            const [transcriptResponse, languageResponse] = await Promise.all([
                retryWithBackoff(() => this.ai.models.generateContent({ model: 'gemini-3.1-pro-preview', contents: englishTranscriptPrompt, config: this.getGenerationConfig({ maxOutputTokens: 8192 }) })),
                retryWithBackoff(() => this.ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: languageDetectionPrompt, config: this.getGenerationConfig() }))
            ]);

            const getResponseText = (response: GenerateContentResponse | unknown) => (response as GenerateContentResponse).text;
            
            const englishTranscript = getResponseText(transcriptResponse);
            const detectedLanguages = getResponseText(languageResponse);

            if (!englishTranscript) throw new Error("Failed to generate the English transcript. The model returned an empty response.");
            
            // Step 2: Use the polished transcript to generate the summary and prescription. These can run in parallel.
            const summaryPrompt = prompts.summaryPromptTemplate.replace(/\$\{transcript\}/g, englishTranscript);
            const prescriptionPrompt = prompts.prescriptionPromptTemplate.replace(/\$\{transcript\}/g, englishTranscript);

            const [summaryResponse, prescriptionResponse] = await Promise.all([
                retryWithBackoff(() => this.ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: summaryPrompt, config: this.getGenerationConfig() })),
                retryWithBackoff(() => this.ai.models.generateContent({
                    model: 'gemini-3.1-pro-preview',
                    contents: prescriptionPrompt,
                    config: this.getGenerationConfig({ maxOutputTokens: 4096, responseMimeType: 'application/json' })
                }))
            ]);
            
            const summary = getResponseText(summaryResponse);
            
            let prescription: PrescriptionDetails;
            try {
                const prescriptionJsonString = getResponseText(prescriptionResponse);
                if (!prescriptionJsonString) throw new Error("The model returned an empty prescription response.");
                prescription = JSON.parse(prescriptionJsonString);
            } catch (jsonError) {
                console.error("Failed to parse prescription JSON from model:", jsonError);
                throw new Error("The AI model returned an invalid format for the prescription details.");
            }

            if (!summary) throw new Error("Failed to generate the summary. The model returned an empty response.");

            return { 
                englishTranscript: englishTranscript || '', 
                summary: summary || '', 
                prescription: prescription!, 
                detectedLanguages: detectedLanguages || '' 
            };
        } catch (error) {
            console.error("Error processing transcript with Gemini:", error);
            const originalMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Gemini Provider Error: Failed to process transcript. Details: ${originalMessage}`);
        }
    }

    async getCorrectedPrescription(params: CorrectionParams): Promise<{ correctedContent: string }> {
        try {
            const { transcript, originalContent, sectionTitle, correctionText, promptTemplate } = params;
            const prompt = promptTemplate
                .replace(/\$\{transcript\}/g, transcript)
                .replace(/\$\{originalContent\}/g, originalContent)
                .replace(/\$\{sectionTitle\}/g, sectionTitle)
                .replace(/\$\{correctionText\}/g, correctionText);

            const response = await retryWithBackoff(() => this.ai.models.generateContent({
                model: 'gemini-3.1-pro-preview',
                contents: prompt,
                config: this.getGenerationConfig()
            }));
            
            const correctedContent = (response as GenerateContentResponse).text;
            if (!correctedContent) {
                throw new Error("Failed to generate the corrected content. The model returned an empty response.");
            }
            return { correctedContent };
        } catch (error) {
            console.error("Error in getCorrectedPrescription with Gemini:", error);
            const originalMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Gemini Provider Error: Failed to get corrected prescription. Details: ${originalMessage}`);
        }
    }

    async generateTriageReport(vitals: Vitals, notes: string, promptTemplate: string): Promise<{ triageReport: string }> {
        try {
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

            const response = await retryWithBackoff(() => this.ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: this.getGenerationConfig()
            }));
            
            const triageReport = (response as GenerateContentResponse).text;
            if (!triageReport) {
                throw new Error("Failed to generate triage report. The model returned an empty response.");
            }
            return { triageReport };
        } catch (error) {
            console.error("Error generating triage report with Gemini:", error);
            const originalMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Gemini Provider Error: Failed to generate triage report. Details: ${originalMessage}`);
        }
    }

    async extractIntakeData(transcript: string, promptTemplate: string): Promise<{ patientInfo: PatientInfo; vitals: Vitals; preliminaryNotes: string; }> {
        try {
            const prompt = promptTemplate.replace(/\$\{transcript\}/g, transcript);

            const response = await retryWithBackoff(() => this.ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: this.getGenerationConfig({ responseMimeType: 'application/json' })
            }));

            const jsonString = (response as GenerateContentResponse).text;
            if (!jsonString) {
                throw new Error("Failed to extract intake data. The model returned an empty response.");
            }

            try {
                const parsedData = JSON.parse(jsonString);
                // Basic validation
                if (!parsedData.patientInfo || !parsedData.vitals || typeof parsedData.preliminaryNotes === 'undefined') {
                    throw new Error("Extracted data is missing required fields.");
                }

                // Data Normalization & Validation
                const patientInfo = parsedData.patientInfo;
                const vitals = parsedData.vitals;

                // Ensure age is a numeric string
                if (patientInfo.age) {
                    const numericAge = parseInt(patientInfo.age.toString().replace(/\D/g, ''), 10);
                    patientInfo.age = isNaN(numericAge) ? "" : numericAge.toString();
                }

                // Basic format check for vitals - strip non-numeric parts except for BP slash
                const normalizeVital = (val: any) => {
                    if (!val) return "";
                    // Keep numbers, dots (for decimals) and '/' for BP
                    return val.toString().replace(/[^0-9./]/g, '');
                };

                vitals.bp = vitals.bp ? vitals.bp.toString().replace(/[^0-9/]/g, '') : "";
                vitals.pulse = normalizeVital(vitals.pulse);
                vitals.spo2 = normalizeVital(vitals.spo2);
                vitals.temp = normalizeVital(vitals.temp);
                vitals.weight = normalizeVital(vitals.weight);
                vitals.glucose = normalizeVital(vitals.glucose);

                return {
                    patientInfo,
                    vitals,
                    preliminaryNotes: parsedData.preliminaryNotes,
                };
            } catch (e) {
                console.error("Failed to parse JSON from intake data extraction:", jsonString, e);
                throw new Error("The AI model returned an invalid format for the intake data.");
            }
        } catch (error) {
            console.error("Error extracting intake data with Gemini:", error);
            const originalMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Gemini Provider Error: Failed to extract intake data. Details: ${originalMessage}`);
        }
    }

    async extractAppointmentDetails(transcript: string, promptTemplate: string): Promise<AppointmentRequest> {
        try {
            const currentDate = new Date().toISOString().split('T')[0];
            const prompt = promptTemplate
                .replace(/\$\{transcript\}/g, transcript)
                .replace(/\$\{currentDate\}/g, currentDate);

            const response = await retryWithBackoff(() => this.ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: this.getGenerationConfig({ responseMimeType: 'application/json' })
            }));

            const jsonString = (response as GenerateContentResponse).text;
            if (!jsonString) {
                throw new Error("Failed to extract appointment details. The model returned an empty response.");
            }
            try {
                const parsedData = JSON.parse(jsonString);
                if (!parsedData.patientName || typeof parsedData.requestedDate === 'undefined' || typeof parsedData.requestedTime === 'undefined' || typeof parsedData.reasonForVisit === 'undefined') {
                    throw new Error("Extracted appointment data is missing required fields.");
                }
                return parsedData;
            } catch (e) {
                console.error("Failed to parse JSON from appointment extraction:", jsonString, e);
                throw new Error("The AI model returned an invalid format for the appointment data.");
            }
        } catch (error) {
            console.error("Error extracting appointment details with Gemini:", error);
            const originalMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Gemini Provider Error: Failed to extract appointment details. Details: ${originalMessage}`);
        }
    }

    async getChatResponse(history: ChatTurn[], systemInstruction: string): Promise<string> {
        const contents: Content[] = history.map(turn => ({
            role: turn.role,
            parts: [{ text: turn.text }]
        }));

        try {
            const response = await retryWithBackoff(() => this.ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents,
                config: this.getGenerationConfig({
                    systemInstruction,
                })
            }));

            const text = (response as GenerateContentResponse).text;
            if (!text) {
                throw new Error("The model returned an empty response for chat.");
            }
            return text;
        } catch (error) {
            console.error("Error getting chat response from Gemini:", error);
            const originalMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Gemini Provider Error: Failed to get chat response. Details: ${originalMessage}`);
        }
    }

    async generateSpeech(text: string): Promise<string | undefined> {
        try {
            const response = await retryWithBackoff(() => this.ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: `Read the following text clearly and naturally: ${text}` }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: 'Kore' }, // A standard, clear voice
                        },
                    },
                },
            }));

            const base64Audio = (response as GenerateContentResponse).candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            return base64Audio;
        } catch (error) {
            console.error("Error generating speech with Gemini:", error);
            // Don't re-throw, just return undefined so the UI can handle it gracefully.
            return undefined;
        }
    }

    async spellCheck(text: string): Promise<string> {
        if (!text.trim()) {
            return text;
        }
        try {
            const prompt = `Correct any spelling mistakes in the following text. Only return the corrected text, do not add any other commentary. Text: "${text}"`;
            const response = await this.ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: this.getGenerationConfig()
            });
            const correctedText = (response as GenerateContentResponse).text;
            return correctedText || text; // Fallback to original text if response is empty
        } catch (error) {
            console.error("Gemini spell check failed:", error);
            return text; // Fallback on error
        }
    }
}
