import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { SendMessageDto } from './dto/send-message.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('shops/:shopId/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  listMessages(
    @CurrentUser() user: User,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.chatService.listMessages(shopId, user.id, pagination);
  }

  @Post()
  sendMessage(
    @CurrentUser() user: User,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(shopId, user.id, dto);
  }
}
