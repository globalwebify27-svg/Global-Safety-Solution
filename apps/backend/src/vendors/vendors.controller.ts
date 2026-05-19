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
import { VendorsService } from './vendors.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'HR_MANAGER')
  create(@Body() data: any) {
    return this.vendorsService.create(data);
  }

  @Get()
  @Roles('SUPER_ADMIN', 'HR_MANAGER')
  findAll() {
    return this.vendorsService.findAll();
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'HR_MANAGER')
  findOne(@Param('id') id: string) {
    return this.vendorsService.findOne(id);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'HR_MANAGER')
  update(@Param('id') id: string, @Body() data: any) {
    return this.vendorsService.update(id, data);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  remove(@Param('id') id: string) {
    return this.vendorsService.remove(id);
  }
}
