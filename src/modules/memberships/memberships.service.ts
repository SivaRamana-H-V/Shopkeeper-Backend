import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MemberRole, ShopMember } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AddMemberDto } from './dto/add-member.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResult, paginate } from '../common/utils/pagination.util';

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  async addMember(
    shopId: string,
    requesterId: string,
    dto: AddMemberDto,
  ): Promise<ShopMember> {
    await this.assertOwner(shopId, requesterId);
    const targetUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!targetUser) throw new NotFoundException('User not found');
    return this.prisma.shopMember.create({
      data: { shopId, userId: targetUser.id, role: MemberRole.MEMBER },
    });
  }

  async removeMember(
    shopId: string,
    requesterId: string,
    targetUserId: string,
  ): Promise<void> {
    await this.assertOwner(shopId, requesterId);
    if (requesterId === targetUserId) {
      throw new ForbiddenException('Owner cannot remove themselves');
    }
    await this.prisma.shopMember.delete({
      where: { userId_shopId: { userId: targetUserId, shopId } },
    });
  }

  async listMembers(
    shopId: string,
    requesterId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<ShopMember>> {
    await this.assertMember(shopId, requesterId);
    const where = { shopId };
    const total = await this.prisma.shopMember.count({ where });
    const items = await this.prisma.shopMember.findMany({
      where,
      include: { user: true },
      ...paginate(pagination),
      orderBy: { joinedAt: 'asc' },
    });
    return {
      items,
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  private async assertOwner(shopId: string, userId: string): Promise<void> {
    const m = await this.prisma.shopMember.findUnique({
      where: { userId_shopId: { userId, shopId } },
    });
    if (!m || m.role !== MemberRole.OWNER) {
      throw new ForbiddenException('Only shop owner can perform this action');
    }
  }

  private async assertMember(shopId: string, userId: string): Promise<void> {
    const m = await this.prisma.shopMember.findUnique({
      where: { userId_shopId: { userId, shopId } },
    });
    if (!m) throw new ForbiddenException('Not a member of this shop');
  }
}
