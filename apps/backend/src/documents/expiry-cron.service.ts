import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ExpiryCronService {
  private readonly logger = new Logger(ExpiryCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkCertificateExpiry() {
    this.logger.log('Starting check for certificate expirations');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const documents = await this.prisma.document.findMany({
      where: {
        category: 'CERTIFICATE',
        expiry_date: {
          not: null,
        },
      },
    });

    const startOfDay = new Date(today);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    for (const document of documents) {
      if (!document.expiry_date) continue;
      const expiryDate = new Date(document.expiry_date);
      expiryDate.setHours(0, 0, 0, 0);

      let title = '';
      let message = '';
      
      const formattedDate = expiryDate.toISOString().split('T')[0];

      if (expiryDate < today) {
        title = `Certificate Expired: ${document.name}`;
        message = `Certificate Expired: ${document.name} has expired on ${formattedDate}`;
      } else if (expiryDate <= thirtyDaysFromNow) {
        title = `Certificate Due Soon: ${document.name}`;
        message = `Certificate Due Soon: ${document.name} expires on ${formattedDate}`;
      } else {
        continue;
      }

      // Check if notification already exists for today
      // Using raw query if Notification model is not exact, but assuming standard prisma schema for notifications
      try {
        const existingNotification = await (this.prisma as any).notification.findFirst({
          where: {
            title,
            created_at: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
        });

        if (!existingNotification) {
          await this.notificationsService.notifyAdmins(
            title,
            message,
            'WARNING'
          );
          this.logger.log(`Created notification: ${title}`);
        }
      } catch (error) {
        this.logger.error(`Failed to check/create notification for ${document.id}:`, error);
      }
    }
  }

  private async resolveUserClientId(userPayload?: any): Promise<string | undefined> {
    const userId = userPayload?.userId || userPayload?.id || userPayload?.sub;
    if (!userId) return undefined;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: true } },
      },
    });

    const isClient =
      user?.roles?.some(
        (ur: any) => ur.role?.name === 'CLIENT' || ur.role?.name === 'CLIENTS',
      ) || (user?.designation || '').toUpperCase().includes('CLIENT');

    if (isClient && user?.email) {
      const clientRecord = await this.prisma.client.findFirst({
        where: { email: user.email },
      });
      return clientRecord?.id;
    }
    return undefined;
  }

  async getDueCertificates(userPayload?: any) {
    const userClientId = await this.resolveUserClientId(userPayload);
    const documents = await this.prisma.document.findMany({
      where: {
        category: 'CERTIFICATE',
        expiry_date: {
          not: null,
        },
        ...(userClientId ? { client_id: userClientId } : {}),
      },
      include: {
        client: true,
        project: true,
      },
      orderBy: {
        expiry_date: 'asc',
      },
    });

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    return documents.map(doc => {
      const expiryDate = new Date(doc.expiry_date!);
      expiryDate.setHours(0, 0, 0, 0);
      
      let status = 'ACTIVE';
      if (expiryDate < now) {
        status = 'EXPIRED';
      } else if (expiryDate <= thirtyDaysFromNow) {
        status = 'DUE_SOON';
      }

      const diffTime = expiryDate.getTime() - now.getTime();
      const days_remaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        ...doc,
        status,
        days_remaining,
      };
    });
  }

  async getDueStats(userPayload?: any) {
    const userClientId = await this.resolveUserClientId(userPayload);
    const documents = await this.prisma.document.findMany({
      where: {
        category: 'CERTIFICATE',
        expiry_date: {
          not: null,
        },
        ...(userClientId ? { client_id: userClientId } : {}),
      },
      select: {
        expiry_date: true,
      },
    });

    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    let active = 0;
    let due_soon = 0;
    let expired = 0;

    documents.forEach(doc => {
      const expiryDate = new Date(doc.expiry_date!);
      expiryDate.setHours(0, 0, 0, 0);
      
      if (expiryDate < now) {
        expired++;
      } else if (expiryDate <= thirtyDaysFromNow) {
        due_soon++;
      } else {
        active++;
      }
    });

    return {
      total: documents.length,
      active,
      due_soon,
      expired,
    };
  }
}
