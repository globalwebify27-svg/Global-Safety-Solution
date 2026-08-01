import { IsOptional, IsString } from 'class-validator';

export class EditCertificateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  certificate_number?: string;

  @IsOptional()
  @IsString()
  cert_competency_no?: string;

  @IsOptional()
  @IsString()
  issue_date?: string;

  @IsOptional()
  @IsString()
  expiry_date?: string;

  @IsOptional()
  @IsString()
  validity_period?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  delivery_status?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
