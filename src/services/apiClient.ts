// services/apiClient.ts

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1'; // Your FastAPI backend URL

/**
 * Retrieves the stored auth token from local storage.
 */
const getToken = (): string | null => {
    return localStorage.getItem('authToken');
};

/**
 * A wrapper around the native `fetch` API to streamline backend communication.
 * It automatically sets the base URL, content type, and authorization headers.
 *
 * @param endpoint The API endpoint to call (e.g., '/appointments').
 * @param options The standard `RequestInit` options for the fetch call.
 * @returns The JSON response from the API.
 * @throws An error if the network response is not OK.
 */
const apiClient = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const token = getToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = { detail: `HTTP error! status: ${response.status}` };
        }
        // FastAPI validation errors are often under 'detail'
        const message = errorData.detail || `An unknown API error occurred.`;
        throw new Error(message);
    }
    
    // Handle cases where the response body might be empty (e.g., for a 204 No Content)
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : null as T;
    } catch (e) {
      console.error("Failed to parse JSON response:", text);
      throw new Error("Received an invalid JSON response from the server.");
    }
};

// Convenience methods for different HTTP verbs
export const api = {
    get: <T>(endpoint: string): Promise<T> => apiClient<T>(endpoint, { method: 'GET' }),
    post: <T>(endpoint:string, body: any): Promise<T> => apiClient<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
    put: <T>(endpoint: string, body: any): Promise<T> => apiClient<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
    delete: <T>(endpoint: string): Promise<T> => apiClient<T>(endpoint, { method: 'DELETE' }),
};