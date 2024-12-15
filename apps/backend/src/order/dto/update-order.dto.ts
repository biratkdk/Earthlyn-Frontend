import { IsEnum, IsOptional, IsString } from "class-validator";
import { OrderStatus } from "@prisma/client";

export class UpdateOrderDto {
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
