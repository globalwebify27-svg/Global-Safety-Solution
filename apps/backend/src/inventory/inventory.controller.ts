import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @Permissions('READ_INVENTORY')
  findAll() {
    return this.inventoryService.findAll();
  }

  @Get(':id')
  @Permissions('READ_INVENTORY')
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Post()
  @Permissions('CREATE_INVENTORY')
  create(@Body() data: CreateInventoryDto) {
    return this.inventoryService.create(data);
  }

  @Patch(':id')
  @Permissions('UPDATE_INVENTORY')
  update(@Param('id') id: string, @Body() data: UpdateInventoryDto) {
    return this.inventoryService.update(id, data);
  }

  @Post('transaction')
  @Permissions('UPDATE_INVENTORY')
  createTransaction(@Body() data: CreateTransactionDto, @Req() req: any) {
    return this.inventoryService.createTransaction({
      ...data,
      performed_by: req.user.userId,
    });
  }
}
