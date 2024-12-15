import { IsString, IsOptional } from "class-validator";

export class CreateTicketDto {
  @IsString()
  issueType: string;

  @IsString()
  subject: string;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  priority?: string;
}
