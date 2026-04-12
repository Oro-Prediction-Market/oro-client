import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./user.entity";
import { Market } from "./market.entity";
import { Outcome } from "./outcome.entity";

export enum ChallengeStatus {
  OPEN = "open", // waiting for challengers
  ACTIVE = "active", // at least one challenger joined
  SETTLED = "settled", // market resolved — winner determined
  EXPIRED = "expired", // no one joined before deadline
}

@Index(["creatorId", "status"])
@Index(["marketId", "status"])
@Entity("challenges")
export class Challenge {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column()
  creatorId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "creatorId" })
  creator: User;

  @Column()
  marketId: string;

  @ManyToOne(() => Market, { onDelete: "CASCADE" })
  @JoinColumn({ name: "marketId" })
  market: Market;

  /** The outcome the creator is defending */
  @Column()
  outcomeId: string;

  @ManyToOne(() => Outcome, { onDelete: "CASCADE" })
  @JoinColumn({ name: "outcomeId" })
  outcome: Outcome;

  @Column({
    type: "enum",
    enum: ChallengeStatus,
    default: ChallengeStatus.OPEN,
  })
  status: ChallengeStatus;

  /** Number of participants who have joined via the challenge link */
  @Column({ default: 0 })
  participantCount: number;

  /** Challenge expires 24 hours after creation if no one joins */
  @Column({ type: "timestamptz" })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
