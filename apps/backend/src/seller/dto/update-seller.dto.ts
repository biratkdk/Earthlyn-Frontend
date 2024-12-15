import { SellerTier } from "@prisma/client";
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateSellerDto {
  @IsString()
  @IsOptional()
  storeDescription?: string;

  @IsNumber()
  @IsOptional()
  processingFee?: number;

  @IsEnum(SellerTier)
  @IsOptional()
  tier?: SellerTier;
}
