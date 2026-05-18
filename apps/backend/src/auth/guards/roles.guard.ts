import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UsersService } from '../../users/users.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const userPayload = request.user;
    if (!userPayload) return false;

    const populatedUser = await this.usersService.findByEmail(
      userPayload.email,
    );
    if (!populatedUser) return false;

    // Super admin bypass
    const admins = ['admin@globalsafety.com', 'amrvbloggers@gmail.com'];
    if (admins.includes(populatedUser.email)) return true;

    const userRoles = populatedUser.roles?.map((ur: any) => ur.role.name) || [];
    return requiredRoles.some((role) => userRoles.includes(role));
  }
}
