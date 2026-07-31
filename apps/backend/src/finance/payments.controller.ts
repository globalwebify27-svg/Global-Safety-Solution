import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  findAll() {
    return this.paymentsService.findAll();
  }

  @Post()
  create(@Body() data: any) {
    return this.paymentsService.create(data);
  }

  @Get('invoice/:invoiceId')
  findByInvoice(@Param('invoiceId') invoiceId: string) {
    return this.paymentsService.findByInvoice(invoiceId);
  }

  @Post(':id/send-receipt')
  sendReceipt(@Param('id') id: string, @Body('email') email?: string) {
    return this.paymentsService.sendPaymentReceipt(id, email);
  }
}
