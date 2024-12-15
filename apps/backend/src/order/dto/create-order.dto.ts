import { IsString, IsInt, Min, IsOptional } from "class-validator";

export class CreateOrderDto {
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsString()
  @IsOptional()
  paymentIntentId?: string;
}
