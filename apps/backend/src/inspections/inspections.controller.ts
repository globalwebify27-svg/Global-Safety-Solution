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
  Res,
} from '@nestjs/common';
import { InspectionsService } from './inspections.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateInspectionDto,
  UpdateInspectionDto,
  UpdateInspectionItemDto,
} from './dto/create-inspection.dto';

@Controller('inspections')
@UseGuards(JwtAuthGuard)
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Post()
  create(@Body() data: CreateInspectionDto) {
    return this.inspectionsService.create(data);
  }

  @Post('schedule/:workOrderId')
  schedule(
    @Param('workOrderId') workOrderId: string,
    @Body() body: { engineerId: string; scheduledDate: string },
  ) {
    return this.inspectionsService.scheduleWorkOrder(
      workOrderId,
      body.engineerId,
      body.scheduledDate,
    );
  }

  @Get()
  findAll() {
    return this.inspectionsService.findAll();
  }

  @Get('my')
  findMyInspections(@Req() req: any) {
    return this.inspectionsService.findByEngineer(req.user.userId);
  }

  @Get('engineer/:engineerId')
  findByEngineerId(@Param('engineerId') engineerId: string) {
    return this.inspectionsService.findByEngineer(engineerId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inspectionsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateInspectionDto) {
    return this.inspectionsService.update(id, data);
  }

  @Patch('item/:itemId')
  updateItem(
    @Param('itemId') itemId: string,
    @Body() data: UpdateInspectionItemDto,
  ) {
    return this.inspectionsService.updateItem(itemId, data);
  }

  @Get(':id/certificate')
  async downloadCertificate(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    const buffer = await this.inspectionsService.generateCertificate(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=safety-certificate-${id.substring(0, 8)}.pdf`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.inspectionsService.approve(id);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() body: { feedback: string }) {
    return this.inspectionsService.reject(id, body.feedback);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inspectionsService.remove(id);
  }
}
