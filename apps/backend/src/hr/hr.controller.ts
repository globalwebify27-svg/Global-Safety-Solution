import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HRService } from './hr.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('hr')
@UseGuards(JwtAuthGuard)
export class HRController {
  constructor(private readonly hrService: HRService) {}

  @Get('employee/:id/profile')
  getEmployeeFinancialProfile(@Param('id') id: string) {
    return this.hrService.getEmployeeFinancialProfile(id);
  }

  @Post('employee/:id/promote')
  updateSalary(@Param('id') id: string, @Body() data: any) {
    return this.hrService.updateSalaryAndDesignation(id, data);
  }

  @Get('payroll')
  getPayrollHistory(
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.hrService.getPayrollHistory(
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined,
    );
  }

  @Post('payroll/generate')
  generateBatch(@Body() data: { month: number; year: number }) {
    return this.hrService.generatePayrollBatch(data.month, data.year);
  }

  @Put('payroll/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() data: { status: string; paid_at?: string },
  ) {
    return this.hrService.updatePayrollStatus(id, data.status, data.paid_at);
  }
}
