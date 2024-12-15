import { IsString, IsOptional, IsNumber } from "class-validator";

export class CreateSellerDto {
  @IsString()
  userId: string;

  @IsNumber()
  @IsOptional()
  processingFee?: number;

  @IsString()
  @IsOptional()
  storeDescription?: string;
}
