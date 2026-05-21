import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('quotations')
@UseGuards(JwtAuthGuard)
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) { }

  @Get()
  findAll() {
    return this.quotationsService.findAll();
  }

  @Post()
  create(@Body() data: any) {
    return this.quotationsService.create(data);
  }

  @Post('lead/:leadId')
  quickQuote(@Param('leadId') leadId: string) {
    return this.quotationsService.create({
      lead_id: leadId,
      items: [
        {
          description: "General Service / Software Provision",
          quantity: 1,
          unit_price: 20000
        }
      ],
      apply_gst: false,
      notes: ""
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quotationsService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.quotationsService.updateStatus(id, status);
  }

  @Post(':id/convert')
  convert(@Param('id') id: string) {
    return this.quotationsService.convertToProjectAndInvoice(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.quotationsService.remove(id);
  }
}
