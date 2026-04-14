import { Module, forwardRef } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NOTIFICATION_QUEUE } from "./notification.queue";
import { NotificationProcessor } from "./notification.processor";
import { AutoResolveMarketsJob } from "./auto-resolve-markets.job";
import { TelegramSimpleService } from "../telegram/telegram.service.simple";
import { User } from "../entities/user.entity";
import { Market } from "../entities/market.entity";
import { Dispute } from "../entities/dispute.entity";
import { AuditLog } from "../entities/audit-log.entity";
import { MarketsModule } from "../markets/markets.module";

@Module({
  imports: [
    BullModule.registerQueue({ name: NOTIFICATION_QUEUE }),
    TypeOrmModule.forFeature([User, Market, Dispute, AuditLog]),
    forwardRef(() => MarketsModule),
  ],
  providers: [
    NotificationProcessor,
    TelegramSimpleService,
    AutoResolveMarketsJob,
  ],
  exports: [BullModule],
})
export class JobsModule {}
