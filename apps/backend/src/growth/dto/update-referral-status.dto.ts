import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

export const REFERRAL_STATUSES = ["PENDING", "COMPLETED", "CANCELLED"] as const;

export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

export class UpdateReferralStatusDto {
  @IsIn(REFERRAL_STATUSES)
  status: ReferralStatus;

  @IsInt()
  @Min(0)
  @Max(10000)
  @IsOptional()
  rewardPoints?: number;
}
