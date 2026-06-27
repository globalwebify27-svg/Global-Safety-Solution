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
  PENDING_REVIEW = 'PENDING_REVIEW',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export class CreateInspectionItemDto {
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsString()
  recommendations?: string;

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

  @IsOptional()
  @IsNumber()
  expenditure?: number;

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
  @IsString()
  admin_feedback?: string;

  @IsOptional()
  @IsString()
  draft_cert_type?: string;

  @IsOptional()
  draft_cert_data?: any;

  @IsOptional()
  @IsNumber()
  expenditure?: number;

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
  @IsString()
  scope?: string;

  @IsOptional()
  @IsString()
  recommendations?: string;

  @IsOptional()
  @IsNumber()
  expenditure?: number;

  @IsOptional()
  @IsString()
  cert_ref_no?: string;

  @IsOptional()
  @IsDateString()
  cert_test_date?: string;

  @IsOptional()
  @IsDateString()
  cert_expiry_date?: string;

  @IsOptional()
  @IsString()
  cert_competency_no?: string;
}

export class AddInspectionItemDto {
  @IsUUID()
  inspection_id: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsString()
  recommendations?: string;

  @IsOptional()
  @IsNumber()
  expenditure?: number;

  @IsOptional()
  @IsString()
  photo_url?: string;

  @IsOptional()
  @IsString()
  cert_ref_no?: string;

  @IsOptional()
  @IsDateString()
  cert_test_date?: string;

  @IsOptional()
  @IsDateString()
  cert_expiry_date?: string;

  @IsOptional()
  @IsString()
  cert_competency_no?: string;
}
