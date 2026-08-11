import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderFactory } from './providers/provider.factory';
import { decrypt } from '../common/utils/crypto.util';
import { WhatsAppTemplatesService } from './whatsapp-templates.service';

@Injectable()
export class WhatsAppNotificationService {
  private readonly logger = new Logger(WhatsAppNotificationService.name);

  // Failover state registers
  private consecutiveFailures = 0;
  private isFailedOver = false;
  private tempProvider: string | null = null;
  private failoverExpiresAt: Date | null = null;
  private readonly fallbackSequence = ['Zavu', 'Meta', 'Twilio'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly templatesService: WhatsAppTemplatesService,
  ) {}

  private async handleDispatchOutcome(success: boolean, providerUsed: string) {
    const now = new Date();

    // Check if failover has expired
    if (this.isFailedOver && this.failoverExpiresAt && now >= this.failoverExpiresAt) {
      this.logger.log(`WhatsApp failover window expired. Resetting active provider back to default.`);
      this.isFailedOver = false;
      this.tempProvider = null;
      this.failoverExpiresAt = null;
      this.consecutiveFailures = 0;
    }

    if (success) {
      // Reset failures on successful send of the default provider
      if (!this.isFailedOver) {
        this.consecutiveFailures = 0;
      }
      return;
    }

    // On failure
    if (this.isFailedOver) {
      this.logger.warn(`Failed dispatch registered using fallback provider '${providerUsed}'.`);
      return;
    }

    this.consecutiveFailures++;
    this.logger.warn(`WhatsApp dispatch failure registered. Consecutive failures: ${this.consecutiveFailures}/3`);

    if (this.consecutiveFailures >= 3) {
      // Trigger Failover!
      const activeIdx = this.fallbackSequence.findIndex(p => p.toUpperCase() === providerUsed.toUpperCase());
      let fallbackIndex = activeIdx + 1;
      if (fallbackIndex >= this.fallbackSequence.length || fallbackIndex < 0) {
        fallbackIndex = 0;
      }
      const selectedFallback = this.fallbackSequence[fallbackIndex];

      this.isFailedOver = true;
      this.tempProvider = selectedFallback;
      this.failoverExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour cooldown

      this.logger.error(
        `CRITICAL: WhatsApp provider '${providerUsed}' failed 3 times consecutively. Switching to fallback provider '${selectedFallback}' for 1 hour.`,
      );

      // Write warning log to SystemLog
      try {
        await this.prisma.systemLog.create({
          data: {
            type: 'WHATSAPP_FAILOVER',
            name: 'PROVIDER_FALLBACK',
            message: `CRITICAL: Switching WhatsApp provider from '${providerUsed}' to '${selectedFallback}' due to 3 consecutive failures.`,
            body: JSON.stringify({
              consecutiveFailures: this.consecutiveFailures,
              failedProvider: providerUsed,
              fallbackProvider: selectedFallback,
              expiresAt: this.failoverExpiresAt,
            }),
          },
        });
      } catch {}
    }
  }

  async getActiveProviderConfig() {
    const settingsList = await this.prisma.systemSetting.findMany({
      where: {
        key: {
          startsWith: 'whatsapp_',
        },
      },
    });

    const settings = settingsList.reduce(
      (acc: Record<string, string>, s) => ({ ...acc, [s.key]: s.value }),
      {},
    );

    const isEnabled = settings['whatsapp_enabled'] === 'true';
    const activeProvider = (settings['whatsapp_active_provider'] || 'Zavu').toUpperCase();

    let apiKey = '';
    let environment: 'sandbox' | 'live' = 'sandbox';
    let defaultTemplate = 'certificate_due_reminder';
    let phoneId = '';
    let accountId = '';

    if (activeProvider === 'ZAVU') {
      environment = (settings['whatsapp_zavu_environment'] || 'sandbox') as 'sandbox' | 'live';
      apiKey = environment === 'live'
        ? (process.env.ZAVU_LIVE_API_KEY || '')
        : (process.env.ZAVU_SANDBOX_API_KEY || '');
      defaultTemplate = settings['whatsapp_zavu_default_template'] || 'certificate_due_reminder';
      phoneId = settings['whatsapp_zavu_phone_number_id'] || '';
      accountId = settings['whatsapp_zavu_business_account_id'] || '';
    } else if (activeProvider === 'META') {
      apiKey = decrypt(settings['whatsapp_meta_access_token'] || '');
      phoneId = settings['whatsapp_meta_phone_number_id'] || '';
      accountId = settings['whatsapp_meta_business_account_id'] || '';
      defaultTemplate = settings['whatsapp_meta_default_template'] || 'certificate_due_reminder';
    } else if (activeProvider === 'TWILIO') {
      apiKey = decrypt(settings['whatsapp_twilio_auth_token'] || '');
      accountId = settings['whatsapp_twilio_account_sid'] || '';
      phoneId = settings['whatsapp_twilio_sender_number'] || '';
      defaultTemplate = settings['whatsapp_twilio_default_template'] || 'certificate_due_reminder';
    }

    return {
      isEnabled,
      activeProvider,
      apiKey,
      environment,
      defaultTemplate,
      phoneId,
      accountId,
      zavuApiKey: (settings['whatsapp_zavu_environment'] || 'sandbox') === 'live'
        ? (process.env.ZAVU_LIVE_API_KEY ? 'Managed securely by server environment' : 'Not configured (missing server environment variable)')
        : (process.env.ZAVU_SANDBOX_API_KEY ? 'Managed securely by server environment' : 'Not configured (missing server environment variable)'),
      metaAccessToken: decrypt(settings['whatsapp_meta_access_token'] || ''),
      twilioAuthToken: decrypt(settings['whatsapp_twilio_auth_token'] || ''),
    };
  }

  async testConnection(providerName: string, apiKey: string) {
    try {
      let resolvedApiKey = apiKey;
      if (providerName.toLowerCase() === 'zavu') {
        const settingsList = await this.prisma.systemSetting.findMany({
          where: { key: 'whatsapp_zavu_environment' }
        });
        const environment = settingsList[0]?.value || 'sandbox';
        resolvedApiKey = environment === 'live'
          ? (process.env.ZAVU_LIVE_API_KEY || '')
          : (process.env.ZAVU_SANDBOX_API_KEY || '');
        if (!resolvedApiKey) {
          return {
            success: false,
            message: environment === 'live'
              ? 'Zavu Production API key is not configured on the server.'
              : 'Zavu Sandbox API key is not configured on the server.',
          };
        }
      }
      const provider = ProviderFactory.getProvider(providerName);
      return await provider.verifyConnection(resolvedApiKey);
    } catch (error: any) {
      return { success: false, message: error?.message || 'Failed to instantiate provider.' };
    }
  }

  async testSandboxConnection(providerName: string, apiKey: string) {
    const logs: string[] = [];
    try {
      logs.push(`[1/4] Checking Sandbox Token credentials...`);
      
      let resolvedApiKey = apiKey;
      if (providerName.toLowerCase() === 'zavu') {
        resolvedApiKey = process.env.ZAVU_SANDBOX_API_KEY || '';
        if (!resolvedApiKey) {
          throw new Error('Zavu Sandbox API key is not configured on the server.');
        }
      }
      
      if (providerName.toLowerCase() === 'zavu' && !resolvedApiKey.startsWith('zv_test_')) {
        throw new Error(`Token validation failed: Zavu Sandbox tokens must start with 'zv_test_'`);
      }
      logs.push(`Token format matches 'zv_test_' validation rules.`);

      logs.push(`[2/4] Initializing provider driver factory...`);
      const provider = ProviderFactory.getProvider(providerName);
      logs.push(`Successfully loaded provider driver: ${providerName}.`);

      logs.push(`[3/4] Testing sandbox server connection ping...`);
      const verifyResult = await provider.verifyConnection(resolvedApiKey);
      if (!verifyResult.success) {
        throw new Error(verifyResult.message || 'API connection refused by remote sandbox host.');
      }
      logs.push(`Connection established: ${verifyResult.message}`);

      logs.push(`[4/4] Connection verification completed successfully! Sandbox is ready.`);
      return {
        success: true,
        logs,
      };
    } catch (err: any) {
      logs.push(`CRITICAL ERROR: ${err.message}`);
      return {
        success: false,
        message: err.message,
        logs,
      };
    }
  }

  async sendTestMessage(options: {
    providerName: string;
    apiKey: string;
    environment: 'sandbox' | 'live';
    to: string;
    template: string;
  }) {
    try {
      let resolvedApiKey = options.apiKey;
      if (options.providerName.toLowerCase() === 'zavu') {
        resolvedApiKey = options.environment === 'live'
          ? (process.env.ZAVU_LIVE_API_KEY || '')
          : (process.env.ZAVU_SANDBOX_API_KEY || '');
        if (!resolvedApiKey) {
          return {
            success: false,
            message: options.environment === 'live'
              ? 'Zavu Production API key is not configured on the server.'
              : 'Zavu Sandbox API key is not configured on the server.',
          };
        }
      }
      const provider = ProviderFactory.getProvider(options.providerName);
      const result = await provider.sendTemplate({
        to: options.to,
        templateName: options.template,
        apiKey: resolvedApiKey,
        environment: options.environment,
        variables: {
          company_name: 'Test Corp Ltd',
          certificate_name: 'Standard Safety Test',
          certificate_number: 'TEST-12345',
          expiry_date: new Date().toLocaleDateString('en-IN'),
          days_remaining: '15',
          renewal_contact_name: 'Test Contact Officer',
          renewal_contact_number: options.to,
        },
      });

      return {
        success: result.success,
        message: result.success ? 'Test message sent successfully!' : result.errorMessage || 'Unknown error',
        messageId: result.messageId,
      };
    } catch (error: any) {
      return { success: false, message: error?.message || 'Integration error occurred.' };
    }
  }

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
    return this.sendNotification({
      to: options.to,
      templateCode: 'CERTIFICATE_EXPIRING',
      context: {
        company_name: options.client_name,
        certificate_name: options.cert_name,
        certificate_number: options.cert_no,
        expiry_date: options.expiry_date,
        days_remaining: options.days_remaining,
        contact_name: options.contact_name,
        contact_phone: options.contact_phone,
      },
    });
  }

  async sendNotification(options: {
    to: string;
    templateCode: string;
    context: Record<string, any>;
    logId?: string;
  }) {
    try {
      const config = await this.getActiveProviderConfig();

      let validationError: string | null = null;

      // 1. Validate WhatsApp is enabled
      if (!config.isEnabled) {
        validationError = 'WhatsApp notifications disabled globally.';
      }
      // 2. Validate active provider is selected
      else if (!config.activeProvider) {
        validationError = 'WhatsApp active provider not selected.';
      }
      // 3. Validate API key is configured
      else if (!config.apiKey) {
        validationError = 'WhatsApp API key is missing.';
      }

      // Resolve provider details with failover checks
      let providerName = config.activeProvider;
      let resolvedApiKey = config.apiKey;
      const now = new Date();
      if (this.isFailedOver && this.failoverExpiresAt && now < this.failoverExpiresAt) {
        providerName = (this.tempProvider || config.activeProvider).toUpperCase();
        if (providerName === 'ZAVU') resolvedApiKey = config.zavuApiKey;
        else if (providerName === 'META') resolvedApiKey = config.metaAccessToken;
        else if (providerName === 'TWILIO') resolvedApiKey = config.twilioAuthToken;
      }

      // 4. Validate required provider credentials are available
      if (!validationError && !resolvedApiKey) {
        validationError = `WhatsApp credentials API key is missing for provider ${providerName}.`;
      }

      // Resolve mapped variables from templates registry
      const mapped = await this.templatesService.resolveMappedVariables(options.templateCode, options.context);
      const templateName = mapped.templateName;
      const variables = mapped.variables;

      // 5. Validate required template is configured
      if (!validationError && (!templateName || templateName === options.templateCode.toLowerCase())) {
        const templateRecord = await this.prisma.whatsAppTemplate.findFirst({
          where: { code: options.templateCode },
        });
        if (!templateRecord || !templateRecord.is_active || !templateRecord.template_name) {
          validationError = `Required WhatsApp template mapping '${options.templateCode}' is missing or inactive in registry.`;
        }
      }

      if (validationError) {
        this.logger.warn(`WhatsApp validation failed: ${validationError}. Skipping dispatch.`);
        const logData = {
          recipient: options.to,
          template_code: templateName || options.templateCode,
          notification_type: options.templateCode,
          provider: providerName || 'UNKNOWN',
          environment: config.environment,
          status: 'SKIPPED' as const,
          failure_reason: 'Missing or invalid provider configuration.',
          provider_response: JSON.stringify({ error: validationError }),
          sent_at: null,
        };

        if (options.logId) {
          await this.prisma.whatsAppLog.update({
            where: { id: options.logId },
            data: logData,
          });
        } else {
          await this.prisma.whatsAppLog.create({
            data: logData,
          });
        }

        return {
          success: false,
          status: 'SKIPPED',
          error: 'Missing or invalid provider configuration.',
        };
      }

      let recipientPhone = options.to.replace(/\s+/g, '');
      if (!recipientPhone.startsWith('+')) {
        if (recipientPhone.length === 10) {
          recipientPhone = `+91${recipientPhone}`;
        } else {
          recipientPhone = `+${recipientPhone}`;
        }
      }

      const provider = ProviderFactory.getProvider(providerName);

      this.logger.log(`Triggering WhatsApp notification [${options.templateCode}] using template [${templateName}] to ${recipientPhone} via ${providerName}...`);
      const result = await provider.sendTemplate({
        to: recipientPhone,
        templateName,
        variables,
        apiKey: resolvedApiKey,
        environment: config.environment,
      });

      // Update failover stats based on success/failure outcome
      await this.handleDispatchOutcome(result.success, providerName);

      const logData = {
        recipient: recipientPhone,
        message_id: result.messageId || null,
        template_code: templateName,
        notification_type: options.templateCode,
        provider: providerName,
        environment: config.environment,
        status: result.success ? ('SENT' as const) : ('FAILED' as const),
        failure_reason: result.success ? null : (result.errorMessage || 'Provider dispatch failed'),
        provider_response: JSON.stringify(result),
        request_payload: JSON.stringify({ to: recipientPhone, template: templateName, variables }),
        sent_at: result.success ? new Date() : null,
      };

      if (options.logId) {
        await this.prisma.whatsAppLog.update({
          where: { id: options.logId },
          data: logData,
        });
      } else {
        await this.prisma.whatsAppLog.create({
          data: logData,
        });
      }

      return {
        success: result.success,
        status: result.success ? 'SENT' : 'FAILED',
        messageId: result.messageId,
        error: result.errorMessage,
      };
    } catch (error: any) {
      this.logger.error(`Error in sendNotification: ${error?.message}`);
      const logData = {
        recipient: options.to || 'UNKNOWN',
        template_code: options.templateCode,
        notification_type: options.templateCode,
        provider: 'UNKNOWN',
        status: 'FAILED' as const,
        failure_reason: error?.message || 'Unknown fatal exception',
        provider_response: JSON.stringify({ exception: error?.message }),
      };

      if (options.logId) {
        await this.prisma.whatsAppLog.update({
          where: { id: options.logId },
          data: logData,
        });
      } else {
        await this.prisma.whatsAppLog.create({
          data: logData,
        });
      }

      return { success: false, status: 'FAILED', error: error?.message };
    }
  }
}
