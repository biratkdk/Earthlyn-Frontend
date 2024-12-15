import { IsBoolean, IsIn, IsOptional, IsString, Length } from "class-validator";

export const MARKETING_AUDIENCES = ["ALL", "BUYERS", "SELLERS"] as const;

export type MarketingAudience = (typeof MARKETING_AUDIENCES)[number];

export class CreateMarketingCampaignDto {
  @IsString()
  @Length(3, 80)
  title: string;

  @IsString()
  @Length(10, 500)
  message: string;

  @IsIn(MARKETING_AUDIENCES)
  audience: MarketingAudience;

  @IsBoolean()
  @IsOptional()
  sendNow?: boolean;
}
