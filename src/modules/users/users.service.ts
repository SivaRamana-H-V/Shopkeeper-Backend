import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { User } from '@prisma/client';

interface FindOrCreateInput {
  supabaseUserId: string;
  email: string;
  name: string;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreate(input: FindOrCreateInput): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: { supabaseUserId: input.supabaseUserId },
    });

    if (existing) return existing;

    return this.prisma.user.create({
      data: {
        supabaseUserId: input.supabaseUserId,
        email: input.email,
        name: input.name,
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async updateProfile(
    userId: string,
    data: { name?: string; phone?: string },
  ): Promise<User> {
    return this.prisma.user.update({ where: { id: userId }, data });
  }
}
