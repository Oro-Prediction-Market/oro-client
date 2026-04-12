import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards";
import { ChallengesService } from "./challenges.service";

class CreateChallengeDto {
  marketId: string;
  outcomeId: string;
}

@ApiTags("challenges")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("challenges")
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Post()
  @ApiOperation({ summary: "Create a prediction challenge" })
  async create(@Req() req: any, @Body() dto: CreateChallengeDto) {
    const challenge = await this.challengesService.create(
      req.user.userId,
      dto.marketId,
      dto.outcomeId,
    );
    return this.toResponse(challenge, req.user.userId);
  }

  @Get()
  @ApiOperation({ summary: "List open/active challenges" })
  async findAll(@Req() req: any) {
    const challenges = await this.challengesService.findForUser(
      req.user.userId,
    );
    return challenges.map((c) => this.toResponse(c, req.user.userId));
  }

  @Post(":id/join")
  @ApiOperation({ summary: "Join a challenge" })
  async join(@Req() req: any, @Param("id") id: string) {
    const challenge = await this.challengesService.join(id, req.user.userId);
    return this.toResponse(challenge, req.user.userId);
  }

  private toResponse(challenge: any, currentUserId: string) {
    const botUsername = process.env.BOT_USERNAME ?? "OroPredictBot";
    const appPath = process.env.BOT_APP_PATH ?? "app";
    const link = `https://t.me/${botUsername}/${appPath}?startapp=challenge_${challenge.creatorId}_m_${challenge.marketId}_o_${challenge.outcomeId}`;
    return {
      id: challenge.id,
      marketId: challenge.marketId,
      marketTitle: challenge.market?.title ?? null,
      outcomeId: challenge.outcomeId,
      outcomeLabel: challenge.outcome?.label ?? null,
      creatorId: challenge.creatorId,
      creatorName:
        challenge.creator?.username ?? challenge.creator?.telegramId ?? null,
      isOwner: challenge.creatorId === currentUserId,
      participantCount: challenge.participantCount,
      status: challenge.status,
      expiresAt: challenge.expiresAt,
      createdAt: challenge.createdAt,
      link,
    };
  }
}
