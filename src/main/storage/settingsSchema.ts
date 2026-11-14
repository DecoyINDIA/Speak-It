import { z } from 'zod';

export const GeneralSettingsSchema = z.object({
  hotkey: z.array(z.string()).default(['Control', 'Meta']),
  hotkeyMode: z.enum(['ptt', 'toggle']).default('ptt'),
  doubleTapHandsFree: z.boolean().default(true),
  micDeviceId: z.string().default('default'),
  inputLanguage: z.string().default('auto'),
  outputLanguage: z.enum(['as_spoken', 'en']).default('as_spoken'),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
});

export const SystemSettingsSchema = z.object({
  launchAtLogin: z.boolean().default(false),
  alwaysShowBar: z.boolean().default(false),
  sounds: z.boolean().default(true),
  muteOtherAudio: z.boolean().default(false),
  micWarmWindowSeconds: z.number().min(0).max(120).default(20),
  pressEnterCommand: z.boolean().default(false),
  perAppOverrides: z.record(z.string(), z.object({
    pasteMethod: z.enum(['auto', 'ctrlv', 'shiftinsert', 'unicode']).optional(),
    skipPasswordCheck: z.boolean().optional(),
  })).default({}),
});

export const ProvidersSettingsSchema = z.object({
  chain: z.array(z.string()).default(['groq', 'gemini', 'offline']),
  groq: z.object({
    sttModel: z.string().default('whisper-large-v3-turbo'),
    llmModel: z.string().default('llama-3.3-70b-versatile'),
  }).default({
    sttModel: 'whisper-large-v3-turbo',
    llmModel: 'llama-3.3-70b-versatile',
  }),
  gemini: z.object({
    sttModel: z.string().default('gemini-2.5-flash'),
    llmModel: z.string().default('gemini-2.5-flash'),
  }).default({
    sttModel: 'gemini-2.5-flash',
    llmModel: 'gemini-2.5-flash',
  }),
  offline: z.object({
    model: z.string().default('ggml-model-whisper-small.bin'),
    idleUnloadMinutes: z.number().default(10),
  }).default({
    model: 'ggml-model-whisper-small.bin',
    idleUnloadMinutes: 10,
  }),
  localCleanup: z.object({
    enabled: z.boolean().default(false),
    baseUrl: z.string().default('http://127.0.0.1:11434/v1'),
    model: z.string().default('llama3.2:latest'),
  }).default({
    enabled: false,
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: 'llama3.2:latest',
  }),
});

export const PrivacySettingsSchema = z.object({
  retentionDays: z.number().default(90),
  keepAudio: z.boolean().default(true),
  contextAwareness: z.boolean().default(false),
});

export const SettingsSchema = z.object({
  general: GeneralSettingsSchema.default(() => GeneralSettingsSchema.parse({})),
  system: SystemSettingsSchema.default(() => SystemSettingsSchema.parse({})),
  providers: ProvidersSettingsSchema.default(() => ProvidersSettingsSchema.parse({})),
  privacy: PrivacySettingsSchema.default(() => PrivacySettingsSchema.parse({})),
});

export type AppSettings = z.infer<typeof SettingsSchema>;

export const defaultSettings: AppSettings = SettingsSchema.parse({});
