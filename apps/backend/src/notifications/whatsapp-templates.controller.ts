import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { WhatsAppTemplatesService } from './whatsapp-templates.service';

@Controller('whatsapp-templates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WhatsAppTemplatesController {
  constructor(private readonly templatesService: WhatsAppTemplatesService) {}

  @Post()
  @Permissions('UPDATE_SYSTEM_SETTINGS')
  create(
    @Body()
    body: {
      name: string;
      code: string;
      template_name: string;
      variables_map: string;
      is_active?: boolean;
    },
  ) {
    return this.templatesService.create(body);
  }

  @Get()
  @Permissions('READ_SYSTEM_SETTINGS')
  findAll() {
    return this.templatesService.findAll();
  }

  @Get(':id')
  @Permissions('READ_SYSTEM_SETTINGS')
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Patch(':id')
  @Permissions('UPDATE_SYSTEM_SETTINGS')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      code?: string;
      template_name?: string;
      variables_map?: string;
      is_active?: boolean;
    },
  ) {
    return this.templatesService.update(id, body);
  }

  @Delete(':id')
  @Permissions('UPDATE_SYSTEM_SETTINGS')
  remove(@Param('id') id: string) {
    return this.templatesService.remove(id);
  }
}
