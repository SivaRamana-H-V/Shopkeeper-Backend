import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { MemberRole, Shop, ShopMember } from '@prisma/client';
import { CreateShopDto } from './dto/create-shop.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResult, paginate } from '../common/utils/pagination.util';

@Injectable()
export class ShopsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateShopDto): Promise<Shop> {
    return this.prisma.$transaction(async (tx) => {
      const shop = await tx.shop.create({ data: { name: dto.name } });
      await tx.shopMember.create({
        data: { userId, shopId: shop.id, role: MemberRole.OWNER },
      });
      return shop;
    });
  }

  async findUserShops(
    userId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResult<Shop>> {
    const where = { members: { some: { userId } } };
    const total = await this.prisma.shop.count({ where });
    const items = await this.prisma.shop.findMany({
      where,
      include: { members: { where: { userId }, select: { role: true } } },
      skip: paginate(pagination).skip,
      take: paginate(pagination).take,
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

  async findOne(shopId: string, userId: string): Promise<Shop> {
    await this.assertMember(shopId, userId);
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  async updateShop(
    shopId: string,
    userId: string,
    data: Partial<{ name: string }>,
  ): Promise<Shop> {
    await this.assertOwner(shopId, userId);
    return this.prisma.shop.update({ where: { id: shopId }, data });
  }

  async assertMember(shopId: string, userId: string): Promise<void> {
    const membership = await this.prisma.shopMember.findUnique({
      where: { userId_shopId: { userId, shopId } },
    });
    if (!membership) throw new ForbiddenException('Not a member of this shop');
  }

  async assertOwner(shopId: string, userId: string): Promise<void> {
    const membership = await this.prisma.shopMember.findUnique({
      where: { userId_shopId: { userId, shopId } },
    });
    if (!membership || membership.role !== MemberRole.OWNER) {
      throw new ForbiddenException('Only shop owner can perform this action');
    }
  }

  async getMembership(shopId: string, userId: string): Promise<ShopMember | null> {
    return this.prisma.shopMember.findUnique({
      where: { userId_shopId: { userId, shopId } },
    });
  }
}
