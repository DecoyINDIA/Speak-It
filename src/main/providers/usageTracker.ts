export interface ProviderUsage {
  hourlyAudioSeconds: number;
  dailyAudioSeconds: number;
  requestsThisMinute: number;
  requestsToday: number;
  lastCooldownUntil?: number;
}

export class UsageTracker {
  private hourlyAudioSeconds = 0;
  private dailyAudioSeconds = 0;
  private requestsThisMinute = 0;
  private requestsToday = 0;
  private lastMinuteReset = Date.now();
  private lastHourReset = Date.now();
  private lastDayReset = Date.now();
  private cooldownUntil: Record<string, number> = {};

  // Groq limits per §8.6 & A4
  private readonly GROQ_MAX_AUDIO_SEC_HOUR = 7200;
  private readonly GROQ_MAX_AUDIO_SEC_DAY = 28800;
  private readonly GROQ_MAX_RPM = 20;

  constructor() {
    this.checkResets();
  }

  private checkResets(): void {
    const now = Date.now();
    if (now - this.lastMinuteReset >= 60000) {
      this.requestsThisMinute = 0;
      this.lastMinuteReset = now;
    }
    if (now - this.lastHourReset >= 3600000) {
      this.hourlyAudioSeconds = 0;
      this.lastHourReset = now;
    }
    if (now - this.lastDayReset >= 86400000) {
      this.dailyAudioSeconds = 0;
      this.requestsToday = 0;
      this.lastDayReset = now;
    }
  }

  public recordRequest(provider: string, audioDurationSec = 0): void {
    this.checkResets();
    this.requestsThisMinute++;
    this.requestsToday++;
    this.hourlyAudioSeconds += audioDurationSec;
    this.dailyAudioSeconds += audioDurationSec;
  }

  public setCooldown(provider: string, cooldownSec = 60): void {
    this.cooldownUntil[provider] = Date.now() + cooldownSec * 1000;
  }

  public isAvailable(provider: string): boolean {
    this.checkResets();
    const cooldown = this.cooldownUntil[provider];
    if (cooldown && Date.now() < cooldown) {
      return false;
    }

    if (provider === 'groq') {
      if (this.requestsThisMinute >= this.GROQ_MAX_RPM) return false;
      if (this.hourlyAudioSeconds >= this.GROQ_MAX_AUDIO_SEC_HOUR) return false;
      if (this.dailyAudioSeconds >= this.GROQ_MAX_AUDIO_SEC_DAY) return false;
    }

    return true;
  }

  public getUsage(): ProviderUsage {
    this.checkResets();
    return {
      hourlyAudioSeconds: Math.round(this.hourlyAudioSeconds),
      dailyAudioSeconds: Math.round(this.dailyAudioSeconds),
      requestsThisMinute: this.requestsThisMinute,
      requestsToday: this.requestsToday,
    };
  }
}

export const usageTracker = new UsageTracker();
