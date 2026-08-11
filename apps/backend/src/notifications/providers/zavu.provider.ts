import { NotificationProvider, SendTemplateOptions } from './notification-provider.interface';

export class ZavuProvider implements NotificationProvider {
  async sendTemplate(options: SendTemplateOptions): Promise<{
    success: boolean;
    messageId?: string;
    errorMessage?: string;
  }> {
    const url = 'https://api.zavu.dev/v1/messages';

    // Map named variables to Zavu's numbered format "1", "2", "3" etc.
    // Order based on template definition:
    // 1: Company Name (client_name)
    // 2: Certificate Name
    // 3: Certificate Number
    // 4: Expiry Date
    // 5: Days Remaining
    // 6: Renewal Contact Name
    // 7: Renewal Contact Number
    const templateVariables: Record<string, string> = {
      '1': options.variables.company_name || '',
      '2': options.variables.certificate_name || '',
      '3': options.variables.certificate_number || '',
      '4': options.variables.expiry_date || '',
      '5': options.variables.days_remaining || '',
      '6': options.variables.renewal_contact_name || '',
      '7': options.variables.renewal_contact_number || '',
    };

    const payload = {
      to: options.to,
      messageType: 'template',
      content: {
        templateId: options.templateName,
        templateVariables,
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${options.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = { message: text };
      }

      if (!response.ok) {
        return {
          success: false,
          errorMessage: data?.message || data?.error || `HTTP error ${response.status}`,
        };
      }

      return {
        success: true,
        messageId: data?.id || data?.messageId || 'zavu-msg-ok',
      };
    } catch (error: any) {
      return {
        success: false,
        errorMessage: error?.message || 'Unknown network error',
      };
    }
  }

  async verifyConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
    const url = 'https://api.zavu.dev/v1/templates';
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return {
            success: false,
            message: 'Zavu Sandbox API authentication failed.',
          };
        }
        return {
          success: false,
          message: `API validation failed (HTTP ${response.status})`,
        };
      }

      return {
        success: true,
        message: 'Zavu Sandbox API connection successful.',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.message || 'Network connectivity error',
      };
    }
  }
}
