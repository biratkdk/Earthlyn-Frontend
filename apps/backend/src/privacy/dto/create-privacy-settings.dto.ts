import { IsBoolean, IsOptional } from "class-validator";

export class CreatePrivacySettingsDto {
  @IsBoolean()
  @IsOptional()
  dataCollection?: boolean;

  @IsBoolean()
  @IsOptional()
  marketing?: boolean;

  @IsBoolean()
  @IsOptional()
  analytics?: boolean;
}
