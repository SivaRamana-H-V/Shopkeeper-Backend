import { IsEmail, IsNotEmpty } from 'class-validator';

export class AddMemberDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
