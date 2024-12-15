import { IsString } from "class-validator";

export class CreateBuyerDto {
  @IsString()
  userId: string;
}
