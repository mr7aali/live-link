import { IsString, MinLength, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  username: string;

  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'phoneNumber must be a valid phone number',
  })
  phoneNumber: string;

  @IsString()
  @MinLength(6)
  password: string;
}
