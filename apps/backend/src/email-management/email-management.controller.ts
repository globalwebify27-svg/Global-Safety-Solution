import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EmailManagementService } from './email-management.service';
import { MailService } from './mail.service';
import { TemplateEngineService } from './template-engine.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { EmailQueueService } from './email-queue.service';
import { Query } from '@nestjs/common';

@Controller('email-management')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EmailManagementController {
  constructor(
    private readonly emailService: EmailManagementService,
    private readonly mailService: MailService,
    private readonly templateEngine: TemplateEngineService,
    private readonly emailQueue: EmailQueueService,
  ) {}

  // 1. SMTP Config
  @Get('smtp')
  @Permissions('MANAGE_SYSTEM')
  getSmtpConfig() {
    return this.emailService.getSmtpConfig();
  }

  @Post('smtp')
  @Permissions('MANAGE_SYSTEM')
  upsertSmtpConfig(@Body() body: any) {
    return this.emailService.upsertSmtpConfig(body);
  }

  @Post('smtp/verify')
  @Permissions('MANAGE_SYSTEM')
  verifySmtpConnection() {
    return this.mailService.verifyConnection();
  }

  // 2. Email Templates
  @Get('templates')
  @Permissions('MANAGE_SYSTEM')
  getEmailTemplates() {
    return this.emailService.getEmailTemplates();
  }

  @Post('templates/preview')
  @Permissions('MANAGE_SYSTEM')
  previewTemplate(@Body() body: { id?: string; code?: string; context?: any }) {
    const key = body.id || body.code || 'QUOTATION_CREATED';
    return this.templateEngine.renderPreview(key, body.context);
  }

  @Post('templates')
  @Permissions('MANAGE_SYSTEM')
  createEmailTemplate(@Body() body: any) {
    return this.emailService.createEmailTemplate(body);
  }

  @Put('templates/:id')
  @Permissions('MANAGE_SYSTEM')
  updateEmailTemplate(@Param('id') id: string, @Body() body: any) {
    return this.emailService.updateEmailTemplate(id, body);
  }

  @Delete('templates/:id')
  @Permissions('MANAGE_SYSTEM')
  deleteEmailTemplate(@Param('id') id: string) {
    return this.emailService.deleteEmailTemplate(id);
  }

  // 3. Email Branding
  @Get('branding')
  @Permissions('MANAGE_SYSTEM')
  getEmailBranding() {
    return this.emailService.getEmailBranding();
  }

  @Post('branding')
  @Permissions('MANAGE_SYSTEM')
  upsertEmailBranding(@Body() body: any) {
    return this.emailService.upsertEmailBranding(body);
  }

  // 4. Notification Rules
  @Get('rules')
  @Permissions('MANAGE_SYSTEM')
  getNotificationRules() {
    return this.emailService.getNotificationRules();
  }

  @Put('rules/:id')
  @Permissions('MANAGE_SYSTEM')
  updateNotificationRule(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.emailService.updateNotificationRule(id, body, req.user, req.ip);
  }

  @Post('rules/enable-all')
  @Permissions('MANAGE_SYSTEM')
  enableAllRules(@Req() req: any) {
    return this.emailService.enableAllRules(req.user, req.ip);
  }

  @Post('rules/disable-all')
  @Permissions('MANAGE_SYSTEM')
  disableAllRules(@Req() req: any) {
    return this.emailService.disableAllRules(req.user, req.ip);
  }

  @Post('rules/restore-defaults')
  @Permissions('MANAGE_SYSTEM')
  restoreDefaultRules(@Req() req: any) {
    return this.emailService.restoreDefaultRules(req.user, req.ip);
  }

  @Get('rules/audit-logs')
  @Permissions('MANAGE_SYSTEM')
  getAuditLogs() {
    return this.emailService.getAuditLogs();
  }

  // 5. Email Logs
  @Get('logs')
  @Permissions('MANAGE_SYSTEM')
  getEmailLogs() {
    return this.emailService.getEmailLogs();
  }

  // 6. Test Email Trigger
  @Post('test-email')
  @Permissions('MANAGE_SYSTEM')
  sendTestEmail(@Body('recipient') recipient: string) {
    return this.emailService.sendTestEmail(recipient || 'test@globalsafety.com');
  }

  // 7. Queue Metrics & Analytics
  @Get('queue')
  @Permissions('MANAGE_SYSTEM')
  getQueueStats() {
    return this.emailService.getQueueStats();
  }

  @Get('queue/items')
  @Permissions('MANAGE_SYSTEM')
  getQueueItems(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.emailQueue.getQueueItems(status, page ? parseInt(page) : 1, limit ? parseInt(limit) : 50);
  }

  @Post('queue/:id/retry')
  @Permissions('MANAGE_SYSTEM')
  retryFailedEmail(@Param('id') id: string) {
    return this.emailQueue.retryFailedEmail(id);
  }

  @Post('queue/retry-all')
  @Permissions('MANAGE_SYSTEM')
  retryAllFailed() {
    return this.emailQueue.retryAllFailed();
  }

  @Get('analytics/stats')
  @Permissions('MANAGE_SYSTEM')
  getAnalyticsStats() {
    return this.emailService.getAnalyticsStats();
  }
}
