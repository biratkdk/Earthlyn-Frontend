import { IsEnum, IsOptional, IsString, Length } from "class-validator";
import { DisputeStatus } from "@prisma/client";

export class UpdateDisputeDto {
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;

  @IsOptional()
  @IsString()
  @Length(5, 1000)
  resolution?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;
}
