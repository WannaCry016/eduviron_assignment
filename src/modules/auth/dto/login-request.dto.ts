import { IsString, MinLength } from 'class-validator';

export class LoginRequestDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(8)
  password: string;
}
