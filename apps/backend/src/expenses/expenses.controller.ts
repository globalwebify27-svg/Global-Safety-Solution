import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  create(@Body() data: any, @Request() req: any) {
    return this.expensesService.create(data, req.user.id);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'HR_MANAGER')
  findAll() {
    return this.expensesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.expensesService.findOne(id);
  }

  @Patch(':id/status')
  @Roles('SUPER_ADMIN', 'HR_MANAGER')
  updateStatus(
    @Param('id') id: string,
    @Body() data: { status: string },
    @Request() req: any,
  ) {
    return this.expensesService.updateStatus(id, data.status, req.user.id);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  remove(@Param('id') id: string) {
    return this.expensesService.remove(id);
  }
}
