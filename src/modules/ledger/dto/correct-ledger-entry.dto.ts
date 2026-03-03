import { IsDecimal, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CorrectLedgerEntryDto {
  @IsDecimal({ decimal_digits: '0,2' })
  @IsNotEmpty()
  amount: string;

  @IsOptional()
  @IsString()
  note?: string;
}
