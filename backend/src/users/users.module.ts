import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../entities/user.entity";
import { Payment } from "../entities/payment.entity";
import { Transaction } from "../entities/transaction.entity";
import { Position } from "../entities/position.entity";
import { UsersController } from "./users.controller";
import { StreakService } from "./streak.service";

@Module({
  imports: [TypeOrmModule.forFeature([User, Payment, Transaction, Position])],
  controllers: [UsersController],
  providers: [StreakService],
  exports: [StreakService],
})
export class UsersModule {}
