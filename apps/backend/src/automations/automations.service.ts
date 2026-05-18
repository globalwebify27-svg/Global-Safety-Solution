import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AutomationsService {
  private readonly logger = new Logger(AutomationsService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleOverdueInvoices() {
    this.logger.log('Scanning for overdue invoices...');

    const today = new Date();
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        status: { in: ['UNPAID', 'PARTIAL'] },
        due_date: { lt: today },
      },
      include: { client: true },
    });

    if (overdueInvoices.length === 0) {
      this.logger.log('No overdue invoices found.');
      return;
    }

    this.logger.log(`Found ${overdueInvoices.length} overdue invoices.`);

    for (const invoice of overdueInvoices) {
      this.logger.warn(
        `Alert: Invoice ${invoice.invoice_number} for client ${invoice.client.name} is OVERDUE.`,
      );

      // Use Notification instead of Reminder
      await this.prisma.notification.create({
        data: {
          user_id: invoice.client_id, // Or an admin ID
          title: `OVERDUE PAYMENT: ${invoice.invoice_number}`,
          message: `Client ${invoice.client.name} has an outstanding balance of ₹${Number(invoice.total_amount).toLocaleString()}.`,
          type: 'WARNING',
        },
      });
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async handleLeadFollowUps() {
    this.logger.log('Scanning for lead follow-ups...');
    const today = new Date();

    const leadsToFollowUp = await this.prisma.lead.findMany({
      where: {
        next_follow_up: {
          lte: today,
          gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
        },
        status: { notIn: ['WON', 'LOST'] },
      },
    });

    for (const lead of leadsToFollowUp) {
      this.logger.log(
        `Reminder: Follow up with lead ${lead.company_name} today.`,
      );
      // Use Notification instead of Task for general lead follow-ups
      if (lead.assigned_to) {
        await this.prisma.notification.create({
          data: {
            user_id: lead.assigned_to,
            title: `Follow up: ${lead.company_name}`,
            message: `Scheduled follow-up for lead capture. Probability: ${lead.closure_probability}%`,
            type: 'INFO',
          },
        });
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async handleCertificateExpiries() {
    this.logger.log('Scanning for expiring certificates...');

    const intervals = [30, 25, 20, 15, 10, 5, 0]; // Days before expiry

    for (const days of intervals) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

      const certificates = await this.prisma.certificate.findMany({
        where: {
          expiry_date: { gte: startOfDay, lte: endOfDay },
          status: 'ACTIVE',
        },
        include: {
          inspection: { include: { client: true } },
        },
      });

      for (const cert of certificates) {
        const message =
          days === 0
            ? `Certificate ${cert.certificate_no} for client ${cert.inspection.client.name} EXPIRED TODAY!`
            : `Certificate ${cert.certificate_no} for client ${cert.inspection.client.name} will expire in ${days} days.`;

        this.logger.warn(message);

        // Notify Admins
        const adminRoles = await this.prisma.userRole.findMany({
          where: { role: { name: 'SUPER_ADMIN' } },
          select: { user_id: true },
        });

        for (const admin of adminRoles) {
          await this.prisma.notification.create({
            data: {
              user_id: admin.user_id,
              title:
                days === 0
                  ? `EXPIRED: ${cert.certificate_no}`
                  : `Renewal Alert: ${cert.certificate_no}`,
              message: message,
              type: days <= 5 ? 'WARNING' : 'INFO',
            },
          });
        }
      }
    }
  }
}
