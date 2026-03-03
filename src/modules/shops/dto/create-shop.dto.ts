import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateShopDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
