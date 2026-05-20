import {
  IsString,
  IsUUID,
  IsDateString,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum InspectionStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export class CreateInspectionItemDto {
  @IsString()
  description: string;

  @IsOptional()
  @IsNumber()
  expenditure?: number;
}

export class CreateInspectionDto {
  @IsUUID()
  client_id: string;

  @IsOptional()
  @IsUUID()
  project_id?: string;

  @IsOptional()
  @IsUUID()
  engineer_id?: string;

  @IsOptional()
  @IsUUID()
  work_order_id?: string;

  @IsDateString()
  scheduled_date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInspectionItemDto)
  @IsOptional()
  items?: CreateInspectionItemDto[];
}

export class UpdateInspectionDto {
  @IsOptional()
  @IsEnum(InspectionStatus)
  status?: InspectionStatus;

  @IsOptional()
  @IsUUID()
  engineer_id?: string;

  @IsOptional()
  @IsDateString()
  scheduled_date?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsDateString()
  completed_date?: string;
}

export class UpdateInspectionItemDto {
  @IsOptional()
  @IsString()
  status?: string; // PASS, FAIL, NA

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  photo_url?: string;

  @IsOptional()
  @IsNumber()
  expenditure?: number;
}
