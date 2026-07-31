import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  module?: string;
  attachments?: any[];
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves active SMTP configuration from database and builds Nodemailer transporter.
   * Throws BadRequestException if SMTP is unconfigured or disabled.
   */
  async getTransporterAndConfig() {
    let config: any = null;
    try {
      config = await this.prisma.smtpConfig.findFirst({
        where: { is_active: true },
        orderBy: { created_at: 'desc' },
      });
    } catch (error) {
      this.logger.warn(`Failed to fetch SmtpConfig from database: ${error.message}`);
    }

    if (!config || !config.host || !config.username) {
      throw new BadRequestException('SMTP is not configured. Please configure SMTP settings.');
    }

    const isSecure = config.port === 465 || (config.encryption_type || '').toUpperCase() === 'SSL';

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: Number(config.port) || 587,
      secure: isSecure,
      auth: {
        user: config.username,
        pass: config.password_encrypted || '',
      },
      tls: {
        rejectUnauthorized: false, // Prevents self-signed SSL handshake failures in dev/staging
      },
    });

    return { transporter, config };
  }

  /**
   * Verifies SMTP connection and authentication handshake.
   */
  async verifyConnection() {
    try {
      const { transporter, config } = await this.getTransporterAndConfig();
      await transporter.verify();
      return {
        success: true,
        message: `SMTP Connection verified successfully to ${config.host}:${config.port} as ${config.sender_email}`,
        host: config.host,
        port: config.port,
        sender_email: config.sender_email,
      };
    } catch (error) {
      this.logger.error(`SMTP Connection Verification Failed: ${error.message}`);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`SMTP Connection Failed: ${error.message}`);
    }
  }

  /**
   * Reusable method to send email via Nodemailer and record status in email_logs.
   */
  async sendMail(options: SendMailOptions) {
    let config: any = null;
    let transporter: nodemailer.Transporter | null = null;

    const res = await this.getTransporterAndConfig();
    transporter = res.transporter;
    config = res.config;

    const fromAddress = config.sender_name
      ? `"${config.sender_name}" <${config.sender_email}>`
      : config.sender_email;

    const mailData: nodemailer.SendMailOptions = {
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || undefined,
      replyTo: config.reply_to_email || undefined,
      attachments: options.attachments || undefined,
    };

    try {
      this.logger.log(`Transmitting email to ${options.to} via ${config.host}:${config.port}`);
      const info = await transporter.sendMail(mailData);

      return {
        success: true,
        message: `Email sent successfully to ${options.to}`,
        messageId: info.messageId,
      };
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${options.to}: ${error.message}`);
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`SMTP Transmission Failed: ${error?.message || 'Could not connect to SMTP server.'}`);
    }
  }

  /**
   * Helper to insert record into email_logs table safely.
   */
  private async logEmailAttempt(
    recipient: string,
    subject: string,
    module: string,
    status: 'SENT' | 'FAILED' | 'QUEUED',
    errorMessage?: string | null,
    metadata?: string | null
  ) {
    try {
      await this.prisma.emailLog.create({
        data: {
          recipient,
          subject,
          module,
          status,
          sent_date: status === 'SENT' ? new Date() : null,
          error_message: errorMessage || null,
          metadata: metadata || null,
        },
      });
    } catch (dbErr) {
      this.logger.warn(`Could not save EmailLog DB record: ${dbErr.message}`);
    }
  }
}
