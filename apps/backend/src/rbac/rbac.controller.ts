import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { RBACService } from './rbac.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('rbac')
export class RBACController {
  constructor(private readonly rbacService: RBACService) {}

  @Get('test')
  test() {
    return { status: 'ok', message: 'RBAC Controller is reachable' };
  }

  @Get('roles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'HR_MANAGER', 'OFFICE_ADMIN')
  getRoles() {
    console.log('RBACController: getRoles called');
    return this.rbacService.getAllRoles();
  }

  @Post('roles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  createRole(@Body() data: { name: string; description: string }) {
    return this.rbacService.createRole(data);
  }

  @Get('permissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  getPermissions() {
    return this.rbacService.getAllPermissions();
  }

  @Get('roles/:id/permissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  getRolePermissions(@Param('id') roleId: string) {
    return this.rbacService.getRolePermissions(roleId);
  }

  @Post('roles/:id/permissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  updateRolePermissions(
    @Param('id') roleId: string,
    @Body() data: { permissionIds: string[] },
  ) {
    return this.rbacService.updateRolePermissions(roleId, data.permissionIds);
  }

  @Post('seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  seed() {
    return this.rbacService.seedRbac();
  }
}
