import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MemberRole, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ShopsService } from '../shops/shops.service';
import { LedgerService } from '../ledger/ledger.service';
import { ChatService } from '../chat/chat.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResult, paginate } from '../common/utils/pagination.util';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shopsService: ShopsService,
    private readonly ledgerService: LedgerService,
    private readonly chatService: ChatService,
  ) {}

  async initiatePayment(shopId: string, payerId: string, dto: InitiatePaymentDto) {
    await this.shopsService.assertMember(shopId, payerId);

    const paymentAmount = new Prisma.Decimal(dto.amount);
    if (paymentAmount.lte(0)) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: { userId: payerId, shopId, amount: paymentAmount, status: PaymentStatus.INITIATED },
      });

      try {
        const pendingEntries = await tx.ledgerEntry.findMany({
          where: {
            shopId,
            userId: payerId,
            status: { in: ['APPROVED', 'PARTIAL_PAID'] },
          },
          include: { allocations: { select: { allocatedAmount: true } } },
          orderBy: { createdAt: 'asc' },
        });

        if (pendingEntries.length === 0) {
          await tx.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED } });
          throw new BadRequestException('No outstanding approved ledger entries to pay');
        }

        const totalOutstanding = pendingEntries.reduce((sum: number, entry) => {
          const alreadyPaid = entry.allocations.reduce(
            (s: number, a: { allocatedAmount: Prisma.Decimal }) => s + Number(a.allocatedAmount),
            0,
          );
          return sum + (Number(entry.originalAmount) - alreadyPaid);
        }, 0);

        if (Number(paymentAmount) > totalOutstanding) {
          throw new BadRequestException(
            `Payment exceeds outstanding balance of ₹${totalOutstanding.toFixed(2)}`,
          );
        }

        let remaining = Number(paymentAmount);

        for (const entry of pendingEntries) {
          if (remaining <= 0) break;
          const alreadyPaid = entry.allocations.reduce(
            (s: number, a: { allocatedAmount: Prisma.Decimal }) => s + Number(a.allocatedAmount),
            0,
          );
          const entryRemaining = Number(entry.originalAmount) - alreadyPaid;
          const allocate = Math.min(remaining, entryRemaining);

          await tx.paymentAllocation.create({
            data: {
              paymentId: payment.id,
              ledgerEntryId: entry.id,
              allocatedAmount: new Prisma.Decimal(allocate),
            },
          });

          await this.ledgerService.refreshEntryStatus(entry.id, tx);
          remaining -= allocate;
        }

        const finalPayment = await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.SUCCESS },
        });

        await this.chatService.emitSystemEvent(shopId, {
          content: `Payment of ₹${dto.amount} received and allocated.`,
          relatedPaymentId: payment.id,
        });

        return finalPayment;
      } catch (error) {
        await tx.payment
          .update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED } })
          .catch(() => undefined);
        throw error;
      }
    });
  }

  async listPayments(
    shopId: string,
    requesterId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<unknown>> {
    await this.shopsService.assertMember(shopId, requesterId);
    const membership = await this.shopsService.getMembership(shopId, requesterId);
    const isOwner = membership?.role === MemberRole.OWNER;

    const where = { shopId, ...(!isOwner && { userId: requesterId }) };
    const total = await this.prisma.payment.count({ where });
    const items = await this.prisma.payment.findMany({
      where,
      include: {
        allocations: {
          include: {
            ledgerEntry: { select: { id: true, originalAmount: true, note: true } },
          },
        },
      },
      ...paginate(pagination),
      orderBy: { createdAt: 'desc' },
    });
    return {
      items,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async getPayment(shopId: string, paymentId: string, requesterId: string) {
    await this.shopsService.assertMember(shopId, requesterId);
    const membership = await this.shopsService.getMembership(shopId, requesterId);
    const isOwner = membership?.role === MemberRole.OWNER;

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, shopId },
      include: {
        allocations: {
          include: {
            ledgerEntry: { select: { id: true, originalAmount: true, note: true, status: true } },
          },
        },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (!isOwner && payment.userId !== requesterId) throw new NotFoundException('Payment not found');
    return payment;
  }
}
