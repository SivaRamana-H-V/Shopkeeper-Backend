import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ShopsService } from './shops.service';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { CreateShopDto } from './dto/create-shop.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Post()
  createShop(@CurrentUser() user: User, @Body() dto: CreateShopDto) {
    return this.shopsService.create(user.id, dto);
  }

  @Get()
  listMyShops(@CurrentUser() user: User, @Query() pagination: PaginationDto) {
    return this.shopsService.findUserShops(user.id, pagination);
  }

  @Get(':shopId')
  getShop(
    @CurrentUser() user: User,
    @Param('shopId', ParseUUIDPipe) shopId: string,
  ) {
    return this.shopsService.findOne(shopId, user.id);
  }

  @Patch(':shopId')
  updateShop(
    @CurrentUser() user: User,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body() dto: CreateShopDto,
  ) {
    return this.shopsService.updateShop(shopId, user.id, { name: dto.name });
  }
}
