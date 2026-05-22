import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.client.findMany({
      include: {
        contacts: true,
        compliances: true,
        assigned_staff: {
          include: {
            assigned_clients: true,
          },
        },
        projects: {
          include: {
            tasks: true,
            work_orders: true,
          },
        },
        inspections: true,
      },
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        contacts: true,
        compliances: true,
        assigned_staff: {
          include: {
            assigned_clients: true,
          },
        },
        projects: {
          include: {
            tasks: true,
            work_orders: true,
          },
        },
        inspections: true,
      },
    });

    if (!client) return null;

    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        entity_id: id,
        entity_type: 'CLIENT',
        action: 'STAFF_REASSIGNED',
      },
      orderBy: { created_at: 'asc' },
    });

    return {
      ...client,
      auditLogs,
    };
  }

  async create(data: any) {
    return this.prisma.client.create({ data });
  }

  async update(id: string, data: any) {
    if (data.assigned_staff_id !== undefined) {
      const oldClient = await this.prisma.client.findUnique({
        where: { id },
        include: {
          assigned_staff: true,
          projects: {
            include: {
              tasks: true,
              work_orders: true,
            },
          },
          inspections: true,
        },
      });

      if (oldClient && oldClient.assigned_staff_id !== data.assigned_staff_id) {
        let completedProjects = 0, pendingProjects = 0;
        let completedTasks = 0, pendingTasks = 0;
        let completedWorkOrders = 0, pendingWorkOrders = 0;
        let completedInspections = 0, pendingInspections = 0;

        if (oldClient.projects) {
          oldClient.projects.forEach(p => {
            if (p.status === 'COMPLETED') completedProjects++;
            else pendingProjects++;

            if (p.tasks) {
              p.tasks.forEach(t => {
                if (t.status === 'DONE') completedTasks++;
                else pendingTasks++;
              });
            }
            if (p.work_orders) {
              p.work_orders.forEach(w => {
                if (w.status === 'COMPLETED') completedWorkOrders++;
                else pendingWorkOrders++;
              });
            }
          });
        }

        if (oldClient.inspections) {
          oldClient.inspections.forEach(i => {
            if (i.status === 'COMPLETED') completedInspections++;
            else pendingInspections++;
          });
        }

        let newStaffName = 'Unassigned';
        if (data.assigned_staff_id) {
          const newStaff = await this.prisma.user.findUnique({
            where: { id: data.assigned_staff_id },
          });
          if (newStaff) {
            newStaffName = newStaff.name;
          }
        }

        const oldStaffName = oldClient.assigned_staff?.name || 'Unassigned';

        await this.prisma.auditLog.create({
          data: {
            entity_type: 'CLIENT',
            entity_id: id,
            action: 'STAFF_REASSIGNED',
            old_data: {
              assigned_staff_id: oldClient.assigned_staff_id || null,
              assigned_staff_name: oldStaffName,
              completed_projects: completedProjects,
              pending_projects: pendingProjects,
              completed_tasks: completedTasks,
              pending_tasks: pendingTasks,
              completed_work_orders: completedWorkOrders,
              pending_work_orders: pendingWorkOrders,
              completed_inspections: completedInspections,
              pending_inspections: pendingInspections,
            } as any,
            new_data: {
              assigned_staff_id: data.assigned_staff_id || null,
              assigned_staff_name: newStaffName,
            } as any,
            user_id: 'System',
          },
        });
      }
    }

    return this.prisma.client.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.client.delete({ where: { id } });
  }
}
