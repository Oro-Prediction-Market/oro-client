import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Season, SeasonStatus } from "../entities/season.entity";
import { User } from "../entities/user.entity";

@Injectable()
export class SeasonService {
  private readonly logger = new Logger(SeasonService.name);

  constructor(
    @InjectRepository(Season) private seasonRepo: Repository<Season>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  /** Run every Monday at 00:05 UTC to close the previous week and open the next. */
  @Cron("5 0 * * 1")
  async rolloverSeason(): Promise<void> {
    this.logger.log("Rolling over weekly season…");
    await this.closeActiveSeason();
    await this.openNewSeason();
  }

  async closeActiveSeason(): Promise<void> {
    const active = await this.seasonRepo.findOne({
      where: { status: SeasonStatus.ACTIVE },
    });
    if (!active) return;

    // Snapshot top-10 leaderboard at close time
    const top10 = await this.userRepo
      .createQueryBuilder("u")
      .select([
        "u.id",
        "u.firstName",
        "u.lastName",
        "u.username",
        "u.reputationScore",
        "u.reputationTier",
        "u.totalPredictions",
        "u.correctPredictions",
      ])
      .where("u.totalPredictions > 0")
      .orderBy("u.reputationScore", "DESC", "NULLS LAST")
      .addOrderBy("u.correctPredictions", "DESC")
      .limit(10)
      .getMany();

    const snapshot = top10.map((u, i) => ({
      rank: i + 1,
      userId: u.id,
      firstName: u.firstName,
      username: u.username,
      reputationScore: u.reputationScore,
      reputationTier: u.reputationTier,
      winRate:
        u.totalPredictions > 0
          ? Math.round((u.correctPredictions / u.totalPredictions) * 100)
          : 0,
    }));

    await this.seasonRepo.update(active.id, {
      status: SeasonStatus.CLOSED,
      winnersSnapshot: snapshot as any,
    });

    this.logger.log(`Season ${active.id} closed with ${snapshot.length} winners`);
  }

  async openNewSeason(): Promise<Season> {
    const now = new Date();
    // ISO week: Monday = start of week
    const startOfWeek = new Date(now);
    const day = startOfWeek.getUTCDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day; // Monday
    startOfWeek.setUTCDate(startOfWeek.getUTCDate() + diff);
    startOfWeek.setUTCHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setUTCDate(endOfWeek.getUTCDate() + 7);

    // Get ISO week number
    const jan4 = new Date(Date.UTC(startOfWeek.getUTCFullYear(), 0, 4));
    const weekNumber =
      Math.ceil(
        ((startOfWeek.getTime() - jan4.getTime()) / 86400000 + jan4.getUTCDay() + 1) / 7,
      );

    const existing = await this.seasonRepo.findOne({
      where: { year: startOfWeek.getUTCFullYear(), weekNumber },
    });
    if (existing) return existing;

    const season = this.seasonRepo.create({
      weekNumber,
      year: startOfWeek.getUTCFullYear(),
      startsAt: startOfWeek,
      endsAt: endOfWeek,
      status: SeasonStatus.ACTIVE,
    });
    const saved = await this.seasonRepo.save(season);
    this.logger.log(`Season opened: week ${weekNumber}/${startOfWeek.getUTCFullYear()}`);
    return saved;
  }

  async getCurrentSeason(): Promise<Season | null> {
    return this.seasonRepo.findOne({ where: { status: SeasonStatus.ACTIVE } });
  }

  async getSeasonHistory(limit = 10): Promise<Season[]> {
    return this.seasonRepo.find({
      where: { status: SeasonStatus.CLOSED },
      order: { startsAt: "DESC" },
      take: limit,
    });
  }
}
