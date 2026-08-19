import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AssetsService } from './assets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('assets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @Permissions('READ_ASSET')
  findAll() {
    return this.assetsService.findAll();
  }

  @Get(':id')
  @Permissions('READ_ASSET')
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Post()
  @Permissions('CREATE_ASSET')
  create(@Body() data: any, @Req() req: any) {
    const user = req.user?.name 
      ? `${req.user.name}${req.user.employee_id ? " (" + req.user.employee_id + ")" : ""}` 
      : (req.user?.email || "System");
    return this.assetsService.create(data, user);
  }

  @Patch(':id')
  @Permissions('UPDATE_ASSET')
  update(@Param('id') id: string, @Body() data: any, @Req() req: any) {
    const user = req.user?.name 
      ? `${req.user.name}${req.user.employee_id ? " (" + req.user.employee_id + ")" : ""}` 
      : (req.user?.email || "System");
    return this.assetsService.update(id, data, user);
  }

  @Delete(':id')
  @Permissions('DELETE_ASSET')
  delete(@Param('id') id: string, @Req() req: any) {
    const user = req.user?.name 
      ? `${req.user.name}${req.user.employee_id ? " (" + req.user.employee_id + ")" : ""}` 
      : (req.user?.email || "System");
    return this.assetsService.delete(id, user);
  }
}
