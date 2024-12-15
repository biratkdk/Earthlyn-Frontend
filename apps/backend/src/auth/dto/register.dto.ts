import { IsEmail, IsEnum, IsString, Matches, MinLength } from "class-validator";
import { UserRole } from "@prisma/client";

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(3)
  name: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: "password must include at least one letter and one number",
  })
  password: string;

  @IsEnum(UserRole)
  role: UserRole;
}
