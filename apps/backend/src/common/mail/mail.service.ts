import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      port: Number(process.env.SMTP_PORT) || 2525,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendMail(
    to: string,
    subject: string,
    text: string,
    attachments?: any[],
  ) {
    try {
      if (!process.env.SMTP_USER) {
        this.logger.warn(
          `SMTP not configured. Email to ${to} would have been: ${subject}`,
        );
        return;
      }

      await this.transporter.sendMail({
        from: '"Global Safety Solution" <no-reply@globalsafety.com>',
        to,
        subject,
        text,
        attachments,
      });
      this.logger.log(`Email sent successfully to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
    }
  }

  async sendInvoice(
    to: string,
    clientName: string,
    invoiceId: string,
    pdfBuffer: Buffer,
  ) {
    const subject = `Invoice for Safety Services - ${invoiceId}`;
    const text = `Dear ${clientName},\n\nPlease find attached the invoice for our services. Thank you for choosing Global Safety Solution.`;

    await this.sendMail(to, subject, text, [
      {
        filename: `invoice-${invoiceId.substring(0, 8)}.pdf`,
        content: pdfBuffer,
      },
    ]);
  }

  async sendCertificate(
    to: string,
    clientName: string,
    id: string,
    pdfBuffer: Buffer,
  ) {
    const subject = `Safety Compliance Certificate - ${id.substring(0, 8)}`;
    const text = `Dear ${clientName},\n\nWe are pleased to inform you that your site inspection is complete. Please find your Safety Compliance Certificate attached.\n\nStay Safe!`;

    await this.sendMail(to, subject, text, [
      {
        filename: `safety-certificate-${id.substring(0, 8)}.pdf`,
        content: pdfBuffer,
      },
    ]);
  }
}
