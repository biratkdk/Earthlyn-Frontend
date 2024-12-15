import { IsEmail, IsOptional, IsString } from "class-validator";

export class CreateReferralDto {
  @IsString()
  @IsOptional()
  refereeId?: string;

  @IsEmail()
  @IsOptional()
  refereeEmail?: string;
}
