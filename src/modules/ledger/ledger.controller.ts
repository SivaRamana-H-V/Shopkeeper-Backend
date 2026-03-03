import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { CreateLedgerEntryDto } from './dto/create-ledger-entry.dto';
import { RejectLedgerEntryDto } from './dto/reject-ledger-entry.dto';
import { CorrectLedgerEntryDto } from './dto/correct-ledger-entry.dto';
import { ListLedgerEntriesDto } from './dto/list-ledger-entries.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('shops/:shopId/ledger')
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Post()
  createEntry(
    @CurrentUser() user: User,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body() dto: CreateLedgerEntryDto,
  ) {
    return this.ledgerService.createEntry(shopId, user.id, dto);
  }

  @Get()
  listEntries(
    @CurrentUser() user: User,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Query() filters: ListLedgerEntriesDto,
    @Query() pagination: PaginationDto,
  ) {
    return this.ledgerService.listEntries(shopId, user.id, filters, pagination);
  }

  @Get(':entryId')
  getEntry(
    @CurrentUser() user: User,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.ledgerService.getEntry(shopId, entryId, user.id);
  }

  @Patch(':entryId/approve')
  approveEntry(
    @CurrentUser() user: User,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
  ) {
    return this.ledgerService.approveEntry(shopId, entryId, user.id);
  }

  @Patch(':entryId/reject')
  rejectEntry(
    @CurrentUser() user: User,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: RejectLedgerEntryDto,
  ) {
    return this.ledgerService.rejectEntry(shopId, entryId, user.id, dto);
  }

  @Post(':entryId/correct')
  correctEntry(
    @CurrentUser() user: User,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('entryId', ParseUUIDPipe) entryId: string,
    @Body() dto: CorrectLedgerEntryDto,
  ) {
    return this.ledgerService.correctEntry(shopId, entryId, user.id, dto);
  }
}
