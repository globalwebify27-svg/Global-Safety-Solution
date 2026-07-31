import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService, SendMailOptions } from './mail.service';
import { EmailQueueService } from './email-queue.service';

export interface SendTemplatedMailOptions {
  templateCode: string;
  to: string;
  context: Record<string, any>;
  attachments?: any[];
  module?: string;
  scheduledFor?: Date;
}

@Injectable()
export class TemplateEngineService {
  private readonly logger = new Logger(TemplateEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    @Inject(forwardRef(() => EmailQueueService))
    private readonly emailQueue: EmailQueueService,
  ) {}

  /**
   * Replaces all {{variable_name}} or {variable_name} placeholders in text/html with context values.
   */
  replacePlaceholders(text: string, context: Record<string, any>): string {
    if (!text) return '';
    return text.replace(/\{\{?\s*([a-zA-Z0-9_]+)\s*\}?\}/g, (match, key) => {
      const val = context[key];
      if (val !== undefined && val !== null) {
        return String(val);
      }
      // If variable key is missing in context, return empty string or keep tag clean
      return '';
    });
  }

  /**
   * Injects global EmailBranding (logo, address, website, legal text, social links) into template body.
   */
  wrapWithBrandingLayout(bodyHtml: string, branding: any): string {
    const companyName = branding?.company_name || 'Global Safety Solution ERP';
    const logoUrl = branding?.company_logo_url || '';
    const website = branding?.website || '';
    const phone = branding?.phone || '';
    const address = branding?.address || '';
    const footerText =
      branding?.footer_text ||
      '© 2026 Global Safety Solution. All rights reserved. Confidential ERP communication.';

    let socialLinksHtml = '';
    if (branding?.social_links) {
      try {
        const links =
          typeof branding.social_links === 'string'
            ? JSON.parse(branding.social_links)
            : branding.social_links;
        const linkItems = Object.entries(links)
          .filter(([_, url]) => Boolean(url))
          .map(
            ([platform, url]) =>
              `<a href="${url}" target="_blank" style="color: #2563eb; text-decoration: none; margin: 0 6px; font-weight: bold; text-transform: capitalize;">${platform}</a>`
          );
        if (linkItems.length > 0) {
          socialLinksHtml = `<div style="margin-top: 10px; font-size: 12px;">${linkItems.join(' | ')}</div>`;
        }
      } catch (e) {
        this.logger.warn(`Could not parse social links for email branding: ${e.message}`);
      }
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${companyName}</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a;">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 10px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
                  
                  <!-- HEADER -->
                  <tr>
                    <td style="background-color: #0f172a; padding: 24px 32px; text-align: left;">
                      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td>
                            ${
                              logoUrl
                                ? `<img src="${logoUrl}" alt="${companyName}" style="max-height: 40px; width: auto; display: block;" />`
                                : `<span style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">${companyName}</span>`
                            }
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- BODY CONTENT -->
                  <tr>
                    <td style="padding: 32px; font-size: 15px; line-height: 1.6; color: #334155;">
                      ${bodyHtml}
                    </td>
                  </tr>

                  <!-- FOOTER -->
                  <tr>
                    <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
                      <p style="margin: 0 0 8px 0; font-weight: 600; color: #475569;">${companyName}</p>
                      ${address ? `<p style="margin: 0 0 4px 0;">${address}</p>` : ''}
                      ${phone || website ? `<p style="margin: 0 0 8px 0;">${phone ? `Tel: ${phone}` : ''} ${phone && website ? '•' : ''} ${website ? `<a href="${website}" style="color: #2563eb; text-decoration: none;">${website}</a>` : ''}</p>` : ''}
                      ${socialLinksHtml}
                      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
                      <p style="margin: 0; font-size: 11px; color: #94a3b8;">${footerText}</p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  /**
   * Fetches template from DB, compiles placeholders using context, and wraps with branding layout.
   */
  async renderTemplate(templateCode: string, context: Record<string, any>) {
    let template: any = null;
    let branding: any = null;

    try {
      template = await this.prisma.emailTemplate.findFirst({
        where: { code: templateCode, is_active: true },
      });

      branding = await this.prisma.emailBranding.findFirst({
        orderBy: { created_at: 'desc' },
      });
    } catch (error) {
      this.logger.warn(`Failed to query database for template ${templateCode}: ${error.message}`);
    }

    // Default Fallback templates if not found in database
    if (!template) {
      template = this.getDefaultFallbackTemplate(templateCode);
    }

    // Merge default context variables (company_name, current_year)
    const mergedContext = {
      company_name: branding?.company_name || 'Global Safety Solution ERP',
      current_year: new Date().getFullYear(),
      ...context,
    };

    const renderedSubject = this.replacePlaceholders(template.subject, mergedContext);
    const renderedBody = this.replacePlaceholders(template.body_html, mergedContext);
    const finalHtml = this.wrapWithBrandingLayout(renderedBody, branding);

    // Strip HTML for plain text fallback
    const plainText = renderedBody.replace(/<[^>]*>?/gm, '').trim();

    return {
      subject: renderedSubject,
      html: finalHtml,
      text: plainText,
      template,
    };
  }

  /**
   * Live Preview renderer for frontend modal testing with sample data.
   */
  async renderPreview(templateIdOrCode: string, customContext?: Record<string, any>) {
    let template: any = null;
    let branding: any = null;

    try {
      template = await this.prisma.emailTemplate.findFirst({
        where: {
          OR: [{ id: templateIdOrCode }, { code: templateIdOrCode }],
        },
      });

      branding = await this.prisma.emailBranding.findFirst({
        orderBy: { created_at: 'desc' },
      });
    } catch (e) {
      this.logger.warn(`Preview template query notice: ${e.message}`);
    }

    if (!template) {
      template = this.getDefaultFallbackTemplate(templateIdOrCode);
    }

    const sampleContext = {
      client_name: 'Acme Industrial Safety Ltd',
      quotation_number: 'QT-2026-0042',
      invoice_number: 'INV-2026-0108',
      certificate_number: 'CERT-GSS-9912',
      engineer_name: 'Er. Rajesh Sharma',
      amount: '₹45,000.00',
      total_amount: '45,000.00',
      scheduled_date: '15-Aug-2026',
      expiry_date: '31-Dec-2026',
      certificate_name: 'Fire Safety Certificate - Grade A',
      site_location: 'Plot 42, GIDC Industrial Estate, Vadodara',
      company_name: branding?.company_name || 'Global Safety Solution ERP',
      ...customContext,
    };

    const renderedSubject = this.replacePlaceholders(template.subject, sampleContext);
    const renderedBody = this.replacePlaceholders(template.body_html, sampleContext);
    const finalHtml = this.wrapWithBrandingLayout(renderedBody, branding);

    return {
      template_name: template.name,
      template_code: template.code,
      subject: renderedSubject,
      html: finalHtml,
      sampleContext,
    };
  }

  /**
   * High-level method for ERP modules to render and send email asynchronously via EmailQueue.
   */
  async sendTemplatedEmail(options: SendTemplatedMailOptions) {
    const rendered = await this.renderTemplate(options.templateCode, options.context);

    // Enqueue email asynchronously (non-blocking)
    const logRecord = await this.emailQueue.enqueueEmail({
      recipient: options.to,
      subject: rendered.subject,
      bodyHtml: rendered.html,
      module: options.module || options.templateCode,
      templateCode: options.templateCode,
      scheduledFor: options.scheduledFor,
      attachments: options.attachments,
    });

    return {
      success: true,
      message: `Email queued for ${options.to}`,
      logId: logRecord.id,
      status: logRecord.status,
    };
  }

  /**
   * Internal helper for fallback templates
   */
  private getDefaultFallbackTemplate(code: string) {
    const defaults: Record<string, any> = {
      QUOTATION_PROPOSAL: {
        name: 'Quotation Proposal Email',
        code: 'QUOTATION_PROPOSAL',
        subject: 'Safety Solution Proposal #{quotation_number} for {client_name}',
        body_html: `
          <h2 style="color: #0f172a; margin-top: 0;">Safety Project Proposal</h2>
          <p>Dear <strong>{{client_name}}</strong>,</p>
          <p>We are pleased to issue Quotation Proposal <strong>#{{quotation_number}}</strong> for your safety compliance project.</p>
          <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px; color: #475569;">Quotation Ref: <strong>{{quotation_number}}</strong></p>
            <p style="margin: 4px 0 0 0; font-size: 16px; color: #0f172a; font-weight: bold;">Total Amount: {{amount}}</p>
          </div>
          <p>Please find the official proposal PDF attached for your review. You can accept the proposal online using the link below:</p>
          <p><a href="{{acceptance_link}}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; inline-block;">Review & Accept Proposal</a></p>
          <p style="margin-bottom: 0;">Warm regards,<br /><strong>{{company_name}}</strong></p>
        `,
      },
      SITE_VISIT_SCHEDULE: {
        name: 'Site Visit Schedule Email',
        code: 'SITE_VISIT_SCHEDULE',
        subject: 'Scheduled Site Visit Notice for {{client_name}}',
        body_html: `
          <h2 style="color: #0f172a; margin-top: 0;">Site Visit Schedule Notice</h2>
          <p>Dear <strong>{{client_name}}</strong>,</p>
          <p>Our field safety team has scheduled an upcoming inspection visit to your premises.</p>
          <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px;">Visit Date: <strong>{{scheduled_date}}</strong></p>
            <p style="margin: 4px 0 0 0; font-size: 14px;">Assigned Inspector: <strong>{{engineer_name}}</strong></p>
            <p style="margin: 4px 0 0 0; font-size: 14px;">Site Location: <strong>{{site_location}}</strong></p>
          </div>
          <p>Please ensure all equipment and relevant safety personnel are available.</p>
        `,
      },
      ENGINEER_TASK_ASSIGNMENT: {
        name: 'Engineer Task Assignment Email',
        code: 'ENGINEER_TASK_ASSIGNMENT',
        subject: '📋 New Field Task Assignment: {{task_title}}',
        body_html: `
          <h2 style="color: #0f172a; margin-top: 0;">Field Task Assignment</h2>
          <p>Hello <strong>{{engineer_name}}</strong>,</p>
          <p>You have been assigned a new technical task for project <strong>{{project_name}}</strong>.</p>
          <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px;">Task: <strong>{{task_title}}</strong></p>
            <p style="margin: 4px 0 0 0; font-size: 14px;">Target Due Date: <strong>{{due_date}}</strong></p>
            <p style="margin: 4px 0 0 0; font-size: 14px;">Priority: <strong>{{priority}}</strong></p>
          </div>
        `,
      },
      CERTIFICATE_DELIVERY: {
        name: 'Certificate Delivery Email',
        code: 'CERTIFICATE_DELIVERY',
        subject: '🛡️ Safety Certificate Issued: {{certificate_name}}',
        body_html: `
          <h2 style="color: #0f172a; margin-top: 0;">Official Safety Certificate Issued</h2>
          <p>Dear <strong>{{client_name}}</strong>,</p>
          <p>We are pleased to deliver your official Safety Audit & Compliance Certificate <strong>{{certificate_name}}</strong>.</p>
          <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px;">Certificate: <strong>{{certificate_name}}</strong></p>
            <p style="margin: 4px 0 0 0; font-size: 14px;">Valid Until: <strong>{{expiry_date}}</strong></p>
            {{inspection_summary}}
          </div>
          <p>The official signed certificate PDF is attached to this email. You can verify certificate validity online at any time.</p>
        `,
      },
      CERTIFICATE_EXPIRING_15: {
        name: 'Certificate Expiry Reminder (15 Days)',
        code: 'CERTIFICATE_EXPIRING_15',
        subject: '⏰ 15-Day Certificate Expiry Notice: {{certificate_name}}',
        body_html: `
          <h2 style="color: #d97706; margin-top: 0;">Certificate Expiring Soon</h2>
          <p>Dear <strong>{{client_name}}</strong>,</p>
          <p>Your safety compliance certificate <strong>{{certificate_name}}</strong> will expire in 15 days on <strong>{{expiry_date}}</strong>.</p>
          <p>Please contact us to schedule your re-testing inspection to prevent compliance lapses.</p>
        `,
      },
      INVOICE_GENERATED: {
        name: 'Tax Invoice Email',
        code: 'INVOICE_GENERATED',
        subject: 'Tax Invoice #{invoice_number} from {company_name}',
        body_html: `
          <h2 style="color: #0f172a; margin-top: 0;">Tax Invoice Issued</h2>
          <p>Dear <strong>{{client_name}}</strong>,</p>
          <p>Please find attached Tax Invoice <strong>#{{invoice_number}}</strong> for your safety solution services.</p>
          <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0; font-size: 14px;">Invoice Number: <strong>{{invoice_number}}</strong></p>
            <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: bold;">Amount Due: {{amount}}</p>
            <p style="margin: 4px 0 0 0; font-size: 14px;">Due Date: <strong>{{due_date}}</strong></p>
          </div>
        `,
      },
      PAYMENT_RECEIPT: {
        name: 'Payment Receipt Email',
        code: 'PAYMENT_RECEIPT',
        subject: 'Payment Confirmation Receipt for Invoice #{invoice_number}',
        body_html: `
          <h2 style="color: #10b981; margin-top: 0;">Payment Received - Thank You</h2>
          <p>Dear <strong>{{client_name}}</strong>,</p>
          <p>We have successfully received your payment of <strong>{{amount}}</strong> for Invoice <strong>#{{invoice_number}}</strong>.</p>
        `,
      },
      OVERDUE_PAYMENT_REMINDER: {
        name: 'Overdue Payment Reminder',
        code: 'OVERDUE_PAYMENT_REMINDER',
        subject: '⚠️ Overdue Payment Reminder: Invoice #{invoice_number}',
        body_html: `
          <h2 style="color: #dc2626; margin-top: 0;">Overdue Payment Reminder</h2>
          <p>Dear <strong>{{client_name}}</strong>,</p>
          <p>This is a formal payment reminder regarding Invoice <strong>#{{invoice_number}}</strong>, which was due on <strong>{{due_date}}</strong>.</p>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Total Invoice Amount:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #0f172a;">{{total_amount}}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #16a34a;">Total Paid Amount:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #16a34a;">- {{paid_amount}}</td>
              </tr>
              <tr style="border-top: 2px solid #cbd5e1;">
                <td style="padding: 10px 0; font-weight: bold; color: #dc2626; font-size: 15px;">Outstanding Balance Due:</td>
                <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #dc2626; font-size: 15px;">{{remaining_due}}</td>
              </tr>
            </table>
          </div>

          {{installment_breakdown_html}}

          <p>Please arrange payment for the remaining balance of <strong>{{remaining_due}}</strong> at your earliest convenience.</p>
        `,
      },
      CLIENT_WELCOME: {
        name: 'Welcome Email & Portal Access Link',
        code: 'CLIENT_WELCOME',
        subject: 'Welcome to Global Safety Solution - Client Portal Access',
        body_html: `
          <h2 style="color: #0f172a; margin-top: 0;">Welcome to {{company_name}}</h2>
          <p>Dear <strong>{{client_name}}</strong>,</p>
          <p>Your client portal account has been created successfully.</p>
          <p>For security, please click the secure link below to set your password and access your safety documents, certificates, and invoices:</p>
          <p><a href="{{setup_password_link}}" style="background-color: #10b981; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Set Up Password & Login</a></p>
        `,
      },
      CUSTOM_EMAIL: {
        name: 'Custom Compose Email',
        code: 'CUSTOM_EMAIL',
        subject: 'Message from {{company_name}}',
        body_html: `
          <p>Dear <strong>{{client_name}}</strong>,</p>
          <div>{{custom_message}}</div>
        `,
      },
    };

    return (
      defaults[code] || {
        name: `${code} Template`,
        code,
        subject: `System Notification: ${code}`,
        body_html: `<p>Hello {{client_name}},</p><p>This is an automated notification regarding ${code}.</p>`,
      }
    );
  }
}
