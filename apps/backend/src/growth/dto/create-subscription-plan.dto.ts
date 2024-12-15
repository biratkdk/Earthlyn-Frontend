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

export class CreateSubscriptionPlanDto {
  @IsString()
  @Length(3, 50)
  code: string;

  @IsString()
  @Length(3, 80)
  name: string;

  @IsString()
  @Length(10, 500)
  description: string;

  @IsNumber()
  @Min(0)
  @Max(10000)
  price: number;

  @IsIn(SUBSCRIPTION_INTERVALS)
  interval: string;

  @IsArray()
  @IsString({ each: true })
  benefits: string[];

  @IsString()
  @IsOptional()
  stripePriceId?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(0)
  @Max(10000)
  @IsOptional()
  sortOrder?: number;
}
