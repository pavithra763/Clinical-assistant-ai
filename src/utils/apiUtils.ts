
export function getFriendlyErrorMessage(error: any, context?: string): string {
  const prefix = context ? `Error ${context}: ` : '';
  if (typeof error === 'string') return `${prefix}${error}`;
  if (error?.message) {
    if (error.message.includes('quota')) return `${prefix}AI service quota exceeded. Please try again later.`;
    if (error.message.includes('network')) return `${prefix}Network error. Please check your connection.`;
    return `${prefix}${error.message}`;
  }
  return `${prefix}An unexpected error occurred. Please try again.`;
}

export async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      retries++;
      if (retries >= maxRetries) throw error;
      const delay = initialDelay * Math.pow(2, retries - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Retry failed');
}
