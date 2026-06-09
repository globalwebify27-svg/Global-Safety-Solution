import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('quotations')
@UseGuards(JwtAuthGuard)
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) { }

  @Get()
  findAll(@Req() req: any) {
    return this.quotationsService.findAll(req.user);
  }

  @Post()
  create(@Body() data: any) {
    return this.quotationsService.create(data);
  }

  @Post('lead/:leadId')
  quickQuote(@Param('leadId') leadId: string) {
    return this.quotationsService.quickQuote(leadId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quotationsService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.quotationsService.updateStatus(id, status);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.quotationsService.update(id, data);
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
