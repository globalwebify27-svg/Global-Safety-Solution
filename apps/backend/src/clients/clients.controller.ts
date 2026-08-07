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
import { ClientsService } from './clients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Controller('clients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Permissions('CREATE_CLIENT')
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create(createClientDto);
  }

  @Get()
  @Permissions('READ_CLIENT')
  findAll() {
    return this.clientsService.findAll();
  }

  @Get(':id')
  @Permissions('READ_CLIENT')
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  @Permissions('UPDATE_CLIENT')
  update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto) {
    console.log(
      `[ClientsController] PATCH request received for id: ${id}`,
      updateClientDto,
    );
    return this.clientsService.update(id, updateClientDto);
  }

  @Post(':id/send-welcome')
  @Permissions('UPDATE_CLIENT')
  sendWelcomeEmail(@Param('id') id: string, @Body('email') email?: string) {
    return this.clientsService.sendWelcomeEmail(id, email);
  }

  @Post(':id/send-credentials')
  @Permissions('UPDATE_CLIENT')
  sendPortalCredentials(@Param('id') id: string, @Body('email') email?: string) {
    return this.clientsService.sendPortalCredentials(id, email);
  }

  @Post(':id/send-custom-email')
  @Permissions('UPDATE_CLIENT')
  sendCustomEmail(
    @Param('id') id: string,
    @Body() body: { email: string; subject: string; message: string }
  ) {
    return this.clientsService.sendCustomEmail(id, body.email, body.subject, body.message);
  }

  @Post(':id/send-whatsapp')
  @Permissions('UPDATE_CLIENT')
  sendCustomWhatsApp(
    @Param('id') id: string,
    @Body() body: {
      recipient: string;
      company_name: string;
      certificate_name: string;
      certificate_number: string;
      expiry_date: string;
      days_remaining: string;
      contact_name: string;
      contact_phone: string;
    }
  ) {
    return this.clientsService.sendCustomWhatsApp(id, body);
  }

  @Delete(':id')
  @Permissions('DELETE_CLIENT')
  remove(@Param('id') id: string) {
    return this.clientsService.remove(id);
  }
}
