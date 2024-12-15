import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateMessageDto {
  @IsOptional()
  @IsString()
  senderId?: string;

  @IsString()
  receiverId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  content: string;
}
