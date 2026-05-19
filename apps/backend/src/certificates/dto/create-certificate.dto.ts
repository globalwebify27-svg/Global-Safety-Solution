import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsEnum,
  IsObject,
} from 'class-validator';

export class CreateCertificateDto {
  @IsUUID()
  inspection_id: string;

  @IsString()
  certificate_no: string;

  @IsDateString()
  issue_date: string;

  @IsString()
  validity_period: string; // "1y", "3y", "1-time"

  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class UpdateCertificateDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  pdf_url?: string;

  @IsOptional()
  @IsObject()
  metadata?: any;
}
