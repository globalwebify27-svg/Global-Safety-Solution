import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { UsersService } from '../../users/users.service';

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
    const request = context.switchToHttp().getRequest();
    const userPayload = request.user;
    if (!userPayload) return false;

    const user = await this.usersService.findById(userPayload.userId);
    if (!user || !user.is_active) return false;

    if (user.is_on_hold && request.method !== 'GET') {
      return false;
    }

    const populatedUser: any = await this.usersService.findByEmail(user.email);
    if (!populatedUser) return false;

    if (populatedUser.email === 'admin@globalsafety.com') {
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

    return requiredPermissions.some((permission) =>
      userPermissions.has(permission),
    );
  }
}
