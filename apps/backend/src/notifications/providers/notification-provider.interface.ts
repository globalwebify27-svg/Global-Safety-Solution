export interface SendTemplateOptions {
  to: string;
  templateName: string;
  variables: Record<string, string>;
  apiKey: string;
  environment: 'sandbox' | 'live';
}

export interface NotificationProvider {
  sendTemplate(options: SendTemplateOptions): Promise<{
    success: boolean;
    messageId?: string;
    errorMessage?: string;
  }>;
  verifyConnection(apiKey: string): Promise<{
    success: boolean;
    message: string;
  }>;
}
