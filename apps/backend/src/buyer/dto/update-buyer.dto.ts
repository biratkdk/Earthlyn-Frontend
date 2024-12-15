import { IsOptional, IsString } from "class-validator";

export class UpdateBuyerDto {
  @IsOptional()
  @IsString()
  preferredCategory?: string;
}
