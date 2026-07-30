import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async findAll() {
    return this.prisma.task.findMany({
      include: {
        project: true,
        assignee: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findByProject(projectId: string) {
    return this.prisma.task.findMany({
      where: { project_id: projectId },
      include: {
        assignee: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
        assignee: true,
      },
    });
  }

  async create(data: any) {
    const task = await this.prisma.task.create({
      data,
      include: { assignee: true, project: true },
    });

    if (task.assigned_to && task.project_id) {
      try {
        const project = await this.prisma.project.findUnique({
          where: { id: task.project_id },
          include: { client: true },
        });

        if (project && project.stage === 'PROJECT_CREATED') {
          await this.prisma.project.update({
            where: { id: task.project_id },
            data: { stage: 'ENGINEER_ASSIGNED' },
          });
        }

        await this.prisma.projectActivity.create({
          data: {
            project_id: task.project_id,
            action: 'Field Engineer Assigned',
            performed_by: 'Operations Manager',
            remarks: `Task "${task.title}" assigned to engineer ${task.assignee?.name || 'Staff'}`,
          },
        });

        // Send In-App Notification to assigned staff/engineer
        const clientName = project?.client?.name || project?.name || 'Project';
        await this.notificationsService.create({
          user_id: task.assigned_to,
          title: '📋 New Task Assigned',
          message: `You have been assigned a new operational task "${task.title}" for ${clientName}.`,
          type: 'INFO',
          link: '/dashboard/operations',
        });
      } catch (err) {
        console.warn('[TasksService] Failed to notify/update project on task create:', err?.message);
      }
    }

    return task;
  }

  async update(id: string, data: any) {
    const task = await this.prisma.task.update({
      where: { id },
      data,
      include: { assignee: true, project: true },
    });

    if (data.assigned_to && task.project_id) {
      try {
        await this.prisma.projectActivity.create({
          data: {
            project_id: task.project_id,
            action: 'Task Reassigned / Updated',
            performed_by: 'Operations Manager',
            remarks: `Task "${task.title}" updated for engineer ${task.assignee?.name || 'Staff'}`,
          },
        });

        await this.notificationsService.create({
          user_id: task.assigned_to,
          title: '📋 Task Updated',
          message: `Task "${task.title}" assigned to you has been updated.`,
          type: 'INFO',
          link: '/dashboard/operations',
        });
      } catch (err) {
        console.warn('[TasksService] Failed to log activity on task update:', err?.message);
      }
    }

    return task;
  }

  async remove(id: string) {
    return this.prisma.task.delete({
      where: { id },
    });
  }
}
