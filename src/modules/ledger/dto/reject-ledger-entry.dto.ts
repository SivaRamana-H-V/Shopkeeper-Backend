import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RejectLedgerEntryDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  reason: string;
}
