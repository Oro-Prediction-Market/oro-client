import { BadRequestException } from "@nestjs/common";
import { ParimutuelEngine } from "./parimutuel.engine";
import { MarketStatus } from "../entities/market.entity";
import { PositionStatus as BetStatus } from "../entities/position.entity";
import { TransactionType } from "../entities/transaction.entity";
import { LMSRService } from "./lmsr.service";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeOutcome(overrides: any = {}) {
  return {
    id: "outcome-1",
    label: "Team A",
    totalBetAmount: 0,
    currentOdds: 0,
    lmsrProbability: 0.5,
    isWinner: false,
    ...overrides,
  };
}

function makeMarket(overrides: any = {}) {
  return {
    id: "market-1",
    title: "Test Market",
    status: MarketStatus.OPEN,
    totalPool: 0,
    houseEdgePct: 5,
    liquidityParam: 1000,
    outcomes: [
      makeOutcome({ id: "o1", label: "A" }),
      makeOutcome({ id: "o2", label: "B" }),
    ],
    resolvedOutcomeId: null,
    resolvedAt: null,
    ...overrides,
  };
}

// Null telegram simple service — sendSettlementNotifications is fire-and-forget
// so null is safe; errors are swallowed by the .catch() in the engine.
const nullTelegram = null as any;

// DK gateway stub — transferToAccount is bypassed in tests via configService
const nullDkGateway = null as any;

// ConfigService stub that enables all staging bypasses
const bypassConfigService = {
  get: jest.fn((key: string) => {
    if (
      key === "DK_STAGING_PAYOUT_BYPASS" ||
      key === "DK_STAGING_DEPOSIT_BYPASS" ||
      key === "DK_STAGING_WITHDRAWAL_BYPASS"
    )
      return "true";
    return undefined;
  }),
} as any;

// ─── calcOdds ─────────────────────────────────────────────────────────────────

describe("ParimutuelEngine.calcOdds", () => {
  let engine: ParimutuelEngine;

  beforeEach(() => {
    engine = new ParimutuelEngine(
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      nullTelegram,
      nullDkGateway,
      bypassConfigService,
    );
  });

  it("returns 0 when outcomePool is 0", () => {
    expect(engine.calcOdds(1000, 5, 0)).toBe(0);
  });

  it("calculates correct odds with 5% house edge", () => {
    // payoutPool = 1000 * 0.95 = 950; outcomePool = 500 → odds = 1.9
    expect(engine.calcOdds(1000, 5, 500)).toBeCloseTo(1.9);
  });

  it("calculates odds when one outcome takes entire pool (5% edge)", () => {
    // payoutPool = 1000 * 0.95 = 950; winner holds all 1000 → 0.95
    expect(engine.calcOdds(1000, 5, 1000)).toBeCloseTo(0.95);
  });

  it("handles 0% house edge", () => {
    expect(engine.calcOdds(500, 0, 250)).toBeCloseTo(2.0);
  });

  it("handles 100% house edge (no payout)", () => {
    expect(engine.calcOdds(1000, 100, 500)).toBeCloseTo(0);
  });
});

// ─── placeBet ─────────────────────────────────────────────────────────────────

describe("ParimutuelEngine.placeBet", () => {
  let engine: ParimutuelEngine;
  let mockMarketRepo: any;
  let mockBetRepo: any;
  let mockDataSource: any;
  let mockRedis: any;
  let mockLmsr: any;
  let mockEm: any;

  beforeEach(() => {
    const market = makeMarket();

    mockEm = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          setLock: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(market),
          select: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ balance: 500 }),
        }),
      }),
      findOne: jest.fn().mockResolvedValue({ id: "user-1" }),
      save: jest
        .fn()
        .mockImplementation((_entity: any, data: any) => Promise.resolve(data)),
      create: jest.fn().mockImplementation((_entity: any, data: any) => data),
      find: jest
        .fn()
        .mockResolvedValue([
          makeOutcome({ id: "o1", label: "A" }),
          makeOutcome({ id: "o2", label: "B" }),
        ]),
      update: jest.fn().mockResolvedValue(undefined),
    };

    mockDataSource = {
      transaction: jest.fn().mockImplementation((cb: Function) => cb(mockEm)),
    };

    mockRedis = {
      acquireLockWithRetry: jest.fn().mockResolvedValue("lock-token"),
      releaseLock: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    mockLmsr = {
      calculateProbabilities: jest.fn().mockReturnValue([0.5, 0.5]),
    };

    engine = new ParimutuelEngine(
      mockMarketRepo,
      null as any,
      mockBetRepo,
      null as any,
      null as any,
      null as any,
      null as any,
      mockDataSource,
      mockLmsr,
      mockRedis,
      null as any,
      nullTelegram,
      nullDkGateway,
      bypassConfigService,
    );
  });

  it("throws when amount <= 0", async () => {
    await expect(
      engine.placePosition("user-1", "market-1", "o1", 0),
    ).rejects.toThrow(BadRequestException);
    await expect(
      engine.placePosition("user-1", "market-1", "o1", -5),
    ).rejects.toThrow(BadRequestException);
  });

  it("throws when market is not open", async () => {
    mockEm.getRepository.mockReturnValue({
      createQueryBuilder: jest.fn().mockReturnValue({
        setLock: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        getOne: jest
          .fn()
          .mockResolvedValue(makeMarket({ status: MarketStatus.CLOSED })),
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ balance: 500 }),
      }),
    });

    await expect(
      engine.placePosition("user-1", "market-1", "o1", 100),
    ).rejects.toThrow("Market is not open for betting");
  });

  it("throws when balance is insufficient", async () => {
    // balance = 50, bet = 200
    const balanceQb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ balance: 50 }),
    };
    const marketQb = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(makeMarket()),
    };

    mockEm.find = jest
      .fn()
      .mockResolvedValue([
        makeOutcome({ id: "o1", label: "A" }),
        makeOutcome({ id: "o2", label: "B" }),
      ]);
    mockEm.getRepository.mockImplementation((entity: any) => {
      if (
        entity?.name === "Transaction" ||
        (entity && entity.toString().includes("Transaction"))
      ) {
        return { createQueryBuilder: jest.fn().mockReturnValue(balanceQb) };
      }
      return { createQueryBuilder: jest.fn().mockReturnValue(marketQb) };
    });

    await expect(
      engine.placePosition("user-1", "market-1", "o1", 200),
    ).rejects.toThrow("Insufficient balance");
  });

  it("throws when outcome not found in market", async () => {
    await expect(
      engine.placePosition("user-1", "market-1", "nonexistent-outcome", 100),
    ).rejects.toThrow("Outcome not found in this market");
  });

  it("successfully creates a position and debit transaction", async () => {
    const savedPosition = {
      id: "position-1",
      status: BetStatus.PENDING,
      amount: 100,
    };
    mockEm.save.mockImplementation((_entity: any, data: any) => {
      if (data?.status === BetStatus.PENDING)
        return Promise.resolve(savedPosition);
      return Promise.resolve(data);
    });

    const result = await engine.placePosition("user-1", "market-1", "o1", 100);
    expect(result).toMatchObject({
      id: "position-1",
      status: BetStatus.PENDING,
    });
    expect(mockRedis.releaseLock).toHaveBeenCalledWith(
      "market:market-1",
      "lock-token",
    );
    expect(mockRedis.del).toHaveBeenCalled();
  });
});

// transitionMarket

describe("ParimutuelEngine.transitionMarket", () => {
  let engine: ParimutuelEngine;
  let mockMarketRepo: any;

  function makeRepo(market: any) {
    return {
      findOneBy: jest.fn().mockResolvedValue(market),
      save: jest.fn().mockImplementation((m: any) => Promise.resolve(m)),
      findOne: jest.fn().mockResolvedValue(market),
    };
  }

  it("transitions OPEN → CLOSED", async () => {
    const market = makeMarket({ status: MarketStatus.OPEN });
    mockMarketRepo = makeRepo(market);
    engine = new ParimutuelEngine(
      mockMarketRepo,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      nullTelegram,
      nullDkGateway,
      bypassConfigService,
    );

    const result = await engine.transitionMarket(
      "market-1",
      MarketStatus.CLOSED,
    );
    expect(result.status).toBe(MarketStatus.CLOSED);
  });

  it("throws on invalid transition OPEN → RESOLVED", async () => {
    const market = makeMarket({ status: MarketStatus.OPEN });
    mockMarketRepo = makeRepo(market);
    engine = new ParimutuelEngine(
      mockMarketRepo,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      nullTelegram,
      nullDkGateway,
      bypassConfigService,
    );

    await expect(
      engine.transitionMarket("market-1", MarketStatus.RESOLVED),
    ).rejects.toThrow(BadRequestException);
  });

  it("throws when market not found", async () => {
    mockMarketRepo = { findOneBy: jest.fn().mockResolvedValue(null) };
    engine = new ParimutuelEngine(
      mockMarketRepo,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      nullTelegram,
      nullDkGateway,
      bypassConfigService,
    );

    await expect(
      engine.transitionMarket("bad-id", MarketStatus.CLOSED),
    ).rejects.toThrow("Market not found");
  });
});

// ─── cancelMarket ─────────────────────────────────────────────────────────────

describe("ParimutuelEngine.cancelMarket", () => {
  it("refunds all PENDING bets", async () => {
    const market = makeMarket({ status: MarketStatus.OPEN });
    const pendingBet = {
      id: "b1",
      userId: "u1",
      amount: 100,
      status: BetStatus.PENDING,
    };

    const savedItems: any[] = [];
    const mockEm: any = {
      findOne: jest.fn().mockResolvedValue(market),
      find: jest.fn().mockResolvedValue([pendingBet]),
      save: jest.fn().mockImplementation((_e: any, data: any) => {
        savedItems.push(data);
        return Promise.resolve(data);
      }),
      create: jest.fn().mockImplementation((_e: any, data: any) => data),
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ balance: 0 }),
        }),
      }),
    };

    const engine = new ParimutuelEngine(
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      { transaction: (cb: Function) => cb(mockEm) } as any,
      null as any,
      null as any,
      null as any,
      nullTelegram,
      nullDkGateway,
      bypassConfigService,
    );

    await engine.cancelMarket("market-1");

    const refundTx = savedItems.find((i) => i.type === TransactionType.REFUND);
    expect(refundTx).toBeDefined();
    expect(refundTx.amount).toBe(100);

    const updatedBet = savedItems.find((i) => i.id === "b1");
    expect(updatedBet?.status).toBe(BetStatus.REFUNDED);
  });
});

// ─── resolveMarket / settleMarket (payout path) ───────────────────────────────

describe("ParimutuelEngine.resolveMarket → settleMarket", () => {
  function makeResolvableEngine(bets: any[], winner: any, market: any) {
    const savedItems: any[] = [];

    const mockEm: any = {
      // settleMarket calls em.find(Position, ...) — match by name or class string
      find: jest.fn().mockImplementation((entity: any) => {
        const name = entity?.name ?? String(entity);
        if (name.includes("Position") || name.includes("Bet")) {
          return Promise.resolve(bets);
        }
        return Promise.resolve([]);
      }),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((_entity: any, data: any) => {
        savedItems.push(data);
        return Promise.resolve(data);
      }),
      create: jest.fn().mockImplementation((_entity: any, data: any) => data),
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ balance: 0 }),
        }),
      }),
    };

    const mockMarketRepo = {
      findOne: jest.fn().mockResolvedValue({
        ...market,
        outcomes: [
          winner,
          ...market.outcomes.filter((o: any) => o.id !== winner.id),
        ],
      }),
      findOneBy: jest.fn().mockResolvedValue(market),
      save: jest.fn().mockImplementation((m: any) => Promise.resolve(m)),
    };

    const mockOutcomeRepo = {
      save: jest.fn().mockImplementation((o: any) => Promise.resolve(o)),
    };

    const mockDisputeRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    const mockReputationService = {
      recalculateForMarket: jest.fn().mockResolvedValue(undefined),
    };

    // betRepo used by sendSettlementNotifications (fire-and-forget, errors swallowed)
    const mockBetRepo = {
      find: jest.fn().mockResolvedValue(
        bets.map((b) => ({
          ...b,
          user: { id: b.userId, telegramId: null, reputationTier: "newcomer" },
        })),
      ),
    };

    const mockDataSource = {
      transaction: (cb: Function) => cb(mockEm),
      getRepository: jest.fn().mockReturnValue({
        findBy: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue(undefined),
      }),
    };

    const engine = new ParimutuelEngine(
      mockMarketRepo as any,
      mockOutcomeRepo as any,
      mockBetRepo as any,
      null as any,
      null as any,
      null as any,
      mockDisputeRepo as any,
      mockDataSource as any,
      null as any,
      null as any,
      mockReputationService as any,
      nullTelegram,
      nullDkGateway,
      bypassConfigService,
    );

    return { engine, savedItems, mockEm, mockMarketRepo, mockOutcomeRepo };
  }

  it("marks winning bets as WON and losing bets as LOST", async () => {
    const market = makeMarket({
      status: MarketStatus.RESOLVING,
      totalPool: 300,
      houseEdgePct: 0,
      outcomes: [
        makeOutcome({ id: "winner", totalBetAmount: 200 }),
        makeOutcome({ id: "loser", totalBetAmount: 100 }),
      ],
    });
    const winnerOutcome = market.outcomes[0];
    const bets = [
      {
        id: "b1",
        userId: "u1",
        outcomeId: "winner",
        amount: 200,
        status: BetStatus.PENDING,
      },
      {
        id: "b2",
        userId: "u2",
        outcomeId: "loser",
        amount: 100,
        status: BetStatus.PENDING,
      },
    ];

    const { engine, savedItems } = makeResolvableEngine(
      bets,
      winnerOutcome,
      market,
    );
    await engine.resolveMarket("market-1", "winner");

    const wonBet = savedItems.find((i) => i.id === "b1");
    const lostBet = savedItems.find((i) => i.id === "b2");
    expect(wonBet?.status).toBe(BetStatus.WON);
    expect(lostBet?.status).toBe(BetStatus.LOST);
  });

  it("pays out the full payout pool (0% house edge) to single winner", async () => {
    const market = makeMarket({
      status: MarketStatus.RESOLVING,
      totalPool: 1000,
      houseEdgePct: 0,
      outcomes: [makeOutcome({ id: "winner", totalBetAmount: 1000 })],
    });
    const winnerOutcome = market.outcomes[0];
    const bets = [
      {
        id: "b1",
        userId: "u1",
        outcomeId: "winner",
        amount: 1000,
        status: BetStatus.PENDING,
      },
    ];

    const { engine, savedItems } = makeResolvableEngine(
      bets,
      winnerOutcome,
      market,
    );
    await engine.resolveMarket("market-1", "winner");

    const wonBet = savedItems.find((i) => i.id === "b1");
    expect(wonBet?.payout).toBeCloseTo(1000);
  });

  it("deducts house edge from payout pool", async () => {
    // totalPool = 1000, houseEdge = 10% → payoutPool = 900
    const market = makeMarket({
      status: MarketStatus.RESOLVING,
      totalPool: 1000,
      houseEdgePct: 10,
      outcomes: [
        makeOutcome({ id: "winner", totalBetAmount: 500 }),
        makeOutcome({ id: "loser", totalBetAmount: 500 }),
      ],
    });
    const winnerOutcome = market.outcomes[0];
    const bets = [
      {
        id: "b1",
        userId: "u1",
        outcomeId: "winner",
        amount: 500,
        status: BetStatus.PENDING,
      },
      {
        id: "b2",
        userId: "u2",
        outcomeId: "loser",
        amount: 500,
        status: BetStatus.PENDING,
      },
    ];

    const { engine, savedItems } = makeResolvableEngine(
      bets,
      winnerOutcome,
      market,
    );
    await engine.resolveMarket("market-1", "winner");

    const wonBet = savedItems.find((i) => i.id === "b1");
    expect(wonBet?.payout).toBeCloseTo(900);
  });

  it("splits payout pool proportionally among multiple winners", async () => {
    // u1=200, u2=100 → shares 2/3, 1/3 of pool=300
    const market = makeMarket({
      status: MarketStatus.RESOLVING,
      totalPool: 300,
      houseEdgePct: 0,
      outcomes: [makeOutcome({ id: "winner", totalBetAmount: 300 })],
    });
    const winnerOutcome = market.outcomes[0];
    const bets = [
      {
        id: "b1",
        userId: "u1",
        outcomeId: "winner",
        amount: 200,
        status: BetStatus.PENDING,
      },
      {
        id: "b2",
        userId: "u2",
        outcomeId: "winner",
        amount: 100,
        status: BetStatus.PENDING,
      },
    ];

    const { engine, savedItems } = makeResolvableEngine(
      bets,
      winnerOutcome,
      market,
    );
    await engine.resolveMarket("market-1", "winner");

    const bet1 = savedItems.find((i) => i.id === "b1");
    const bet2 = savedItems.find((i) => i.id === "b2");
    expect(bet1?.payout).toBeCloseTo(200);
    expect(bet2?.payout).toBeCloseTo(100);
    expect(bet1?.status).toBe(BetStatus.WON);
    expect(bet2?.status).toBe(BetStatus.WON);
  });

  it("creates a POSITION_PAYOUT transaction for each winning bet", async () => {
    const market = makeMarket({
      status: MarketStatus.RESOLVING,
      totalPool: 200,
      houseEdgePct: 0,
      outcomes: [makeOutcome({ id: "winner", totalBetAmount: 200 })],
    });
    const winnerOutcome = market.outcomes[0];
    const bets = [
      {
        id: "b1",
        userId: "u1",
        outcomeId: "winner",
        amount: 200,
        status: BetStatus.PENDING,
      },
    ];

    const { engine, savedItems } = makeResolvableEngine(
      bets,
      winnerOutcome,
      market,
    );
    await engine.resolveMarket("market-1", "winner");

    const payoutTx = savedItems.find(
      (i) => i.type === TransactionType.POSITION_PAYOUT,
    );
    expect(payoutTx).toBeDefined();
    expect(payoutTx.amount).toBeCloseTo(200);
    expect(payoutTx.userId).toBe("u1");
  });

  it("credits payout to the winner's wallet and not the loser's", async () => {
    // Setup:
    //   u1 (winner) has 200 Nu in their wallet before settlement
    //   u2 (loser)  has 500 Nu in their wallet before settlement
    //   totalPool = 300, houseEdge = 0% → payoutPool = 300
    //   u1 bet 200 on winner (100% of winner pool) → payout = 300
    //   u1 wallet after = 200 + 300 = 500
    //   u2 wallet stays at 500 (no payout transaction created)
    const WINNER_BALANCE_BEFORE = 200;
    const LOSER_BALANCE_BEFORE = 500;

    const market = makeMarket({
      status: MarketStatus.RESOLVING,
      totalPool: 300,
      houseEdgePct: 0,
      outcomes: [
        makeOutcome({ id: "winner-outcome", totalBetAmount: 200 }),
        makeOutcome({ id: "loser-outcome", totalBetAmount: 100 }),
      ],
    });
    const winnerOutcome = market.outcomes[0];
    const bets = [
      {
        id: "b1",
        userId: "u1-winner",
        outcomeId: "winner-outcome",
        amount: 200,
        status: BetStatus.PENDING,
      },
      {
        id: "b2",
        userId: "u2-loser",
        outcomeId: "loser-outcome",
        amount: 100,
        status: BetStatus.PENDING,
      },
    ];

    const savedItems: any[] = [];

    // Per-user balance mock: returns the correct starting balance per userId
    const balanceByUser: Record<string, number> = {
      "u1-winner": WINNER_BALANCE_BEFORE,
      "u2-loser": LOSER_BALANCE_BEFORE,
    };

    const mockEm: any = {
      find: jest.fn().mockImplementation((entity: any) => {
        const name = entity?.name ?? String(entity);
        if (name.includes("Position") || name.includes("Bet"))
          return Promise.resolve(bets);
        return Promise.resolve([]);
      }),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((_entity: any, data: any) => {
        savedItems.push(data);
        return Promise.resolve(data);
      }),
      create: jest.fn().mockImplementation((_entity: any, data: any) => data),
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockImplementation(() => {
          let capturedUserId: string | null = null;
          return {
            select: jest.fn().mockReturnThis(),
            where: jest
              .fn()
              .mockImplementation((_clause: string, params: any) => {
                if (params?.userId) capturedUserId = params.userId;
                return {
                  getRawOne: () =>
                    Promise.resolve({
                      balance: balanceByUser[capturedUserId!] ?? 0,
                    }),
                };
              }),
          };
        }),
      }),
    };

    const mockMarketRepo = {
      findOne: jest.fn().mockResolvedValue({
        ...market,
        outcomes: [
          winnerOutcome,
          ...market.outcomes.filter((o: any) => o.id !== winnerOutcome.id),
        ],
      }),
      findOneBy: jest.fn().mockResolvedValue(market),
      save: jest.fn().mockImplementation((m: any) => Promise.resolve(m)),
    };

    const engine = new ParimutuelEngine(
      mockMarketRepo as any,
      {
        save: jest.fn().mockImplementation((o: any) => Promise.resolve(o)),
      } as any,
      {
        find: jest.fn().mockResolvedValue(
          bets.map((b) => ({
            ...b,
            user: {
              id: b.userId,
              telegramId: null,
              reputationTier: "newcomer",
            },
          })),
        ),
      } as any,
      null as any,
      null as any,
      null as any,
      { find: jest.fn().mockResolvedValue([]) } as any,
      {
        transaction: (cb: Function) => cb(mockEm),
        getRepository: jest.fn().mockReturnValue({
          findBy: jest.fn().mockResolvedValue([]),
          update: jest.fn(),
        }),
      } as any,
      null as any,
      null as any,
      { recalculateForMarket: jest.fn().mockResolvedValue(undefined) } as any,
      nullTelegram,
      nullDkGateway,
      bypassConfigService,
    );

    await engine.resolveMarket("market-1", "winner-outcome");

    // ── Winner's payout transaction ───────────────────────────────────────────
    const payoutTxs = savedItems.filter(
      (i) => i.type === TransactionType.POSITION_PAYOUT,
    );

    // Only one payout transaction — for the winner
    expect(payoutTxs).toHaveLength(1);

    const winnerTx = payoutTxs[0];
    expect(winnerTx.userId).toBe("u1-winner"); // goes to the right user
    expect(winnerTx.amount).toBeCloseTo(300); // full pool (0% edge)
    expect(winnerTx.balanceBefore).toBe(WINNER_BALANCE_BEFORE); // 200 before
    expect(winnerTx.balanceAfter).toBeCloseTo(WINNER_BALANCE_BEFORE + 300); // 500 after

    // ── Loser gets no payout transaction ─────────────────────────────────────
    const loserPayoutTx = payoutTxs.find((i) => i.userId === "u2-loser");
    expect(loserPayoutTx).toBeUndefined();

    // ── Loser bet status is LOST ──────────────────────────────────────────────
    const loserBet = savedItems.find((i) => i.id === "b2");
    expect(loserBet?.status).toBe(BetStatus.LOST);
  });

  it("credits correct payout to winner's wallet with 5% house edge", async () => {
    // totalPool = 300, houseEdge = 5% → houseAmount = 15, payoutPool = 285
    // u1 bet 200 on winner (100% of winner pool = 200) → payout = 285
    // u1 wallet: 200 before → 200 + 285 = 485 after
    // u2 (loser): no payout transaction, wallet untouched
    const WINNER_BALANCE_BEFORE = 200;
    const LOSER_BALANCE_BEFORE = 500;

    const market = makeMarket({
      status: MarketStatus.RESOLVING,
      totalPool: 300,
      houseEdgePct: 5,
      outcomes: [
        makeOutcome({ id: "winner-outcome", totalBetAmount: 200 }),
        makeOutcome({ id: "loser-outcome", totalBetAmount: 100 }),
      ],
    });
    const winnerOutcome = market.outcomes[0];
    const bets = [
      {
        id: "b1",
        userId: "u1-winner",
        outcomeId: "winner-outcome",
        amount: 200,
        status: BetStatus.PENDING,
      },
      {
        id: "b2",
        userId: "u2-loser",
        outcomeId: "loser-outcome",
        amount: 100,
        status: BetStatus.PENDING,
      },
    ];

    const savedItems: any[] = [];
    const balanceByUser: Record<string, number> = {
      "u1-winner": WINNER_BALANCE_BEFORE,
      "u2-loser": LOSER_BALANCE_BEFORE,
    };

    const mockEm: any = {
      find: jest.fn().mockImplementation((entity: any) => {
        const name = entity?.name ?? String(entity);
        if (name.includes("Position") || name.includes("Bet"))
          return Promise.resolve(bets);
        return Promise.resolve([]);
      }),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((_entity: any, data: any) => {
        savedItems.push(data);
        return Promise.resolve(data);
      }),
      create: jest.fn().mockImplementation((_entity: any, data: any) => data),
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockImplementation(() => {
          let capturedUserId: string | null = null;
          return {
            select: jest.fn().mockReturnThis(),
            where: jest
              .fn()
              .mockImplementation((_clause: string, params: any) => {
                if (params?.userId) capturedUserId = params.userId;
                return {
                  getRawOne: () =>
                    Promise.resolve({
                      balance: balanceByUser[capturedUserId!] ?? 0,
                    }),
                };
              }),
          };
        }),
      }),
    };

    const engine = new ParimutuelEngine(
      {
        findOne: jest.fn().mockResolvedValue({
          ...market,
          outcomes: [
            winnerOutcome,
            ...market.outcomes.filter((o: any) => o.id !== winnerOutcome.id),
          ],
        }),
        findOneBy: jest.fn().mockResolvedValue(market),
        save: jest.fn().mockImplementation((m: any) => Promise.resolve(m)),
      } as any,
      {
        save: jest.fn().mockImplementation((o: any) => Promise.resolve(o)),
      } as any,
      {
        find: jest.fn().mockResolvedValue(
          bets.map((b) => ({
            ...b,
            user: {
              id: b.userId,
              telegramId: null,
              reputationTier: "newcomer",
            },
          })),
        ),
      } as any,
      null as any,
      null as any,
      null as any,
      { find: jest.fn().mockResolvedValue([]) } as any,
      {
        transaction: (cb: Function) => cb(mockEm),
        getRepository: jest.fn().mockReturnValue({
          findBy: jest.fn().mockResolvedValue([]),
          update: jest.fn(),
        }),
      } as any,
      null as any,
      null as any,
      { recalculateForMarket: jest.fn().mockResolvedValue(undefined) } as any,
      nullTelegram,
      nullDkGateway,
      bypassConfigService,
    );

    await engine.resolveMarket("market-1", "winner-outcome");

    const payoutTxs = savedItems.filter(
      (i) => i.type === TransactionType.POSITION_PAYOUT,
    );

    // Only the winner gets a payout
    expect(payoutTxs).toHaveLength(1);

    const winnerTx = payoutTxs[0];
    expect(winnerTx.userId).toBe("u1-winner");
    // payoutPool = 300 * 0.95 = 285; u1 holds 100% of winner pool → payout = 285
    expect(winnerTx.amount).toBeCloseTo(285);
    expect(winnerTx.balanceBefore).toBe(WINNER_BALANCE_BEFORE);
    expect(winnerTx.balanceAfter).toBeCloseTo(WINNER_BALANCE_BEFORE + 285); // 485

    // Loser gets no payout
    expect(payoutTxs.find((i) => i.userId === "u2-loser")).toBeUndefined();

    // Loser bet is LOST
    const loserBet = savedItems.find((i) => i.id === "b2");
    expect(loserBet?.status).toBe(BetStatus.LOST);
  });

  it("creates a Settlement record with correct accounting", async () => {
    const market = makeMarket({
      status: MarketStatus.RESOLVING,
      totalPool: 500,
      houseEdgePct: 5,
      outcomes: [
        makeOutcome({ id: "winner", totalBetAmount: 300 }),
        makeOutcome({ id: "loser", totalBetAmount: 200 }),
      ],
    });
    const winnerOutcome = market.outcomes[0];
    const bets = [
      {
        id: "b1",
        userId: "u1",
        outcomeId: "winner",
        amount: 300,
        status: BetStatus.PENDING,
      },
      {
        id: "b2",
        userId: "u2",
        outcomeId: "loser",
        amount: 200,
        status: BetStatus.PENDING,
      },
    ];

    const { engine, savedItems } = makeResolvableEngine(
      bets,
      winnerOutcome,
      market,
    );
    await engine.resolveMarket("market-1", "winner");

    const settlement = savedItems.find(
      (i) => i.marketId === "market-1" && i.winningOutcomeId !== undefined,
    );
    expect(settlement).toBeDefined();
    expect(settlement.totalPool).toBe(500);
    expect(settlement.houseAmount).toBeCloseTo(25); // 5% of 500
    expect(settlement.payoutPool).toBeCloseTo(475);
    expect(settlement.totalPositions).toBe(2); // entity field name
    expect(settlement.winningPositions).toBe(1); // entity field name
  });

  it("transitions market to SETTLED status after settlement", async () => {
    const market = makeMarket({
      status: MarketStatus.RESOLVING,
      totalPool: 100,
      houseEdgePct: 0,
      outcomes: [makeOutcome({ id: "winner", totalBetAmount: 100 })],
    });
    const winnerOutcome = market.outcomes[0];
    const bets = [
      {
        id: "b1",
        userId: "u1",
        outcomeId: "winner",
        amount: 100,
        status: BetStatus.PENDING,
      },
    ];

    const { engine, savedItems } = makeResolvableEngine(
      bets,
      winnerOutcome,
      market,
    );
    await engine.resolveMarket("market-1", "winner");

    const savedMarket = savedItems.find(
      (i) => i.id === "market-1" && i.status === MarketStatus.SETTLED,
    );
    expect(savedMarket).toBeDefined();
  });

  it("throws when market is not in RESOLVING state", async () => {
    const market = makeMarket({ status: MarketStatus.CLOSED });
    const mockMarketRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue({ ...market, outcomes: market.outcomes }),
      findOneBy: jest.fn().mockResolvedValue(market),
      save: jest.fn(),
    };

    const engine = new ParimutuelEngine(
      mockMarketRepo as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      nullTelegram,
      nullDkGateway,
      bypassConfigService,
    );

    await expect(engine.resolveMarket("market-1", "winner")).rejects.toThrow(
      BadRequestException,
    );
  });

  it("throws when winning outcome is not in this market", async () => {
    const market = makeMarket({ status: MarketStatus.RESOLVING });
    const mockMarketRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue({ ...market, outcomes: market.outcomes }),
      save: jest.fn(),
    };

    const engine = new ParimutuelEngine(
      mockMarketRepo as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      nullTelegram,
      nullDkGateway,
      bypassConfigService,
    );

    await expect(
      engine.resolveMarket("market-1", "nonexistent-outcome"),
    ).rejects.toThrow(BadRequestException);
  });
});

// ─── dispatchDkPayouts — production (real DK transfer) path ──────────────────

describe("ParimutuelEngine.dispatchDkPayouts", () => {
  /**
   * Builds a minimal engine wired with a real mock DK gateway and a
   * production-like ConfigService (bypass OFF).  The betRepo.find returns
   * winning positions that already carry the resolved user object.
   */
  function makePayoutEngine(winningBetsWithUsers: any[]) {
    const mockDkGateway = {
      transferToAccount: jest.fn().mockResolvedValue({
        txnId: "TXN-001",
        status: "SUCCESS",
        statusDesc: "Transfer completed",
      }),
    };

    // ConfigService: bypass OFF → real DK calls happen
    const productionConfigService = {
      get: jest.fn((_key: string) => undefined),
    };

    const market = makeMarket({
      id: "market-prod",
      status: MarketStatus.RESOLVING,
      totalPool: 500,
      houseEdgePct: 0,
      outcomes: [makeOutcome({ id: "win-outcome", totalBetAmount: 500 })],
    });
    const winnerOutcome = market.outcomes[0];

    const mockEm: any = {
      find: jest.fn().mockImplementation((entity: any) => {
        const name = entity?.name ?? String(entity);
        if (name.includes("Position") || name.includes("Bet"))
          return Promise.resolve(winningBetsWithUsers);
        return Promise.resolve([]);
      }),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest
        .fn()
        .mockImplementation((_e: any, data: any) => Promise.resolve(data)),
      create: jest.fn().mockImplementation((_e: any, data: any) => data),
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ balance: 0 }),
        }),
      }),
    };

    const mockMarketRepo = {
      findOne: jest
        .fn()
        .mockResolvedValue({ ...market, outcomes: [winnerOutcome] }),
      findOneBy: jest.fn().mockResolvedValue(market),
      save: jest.fn().mockImplementation((m: any) => Promise.resolve(m)),
    };

    // betRepo.find used by dispatchDkPayouts to reload WON positions with user relation
    const mockBetRepo = {
      find: jest.fn().mockResolvedValue(
        winningBetsWithUsers.map((b) => ({
          ...b,
          status: BetStatus.WON, // already settled as WON
          payout: b.amount, // payout = full amount (0% edge)
          user: b.user, // user with dkAccountNumber attached
        })),
      ),
    };

    const engine = new ParimutuelEngine(
      mockMarketRepo as any,
      {
        save: jest.fn().mockImplementation((o: any) => Promise.resolve(o)),
      } as any,
      mockBetRepo as any,
      null as any,
      null as any,
      null as any,
      { find: jest.fn().mockResolvedValue([]) } as any,
      {
        transaction: (cb: Function) => cb(mockEm),
        getRepository: jest.fn().mockReturnValue({
          findBy: jest.fn().mockResolvedValue([]),
          update: jest.fn().mockResolvedValue(undefined),
        }),
      } as any,
      null as any,
      null as any,
      { recalculateForMarket: jest.fn().mockResolvedValue(undefined) } as any,
      nullTelegram,
      mockDkGateway as any,
      productionConfigService as any,
    );

    return { engine, mockDkGateway, productionConfigService };
  }

  it("[PRODUCTION] calls transferToAccount for each winner with a linked DK account", async () => {
    const bets = [
      {
        id: "pos-1",
        userId: "u1",
        outcomeId: "win-outcome",
        amount: 300,
        user: {
          id: "u1",
          dkAccountNumber: "110146039368",
          dkAccountName: "Sonam Tenzin",
        },
      },
      {
        id: "pos-2",
        userId: "u2",
        outcomeId: "win-outcome",
        amount: 200,
        user: {
          id: "u2",
          dkAccountNumber: "110111222333",
          dkAccountName: "Dorji",
        },
      },
    ];

    const { engine, mockDkGateway } = makePayoutEngine(bets);

    await engine.resolveMarket("market-prod", "win-outcome");

    // Wait for fire-and-forget to settle
    await new Promise((r) => setTimeout(r, 50));

    expect(mockDkGateway.transferToAccount).toHaveBeenCalledTimes(2);

    // First winner: BTN 300 → 110146039368
    expect(mockDkGateway.transferToAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        accountNumber: "110146039368",
        amount: 300,
        reference: "pos-1",
      }),
    );

    // Second winner: BTN 200 → 110111222333
    expect(mockDkGateway.transferToAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        accountNumber: "110111222333",
        amount: 200,
        reference: "pos-2",
      }),
    );
  });

  it("[PRODUCTION] skips DK transfer for users with no DK account linked", async () => {
    const bets = [
      {
        id: "pos-1",
        userId: "u1",
        outcomeId: "win-outcome",
        amount: 300,
        user: { id: "u1", dkAccountNumber: "110146039368" },
      },
      {
        id: "pos-2",
        userId: "u2",
        outcomeId: "win-outcome",
        amount: 200,
        user: { id: "u2", dkAccountNumber: null }, // no DK account
      },
    ];

    const { engine, mockDkGateway } = makePayoutEngine(bets);

    await engine.resolveMarket("market-prod", "win-outcome");
    await new Promise((r) => setTimeout(r, 50));

    // Only u1 should receive a DK transfer — u2 has no account
    expect(mockDkGateway.transferToAccount).toHaveBeenCalledTimes(1);
    expect(mockDkGateway.transferToAccount).toHaveBeenCalledWith(
      expect.objectContaining({ accountNumber: "110146039368", amount: 300 }),
    );
  });

  it("[PRODUCTION] continues paying remaining winners even if one DK transfer fails", async () => {
    const bets = [
      {
        id: "pos-1",
        userId: "u1",
        outcomeId: "win-outcome",
        amount: 300,
        user: { id: "u1", dkAccountNumber: "110146039368" },
      },
      {
        id: "pos-2",
        userId: "u2",
        outcomeId: "win-outcome",
        amount: 200,
        user: { id: "u2", dkAccountNumber: "110111222333" },
      },
    ];

    const { engine, mockDkGateway } = makePayoutEngine(bets);

    // First call throws, second should still be attempted
    mockDkGateway.transferToAccount
      .mockRejectedValueOnce(new Error("DK network timeout"))
      .mockResolvedValueOnce({
        txnId: "TXN-002",
        status: "SUCCESS",
        statusDesc: "OK",
      });

    await engine.resolveMarket("market-prod", "win-outcome");
    await new Promise((r) => setTimeout(r, 50));

    // Both were attempted despite the first failure
    expect(mockDkGateway.transferToAccount).toHaveBeenCalledTimes(2);
  });

  it("[STAGING BYPASS] does NOT call transferToAccount when DK_STAGING_PAYOUT_BYPASS=true", async () => {
    const bets = [
      {
        id: "pos-1",
        userId: "u1",
        outcomeId: "win-outcome",
        amount: 500,
        user: { id: "u1", dkAccountNumber: "110146039368" },
      },
    ];

    // Override the configService on the shared makePayoutEngine but with bypass ON
    const market = makeMarket({
      id: "market-staging",
      status: MarketStatus.RESOLVING,
      totalPool: 500,
      houseEdgePct: 0,
      outcomes: [makeOutcome({ id: "win-outcome", totalBetAmount: 500 })],
    });
    const winnerOutcome = market.outcomes[0];

    const mockDkGateway = {
      transferToAccount: jest.fn().mockResolvedValue({
        txnId: "TXN-X",
        status: "SUCCESS",
        statusDesc: "OK",
      }),
    };

    const stagingConfigService = {
      get: jest.fn((key: string) =>
        key === "DK_STAGING_PAYOUT_BYPASS" ? "true" : undefined,
      ),
    };

    const mockEm: any = {
      find: jest.fn().mockResolvedValue(bets),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest
        .fn()
        .mockImplementation((_e: any, data: any) => Promise.resolve(data)),
      create: jest.fn().mockImplementation((_e: any, data: any) => data),
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ balance: 0 }),
        }),
      }),
    };

    const engine = new ParimutuelEngine(
      {
        findOne: jest
          .fn()
          .mockResolvedValue({ ...market, outcomes: [winnerOutcome] }),
        findOneBy: jest.fn().mockResolvedValue(market),
        save: jest.fn().mockImplementation((m: any) => Promise.resolve(m)),
      } as any,
      {
        save: jest.fn().mockImplementation((o: any) => Promise.resolve(o)),
      } as any,
      {
        find: jest.fn().mockResolvedValue(
          bets.map((b) => ({
            ...b,
            status: BetStatus.WON,
            payout: b.amount,
            user: b.user,
          })),
        ),
      } as any,
      null as any,
      null as any,
      null as any,
      { find: jest.fn().mockResolvedValue([]) } as any,
      {
        transaction: (cb: Function) => cb(mockEm),
        getRepository: jest.fn().mockReturnValue({
          findBy: jest.fn().mockResolvedValue([]),
          update: jest.fn(),
        }),
      } as any,
      null as any,
      null as any,
      { recalculateForMarket: jest.fn().mockResolvedValue(undefined) } as any,
      nullTelegram,
      mockDkGateway as any,
      stagingConfigService as any,
    );

    await engine.resolveMarket("market-staging", "win-outcome");
    await new Promise((r) => setTimeout(r, 50));

    // Bypass is ON — DK gateway must never be called
    expect(mockDkGateway.transferToAccount).not.toHaveBeenCalled();
  });
});

// ─── LMSRService ─────────────────────────────────────────────────────────────

describe("LMSRService.calculateProbabilities", () => {
  const svc = new LMSRService();

  it("returns empty array for no outcomes", () => {
    expect(svc.calculateProbabilities([])).toEqual([]);
  });

  it("returns equal probabilities when all bets are 0", () => {
    const outcomes = [makeOutcome({ id: "o1" }), makeOutcome({ id: "o2" })];
    const probs = svc.calculateProbabilities(outcomes as any, 1000);
    expect(probs[0]).toBeCloseTo(0.5);
    expect(probs[1]).toBeCloseTo(0.5);
  });

  it("favours the outcome with more bets", () => {
    const outcomes = [
      makeOutcome({ id: "o1", totalBetAmount: 900 }),
      makeOutcome({ id: "o2", totalBetAmount: 100 }),
    ];
    const probs = svc.calculateProbabilities(outcomes as any, 1000);
    expect(probs[0]).toBeGreaterThan(probs[1]);
  });

  it("probabilities always sum to ~1", () => {
    const outcomes = [
      makeOutcome({ id: "o1", totalBetAmount: 300 }),
      makeOutcome({ id: "o2", totalBetAmount: 500 }),
      makeOutcome({ id: "o3", totalBetAmount: 200 }),
    ];
    const probs = svc.calculateProbabilities(outcomes as any, 1000);
    const sum = probs.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
  });
});
