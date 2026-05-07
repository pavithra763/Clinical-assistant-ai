
export function decode(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function decodeAudioData(buffer: ArrayBuffer, context: AudioContext, sampleRate: number, channels: number): Promise<AudioBuffer> {
  // Simple check if it's already an AudioBuffer (mock/demo purposes often do this)
  // But here we'll assume it's raw/encoded data
  return await context.decodeAudioData(buffer);
}

export function createBlob(audioData: Float32Array): { data: string, mimeType: string } {
    const buffer = new ArrayBuffer(audioData.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < audioData.length; i++) {
        const s = Math.max(-1, Math.min(1, audioData[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    const base64 = window.btoa(String.fromCharCode(...new Uint8Array(buffer)));
    return {
        data: base64,
        mimeType: 'audio/pcm;rate=16000'
    };
}
