import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ClientsService } from './clients.service';

@Controller('clients')
export class ClientPortalPublicController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post('setup-password')
  setupPassword(@Body() body: { clientId: string; password: string }) {
    if (!body || !body.clientId || !body.password) {
      throw new BadRequestException('Client ID and Password are required.');
    }
    return this.clientsService.setupPassword(body.clientId, body.password);
  }
}
