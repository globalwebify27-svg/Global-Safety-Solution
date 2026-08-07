import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetWhatsAppLogsDto } from './dto/get-whatsapp-logs.dto';
import { WhatsAppNotificationService } from './whatsapp-notification.service';

@Injectable()
export class WhatsAppLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappService: WhatsAppNotificationService,
  ) {}

  async findAll(query: GetWhatsAppLogsDto) {
    const { status, search, page = 1, limit = 50, sortBy = 'created_at', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { recipient: { contains: search } },
        { message_id: { contains: search } },
        { template_code: { contains: search } },
        { notification_type: { contains: search } },
        { failure_reason: { contains: search } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.whatsAppLog.count({ where }),
      this.prisma.whatsAppLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
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

  async findOne(id: string) {
    const log = await this.prisma.whatsAppLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('WhatsApp log not found');
    return log;
  }

  async retry(id: string) {
    const log = await this.prisma.whatsAppLog.findUnique({ where: { id } });
    if (!log) throw new NotFoundException('WhatsApp log not found');

    // Update state to PENDING
    await this.prisma.whatsAppLog.update({
      where: { id },
      data: {
        status: 'PENDING',
        retry_count: { increment: 1 },
        failure_reason: null,
      },
    });

    // Re-dispatch using whatsappNotificationService
    setImmediate(async () => {
      try {
        let payload: Record<string, any> = {};
        if (log.request_payload) {
          try {
            const parsed = JSON.parse(log.request_payload);
            payload = parsed.variables || {};
          } catch {}
        }
        await this.whatsappService.sendNotification({
          to: log.recipient,
          templateCode: log.notification_type,
          context: payload,
        });
      } catch (err) {
        // ignore retry fail
      }
    });

    return { success: true, message: 'Message queued for retry!' };
  }

  async getAnalytics() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [
      sentCount,
      failedCount,
      pendingCount,
      deliveredCount,
      readCount,
      todayCount,
      logsLast7Days,
      quotaLimitSetting
    ] = await Promise.all([
      this.prisma.whatsAppLog.count({ where: { status: 'SENT' } }),
      this.prisma.whatsAppLog.count({ where: { status: 'FAILED' } }),
      this.prisma.whatsAppLog.count({ where: { status: 'PENDING' } }),
      this.prisma.whatsAppLog.count({ where: { status: 'DELIVERED' } }),
      this.prisma.whatsAppLog.count({ where: { status: 'READ' } }),
      this.prisma.whatsAppLog.count({ where: { created_at: { gte: startOfToday } } }),
      this.prisma.whatsAppLog.findMany({
        where: { created_at: { gte: sevenDaysAgo } },
        select: { status: true, created_at: true, template_code: true },
      }),
      this.prisma.systemSetting.findUnique({ where: { key: 'whatsapp_quota_limit' } })
    ]);

    const totalDispatched = sentCount + deliveredCount + readCount + failedCount;
    const deliveryRate = totalDispatched > 0 
      ? (((sentCount + deliveredCount + readCount) / totalDispatched) * 100).toFixed(1) + '%'
      : '100.0%';

    const totalSuccessful = sentCount + deliveredCount + readCount;
    const readRate = totalSuccessful > 0
      ? ((readCount / totalSuccessful) * 100).toFixed(1) + '%'
      : '0.0%';

    // Quota Monitors
    const quotaLimit = quotaLimitSetting ? Number(quotaLimitSetting.value) : 250; 
    const quotaUsed = todayCount;
    const quotaPercentage = quotaLimit > 0 ? (quotaUsed / quotaLimit) * 100 : 0;
    
    let quotaStatus = 'NORMAL';
    if (quotaPercentage >= 100) {
      quotaStatus = 'EXCEEDED';
      try {
        await this.prisma.systemLog.create({
          data: {
            type: 'WHATSAPP_QUOTA',
            name: 'QUOTA_EXCEEDED',
            message: `CRITICAL: WhatsApp daily limit of ${quotaLimit} reached (100% capacity).`,
            body: JSON.stringify({ quotaLimit, quotaUsed }),
          }
        });
      } catch {}
    } else if (quotaPercentage >= 90) {
      quotaStatus = 'WARNING_90';
    } else if (quotaPercentage >= 80) {
      quotaStatus = 'WARNING_80';
    }

    const dailyMap: Record<string, { sent: number; failed: number; read: number }> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = { sent: 0, failed: 0, read: 0 };
    }

    const templateBreakdown: Record<string, number> = {};

    for (const log of logsLast7Days) {
      const key = log.created_at.toISOString().split('T')[0];
      if (dailyMap[key]) {
        if (log.status === 'FAILED') {
          dailyMap[key].failed++;
        } else if (log.status === 'READ') {
          dailyMap[key].read++;
          dailyMap[key].sent++;
        } else {
          dailyMap[key].sent++;
        }
      }

      if (log.template_code) {
        templateBreakdown[log.template_code] = (templateBreakdown[log.template_code] || 0) + 1;
      }
    }

    const dailyMetrics = Object.entries(dailyMap).map(([date, stats]) => ({
      date,
      ...stats
    })).reverse();

    return {
      total_sent: sentCount + deliveredCount + readCount,
      total_failed: failedCount,
      total_pending: pendingCount,
      today_whatsapp: todayCount,
      delivery_rate: deliveryRate,
      read_rate: readRate,
      quota_stats: {
        quota_limit: quotaLimit,
        quota_used: quotaUsed,
        percentage: quotaPercentage.toFixed(1),
        status: quotaStatus,
      },
      daily_metrics: dailyMetrics,
      template_breakdown: Object.entries(templateBreakdown).map(([name, count]) => ({ name, count })),
    };
  }
}
