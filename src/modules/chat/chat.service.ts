import { ForbiddenException, Injectable } from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResult, paginate } from '../common/utils/pagination.util';

interface SystemEventInput {
  content: string;
  relatedLedgerId?: string;
  relatedPaymentId?: string;
}

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async emitSystemEvent(shopId: string, input: SystemEventInput) {
    return this.prisma.chatMessage.create({
      data: {
        shopId,
        senderId: null,
        messageType: MessageType.SYSTEM_EVENT,
        content: input.content,
        relatedLedgerId: input.relatedLedgerId,
        relatedPaymentId: input.relatedPaymentId,
      },
    });
  }

  async sendMessage(shopId: string, senderId: string, dto: SendMessageDto) {
    const membership = await this.prisma.shopMember.findUnique({
      where: { userId_shopId: { userId: senderId, shopId } },
    });
    if (!membership) throw new ForbiddenException('Not a member of this shop');

    return this.prisma.chatMessage.create({
      data: {
        shopId,
        senderId,
        messageType: MessageType.USER_MESSAGE,
        content: dto.content,
      },
    });
  }

  async listMessages(
    shopId: string,
    requesterId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<unknown>> {
    const membership = await this.prisma.shopMember.findUnique({
      where: { userId_shopId: { userId: requesterId, shopId } },
    });
    if (!membership) throw new ForbiddenException('Not a member of this shop');

    const where = { shopId };
    const total = await this.prisma.chatMessage.count({ where });
    const items = await this.prisma.chatMessage.findMany({
      where,
      include: { sender: { select: { id: true, name: true } } },
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
}
