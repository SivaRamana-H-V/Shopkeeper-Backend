import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { ShopsModule } from '../shops/shops.module';
import { LedgerModule } from '../ledger/ledger.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [ShopsModule, LedgerModule, ChatModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
