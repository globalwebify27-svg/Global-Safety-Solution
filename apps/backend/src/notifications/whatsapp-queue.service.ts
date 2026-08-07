import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppNotificationService } from './whatsapp-notification.service';

@Injectable()
export class WhatsAppQueueService {
  private readonly logger = new Logger(WhatsAppQueueService.name);
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsAppNotificationService,
  ) {}

  /**
   * Enqueue a WhatsApp notification to be processed in background
   */
  async enqueueNotification(options: {
    to: string;
    templateCode: string;
    context: Record<string, any>;
    scheduledFor?: Date;
  }) {
    return this.prisma.whatsAppLog.create({
      data: {
        recipient: options.to,
        template_code: options.templateCode,
        notification_type: options.templateCode,
        provider: 'PENDING',
        status: 'PENDING',
        scheduled_for: options.scheduledFor || null,
        request_payload: JSON.stringify({ to: options.to, template: options.templateCode, variables: options.context }),
      },
    });
  }

  /**
   * Background Cron Worker - Runs every minute to process PENDING and SCHEDULED WhatsApp notifications
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processPendingQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date();

      // Find PENDING logs whose scheduled time is null or past
      const pendingLogs = await this.prisma.whatsAppLog.findMany({
        where: {
          status: 'PENDING',
          OR: [
            { scheduled_for: null },
            { scheduled_for: { lte: now } },
          ],
        },
        take: 20,
        orderBy: { created_at: 'asc' },
      });

      if (pendingLogs.length > 0) {
        this.logger.log(`[WhatsAppQueueCron] Processing ${pendingLogs.length} pending/scheduled WhatsApp notifications...`);
        for (const log of pendingLogs) {
          await this.processSingleLog(log.id);
        }
      }
    } catch (err: any) {
      this.logger.error(`[WhatsAppQueueCron] Error during queue processing: ${err?.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single WhatsApp log record
   */
  private async processSingleLog(logId: string) {
    const log = await this.prisma.whatsAppLog.findUnique({ where: { id: logId } });
    if (!log || log.status !== 'PENDING') return;

    try {
      let context: Record<string, any> = {};
      if (log.request_payload) {
        try {
          const parsed = JSON.parse(log.request_payload);
          context = parsed.variables || {};
        } catch {}
      }

      // Mark as SENDING to prevent double processing
      await this.prisma.whatsAppLog.update({
        where: { id: logId },
        data: { status: 'SENDING' },
      });

      const result = await this.whatsappService.sendNotification({
        to: log.recipient,
        templateCode: log.notification_type,
        context,
        logId,
      });

      if (result.status === 'SKIPPED') {
        this.logger.log(`WhatsApp log ${logId} skipped: ${result.error}`);
      } else if (!result.success) {
        await this.handleRetry(logId, result.error || 'Provider dispatch failed');
      }
    } catch (err: any) {
      await this.handleRetry(logId, err?.message || 'Execution error');
    }
  }

  /**
   * Handle retry timing schedule (5m, 30m, 2h intervals)
   */
  private async handleRetry(logId: string, errorMsg: string) {
    const log = await this.prisma.whatsAppLog.findUnique({ where: { id: logId } });
    if (!log) return;

    const newRetryCount = log.retry_count + 1;

    if (newRetryCount < log.max_retries) {
      // Determine retry offset interval
      let retryDelayMs = 5 * 60 * 1000; // 5 minutes default
      if (newRetryCount === 2) {
        retryDelayMs = 30 * 60 * 1000; // 30 minutes
      } else if (newRetryCount === 3) {
        retryDelayMs = 2 * 60 * 60 * 1000; // 2 hours
      }

      const nextRun = new Date(Date.now() + retryDelayMs);

      await this.prisma.whatsAppLog.update({
        where: { id: logId },
        data: {
          status: 'PENDING',
          retry_count: newRetryCount,
          scheduled_for: nextRun,
          failure_reason: errorMsg,
        },
      });

      this.logger.warn(`[WhatsAppQueue] Scheduled retry #${newRetryCount} for log ${logId} at ${nextRun.toLocaleString()}`);
    } else {
      // Max retries reached
      await this.prisma.whatsAppLog.update({
        where: { id: logId },
        data: {
          status: 'FAILED',
          retry_count: newRetryCount,
          failure_reason: `Max retries (${log.max_retries}) exceeded. Last error: ${errorMsg}`,
        },
      });
      this.logger.error(`[WhatsAppQueue] Message ${logId} permanently FAILED after ${newRetryCount} attempts.`);
    }
  }
}
