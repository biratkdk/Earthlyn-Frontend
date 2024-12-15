import { IsString, Length } from "class-validator";

export class RespondDisputeDto {
  @IsString()
  @Length(2, 2000)
  message: string;
}
