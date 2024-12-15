import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from "class-validator";
import { SUBSCRIPTION_INTERVALS } from "../../subscriptions/subscription-plans";

export class UpdateSubscriptionPlanDto {
  @IsString()
  @Length(3, 80)
  @IsOptional()
  name?: string;

  @IsString()
  @Length(10, 500)
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @Max(10000)
  @IsOptional()
  price?: number;

  @IsIn(SUBSCRIPTION_INTERVALS)
  @IsOptional()
  interval?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  benefits?: string[];

  @IsString()
  @IsOptional()
  stripePriceId?: string | null;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(0)
  @Max(10000)
  @IsOptional()
  sortOrder?: number;
}
