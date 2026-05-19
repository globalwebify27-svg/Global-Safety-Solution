import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateChecklistItemDto {
  @IsString()
  question: string;

  @IsOptional()
  @IsString()
  field_type?: string; // e.g., 'BOOLEAN', 'TEXT', 'NUMBER', 'DROPDOWN'

  @IsOptional()
  @IsString()
  options?: string;

  @IsOptional()
  @IsBoolean()
  is_required?: boolean;
}

export class CreateServiceProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateChecklistItemDto)
  checklist?: CreateChecklistItemDto[];
}

export class UpdateServiceProductDto extends CreateServiceProductDto {}
