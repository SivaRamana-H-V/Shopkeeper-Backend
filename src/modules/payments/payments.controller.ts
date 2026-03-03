import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('shops/:shopId/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  initiatePayment(
    @CurrentUser() user: User,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.paymentsService.initiatePayment(shopId, user.id, dto);
  }

  @Get()
  listPayments(
    @CurrentUser() user: User,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.paymentsService.listPayments(shopId, user.id, pagination);
  }

  @Get(':paymentId')
  getPayment(
    @CurrentUser() user: User,
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ) {
    return this.paymentsService.getPayment(shopId, paymentId, user.id);
  }
}
