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
import { ServiceProductsService } from './service-products.service';
import {
  CreateServiceProductDto,
  UpdateServiceProductDto,
} from './dto/create-service-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('service-products')
@UseGuards(JwtAuthGuard)
export class ServiceProductsController {
  constructor(
    private readonly serviceProductsService: ServiceProductsService,
  ) {}

  @Post()
  create(@Body() createServiceProductDto: CreateServiceProductDto) {
    return this.serviceProductsService.create(createServiceProductDto);
  }

  @Get()
  findAll() {
    return this.serviceProductsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.serviceProductsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateServiceProductDto: UpdateServiceProductDto,
  ) {
    return this.serviceProductsService.update(id, updateServiceProductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.serviceProductsService.remove(id);
  }
}
