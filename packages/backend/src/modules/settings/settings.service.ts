import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async get(key: string): Promise<string | null> {
    const setting = await this.prisma.platformSetting.findUnique({
      where: { key },
    });
    return setting?.value ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    await this.prisma.platformSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    this.logger.log(`Setting updated: ${key}`);
  }

  async getAll(): Promise<Record<string, string>> {
    const settings = await this.prisma.platformSetting.findMany();
    const result: Record<string, string> = {};
    for (const s of settings) {
      // Mask sensitive values
      if (s.key.includes('api_key') || s.key.includes('secret')) {
        result[s.key] = s.value.slice(0, 8) + '...' + s.value.slice(-4);
      } else {
        result[s.key] = s.value;
      }
    }
    return result;
  }

  /**
   * Get Resend API key — from DB first, fallback to env var.
   */
  async getResendApiKey(): Promise<string | null> {
    const fromDb = await this.get('resend_api_key');
    if (fromDb) return fromDb;
    const fromEnv = process.env.RESEND_API_KEY;
    if (fromEnv && !fromEnv.startsWith('re_xxx')) return fromEnv;
    return null;
  }

  async getEmailFrom(): Promise<string> {
    const fromDb = await this.get('email_from');
    return fromDb ?? process.env.EMAIL_FROM ?? 'noreply@substackru.com';
  }
}
