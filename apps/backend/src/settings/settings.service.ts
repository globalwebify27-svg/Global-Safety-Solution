import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { encrypt } from '../common/utils/crypto.util';

const SECRET_KEYS = [
  'whatsapp_zavu_api_key',
  'whatsapp_meta_access_token',
  'whatsapp_twilio_auth_token',
  'whatsapp_meta_app_secret',
];

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const settings = await this.prisma.systemSetting.findMany();
    const settingsMap = settings.reduce(
      (acc: any, s: any) => ({ ...acc, [s.key]: s.value }),
      {}
    );

    const result = settings.reduce(
      (acc: any, s: any) => {
        let val = s.value;
        if (s.key === 'whatsapp_zavu_api_key') {
          // Handled separately below to ensure environment variable status is resolved
          return acc;
        }
        if (SECRET_KEYS.includes(s.key) && val) {
          val = '••••••••••••';
        }
        return { ...acc, [s.key]: val };
      },
      {},
    );

    const env = settingsMap['whatsapp_zavu_environment'] || 'sandbox';
    const hasKey = env === 'live' 
      ? !!process.env.ZAVU_LIVE_API_KEY 
      : !!process.env.ZAVU_SANDBOX_API_KEY;
    result['whatsapp_zavu_api_key'] = hasKey
      ? 'Managed securely by server environment'
      : 'Not configured (missing server environment variable)';

    return result;
  }

  async update(key: string, value: string, category: string = 'GENERAL') {
    if (key === 'whatsapp_zavu_api_key') {
      const existing = await this.prisma.systemSetting.findUnique({ where: { key } });
      return existing || { id: 'whatsapp_zavu_api_key_mock', key, value: '', category };
    }

    let finalValue = value;

    if (SECRET_KEYS.includes(key)) {
      // If the incoming value is masked, keep the existing encrypted value
      if (value === '••••••••••••' || (value && value.startsWith('•••')) || !value) {
        const existing = await this.prisma.systemSetting.findUnique({ where: { key } });
        if (existing) return existing;
      }
      // Encrypt new plain key value
      finalValue = encrypt(value);
    }

    return this.prisma.systemSetting.upsert({
      where: { key },
      update: { value: finalValue, category },
      create: { key, value: finalValue, category },
    });
  }

  async getAuditLogs() {
    return this.prisma.auditLog.findMany({
      where: {
        entity_type: 'SYSTEM_SETTING',
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 50,
    });
  }

  async updateBatch(settings: Record<string, string>, userId?: string) {
    // 1. Fetch current settings list for comparison
    const keysToCompare = Object.keys(settings);
    const existingSettings = await this.prisma.systemSetting.findMany({
      where: { key: { in: keysToCompare } },
    });
    const existingMap = existingSettings.reduce(
      (acc, s) => ({ ...acc, [s.key]: s.value }),
      {} as Record<string, string>,
    );

    // 2. Perform updates
    const promises = Object.entries(settings).map(([key, value]) =>
      this.update(key, value),
    );
    const results = await Promise.all(promises);

    // 3. Compare and record audit trail changes
    const changes: Record<string, { old: string; new: string }> = {};
    for (const [key, newValue] of Object.entries(settings)) {
      const oldValueRaw = existingMap[key] || '';

      // Determine what final value is saved (handling secrets masking and encryption)
      let finalNewValue = newValue;
      let finalOldValue = oldValueRaw;
      if (SECRET_KEYS.includes(key)) {
        if (newValue === '••••••••••••' || !newValue) {
          continue; // Key not modified
        }
        finalNewValue = '••••••••••••';
        finalOldValue = oldValueRaw ? '••••••••••••' : '';
      }

      if (finalOldValue !== finalNewValue) {
        changes[key] = {
          old: finalOldValue,
          new: finalNewValue,
        };
      }
    }

    if (Object.keys(changes).length > 0) {
      await this.prisma.auditLog.create({
        data: {
          user_id: userId || 'SYSTEM',
          action: 'UPDATE_SYSTEM_SETTINGS',
          entity_type: 'SYSTEM_SETTING',
          entity_id: 'SYSTEM',
          old_data: JSON.stringify(existingMap),
          new_data: JSON.stringify(settings),
        },
      });
    }

    return results;
  }
}
