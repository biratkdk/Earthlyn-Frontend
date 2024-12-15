import { IsOptional, IsString } from "class-validator";
import { DisputePriority } from "@prisma/client";

export class CreateDisputeDto {
  @IsString()
  orderId: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  priority?: DisputePriority;
}
