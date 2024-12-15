import {
  IsString,
  IsNumber,
  IsInt,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
  Max,
} from "class-validator";

export class CreateProductDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description: string;

  @IsString()
  category: string;

  @IsNumber()
  @Min(0.01)
  @Max(999999.99)
  price: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  processingFee?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(999999)
  stock?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  ecoScore?: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsString()
  @IsOptional()
  sellerId?: string;
}

export class UpdateProductDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsInt()
  @IsOptional()
  stock?: number;

  @IsInt()
  @IsOptional()
  ecoScore?: number;
}
