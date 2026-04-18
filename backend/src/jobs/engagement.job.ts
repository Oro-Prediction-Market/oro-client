import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository, InjectDataSource } from "@nestjs/typeorm";
import { Repository, DataSource, Not, IsNull, MoreThan, Between, MoreThanOrEqual } from "typeorm";
import { User } from "../entities/user.entity";
import { Transaction, TransactionType } from "../entities/transaction.entity";
import { TelegramSimpleService } from "../telegram/telegram.service.simple";

const DAILY_CREDIT_AMOUNT = 10;

// Re-engagement credits per inactivity milestone
const REENGAGEMENT_CREDITS: Record<number, number> = {
  7: 0,   // warning only — no credit
  14: 15, // Nu 15 comeback credit
  30: 20, // Nu 20 "we miss you" credit
};

@Injectable()
export class EngagementJob {
  private readonly logger = new Logger(EngagementJob.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Transaction) private txRepo: Repository<Transaction>,
    @InjectDataSource() private dataSource: DataSource,
    private readonly telegram: TelegramSimpleService,
  ) {}

  /**
   * Daily free credit — runs 2:00 AM UTC (8:00 AM Bhutan Standard Time).
   * Credits Nu 10 to every user who has placed at least one bet and was
   * active in the last 30 days. Sends a Telegram DM notification.
   */
  @Cron("0 2 * * *")
  async sendDailyCredits(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const users = await this.userRepo.find({
      where: {
        totalPredictions: MoreThan(0),
        telegramChatId: Not(IsNull()),
        lastActiveAt: MoreThanOrEqual(thirtyDaysAgo),
      },
      select: ["id", "telegramChatId", "bonusBalance"],
    });

    this.logger.log(
      `[DailyCredit] Crediting ${users.length} active users Nu ${DAILY_CREDIT_AMOUNT}`,
    );

    let success = 0;
    for (const user of users) {
      try {
        await this.creditUser(user.id, DAILY_CREDIT_AMOUNT, "Daily free credit");

        const chatId = Number(user.telegramChatId);
        if (chatId) {
          await this.telegram.sendMessage(
            chatId,
            `Your daily free credit of <b>Nu ${DAILY_CREDIT_AMOUNT}</b> has been added to your Oro wallet. Open Oro to predict!`,
          );
        }
        success++;
      } catch (err: any) {
        this.logger.error(
          `[DailyCredit] Failed for user ${user.id}: ${err.message}`,
        );
      }
    }

    this.logger.log(`[DailyCredit] Done — ${success}/${users.length} credited`);
  }

  /**
   * Re-engagement cron — runs 3:00 AM UTC daily.
   * Finds users who went silent at exactly the 7, 14, or 30-day mark
   * (using a 1-day window per milestone so each user gets messaged once).
   *
   * 7 days  → reputation decay warning, no credit
   * 14 days → Nu 15 comeback credit + DM
   * 30 days → Nu 20 "we miss you" credit + DM
   */
  @Cron("0 3 * * *")
  async reEngageLapsedUsers(): Promise<void> {
    await Promise.all([
      this.messageWindow(7),
      this.messageWindow(14),
      this.messageWindow(30),
    ]);
  }

  private async messageWindow(daysMissed: number): Promise<void> {
    const now = new Date();

    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() - daysMissed);

    const windowStart = new Date(windowEnd);
    windowStart.setDate(windowStart.getDate() - 1);

    const users = await this.userRepo.find({
      where: {
        lastActiveAt: Between(windowStart, windowEnd),
        telegramChatId: Not(IsNull()),
        totalPredictions: MoreThan(0),
      },
      select: [
        "id",
        "telegramChatId",
        "firstName",
        "reputationTier",
        "betStreakCount",
      ],
    });

    if (users.length === 0) return;

    this.logger.log(
      `[ReEngagement] ${daysMissed}d lapsed — messaging ${users.length} users`,
    );

    const creditAmount = REENGAGEMENT_CREDITS[daysMissed] ?? 0;

    for (const user of users) {
      try {
        const chatId = Number(user.telegramChatId);
        if (!chatId) continue;

        const name = user.firstName ?? "Predictor";
        const msg = this.buildMessage(name, daysMissed, creditAmount, user.reputationTier);

        if (creditAmount > 0) {
          await this.creditUser(
            user.id,
            creditAmount,
            `Re-engagement credit (${daysMissed}d inactive)`,
          );
        }

        await this.telegram.sendMessage(chatId, msg);
      } catch (err: any) {
        this.logger.error(
          `[ReEngagement] Failed for user ${user.id}: ${err.message}`,
        );
      }
    }
  }

  private buildMessage(
    name: string,
    daysMissed: number,
    creditAmount: number,
    tier: string,
  ): string {
    if (daysMissed === 7) {
      return (
        `Hey ${name}, your <b>${tier}</b> reputation is starting to decay. ` +
        `The oracle waits for no one — come back and defend your rank before others overtake you.`
      );
    }

    if (daysMissed === 14) {
      return (
        `${name}, it's been 2 weeks. We've added <b>Nu ${creditAmount}</b> to your Oro wallet ` +
        `to get you back in the game. Your prediction record is still waiting.`
      );
    }

    // 30 days
    return (
      `${name}, a month away from Oro. We've added <b>Nu ${creditAmount}</b> to your wallet — ` +
      `one prediction is all it takes to restart your journey.`
    );
  }

  /**
   * Credits a user's balance with a FREE_CREDIT transaction (isBonus = true)
   * and increments their bonusBalance. Runs inside a DB transaction.
   */
  private async creditUser(
    userId: string,
    amount: number,
    note: string,
  ): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      const { balance: rawBefore } = await em
        .getRepository(Transaction)
        .createQueryBuilder("t")
        .select("COALESCE(SUM(t.amount), 0)", "balance")
        .where("t.userId = :userId", { userId })
        .getRawOne();

      const balanceBefore = Number(rawBefore);

      await em.save(
        em.create(Transaction, {
          type: TransactionType.FREE_CREDIT,
          amount,
          balanceBefore,
          balanceAfter: balanceBefore + amount,
          userId,
          isBonus: true,
          note,
        }),
      );

      await em
        .createQueryBuilder()
        .update(User)
        .set({ bonusBalance: () => `"bonusBalance" + ${amount}` })
        .where("id = :userId", { userId })
        .execute();
    });
  }
}
