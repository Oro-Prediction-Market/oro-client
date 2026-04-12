import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NOTIFICATION_QUEUE } from "./notification.queue";
import { NotificationProcessor } from "./notification.processor";
import { TelegramSimpleService } from "../telegram/telegram.service.simple";
import { User } from "../entities/user.entity";

@Module({
  imports: [
    BullModule.registerQueue({ name: NOTIFICATION_QUEUE }),
    TypeOrmModule.forFeature([User]),
  ],
  providers: [NotificationProcessor, TelegramSimpleService],
  exports: [BullModule],
})
export class JobsModule {}
