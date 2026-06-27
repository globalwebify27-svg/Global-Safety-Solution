import { IsString, IsOptional } from 'class-validator';

export class CreateCertificateTemplateDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  html_content: string;

  @IsString()
  fields: string; // JSON array of field names/inputs
}

export class UpdateCertificateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  html_content?: string;

  @IsOptional()
  @IsString()
  fields?: string;
}
