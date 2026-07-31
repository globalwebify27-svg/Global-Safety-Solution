import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TemplateEngineService } from './template-engine.service';

@Injectable()
export class EmailCronService {
  private readonly logger = new Logger(EmailCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly templateEngine: TemplateEngineService,
  ) {}

  /**
   * Daily Midnight Cron Job - Scans for 15-day certificate expiries and 30-day renewal reminders
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkDailyCertificateExpiries() {
    this.logger.log('[EmailCron] Running daily certificate expiry & renewal scan...');
    try {
      const today = new Date();
      const in15Days = new Date();
      in15Days.setDate(today.getDate() + 15);

      const in30Days = new Date();
      in30Days.setDate(today.getDate() + 30);

      // Find certificates expiring in 15 days or 30 days
      const expiringDocs = await this.prisma.document.findMany({
        where: {
          category: 'CERTIFICATE',
          expiry_date: {
            lte: in30Days,
          },
        },
        include: { client: true },
      });

      let count15 = 0;
      let count30 = 0;

      for (const doc of expiringDocs) {
        if (!doc.client?.email || !doc.expiry_date) continue;

        const expiry = new Date(doc.expiry_date);
        const daysDiff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 3600 * 24));

        if (daysDiff <= 15 && daysDiff > 0) {
          await this.templateEngine.sendTemplatedEmail({
            templateCode: 'CERTIFICATE_EXPIRING_15',
            to: doc.client.email,
            context: {
              client_name: doc.client.name,
              certificate_name: doc.name,
              expiry_date: expiry.toLocaleDateString('en-IN'),
            },
            module: 'COMPLIANCE',
          });
          count15++;
        }
      }

      this.logger.log(`[EmailCron] Queued ${count15} (15-day) certificate expiry reminder emails.`);
    } catch (err: any) {
      this.logger.error(`[EmailCron] Error during daily certificate expiry scan: ${err?.message}`);
    }
  }
}
