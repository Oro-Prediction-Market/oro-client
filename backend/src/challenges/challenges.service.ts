import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Challenge, ChallengeStatus } from "../entities/challenge.entity";
import { Position, PositionStatus } from "../entities/position.entity";
import { User } from "../entities/user.entity";
import { Market, MarketStatus } from "../entities/market.entity";

const MIN_PREDICTIONS_REQUIRED = 5;
const CHALLENGE_TTL_HOURS = 24;

@Injectable()
export class ChallengesService {
  constructor(
    @InjectRepository(Challenge)
    private challengeRepo: Repository<Challenge>,
    @InjectRepository(Position)
    private positionRepo: Repository<Position>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Market)
    private marketRepo: Repository<Market>,
  ) {}

  /**
   * Create a new challenge.
   * Requirements:
   *   - Creator must have ≥ MIN_PREDICTIONS_REQUIRED total predictions
   *   - Creator must have an active (pending) position on the chosen outcome
   *   - Market must still be open
   */
  async create(
    creatorId: string,
    marketId: string,
    outcomeId: string,
  ): Promise<Challenge> {
    // 1. Check user eligibility — count ALL positions (pending + settled)
    const totalBets = await this.positionRepo.count({
      where: { userId: creatorId },
    });
    if (totalBets < MIN_PREDICTIONS_REQUIRED) {
      throw new BadRequestException(
        `You need at least ${MIN_PREDICTIONS_REQUIRED} bets to create a challenge (you have ${totalBets})`,
      );
    }

    // 2. Market must be open
    const market = await this.marketRepo.findOne({ where: { id: marketId } });
    if (!market) throw new NotFoundException("Market not found");
    if (market.status !== MarketStatus.OPEN) {
      throw new BadRequestException("Market is not open for challenges");
    }

    // 3. Creator must have a pending position on this market
    const position = await this.positionRepo.findOne({
      where: {
        userId: creatorId,
        marketId,
        status: PositionStatus.PENDING,
      },
    });
    if (!position) {
      throw new BadRequestException(
        "You must have an active bet on this market to create a challenge",
      );
    }

    // 4. Prevent duplicate open challenge on same market by same user
    const existing = await this.challengeRepo.findOne({
      where: {
        creatorId,
        marketId,
        status: ChallengeStatus.OPEN,
      },
    });
    if (existing) {
      throw new BadRequestException(
        "You already have an open challenge on this market",
      );
    }

    const expiresAt = new Date(
      Date.now() + CHALLENGE_TTL_HOURS * 60 * 60 * 1000,
    );

    const challenge = this.challengeRepo.create({
      creatorId,
      marketId,
      outcomeId,
      status: ChallengeStatus.OPEN,
      participantCount: 0,
      expiresAt,
    });

    return this.challengeRepo.save(challenge);
  }

  /**
   * List active (open/active) challenges for a user — both created by them
   * and ones they can join (all open challenges on markets they haven't bet on yet).
   */
  async findForUser(userId: string): Promise<Challenge[]> {
    return this.challengeRepo
      .createQueryBuilder("c")
      .leftJoinAndSelect("c.market", "m")
      .leftJoinAndSelect("c.outcome", "o")
      .leftJoinAndSelect("c.creator", "u")
      .where("c.status IN (:...statuses)", {
        statuses: [ChallengeStatus.OPEN, ChallengeStatus.ACTIVE],
      })
      .andWhere("c.expiresAt > NOW()")
      .orderBy("c.createdAt", "DESC")
      .limit(20)
      .getMany();
  }

  /**
   * Record that a user joined a challenge via the deep-link.
   * Increments participantCount and transitions to ACTIVE.
   */
  async join(challengeId: string, joiningUserId: string): Promise<Challenge> {
    const challenge = await this.challengeRepo.findOne({
      where: { id: challengeId },
    });
    if (!challenge) throw new NotFoundException("Challenge not found");
    if (
      challenge.status === ChallengeStatus.EXPIRED ||
      challenge.expiresAt < new Date()
    ) {
      throw new BadRequestException("This challenge has expired");
    }
    if (challenge.creatorId === joiningUserId) {
      throw new BadRequestException("You cannot join your own challenge");
    }

    challenge.participantCount += 1;
    if (challenge.status === ChallengeStatus.OPEN) {
      challenge.status = ChallengeStatus.ACTIVE;
    }
    return this.challengeRepo.save(challenge);
  }

  /** Mark expired challenges — called by a cron job or on-demand */
  async expireStale(): Promise<number> {
    const result = await this.challengeRepo
      .createQueryBuilder()
      .update(Challenge)
      .set({ status: ChallengeStatus.EXPIRED })
      .where("status = :status", { status: ChallengeStatus.OPEN })
      .andWhere("expiresAt < NOW()")
      .execute();
    return result.affected ?? 0;
  }
}
