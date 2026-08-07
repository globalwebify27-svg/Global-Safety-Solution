import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { WhatsAppNotificationService } from './whatsapp-notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly whatsappNotificationService: WhatsAppNotificationService,
  ) {}

  @Get()
  findAll(@Req() req: any) {
    return this.notificationsService.findAll(req.user.userId);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Patch('read-all')
  markAllAsRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(req.user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notificationsService.remove(id);
  }

  @Post('whatsapp/test-connection')
  testWhatsAppConnection(@Body() body: { provider: string; apiKey: string }) {
    return this.whatsappNotificationService.testConnection(body.provider, body.apiKey);
  }

  @Post('whatsapp/test-sandbox')
  testWhatsAppSandbox(@Body() body: { provider: string; apiKey: string }) {
    return this.whatsappNotificationService.testSandboxConnection(body.provider, body.apiKey);
  }

  @Post('whatsapp/send-test')
  sendWhatsAppTestMessage(
    @Body() body: {
      provider: string;
      apiKey: string;
      environment: 'sandbox' | 'live';
      to: string;
      template: string;
    },
  ) {
    return this.whatsappNotificationService.sendTestMessage({
      providerName: body.provider,
      apiKey: body.apiKey,
      environment: body.environment,
      to: body.to,
      template: body.template,
    });
  }
}
