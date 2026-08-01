import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UsersService } from '../../users/users.service';

const PERMISSION_MAP: Record<string, string[]> = {
  // Users / Staff
  'READ_USER': ['VIEW_STAFF', 'MANAGE_STAFF'],
  'UPDATE_USER': ['MANAGE_STAFF'],
  'CREATE_USER': ['MANAGE_STAFF'],

  // Clients
  'READ_CLIENT': ['VIEW_CLIENTS', 'MANAGE_CLIENTS'],
  'CREATE_CLIENT': ['MANAGE_CLIENTS'],
  'UPDATE_CLIENT': ['MANAGE_CLIENTS'],
  'DELETE_CLIENT': ['MANAGE_CLIENTS'],

  // Compliance
  'READ_COMPLIANCE': ['VIEW_COMPLIANCE', 'MANAGE_COMPLIANCE'],
  'CREATE_COMPLIANCE': ['MANAGE_COMPLIANCE'],
  'UPDATE_COMPLIANCE': ['MANAGE_COMPLIANCE'],
  'DELETE_COMPLIANCE': ['MANAGE_COMPLIANCE'],

  // Projects / Operations
  'READ_PROJECT': ['VIEW_PROJECTS', 'MANAGE_PROJECTS'],
  'CREATE_PROJECT': ['MANAGE_PROJECTS'],
  'UPDATE_PROJECT': ['MANAGE_PROJECTS'],
  'DELETE_PROJECT': ['MANAGE_PROJECTS'],

  // Tasks / Operations
  'READ_TASK': ['VIEW_FIELD_TASKS', 'VIEW_PROJECTS', 'MANAGE_PROJECTS'],
  'CREATE_TASK': ['MANAGE_PROJECTS'],
  'UPDATE_TASK': ['VIEW_FIELD_TASKS', 'MANAGE_PROJECTS'],
  'DELETE_TASK': ['MANAGE_PROJECTS'],

  // Inventory
  'READ_INVENTORY': ['VIEW_INSPECTIONS', 'MANAGE_INSPECTIONS', 'MANAGE_SYSTEM_SETTINGS'],
  'CREATE_INVENTORY': ['MANAGE_SYSTEM_SETTINGS'],
  'UPDATE_INVENTORY': ['MANAGE_SYSTEM_SETTINGS'],

  // Assets
  'READ_ASSET': ['MANAGE_SYSTEM_SETTINGS'],
  'CREATE_ASSET': ['MANAGE_SYSTEM_SETTINGS'],
  'UPDATE_ASSET': ['MANAGE_SYSTEM_SETTINGS'],
  'DELETE_ASSET': ['MANAGE_SYSTEM_SETTINGS'],

  // Documents
  'READ_DOCUMENT': ['READ_DOCUMENT', 'VIEW_FIELD_TASKS', 'VIEW_INSPECTIONS', 'MANAGE_INSPECTIONS'],
  'CREATE_DOCUMENT': ['CREATE_DOCUMENT', 'VIEW_FIELD_TASKS', 'MANAGE_INSPECTIONS', 'VIEW_INSPECTIONS'],
  'DELETE_DOCUMENT': ['DELETE_DOCUMENT', 'MANAGE_INSPECTIONS'],

  // Settings
  'READ_SETTING': ['MANAGE_SYSTEM_SETTINGS'],
  'UPDATE_SETTING': ['MANAGE_SYSTEM_SETTINGS'],
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions) {
      return true;
    }
    try {
      const request = context.switchToHttp().getRequest();
      const userPayload = request.user;
      if (!userPayload) return false;

      const userId = userPayload.userId || userPayload.id || userPayload.sub;
      if (!userId) return false;

      const user = await this.usersService.findById(userId);
      if (!user || !user.is_active) return false;

    if (user.is_on_hold && request.method !== 'GET') {
      return false;
    }

    const populatedUser: any = await this.usersService.findByEmail(user.email);
    if (!populatedUser) return false;

    const admins = ['admin@globalsafety.com', 'amrvbloggers@gmail.com'];
    const isAdmin =
      admins.includes(populatedUser.email) ||
      populatedUser.roles?.some(
        (ur: any) =>
          ur.role?.name === 'SUPER_ADMIN' ||
          ur.role?.name === 'ADMIN' ||
          ur.role?.name === 'ORGANIZATION_ADMIN',
      );

    if (isAdmin) {
      return true;
    }

    const isClientRole =
      populatedUser.roles?.some(
        (ur: any) =>
          ur.role?.name === 'CLIENT' || ur.role?.name === 'CLIENTS',
      ) || (populatedUser.designation || '').toUpperCase().includes('CLIENT');

    // For ALL internal active staff/employees (non-client users), grant access to document uploads, inspections, and field task operations
    if (!isClientRole) {
      const internalStaffPermissions = [
        'CREATE_DOCUMENT', 'READ_DOCUMENT', 
        'VIEW_FIELD_TASKS', 'UPDATE_TASK', 'CREATE_TASK', 'READ_TASK',
        'VIEW_INSPECTIONS', 'MANAGE_INSPECTIONS',
        'VIEW_PROJECTS', 'MANAGE_PROJECTS',
        'VIEW_COMPLIANCE', 'MANAGE_COMPLIANCE'
      ];
      if (requiredPermissions.some((p) => internalStaffPermissions.includes(p))) {
        return true;
      }
    }

    if (isClientRole && (request.method === 'GET' || requiredPermissions.every((p) => p.startsWith('READ_') || p.startsWith('VIEW_')))) {
      return true;
    }

    const userPermissions = new Set<string>();
    if (populatedUser.roles) {
      populatedUser.roles.forEach((ur: any) => {
        if (ur.role && ur.role.permissions) {
          ur.role.permissions.forEach((rp: any) => {
            if (rp.permission && rp.permission.name) {
              userPermissions.add(rp.permission.name);
            }
          });
        }
      });
    }

    const checkPermission = (required: string) => {
      if (userPermissions.has(required)) return true;
      const mapped = PERMISSION_MAP[required];
      if (mapped) {
        return mapped.some((m) => userPermissions.has(m));
      }
      return false;
    };

    return requiredPermissions.some((permission) =>
      checkPermission(permission),
    );
    } catch (error) {
      console.error('Error in PermissionsGuard:', error);
      return false;
    }
  }
}
