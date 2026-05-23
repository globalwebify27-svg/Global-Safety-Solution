import { IsString, IsOptional, IsBoolean, IsEmail, IsArray } from 'class-validator';

export class CreateClientDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  gst_number?: string;

  @IsOptional()
  @IsString()
  pan_number?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  billing_address?: string;

  @IsOptional()
  @IsString()
  shipping_address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  assigned_staff_id?: string;

  @IsOptional()
  @IsArray()
  contacts?: any[];
}
