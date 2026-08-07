import { NotificationProvider, SendTemplateOptions } from './notification-provider.interface';

export class TwilioProvider implements NotificationProvider {
  async sendTemplate(options: SendTemplateOptions): Promise<{
    success: boolean;
    messageId?: string;
    errorMessage?: string;
  }> {
    return {
      success: false,
      errorMessage: 'Twilio provider driver is coming soon.',
    };
  }

  async verifyConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
    return {
      success: false,
      message: 'Twilio integration is coming soon.',
    };
  }
}
