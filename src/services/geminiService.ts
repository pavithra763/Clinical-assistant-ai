
import { GeminiProvider } from './providers/geminiProvider';
import { SelfHostedProvider } from './providers/selfHostedProvider';
import { OtherCloudProvider } from './providers/otherCloudProvider';
import type { AIService } from './aiService';
import type { AIProvider, AIProviderSettings } from '../types';

/**
 * AI Service Factory Function.
 * This function is responsible for creating an instance of the appropriate AI service
 * based on the user's settings. This allows the application to be flexible and
 * support different AI backends (e.g., Google Gemini, a self-hosted model)
 * without changing the core application logic.
 * 
 * @param settings - The current AI provider configuration from the app's state.
 * @returns An instance of a class that implements the AIService interface.
 * @throws An error if the selected provider is not configured correctly.
 */
export function getAiService(settings: AIProviderSettings): AIService {
    switch (settings.provider) {
        case 'gemini':
            // The API key is expected to be available in the environment.
            // In a Vite environment, process.env might not be defined globally.
            const apiKey = import.meta.env.VITE_API_KEY 
            if (!apiKey) {
                throw new Error("Gemini API key is not configured. Please ensure GEMINI_API_KEY is set in your environment or settings.");
            }
            return new GeminiProvider({ 
                apiKey,
                settings: {
                    temperature: settings.temperature,
                    topP: settings.topP,
                    maxTokens: settings.maxTokens,
                    preferredLanguage: settings.preferredLanguage,
                    enableMedicalVocabulary: settings.enableMedicalVocabulary,
                    wakeWord: settings.wakeWord
                }
            });

        case 'self-hosted':
            if (!settings.streamingUrl || !settings.httpUrl) {
                throw new Error("Self-hosted provider requires both a Streaming and HTTP URL. Please configure them in the settings.");
            }
            return new SelfHostedProvider({ 
                streamingUrl: settings.streamingUrl, 
                httpUrl: settings.httpUrl 
            });

        case 'other-cloud':
             if (!settings.streamingUrl || !settings.httpUrl || !settings.cloudApiKey) {
                throw new Error("Other cloud provider requires Streaming URL, HTTP URL, and an API Key. Please configure them in the settings.");
            }
            return new OtherCloudProvider({ 
                streamingUrl: settings.streamingUrl, 
                httpUrl: settings.httpUrl, 
                apiKey: settings.cloudApiKey 
            });

        default:
            // This ensures that if a new provider is added to the type but not the factory, we get a compile-time error.
            const exhaustiveCheck: never = settings.provider;
            throw new Error(`Unsupported AI provider: ${exhaustiveCheck}`);
    }
}


// Re-exporting core types from the service files for easier access in the main app.
export type { RecordingControls } from './aiService';
export { GeminiProvider } from './providers/geminiProvider';
export { SelfHostedProvider } from './providers/selfHostedProvider';
