import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('leads')
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  findAll() {
    return this.leadsService.findAll();
  }

  @Post()
  create(@Body() data: any) {
    return this.leadsService.create(data);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.leadsService.update(id, data);
  }

  @Post(':id/convert')
  convertToClient(@Param('id') id: string) {
    return this.leadsService.convertToClient(id);
  }

  @Post(':id/email')
  sendEmail(
    @Param('id') id: string,
    @Body('subject') subject: string,
    @Body('message') message: string,
  ) {
    return this.leadsService.sendEmail(id, subject, message);
  }
}
