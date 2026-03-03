import {
  IsDecimal,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateLedgerEntryDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsDecimal({ decimal_digits: '0,2' })
  @IsNotEmpty()
  amount: string;

  @IsOptional()
  @IsString()
  note?: string;
}
