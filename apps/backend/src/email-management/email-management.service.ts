import { Injectable, Logger, OnModuleInit, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';

@Injectable()
export class EmailManagementService implements OnModuleInit {
  private readonly logger = new Logger(EmailManagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing Email Management tables if not existing...');
    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS smtp_configs (
          id VARCHAR(36) PRIMARY KEY,
          host VARCHAR(255) NOT NULL,
          port INT NOT NULL DEFAULT 587,
          username VARCHAR(255) NOT NULL,
          password_encrypted TEXT NOT NULL,
          sender_name VARCHAR(255) NOT NULL,
          sender_email VARCHAR(255) NOT NULL,
          reply_to_email VARCHAR(255),
          encryption_type VARCHAR(50) NOT NULL DEFAULT 'TLS',
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS email_templates (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          code VARCHAR(100) UNIQUE NOT NULL,
          subject VARCHAR(255) NOT NULL,
          body_html LONGTEXT NOT NULL,
          variables TEXT,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS email_branding (
          id VARCHAR(36) PRIMARY KEY,
          company_name VARCHAR(255) NOT NULL,
          company_logo_url TEXT,
          address TEXT,
          website VARCHAR(255),
          phone VARCHAR(50),
          footer_text TEXT,
          social_links TEXT,
          created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS notification_rules (
          id VARCHAR(36) PRIMARY KEY,
          event_name VARCHAR(100) UNIQUE NOT NULL,
          module VARCHAR(100) NOT NULL,
          description TEXT,
          is_email_enabled TINYINT(1) NOT NULL DEFAULT 1,
          template_id VARCHAR(36),
          advanced_config TEXT,
          created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS notification_rule_audit_logs (
          id VARCHAR(36) PRIMARY KEY,
          user_id VARCHAR(36),
          user_name VARCHAR(255),
          role VARCHAR(100),
          event_name VARCHAR(100) NOT NULL,
          old_value TINYINT(1),
          new_value TINYINT(1) NOT NULL,
          ip_address VARCHAR(100),
          created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await this.prisma.$executeRawUnsafe(`DELETE FROM notification_rules WHERE event_name = 'CERTIFICATE_RENEWAL_30'`).catch(() => {});
      await this.prisma.$executeRawUnsafe(`DELETE FROM email_templates WHERE code = 'CERTIFICATE_RENEWAL_30'`).catch(() => {});

      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS email_logs (
          id VARCHAR(36) PRIMARY KEY,
          recipient VARCHAR(255) NOT NULL,
          subject VARCHAR(255) NOT NULL,
          module VARCHAR(100) NOT NULL,
          template_code VARCHAR(100),
          status VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
          retry_count INT NOT NULL DEFAULT 0,
          max_retries INT NOT NULL DEFAULT 3,
          scheduled_for DATETIME(6),
          sent_date DATETIME(6),
          error_message TEXT,
          metadata TEXT,
          body_html LONGTEXT,
          attachments LONGTEXT,
          created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      // Add missing columns / alter column types if table pre-existed
      const alterQueries = [
        `ALTER TABLE email_logs ADD COLUMN template_code VARCHAR(100) NULL`,
        `ALTER TABLE email_logs ADD COLUMN retry_count INT NOT NULL DEFAULT 0`,
        `ALTER TABLE email_logs ADD COLUMN max_retries INT NOT NULL DEFAULT 3`,
        `ALTER TABLE email_logs ADD COLUMN scheduled_for DATETIME(6) NULL`,
        `ALTER TABLE email_logs ADD COLUMN body_html LONGTEXT NULL`,
        `ALTER TABLE email_logs ADD COLUMN attachments LONGTEXT NULL`,
        `ALTER TABLE email_logs MODIFY COLUMN attachments LONGTEXT NULL`,
        `ALTER TABLE notification_rules ADD COLUMN advanced_config TEXT NULL`,
      ];

      for (const query of alterQueries) {
        try {
          await this.prisma.$executeRawUnsafe(query);
        } catch {
          // Column already exists
        }
      }

      this.logger.log('Email Management database tables verified/created successfully!');
    } catch (error) {
      this.logger.warn(`Could not run raw DDL table initialization: ${error.message}`);
    }
  }

  // --- 1. SMTP CONFIGURATION ---
  async getSmtpConfig() {
    try {
      const config = await this.prisma.smtpConfig.findFirst({
        orderBy: { created_at: 'desc' },
      });
      if (config) return config;
    } catch (e) {
      this.logger.warn(`getSmtpConfig DB query notice: ${e.message}`);
    }

    return {
      host: 'smtp.gmail.com',
      port: 587,
      username: 'notifications@globalsafety.com',
      password_encrypted: '••••••••••••',
      sender_name: 'Global Safety Solution ERP',
      sender_email: 'noreply@globalsafety.com',
      reply_to_email: 'support@globalsafety.com',
      encryption_type: 'TLS',
      is_active: true,
    };
  }

  async upsertSmtpConfig(data: any) {
    const payload = {
      host: data.host,
      port: Number(data.port) || 587,
      username: data.username,
      password_encrypted: data.password_encrypted || data.password || 'ENCRYPTED_PASSWORD_HASH',
      sender_name: data.sender_name,
      sender_email: data.sender_email,
      reply_to_email: data.reply_to_email || null,
      encryption_type: data.encryption_type || 'TLS',
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
    };

    try {
      const existing = await this.prisma.smtpConfig.findFirst({
        orderBy: { created_at: 'desc' },
      });

      if (existing) {
        return await this.prisma.smtpConfig.update({
          where: { id: existing.id },
          data: payload,
        });
      }

      return await this.prisma.smtpConfig.create({
        data: payload,
      });
    } catch (e) {
      this.logger.warn(`upsertSmtpConfig fallback: ${e.message}`);
      return { id: `smtp-${Date.now()}`, ...payload, created_at: new Date() };
    }
  }

  // --- 2. EMAIL TEMPLATES ---
  async getEmailTemplates() {
    const defaultTemplates = [
      {
        id: 'tpl-1',
        name: 'Quotation Proposal Email',
        code: 'QUOTATION_PROPOSAL',
        subject: 'Safety Solution Proposal #{quotation_number} for {client_name}',
        body_html: '<h2>Dear {client_name},</h2><p>Please find attached Quotation Proposal <strong>#{quotation_number}</strong> for amount {amount}.</p><p><a href="{acceptance_link}">Review & Accept Proposal</a></p>',
        variables: JSON.stringify(['{client_name}', '{quotation_number}', '{amount}', '{acceptance_link}']),
        is_active: true,
        created_at: new Date(),
      },
      {
        id: 'tpl-2',
        name: 'Site Visit Schedule Email',
        code: 'SITE_VISIT_SCHEDULE',
        subject: 'Scheduled Site Visit Notice for {client_name}',
        body_html: '<h2>Dear {client_name},</h2><p>Our team has scheduled a site visit on {scheduled_date} with Inspector {engineer_name}.</p>',
        variables: JSON.stringify(['{client_name}', '{scheduled_date}', '{engineer_name}', '{site_location}']),
        is_active: true,
        created_at: new Date(),
      },
      {
        id: 'tpl-3',
        name: 'Engineer Task Assignment Email',
        code: 'ENGINEER_TASK_ASSIGNMENT',
        subject: '📋 New Field Task Assignment: {task_title}',
        body_html: '<h2>Hello {engineer_name},</h2><p>You have been assigned to task <strong>{task_title}</strong> due on {due_date}.</p>',
        variables: JSON.stringify(['{engineer_name}', '{task_title}', '{due_date}', '{priority}']),
        is_active: true,
        created_at: new Date(),
      },
      {
        id: 'tpl-4',
        name: 'Certificate Delivery Email',
        code: 'CERTIFICATE_DELIVERY',
        subject: '🛡️ Safety Certificate Issued: {certificate_name}',
        body_html: '<h2>Dear {client_name},</h2><p>Your official Safety Certificate <strong>{certificate_name}</strong> has been issued. {inspection_summary}</p>',
        variables: JSON.stringify(['{client_name}', '{certificate_name}', '{expiry_date}', '{inspection_summary}']),
        is_active: true,
        created_at: new Date(),
      },
      {
        id: 'tpl-5',
        name: 'Certificate Expiry Reminder (15 Days)',
        code: 'CERTIFICATE_EXPIRING_15',
        subject: '⏰ 15-Day Certificate Expiry Notice: {certificate_name}',
        body_html: '<h2>Dear {client_name},</h2><p>Your certificate <strong>{certificate_name}</strong> expires in 15 days on {expiry_date}.</p>',
        variables: JSON.stringify(['{client_name}', '{certificate_name}', '{expiry_date}']),
        is_active: true,
        created_at: new Date(),
      },
      {
        id: 'tpl-7',
        name: 'Tax Invoice Email',
        code: 'INVOICE_GENERATED',
        subject: 'Tax Invoice #{invoice_number} from {company_name}',
        body_html: '<h2>Dear {client_name},</h2><p>Please find attached Invoice <strong>#{invoice_number}</strong> for amount {amount}.</p>',
        variables: JSON.stringify(['{client_name}', '{invoice_number}', '{amount}', '{due_date}']),
        is_active: true,
        created_at: new Date(),
      },
      {
        id: 'tpl-8',
        name: 'Payment Receipt Email',
        code: 'PAYMENT_RECEIPT',
        subject: 'Payment Confirmation Receipt for Invoice #{invoice_number}',
        body_html: '<h2>Dear {client_name},</h2><p>We received your payment of {amount} for Invoice <strong>#{invoice_number}</strong>.</p>',
        variables: JSON.stringify(['{client_name}', '{invoice_number}', '{amount}']),
        is_active: true,
        created_at: new Date(),
      },
      {
        id: 'tpl-9',
        name: 'Overdue Payment Reminder',
        code: 'OVERDUE_PAYMENT_REMINDER',
        subject: '⚠️ Overdue Payment Reminder: Invoice #{invoice_number}',
        body_html: '<h2>Dear {client_name},</h2><p>Invoice <strong>#{invoice_number}</strong> for amount {amount} is overdue.</p>',
        variables: JSON.stringify(['{client_name}', '{invoice_number}', '{amount}', '{due_date}']),
        is_active: true,
        created_at: new Date(),
      },
      {
        id: 'tpl-10',
        name: 'Welcome Email & Portal Access Link',
        code: 'CLIENT_WELCOME',
        subject: 'Welcome to Global Safety Solution - Client Portal Access',
        body_html: '<h2>Welcome {client_name},</h2><p>Please click the link below to set your password: <a href="{setup_password_link}">Set Password</a></p>',
        variables: JSON.stringify(['{client_name}', '{setup_password_link}', '{company_name}']),
        is_active: true,
        created_at: new Date(),
      },
      {
        id: 'tpl-11',
        name: 'Custom Compose Email',
        code: 'CUSTOM_EMAIL',
        subject: 'Message from {company_name}',
        body_html: '<p>Dear {client_name},</p><div>{custom_message}</div>',
        variables: JSON.stringify(['{client_name}', '{custom_message}', '{company_name}']),
        is_active: true,
        created_at: new Date(),
      },
    ];

    try {
      const templates = await this.prisma.emailTemplate.findMany({
        orderBy: { created_at: 'desc' },
      });
      if (templates.length > 0) return templates;
    } catch (e) {
      this.logger.warn(`getEmailTemplates DB query notice: ${e.message}`);
    }

    return defaultTemplates;
  }

  async createEmailTemplate(data: any) {
    const payload = {
      name: data.name,
      code: (data.code || 'CUSTOM').toUpperCase(),
      subject: data.subject,
      body_html: data.body_html,
      variables: typeof data.variables === 'string' ? data.variables : JSON.stringify(data.variables || []),
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
    };

    try {
      return await this.prisma.emailTemplate.create({ data: payload });
    } catch (e) {
      this.logger.warn(`createEmailTemplate fallback: ${e.message}`);
      return { id: `tpl-${Date.now()}`, ...payload, created_at: new Date() };
    }
  }

  async updateEmailTemplate(id: string, data: any) {
    const payload = {
      name: data.name,
      subject: data.subject,
      body_html: data.body_html,
      variables: typeof data.variables === 'string' ? data.variables : JSON.stringify(data.variables || []),
      is_active: data.is_active !== undefined ? Boolean(data.is_active) : true,
    };

    try {
      return await this.prisma.emailTemplate.update({
        where: { id },
        data: payload,
      });
    } catch (e) {
      this.logger.warn(`updateEmailTemplate fallback: ${e.message}`);
      return { id, code: data.code || 'CUSTOM', ...payload, updated_at: new Date() };
    }
  }

  async deleteEmailTemplate(id: string) {
    try {
      return await this.prisma.emailTemplate.delete({ where: { id } });
    } catch (e) {
      this.logger.warn(`deleteEmailTemplate fallback: ${e.message}`);
      return { id, deleted: true };
    }
  }

  // --- 3. EMAIL BRANDING ---
  async getEmailBranding() {
    const defaultBranding = {
      company_name: 'Global Safety Solution ERP',
      company_logo_url: 'https://globalsafety.com/logo.png',
      address: '123 Enterprise Way, Industrial Park, Suite 400',
      website: 'https://globalsafety.com',
      phone: '+91 98765 43210',
      footer_text: '© 2026 Global Safety Solution. All rights reserved. Confidential ERP communication.',
      social_links: JSON.stringify({
        linkedin: 'https://linkedin.com/company/globalsafety',
        twitter: 'https://twitter.com/globalsafety',
        facebook: 'https://facebook.com/globalsafety',
      }),
    };

    try {
      const branding = await this.prisma.emailBranding.findFirst({
        orderBy: { created_at: 'desc' },
      });
      if (branding) return branding;
    } catch (e) {
      this.logger.warn(`getEmailBranding DB query notice: ${e.message}`);
    }

    return defaultBranding;
  }

  async upsertEmailBranding(data: any) {
    const payload = {
      company_name: data.company_name,
      company_logo_url: data.company_logo_url,
      address: data.address,
      website: data.website,
      phone: data.phone,
      footer_text: data.footer_text,
      social_links: typeof data.social_links === 'string' ? data.social_links : JSON.stringify(data.social_links || {}),
    };

    try {
      const existing = await this.prisma.emailBranding.findFirst();

      if (existing) {
        return await this.prisma.emailBranding.update({
          where: { id: existing.id },
          data: payload,
        });
      }

      return await this.prisma.emailBranding.create({ data: payload });
    } catch (e) {
      this.logger.warn(`upsertEmailBranding fallback: ${e.message}`);
      return { id: `brand-${Date.now()}`, ...payload, created_at: new Date() };
    }
  }

  // --- 4. NOTIFICATION RULES ---
  async getNotificationRules() {
    const defaultRules = [
      { id: 'rule-1', event_name: 'QUOTATION_PROPOSAL', module: 'SALES', description: 'Triggered when sending quotation proposal to client', is_email_enabled: true, template_id: 'tpl-1' },
      { id: 'rule-2', event_name: 'SITE_VISIT_SCHEDULE', module: 'OPERATIONS', description: 'Triggered when site inspection visit is scheduled', is_email_enabled: true, template_id: 'tpl-2' },
      { id: 'rule-3', event_name: 'ENGINEER_TASK_ASSIGNMENT', module: 'OPERATIONS', description: 'Triggered when task is assigned to field engineer', is_email_enabled: true, template_id: 'tpl-3' },
      { id: 'rule-4', event_name: 'CERTIFICATE_DELIVERY', module: 'COMPLIANCE', description: 'Triggered when safety certificate is issued and delivered', is_email_enabled: true, template_id: 'tpl-4' },
      { id: 'rule-5', event_name: 'CERTIFICATE_EXPIRING_15', module: 'COMPLIANCE', description: 'Triggered 15 days before safety certificate expiry', is_email_enabled: true, template_id: 'tpl-5' },
      { id: 'rule-7', event_name: 'INVOICE_GENERATED', module: 'FINANCE', description: 'Triggered when tax invoice is generated for client', is_email_enabled: true, template_id: 'tpl-7' },
      { id: 'rule-8', event_name: 'PAYMENT_RECEIPT', module: 'FINANCE', description: 'Triggered when client payment is received and logged', is_email_enabled: true, template_id: 'tpl-8' },
      { id: 'rule-9', event_name: 'OVERDUE_PAYMENT_REMINDER', module: 'FINANCE', description: 'Weekly Monday 9:00 AM reminder for overdue invoices', is_email_enabled: true, template_id: 'tpl-9' },
      { id: 'rule-10', event_name: 'CLIENT_WELCOME', module: 'CLIENTS', description: 'Triggered when client account is created with setup link', is_email_enabled: true, template_id: 'tpl-10' },
      { id: 'rule-11', event_name: 'CUSTOM_EMAIL', module: 'CLIENTS', description: 'Triggered when composing custom manual email', is_email_enabled: true, template_id: 'tpl-11' },
    ];

    try {
      const rules = await this.prisma.notificationRule.findMany({
        orderBy: { created_at: 'desc' },
      });
      if (rules.length > 0) return rules;

      // Seed default rules into DB if empty
      for (const r of defaultRules) {
        try {
          await this.prisma.notificationRule.create({
            data: {
              id: r.id,
              event_name: r.event_name,
              module: r.module,
              description: r.description,
              is_email_enabled: r.is_email_enabled,
              template_id: r.template_id,
            },
          });
        } catch {
          // Rule may already exist
        }
      }

      return await this.prisma.notificationRule.findMany({ orderBy: { created_at: 'desc' } });
    } catch (e) {
      this.logger.warn(`getNotificationRules DB query notice: ${e.message}`);
    }

    return defaultRules;
  }

  async updateNotificationRule(id: string, data: any, userCtx?: any, ipAddress?: string) {
    try {
      let existing = await this.prisma.notificationRule.findFirst({
        where: { OR: [{ id }, { event_name: id }] },
      });

      if (!existing) {
        // Upsert by event_name
        existing = await this.prisma.notificationRule.create({
          data: {
            id,
            event_name: id,
            module: 'GENERAL',
            description: `Notification trigger for ${id}`,
            is_email_enabled: Boolean(data.is_email_enabled),
          },
        });
      }

      const oldVal = existing.is_email_enabled ? 1 : 0;
      const newVal = data.is_email_enabled !== undefined ? (Boolean(data.is_email_enabled) ? 1 : 0) : oldVal;

      let advancedConfigObj: Record<string, any> = {};
      if (existing.advanced_config) {
        try {
          advancedConfigObj = JSON.parse(existing.advanced_config);
        } catch {
          // ignore parsing error
        }
      }

      const oldWA = advancedConfigObj.whatsapp_enabled ? 1 : 0;
      if (data.is_whatsapp_enabled !== undefined) {
        advancedConfigObj.whatsapp_enabled = Boolean(data.is_whatsapp_enabled);
      }
      const newWA = advancedConfigObj.whatsapp_enabled ? 1 : oldWA;

      const advancedConfigStr = JSON.stringify(advancedConfigObj);

      const updated = await this.prisma.notificationRule.update({
        where: { id: existing.id },
        data: {
          is_email_enabled: Boolean(newVal),
          template_id: data.template_id !== undefined ? data.template_id : existing.template_id,
          advanced_config: advancedConfigStr,
        },
      });

      // Write Audit Log Entry for Email Channel Toggle
      if (oldVal !== newVal) {
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO notification_rule_audit_logs (id, user_id, user_name, role, event_name, old_value, new_value, ip_address, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          `audit-email-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userCtx?.id || 'sys-admin',
          userCtx?.name || userCtx?.email || 'Administrator',
          userCtx?.role || 'SUPER_ADMIN',
          `${existing.event_name}_EMAIL`,
          oldVal,
          newVal,
          ipAddress || '127.0.0.1',
        );
      }

      // Write Audit Log Entry for WhatsApp Channel Toggle
      if (oldWA !== newWA) {
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO notification_rule_audit_logs (id, user_id, user_name, role, event_name, old_value, new_value, ip_address, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          `audit-wa-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userCtx?.id || 'sys-admin',
          userCtx?.name || userCtx?.email || 'Administrator',
          userCtx?.role || 'SUPER_ADMIN',
          `${existing.event_name}_WHATSAPP`,
          oldWA,
          newWA,
          ipAddress || '127.0.0.1',
        );
      }

      return updated;
    } catch (e) {
      this.logger.warn(`updateNotificationRule fallback: ${e.message}`);
      return { id, is_email_enabled: Boolean(data.is_email_enabled), template_id: data.template_id || null };
    }
  }

  async enableAllRules(userCtx?: any, ipAddress?: string) {
    try {
      const rules = await this.getNotificationRules();
      for (const r of rules) {
        await this.updateNotificationRule(r.id, { is_email_enabled: true }, userCtx, ipAddress);
      }
      return { success: true, message: 'All notification rules enabled successfully.' };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async disableAllRules(userCtx?: any, ipAddress?: string) {
    try {
      const rules = await this.getNotificationRules();
      for (const r of rules) {
        await this.updateNotificationRule(r.id, { is_email_enabled: false }, userCtx, ipAddress);
      }
      return { success: true, message: 'All notification rules disabled successfully.' };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async restoreDefaultRules(userCtx?: any, ipAddress?: string) {
    try {
      const rules = await this.getNotificationRules();
      for (const r of rules) {
        await this.updateNotificationRule(r.id, { is_email_enabled: true, advanced_config: null }, userCtx, ipAddress);
      }
      return { success: true, message: 'Default notification rules restored successfully.' };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  }

  async getAuditLogs() {
    try {
      return await this.prisma.$queryRawUnsafe(
        `SELECT * FROM notification_rule_audit_logs ORDER BY created_at DESC LIMIT 100`
      );
    } catch (e) {
      this.logger.warn(`getAuditLogs query error: ${e.message}`);
      return [];
    }
  }

  // --- 5. EMAIL LOGS ---
  async getEmailLogs() {
    const defaultLogs = [
      { id: 'log-1', recipient: 'client@acmecorp.com', subject: 'Quotation #QT-2026-004 Issued', module: 'QUOTATIONS', status: 'SENT', sent_date: new Date(), error_message: null },
      { id: 'log-2', recipient: 'karan@globalsafety.com', subject: 'Site Inspection Scheduled', module: 'INSPECTIONS', status: 'SENT', sent_date: new Date(), error_message: null },
      { id: 'log-3', recipient: 'admin@globalsafety.com', subject: '⚠️ Certificate Expiry Notice', module: 'VAULT', status: 'QUEUED', sent_date: null, error_message: null },
      { id: 'log-4', recipient: 'vendor@supplier.com', subject: 'Purchase Order #PO-991', module: 'INVENTORY', status: 'FAILED', sent_date: null, error_message: 'SMTP Connection Timeout (Host unreachable)' },
    ];

    try {
      const logs = await this.prisma.emailLog.findMany({
        orderBy: { created_at: 'desc' },
        take: 100,
      });
      if (logs.length > 0) return logs;
    } catch (e) {
      this.logger.warn(`getEmailLogs DB query notice: ${e.message}`);
    }

    return defaultLogs;
  }

  async createEmailLog(data: any) {
    const payload = {
      recipient: data.recipient,
      subject: data.subject,
      module: data.module || 'SYSTEM',
      status: data.status || 'QUEUED',
      sent_date: data.status === 'SENT' ? new Date() : null,
      error_message: data.error_message || null,
      metadata: data.metadata || null,
    };

    try {
      return await this.prisma.emailLog.create({ data: payload });
    } catch (e) {
      this.logger.warn(`createEmailLog fallback: ${e.message}`);
      return { id: `log-${Date.now()}`, ...payload, created_at: new Date() };
    }
  }

  // --- 6. TEST EMAIL TRIGGER ---
  async sendTestEmail(recipient: string) {
    this.logger.log(`Executing test email dispatch for recipient: ${recipient}`);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f6f8; border-radius: 12px;">
        <h2 style="color: #2563eb;">Global Safety Solution ERP - SMTP Test</h2>
        <p>This is an automated test email transmitted via Nodemailer to verify your SMTP server configuration.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
        <p style="font-size: 12px; color: #64748b;">Recipient: <strong>${recipient}</strong></p>
        <p style="font-size: 12px; color: #64748b;">Timestamp: ${new Date().toLocaleString()}</p>
      </div>
    `;

    try {
      return await this.mailService.sendMail({
        to: recipient,
        subject: 'Global Safety Solution ERP - SMTP Engine Verification',
        html: htmlContent,
        module: 'TEST',
      });
    } catch (error: any) {
      this.logger.error(`Test email dispatch failed: ${error?.message}`);
      throw new BadRequestException(
        `SMTP Test Failed: ${error?.message || 'Check your SMTP credentials, host, and port configuration.'}`,
      );
    }
  }

  // --- 7. QUEUE METRICS & ANALYTICS ---
  async getQueueStats() {
    const [pending, sending, sent, failed] = await Promise.all([
      this.prisma.emailLog.count({ where: { status: { in: ['PENDING', 'QUEUED', 'SCHEDULED'] } } }),
      this.prisma.emailLog.count({ where: { status: 'SENDING' } }),
      this.prisma.emailLog.count({ where: { status: 'SENT' } }),
      this.prisma.emailLog.count({ where: { status: 'FAILED' } }),
    ]);

    return {
      active_jobs: sending,
      waiting_jobs: pending,
      failed_jobs: failed,
      completed_today: sent,
    };
  }

  async getAnalyticsStats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [totalSent, totalFailed, totalPending, todayCount, logs] = await Promise.all([
      this.prisma.emailLog.count({ where: { status: 'SENT' } }),
      this.prisma.emailLog.count({ where: { status: 'FAILED' } }),
      this.prisma.emailLog.count({ where: { status: { in: ['PENDING', 'QUEUED', 'SCHEDULED'] } } }),
      this.prisma.emailLog.count({ where: { created_at: { gte: startOfToday } } }),
      this.prisma.emailLog.findMany({
        take: 500,
        orderBy: { created_at: 'desc' },
      }),
    ]);

    // Template usage breakdown
    const templateCounts: Record<string, number> = {};
    const moduleCounts: Record<string, number> = {};

    logs.forEach((log) => {
      const template = log.template_code || log.subject || 'Custom Email';
      const mod = log.module || 'GENERAL';
      templateCounts[template] = (templateCounts[template] || 0) + 1;
      moduleCounts[mod] = (moduleCounts[mod] || 0) + 1;
    });

    const mostUsedTemplates = Object.entries(templateCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const mostActiveModules = Object.entries(moduleCounts)
      .map(([module, count]) => ({ module, count }))
      .sort((a, b) => b.count - a.count);

    const totalLogs = totalSent + totalFailed + totalPending;
    const deliveryRate = totalLogs > 0 ? ((totalSent / (totalSent + totalFailed || 1)) * 100).toFixed(1) : '100.0';

    return {
      total_sent: totalSent,
      total_failed: totalFailed,
      total_pending: totalPending,
      today_emails: todayCount,
      delivery_rate: `${deliveryRate}%`,
      most_used_templates: mostUsedTemplates,
      most_active_modules: mostActiveModules,
    };
  }
}
