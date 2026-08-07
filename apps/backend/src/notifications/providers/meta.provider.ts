import { NotificationProvider, SendTemplateOptions } from './notification-provider.interface';

export class MetaProvider implements NotificationProvider {
  async sendTemplate(options: SendTemplateOptions): Promise<{
    success: boolean;
    messageId?: string;
    errorMessage?: string;
  }> {
    return {
      success: false,
      errorMessage: 'Meta Cloud API provider driver is coming soon.',
    };
  }

  async verifyConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
    return {
      success: false,
      message: 'Meta Cloud API integration is coming soon.',
    };
  }
}
