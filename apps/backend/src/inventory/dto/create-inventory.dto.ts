import { IsString, IsOptional, IsInt, Min, IsNumber } from 'class-validator';

export class CreateInventoryDto {
  @IsString()
  sku: string;

  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  min_stock?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  current_stock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price_per_unit?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  calibration_cert_url?: string;

  @IsOptional()
  @IsString()
  invoice_url?: string;

  @IsOptional()
  @IsString()
  serial_number?: string;

  @IsOptional()
  @IsString()
  make?: string;
}
