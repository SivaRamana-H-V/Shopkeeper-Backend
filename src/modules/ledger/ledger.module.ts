import { Module } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { LedgerController } from './ledger.controller';
import { ShopsModule } from '../shops/shops.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [ShopsModule, ChatModule],
  controllers: [LedgerController],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}
