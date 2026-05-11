import * as Speech from "expo-speech";

export interface TtsOptions {
  rate?: number;
  language?: string;
}

export interface TtsProvider {
  speak: (text: string, options?: TtsOptions) => Promise<void>;
  stop: () => Promise<void>;
  isAvailable: () => Promise<boolean>;
}

export const nativeTtsProvider: TtsProvider = {
  async speak(text, options = {}) {
    const available = await Speech.isSpeakingAsync().then(() => true).catch(() => false);
    if (!available) throw new Error("TTS is unavailable on this device");
    Speech.speak(text, {
      language: options.language ?? "en-US",
      rate: options.rate ?? 0.9
    });
  },
  async stop() {
    await Speech.stop();
  },
  async isAvailable() {
    return Speech.isSpeakingAsync().then(() => true).catch(() => false);
  }
};
