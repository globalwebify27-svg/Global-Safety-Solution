import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    user_id: string;
    title: string;
    message: string;
    type?: string;
    link?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        ...data,
        type: data.type || 'INFO',
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { is_read: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { user_id: userId, is_read: false },
      data: { is_read: true },
    });
  }

  async remove(id: string) {
    return this.prisma.notification.delete({ where: { id } });
  }

  // Helper for broadcast to all admins
  async notifyAdmins(
    title: string,
    message: string,
    type: string = 'INFO',
    link?: string,
  ) {
    const admins = await this.prisma.user.findMany({
      // For now, let's notify the superadmin or anyone with high privilege
      // Assuming email admin@globalsafety.com is the main admin
      where: { is_active: true }, // Simplified for now
    });

    for (const admin of admins) {
      await this.create({
        user_id: admin.id,
        title,
        message,
        type,
        link,
      });
    }
  }

  async notifyUser(
    user_id: string,
    title: string,
    message: string,
    type: string = 'INFO',
    link?: string,
  ) {
    return this.create({
      user_id,
      title,
      message,
      type,
      link,
    });
  }
}
