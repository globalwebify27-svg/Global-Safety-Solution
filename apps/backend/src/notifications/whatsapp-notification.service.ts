import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ZavuProvider } from './providers/zavu.provider';

@Injectable()
export class WhatsAppNotificationService {
  private readonly logger = new Logger(WhatsAppNotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async sendCertificateReminder(options: {
    to: string;
    client_name: string;
    cert_name: string;
    cert_no: string;
    expiry_date: string;
    days_remaining: number;
    contact_name: string;
    contact_phone: string;
  }) {
    try {
      // 1. Fetch system settings
      const settingsList = await this.prisma.systemSetting.findMany({
        where: {
          key: {
            in: [
              'whatsapp_enabled',
              'whatsapp_provider',
              'whatsapp_api_key',
              'whatsapp_environment',
              'whatsapp_default_template',
            ],
          },
        },
      });

      const settings = settingsList.reduce(
        (acc: Record<string, string>, s) => ({ ...acc, [s.key]: s.value }),
        {},
      );

      const isEnabled = settings['whatsapp_enabled'] === 'true';
      const apiKey = settings['whatsapp_api_key'] || '';
      const environment = (settings['whatsapp_environment'] || 'sandbox') as 'sandbox' | 'live';
      const defaultTemplate = settings['whatsapp_default_template'] || 'certificate_due_reminder';

      // 2. Runtime checks: Skip WhatsApp if disabled or credentials missing
      if (!isEnabled) {
        this.logger.log(`WhatsApp notifications are disabled. Skipping notification for certificate ${options.cert_no}.`);
        return { success: true, status: 'SKIPPED_DISABLED' };
      }

      if (!apiKey) {
        this.logger.warn(`WhatsApp is enabled but API Key is missing. Skipping notification.`);
        return { success: true, status: 'SKIPPED_MISSING_CREDENTIALS' };
      }

      // Format recipient phone number: ensure country code (e.g. +91 or +)
      let recipientPhone = options.to.replace(/\s+/g, '');
      if (!recipientPhone.startsWith('+')) {
        // Default to India country code if length is 10
        if (recipientPhone.length === 10) {
          recipientPhone = `+91${recipientPhone}`;
        } else {
          recipientPhone = `+${recipientPhone}`;
        }
      }

      const variables = {
        company_name: options.client_name,
        certificate_name: options.cert_name,
        certificate_number: options.cert_no,
        expiry_date: options.expiry_date,
        days_remaining: String(options.days_remaining),
        renewal_contact_name: options.contact_name,
        renewal_contact_number: options.contact_phone,
      };

      // 3. Resolve provider
      const provider = new ZavuProvider();

      // 4. Send using provider
      this.logger.log(`Triggering WhatsApp notification to ${recipientPhone} via Zavu...`);
      const result = await provider.sendTemplate({
        to: recipientPhone,
        templateName: defaultTemplate,
        variables,
        apiKey,
        environment,
      });

      // 5. Log the outcome to SystemLog table
      await this.prisma.systemLog.create({
        data: {
          type: 'WHATSAPP_LOG',
          name: defaultTemplate,
          message: `To: ${recipientPhone} | Status: ${result.success ? 'SENT' : 'FAILED'}`,
          body: JSON.stringify({
            messageId: result.messageId || null,
            error: result.errorMessage || null,
            environment,
          }),
          variables: JSON.stringify(variables),
        },
      });

      if (!result.success) {
        this.logger.error(`Failed to send WhatsApp message: ${result.errorMessage}`);
      }

      return {
        success: result.success,
        status: result.success ? 'SENT' : 'FAILED',
        messageId: result.messageId,
        error: result.errorMessage,
      };
    } catch (error: any) {
      this.logger.error(`Error in sendCertificateReminder: ${error?.message}`);
      // Failures should never interrupt the primary workflow
      try {
        await this.prisma.systemLog.create({
          data: {
            type: 'WHATSAPP_LOG',
            name: 'ERROR_FATAL',
            message: `Fatal error sending WhatsApp alert`,
            body: JSON.stringify({ error: error?.message || 'Unknown fatal error' }),
          },
        });
      } catch (logErr) {
        // Prevent recursive errors
      }
      return { success: false, status: 'ERROR', error: error?.message };
    }
  }
}
