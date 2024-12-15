import { IsString, Length } from "class-validator";

export class CreateSubscriptionDto {
  @IsString()
  @Length(3, 80)
  plan: string;
}
