import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { LedgerStatus } from '@prisma/client';

export class ListLedgerEntriesDto {
  @IsOptional()
  @IsEnum(LedgerStatus)
  status?: LedgerStatus;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
