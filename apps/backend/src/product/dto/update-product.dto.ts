import {
  IsString,
  IsNumber,
  IsInt,
  IsOptional,
  MinLength,
} from "class-validator";

export class UpdateProductDto {
  @IsString()
  @MinLength(3)
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(10)
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsOptional()
  processingFee?: number;

  @IsInt()
  @IsOptional()
  stock?: number;

  @IsInt()
  @IsOptional()
  ecoScore?: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}
