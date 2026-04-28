import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserEvent } from "../entities/user-event.entity";

export interface TrackEventDto {
  eventType: string;
  sessionId?: string;
  platform?: string;
  meta?: Record<string, any>;
}

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(UserEvent)
    private readonly repo: Repository<UserEvent>,
  ) {}

  async track(userId: string, dto: TrackEventDto): Promise<void> {
    await this.repo.save(
      this.repo.create({
        userId,
        eventType: dto.eventType,
        sessionId: dto.sessionId ?? null,
        platform: dto.platform ?? null,
        meta: dto.meta ?? null,
      }),
    );
  }
}
