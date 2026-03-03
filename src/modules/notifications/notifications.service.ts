import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  async notifyLedgerCreated(userId: string, shopId: string, entryId: string): Promise<void> {
    this.logger.log(`[TODO] Notify user ${userId}: new ledger entry ${entryId} in shop ${shopId}`);
  }

  async notifyLedgerApproved(shopId: string, entryId: string): Promise<void> {
    this.logger.log(`[TODO] Notify shop ${shopId}: entry ${entryId} approved`);
  }

  async notifyLedgerRejected(shopId: string, entryId: string, reason: string): Promise<void> {
    this.logger.log(`[TODO] Notify shop ${shopId}: entry ${entryId} rejected — ${reason}`);
  }

  async notifyPaymentReceived(userId: string, shopId: string, paymentId: string): Promise<void> {
    this.logger.log(`[TODO] Notify shop ${shopId}: payment ${paymentId} from user ${userId}`);
  }
}
