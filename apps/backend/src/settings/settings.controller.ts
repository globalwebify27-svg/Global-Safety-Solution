import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  findAll() {
    return this.settingsService.findAll();
  }

  @Get('audit-logs')
  getAuditLogs() {
    return this.settingsService.getAuditLogs();
  }

  @Patch()
  @Permissions('UPDATE_SETTING')
  update(@Body() settings: Record<string, string>, @Req() req: any) {
    const userId = req.user?.userId;
    return this.settingsService.updateBatch(settings, userId);
  }
}
