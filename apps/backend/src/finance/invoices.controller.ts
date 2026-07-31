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
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  findAll() {
    return this.invoicesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Post()
  create(@Body() data: any) {
    return this.invoicesService.create(data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.invoicesService.update(id, data);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.invoicesService.updateStatus(id, status);
  }

  @Post(':id/send-email')
  sendInvoiceEmail(@Param('id') id: string, @Body('email') email?: string) {
    return this.invoicesService.sendInvoiceEmail(id, email);
  }

  @Post(':id/send-reminder')
  sendPaymentReminder(@Param('id') id: string, @Body('email') email?: string) {
    return this.invoicesService.sendPaymentReminder(id, email);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.invoicesService.remove(id);
  }
}
