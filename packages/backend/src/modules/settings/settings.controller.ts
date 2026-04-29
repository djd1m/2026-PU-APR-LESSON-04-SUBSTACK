import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';

class UpdateSettingsDto {
  resend_api_key?: string;
  email_from?: string;
}

@Controller('api/settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings() {
    return this.settingsService.getAll();
  }

  @Patch()
  async updateSettings(@Body() dto: UpdateSettingsDto) {
    if (dto.resend_api_key) {
      await this.settingsService.set('resend_api_key', dto.resend_api_key);
    }
    if (dto.email_from) {
      await this.settingsService.set('email_from', dto.email_from);
    }
    return { message: 'Settings updated' };
  }

  @Get('email/test')
  async testEmail() {
    const apiKey = await this.settingsService.getResendApiKey();
    const from = await this.settingsService.getEmailFrom();
    return {
      configured: !!apiKey,
      from,
      apiKeyPreview: apiKey ? apiKey.slice(0, 8) + '...' : null,
    };
  }
}
