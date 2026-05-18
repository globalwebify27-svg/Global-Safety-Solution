import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RBACService {
  constructor(private prisma: PrismaService) {}

  async createRole(data: { name: string; description: string }) {
    return this.prisma.role.create({
      data: {
        name: data.name.toUpperCase().replace(/\s+/g, '_'),
        description: data.description,
      },
    });
  }

  async getAllRoles() {
    return this.prisma.role.findMany({
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { name: 'asc' }],
    });
  }

  async getRolePermissions(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
    return role ? role.permissions.map((p) => p.permission_id) : [];
  }

  async updateRolePermissions(roleId: string, permissionIds: string[]) {
    return this.prisma.$transaction(async (tx) => {
      // Remove all existing permissions for this role
      await tx.rolePermission.deleteMany({
        where: { role_id: roleId },
      });

      // Add new permissions
      if (permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: permissionIds.map((id) => ({
            role_id: roleId,
            permission_id: id,
          })),
        });
      }

      return { success: true };
    });
  }

  async seedRbac() {
    const permissions = [
      // Dashboard
      {
        name: 'VIEW_DASHBOARD',
        module: 'DASHBOARD',
        description: 'Access to main dashboard',
      },

      // Client Management
      {
        name: 'VIEW_CLIENTS',
        module: 'CLIENTS',
        description: 'View client list and details',
      },
      {
        name: 'MANAGE_CLIENTS',
        module: 'CLIENTS',
        description: 'Create, update and delete clients',
      },

      // Sales
      { name: 'VIEW_LEADS', module: 'SALES', description: 'View sales leads' },
      {
        name: 'MANAGE_LEADS',
        module: 'SALES',
        description: 'Manage leads pipeline',
      },
      {
        name: 'VIEW_QUOTATIONS',
        module: 'SALES',
        description: 'View quotations',
      },
      {
        name: 'MANAGE_QUOTATIONS',
        module: 'SALES',
        description: 'Create and approve quotations',
      },

      // Finance
      {
        name: 'VIEW_INVOICES',
        module: 'FINANCE',
        description: 'View invoices',
      },
      {
        name: 'MANAGE_INVOICES',
        module: 'FINANCE',
        description: 'Create and send invoices',
      },
      {
        name: 'MANAGE_PAYMENTS',
        module: 'FINANCE',
        description: 'Record and manage payments',
      },

      // HR & Payroll
      {
        name: 'VIEW_STAFF',
        module: 'HR',
        description: 'View employee directory',
      },
      {
        name: 'MANAGE_STAFF',
        module: 'HR',
        description: 'Onboard and manage employee profiles',
      },
      {
        name: 'VIEW_PAYROLL',
        module: 'HR',
        description: 'View payroll history',
      },
      {
        name: 'MANAGE_PAYROLL',
        module: 'HR',
        description: 'Generate and process payroll batches',
      },

      // Operations
      {
        name: 'VIEW_PROJECTS',
        module: 'OPERATIONS',
        description: 'View projects',
      },
      {
        name: 'MANAGE_PROJECTS',
        module: 'OPERATIONS',
        description: 'Manage project lifecycle',
      },
      {
        name: 'VIEW_INSPECTIONS',
        module: 'OPERATIONS',
        description: 'View site inspections',
      },
      {
        name: 'MANAGE_INSPECTIONS',
        module: 'OPERATIONS',
        description: 'Schedule and complete inspections',
      },

      // Compliance
      {
        name: 'VIEW_COMPLIANCE',
        module: 'COMPLIANCE',
        description: 'View compliance status',
      },
      {
        name: 'MANAGE_COMPLIANCE',
        module: 'COMPLIANCE',
        description: 'Manage compliance certificates and renewals',
      },

      // System
      {
        name: 'MANAGE_SYSTEM_SETTINGS',
        module: 'SYSTEM',
        description: 'Change organization and system settings',
      },
      {
        name: 'MANAGE_ROLES',
        module: 'SYSTEM',
        description: 'Manage roles and permissions',
      },
    ];

    for (const p of permissions) {
      await this.prisma.permission.upsert({
        where: { name: p.name },
        update: { module: p.module, description: p.description },
        create: p,
      });
    }

    const roles = [
      {
        name: 'SUPER_ADMIN',
        description:
          'Complete system access with authority to manage roles and organization settings.',
      },
      {
        name: 'HR_MANAGER',
        description: 'Manage employee lifecycle, attendance, and payroll.',
      },
      {
        name: 'FIELD_ENGINEER',
        description: 'Perform site inspections and upload safety reports.',
      },
      {
        name: 'SALES_EXECUTIVE',
        description: 'Manage leads and generate quotations.',
      },
      {
        name: 'CLIENT',
        description: 'Access to project reports, invoices, and certificates.',
      },
    ];

    for (const role of roles) {
      await this.prisma.role.upsert({
        where: { name: role.name },
        update: { description: role.description },
        create: role,
      });
    }

    // Assign SUPER_ADMIN role to default admin
    const admin = await this.prisma.user.findUnique({
      where: { email: 'admin@globalsafety.com' },
    });
    const superAdminRole = await this.prisma.role.findUnique({
      where: { name: 'SUPER_ADMIN' },
    });

    if (admin && superAdminRole) {
      await this.prisma.userRole.upsert({
        where: {
          user_id_role_id: { user_id: admin.id, role_id: superAdminRole.id },
        },
        update: {},
        create: { user_id: admin.id, role_id: superAdminRole.id },
      });
    }

    return {
      permissionsCount: permissions.length,
      rolesCount: roles.length,
      adminAssigned: !!(admin && superAdminRole),
    };
  }
}
