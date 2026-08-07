import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { WhatsAppLogsService } from './whatsapp-logs.service';
import { GetWhatsAppLogsDto } from './dto/get-whatsapp-logs.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('whatsapp-logs')
@UseGuards(JwtAuthGuard)
export class WhatsAppLogsController {
  constructor(private readonly logsService: WhatsAppLogsService) {}

  @Get()
  @Permissions('MANAGE_SYSTEM')
  findAll(@Query() query: GetWhatsAppLogsDto) {
    return this.logsService.findAll(query);
  }

  @Get('analytics/stats')
  @Permissions('MANAGE_SYSTEM')
  getAnalytics() {
    return this.logsService.getAnalytics();
  }

  @Get(':id')
  @Permissions('MANAGE_SYSTEM')
  findOne(@Param('id') id: string) {
    return this.logsService.findOne(id);
  }

  @Post(':id/retry')
  @Permissions('MANAGE_SYSTEM')
  retry(@Param('id') id: string) {
    return this.logsService.retry(id);
  }
}
