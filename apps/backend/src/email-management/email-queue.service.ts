import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Non-blocking queue insertion.
   * Creates record in email_logs with status PENDING/QUEUED and triggers background dispatch asynchronously.
   */
  async enqueueEmail(data: {
    recipient: string;
    subject: string;
    bodyHtml: string;
    module: string;
    templateCode?: string;
    scheduledFor?: Date;
    attachments?: any[];
  }) {
    // Check Notification Rule configuration before enqueueing
    if (data.templateCode) {
      try {
        const rule = await this.prisma.notificationRule.findFirst({
          where: {
            OR: [
              { event_name: data.templateCode },
              { event_name: data.templateCode.toUpperCase() },
            ],
          },
        });

        if (rule && !rule.is_email_enabled) {
          this.logger.log(
            `[NotificationRules] Email notification for event '${data.templateCode}' is DISABLED by admin configuration. Skipping email queue.`
          );
          return {
            id: `skipped-${Date.now()}`,
            recipient: data.recipient,
            subject: data.subject,
            module: data.module,
            template_code: data.templateCode,
            status: 'SKIPPED_DISABLED',
            created_at: new Date(),
          };
        }
      } catch (err: any) {
        this.logger.warn(`[NotificationRules] Could not query rule check for '${data.templateCode}': ${err?.message}`);
      }
    }

    const isScheduled = data.scheduledFor && new Date(data.scheduledFor) > new Date();

    const logRecord = await this.prisma.emailLog.create({
      data: {
        recipient: data.recipient,
        subject: data.subject,
        module: data.module,
        template_code: data.templateCode || null,
        status: isScheduled ? 'SCHEDULED' : 'PENDING',
        scheduled_for: data.scheduledFor || null,
        body_html: data.bodyHtml,
        attachments: data.attachments ? JSON.stringify(data.attachments) : null,
      },
    });

    // If not scheduled for future, trigger async background worker non-blocking
    if (!isScheduled) {
      setImmediate(() => this.processSingleEmail(logRecord.id).catch((err) => {
        this.logger.error(`[AsyncQueue] Background dispatch error for email ${logRecord.id}: ${err?.message}`);
      }));
    }

    return logRecord;
  }

  /**
   * Process a single queued email by ID
   */
  async processSingleEmail(emailId: string) {
    const logRecord = await this.prisma.emailLog.findUnique({
      where: { id: emailId },
    });

    if (!logRecord || logRecord.status === 'SENT') return;

    try {
      await this.prisma.emailLog.update({
        where: { id: emailId },
        data: { status: 'SENDING' },
      });

      const attachments = logRecord.attachments ? JSON.parse(logRecord.attachments) : undefined;

      await this.mailService.sendMail({
        to: logRecord.recipient,
        subject: logRecord.subject,
        html: logRecord.body_html || '<p>No content</p>',
        attachments,
      });

      await this.prisma.emailLog.update({
        where: { id: emailId },
        data: {
          status: 'SENT',
          sent_date: new Date(),
          error_message: null,
        },
      });

      this.logger.log(`[EmailQueue] Email ${emailId} successfully sent to ${logRecord.recipient}`);
    } catch (err: any) {
      const newRetryCount = (logRecord.retry_count || 0) + 1;
      const isFailedFinal = newRetryCount >= (logRecord.max_retries || 3);

      await this.prisma.emailLog.update({
        where: { id: emailId },
        data: {
          status: 'FAILED',
          retry_count: newRetryCount,
          error_message: err?.message || 'SMTP Transmission Failure',
        },
      });

      this.logger.error(`[EmailQueue] Failed sending email ${emailId} (Attempt ${newRetryCount}/${logRecord.max_retries}): ${err?.message}`);
    }
  }

  /**
   * Background Cron Worker - Runs every minute to process PENDING and SCHEDULED emails
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processPendingQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date();

      // Find PENDING emails and SCHEDULED emails whose time has come
      const pendingEmails = await this.prisma.emailLog.findMany({
        where: {
          OR: [
            { status: 'PENDING' },
            { status: 'SCHEDULED', scheduled_for: { lte: now } },
          ],
        },
        take: 20,
        orderBy: { created_at: 'asc' },
      });

      if (pendingEmails.length > 0) {
        this.logger.log(`[EmailQueueCron] Processing ${pendingEmails.length} pending/scheduled emails...`);
        for (const email of pendingEmails) {
          await this.processSingleEmail(email.id);
        }
      }
    } catch (err: any) {
      this.logger.error(`[EmailQueueCron] Error during queue processing: ${err?.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Manual Retry for a specific failed email
   */
  async retryFailedEmail(emailId: string) {
    const email = await this.prisma.emailLog.findUnique({ where: { id: emailId } });
    if (!email) throw new NotFoundException('Queued email not found.');

    await this.prisma.emailLog.update({
      where: { id: emailId },
      data: {
        status: 'PENDING',
        error_message: null,
      },
    });

    setImmediate(() => this.processSingleEmail(emailId));

    return { success: true, message: `Email ${emailId} re-queued for transmission.` };
  }

  /**
   * Bulk Retry for all FAILED emails
   */
  async retryAllFailed() {
    const failedEmails = await this.prisma.emailLog.findMany({
      where: { status: 'FAILED' },
    });

    for (const email of failedEmails) {
      await this.prisma.emailLog.update({
        where: { id: email.id },
        data: { status: 'PENDING', error_message: null },
      });
      setImmediate(() => this.processSingleEmail(email.id));
    }

    return {
      success: true,
      message: `Re-queued ${failedEmails.length} failed emails for transmission.`,
      count: failedEmails.length,
    };
  }

  /**
   * Fetch Queue Items with Filtering & Pagination
   */
  async getQueueItems(status?: string, page = 1, limit = 50) {
    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const [total, items] = await Promise.all([
      this.prisma.emailLog.count({ where }),
      this.prisma.emailLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      items,
    };
  }
}
