import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LedgerStatus, MemberRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ShopsService } from '../shops/shops.service';
import { ChatService } from '../chat/chat.service';
import { CreateLedgerEntryDto } from './dto/create-ledger-entry.dto';
import { RejectLedgerEntryDto } from './dto/reject-ledger-entry.dto';
import { CorrectLedgerEntryDto } from './dto/correct-ledger-entry.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResult, paginate } from '../common/utils/pagination.util';

type EntryWithAllocations = Prisma.LedgerEntryGetPayload<{
  include: { allocations: { select: { allocatedAmount: true } } };
}>;

@Injectable()
export class LedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shopsService: ShopsService,
    private readonly chatService: ChatService,
  ) {}

  async createEntry(shopId: string, creatorId: string, dto: CreateLedgerEntryDto) {
    await this.shopsService.assertOwner(shopId, creatorId);
    const targetMembership = await this.prisma.shopMember.findUnique({
      where: { userId_shopId: { userId: dto.userId, shopId } },
    });
    if (!targetMembership) {
      throw new BadRequestException('Target user is not a member of this shop');
    }
    const entry = await this.prisma.ledgerEntry.create({
      data: {
        shopId,
        userId: dto.userId,
        originalAmount: new Prisma.Decimal(dto.amount),
        note: dto.note,
        status: LedgerStatus.PENDING_APPROVAL,
        createdBy: creatorId,
      },
    });
    await this.chatService.emitSystemEvent(shopId, {
      content: `New ledger entry created for ₹${dto.amount}. Awaiting student approval.`,
      relatedLedgerId: entry.id,
    });
    return entry;
  }

  async approveEntry(shopId: string, entryId: string, studentId: string) {
    const entry = await this.getEntryOrThrow(entryId, shopId);
    this.assertStudentOwns(entry, studentId);
    this.assertStatus(entry, LedgerStatus.PENDING_APPROVAL);
    const updated = await this.prisma.ledgerEntry.update({
      where: { id: entryId },
      data: { status: LedgerStatus.APPROVED },
    });
    await this.chatService.emitSystemEvent(shopId, {
      content: 'Ledger entry approved by student.',
      relatedLedgerId: entry.id,
    });
    return updated;
  }

  async rejectEntry(
    shopId: string,
    entryId: string,
    studentId: string,
    dto: RejectLedgerEntryDto,
  ) {
    const entry = await this.getEntryOrThrow(entryId, shopId);
    this.assertStudentOwns(entry, studentId);
    this.assertStatus(entry, LedgerStatus.PENDING_APPROVAL);
    const updated = await this.prisma.ledgerEntry.update({
      where: { id: entryId },
      data: { status: LedgerStatus.REJECTED, rejectionReason: dto.reason },
    });
    await this.chatService.emitSystemEvent(shopId, {
      content: `Ledger entry rejected. Reason: ${dto.reason}`,
      relatedLedgerId: entry.id,
    });
    return updated;
  }

  async correctEntry(
    shopId: string,
    entryId: string,
    ownerId: string,
    dto: CorrectLedgerEntryDto,
  ) {
    await this.shopsService.assertOwner(shopId, ownerId);
    const oldEntry = await this.getEntryOrThrow(entryId, shopId);
    this.assertStatus(oldEntry, LedgerStatus.REJECTED);

    return this.prisma.$transaction(async (tx) => {
      await tx.ledgerEntry.update({
        where: { id: entryId },
        data: { status: LedgerStatus.CANCELLED },
      });
      const newEntry = await tx.ledgerEntry.create({
        data: {
          shopId,
          userId: oldEntry.userId,
          originalAmount: new Prisma.Decimal(dto.amount),
          note: dto.note ?? oldEntry.note,
          status: LedgerStatus.PENDING_APPROVAL,
          createdBy: ownerId,
          parentEntryId: entryId,
        },
      });
      await this.chatService.emitSystemEvent(shopId, {
        content: `Entry corrected and resubmitted for ₹${dto.amount}. Awaiting approval.`,
        relatedLedgerId: newEntry.id,
      });
      return newEntry;
    });
  }

  async listEntries(
    shopId: string,
    requesterId: string,
    filters: { status?: LedgerStatus; userId?: string },
    pagination: PaginationDto,
  ): Promise<PaginatedResult<unknown>> {
    const membership = await this.prisma.shopMember.findUnique({
      where: { userId_shopId: { userId: requesterId, shopId } },
    });
    if (!membership) throw new ForbiddenException('Not a member of this shop');

    const where: Prisma.LedgerEntryWhereInput = {
      shopId,
      ...(membership.role === MemberRole.MEMBER && { userId: requesterId }),
      ...(filters.status && { status: filters.status }),
      ...(membership.role === MemberRole.OWNER && filters.userId && { userId: filters.userId }),
    };

    const total = await this.prisma.ledgerEntry.count({ where });
    const items = await this.prisma.ledgerEntry.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true } },
        allocations: { select: { allocatedAmount: true } },
      },
      ...paginate(pagination),
      orderBy: { createdAt: 'desc' },
    });

    const enriched = items.map((entry) => {
      const paid = entry.allocations.reduce(
        (sum: number, a: { allocatedAmount: Prisma.Decimal }) => sum + Number(a.allocatedAmount),
        0,
      );
      return { ...entry, paidAmount: paid, remainingAmount: Number(entry.originalAmount) - paid };
    });

    return {
      items: enriched,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async getEntry(shopId: string, entryId: string, requesterId: string) {
    const membership = await this.prisma.shopMember.findUnique({
      where: { userId_shopId: { userId: requesterId, shopId } },
    });
    if (!membership) throw new ForbiddenException('Not a member of this shop');

    const entry = await this.getEntryOrThrow(entryId, shopId);
    if (membership.role === MemberRole.MEMBER && entry.userId !== requesterId) {
      throw new ForbiddenException('Access denied');
    }

    const paid = entry.allocations.reduce(
      (sum: number, a: { allocatedAmount: Prisma.Decimal }) => sum + Number(a.allocatedAmount),
      0,
    );
    return { ...entry, paidAmount: paid, remainingAmount: Number(entry.originalAmount) - paid };
  }

  async refreshEntryStatus(entryId: string, tx: Prisma.TransactionClient): Promise<void> {
    const entry = await tx.ledgerEntry.findUnique({
      where: { id: entryId },
      include: { allocations: { select: { allocatedAmount: true } } },
    });
    if (!entry) return;

    const paid = entry.allocations.reduce(
      (sum: number, a: { allocatedAmount: Prisma.Decimal }) => sum + Number(a.allocatedAmount),
      0,
    );
    const total = Number(entry.originalAmount);

    if (paid >= total) {
      await tx.ledgerEntry.update({ where: { id: entryId }, data: { status: LedgerStatus.PAID } });
    } else if (paid > 0) {
      await tx.ledgerEntry.update({ where: { id: entryId }, data: { status: LedgerStatus.PARTIAL_PAID } });
    }
  }

  private async getEntryOrThrow(entryId: string, shopId: string): Promise<EntryWithAllocations> {
    const entry = await this.prisma.ledgerEntry.findFirst({
      where: { id: entryId, shopId },
      include: { allocations: { select: { allocatedAmount: true } } },
    });
    if (!entry) throw new NotFoundException('Ledger entry not found');
    return entry;
  }

  private assertStudentOwns(entry: EntryWithAllocations, userId: string): void {
    if (entry.userId !== userId) throw new ForbiddenException('This entry does not belong to you');
  }

  private assertStatus(entry: EntryWithAllocations, expected: LedgerStatus): void {
    if (entry.status !== expected) {
      throw new BadRequestException(`Invalid action: entry is in status ${entry.status}`);
    }
  }
}
