import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { AddMemberDto } from './dto/add-member.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('shops/:shopId/members')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get()
  listMembers(
    @CurrentUser() user: User,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.membershipsService.listMembers(shopId, user.id, pagination);
  }

  @Post()
  addMember(
    @CurrentUser() user: User,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.membershipsService.addMember(shopId, user.id, dto);
  }

  @Delete(':targetUserId')
  removeMember(
    @CurrentUser() user: User,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('targetUserId', ParseUUIDPipe) targetUserId: string,
  ) {
    return this.membershipsService.removeMember(shopId, user.id, targetUserId);
  }
}
