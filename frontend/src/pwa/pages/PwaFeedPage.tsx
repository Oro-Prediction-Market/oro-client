import { useState, useEffect } from "react";
import {
  getMarkets,
  placeBet,
  getRecentActivity,
  type Market,
  type ActivityEvent,
} from "@/api/client";
import { PwaPaymentModal } from "../components/PwaPaymentModal";
import type { PaymentResponse } from "@/types/payment";
import { PwaMarketCard } from "../components/PwaMarketCard";
import { PwaMarketGrid } from "../components/PwaMarketGrid";
import { Flame } from "lucide-react";
import { useFilter } from "@/contexts/FilterContext";

// ── Live Activity Ticker ──────────────────────────────────────────────────────

interface FormattedEvent {
  userName: string;
  initials: string;
  action: string;
  outcome: string;
  amount: string;
  marketTitle: string;
  type: "bet" | "win";
}

function parseActivityEvent(e: ActivityEvent): FormattedEvent {
  const amount = `Nu ${Number(e.amount).toLocaleString()}`;
  const rawUserName = e.userName || "";
  const userName = rawUserName.startsWith("@")
    ? rawUserName.substring(1)
    : rawUserName;
  const initials = rawUserName
    ? rawUserName.substring(0, 1).toUpperCase()
    : "?";
  return {
    userName,
    initials,
    action: e.type === "win" ? "won" : "just bet",
    outcome: e.outomeLabel,
    amount,
    marketTitle: e.marketTitle,
    type: e.type,
  };
}

function LiveTicker() {
  const [events, setEvents] = useState<FormattedEvent[]>([]);
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    getRecentActivity()
      .then((data) => {
        if (data.length > 0) {
          setEvents(data.map(parseActivityEvent));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (events.length < 2) return;
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % events.length);
        setVisible(true);
      }, 400);
    }, 4500);
    return () => clearInterval(cycle);
  }, [events.length]);

  if (!events.length) return null;
  const current = events[idx];

  return (
    <>
      <style>{`
        @keyframes tickerSlideUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        style={{
          width: 1,
          height: 14,
          background: "var(--glass-border)",
          flexShrink: 0,
          margin: "0 4px",
        }}
      />
      <Flame
        size={12}
        color="#ff6b00"
        fill="#ff9500"
        style={{ flexShrink: 0 }}
      />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          animation: visible ? "tickerSlideUp 0.4s ease-out forwards" : "none",
          opacity: visible ? 1 : 0,
          display: "flex",
          alignItems: "center",
          gap: 4,
          overflow: "hidden",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--text-main)",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {current.userName}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "var(--text-muted)",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {current.action}
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: current.type === "win" ? "#22c55e" : "#3b82f6",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {current.amount}
        </span>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-subtle)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          · {current.outcome}
        </span>
      </div>
    </>
  );
}

interface ActiveBet {
  marketId: string;
  outcomeId: string;
}

export function PwaFeedPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBet, setActiveBet] = useState<ActiveBet | null>(null);
  const {
    searchQuery,
    selectedCategory,
    setAvailableCategories,
  } = useFilter();

  useEffect(() => {
    getMarkets()
      .then((d) => {
        // Only show live/upcoming for feed
        const active = d.filter(
          (m) =>
            m.status === "open" ||
            m.status === "upcoming" ||
            m.status === "resolving",
        );
        setMarkets(active);

        // Update global categories
        const cats = ["All", ...Array.from(new Set(active.map((m) => m.category).filter(Boolean))) as string[]];
        setAvailableCategories(cats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handlePaymentSuccess = async (_payment: PaymentResponse) => {
    if (!activeBet) return;
    const betAmt = _payment?.amount ?? 0;

    setMarkets((prev) =>
      prev.map((m) => {
        if (m.id !== activeBet.marketId) return m;
        return {
          ...m,
          totalPool: String(Number(m.totalPool) + betAmt),
          outcomes: m.outcomes.map((o) =>
            o.id === activeBet.outcomeId
              ? {
                  ...o,
                  totalBetAmount: String(Number(o.totalBetAmount) + betAmt),
                }
              : o,
          ),
        };
      }),
    );

    setActiveBet(null);

    const market = markets.find((m) => m.id === activeBet.marketId);
    if (market) {
      try {
        await placeBet(market.id, {
          outcomeId: activeBet.outcomeId,
          amount: betAmt,
        });
      } catch (e: any) {
        console.warn(e.message);
      }
    }

    getMarkets()
      .then((d) => {
        setMarkets(
          d.filter(
            (m) =>
              m.status === "open" ||
              m.status === "upcoming" ||
              m.status === "resolving",
          ),
        );
      })
      .catch(console.error);
  };

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "100px 0",
        }}
      >
        <div style={{ textAlign: "center", color: "var(--text-subtle)" }}>
          <div
            style={{
              fontSize: 48,
              marginBottom: 16,
              animation: "bounce 2s infinite",
            }}
          >
            🔮
          </div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>
            Syncing predictions…
          </div>
        </div>
      </div>
    );

  if (!markets.length)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "120px 32px",
          textAlign: "center",
          gap: 16,
        }}
      >
        <div className="mesh-bg" />
        <div style={{ fontSize: 64 }}>🔮</div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: "var(--text-main)",
            fontFamily: "var(--font-display)",
          }}
        >
          No open predictions
        </div>
        <div
          style={{ fontSize: 15, color: "var(--text-muted)", maxWidth: 300 }}
        >
          The oracle is quiet. Check back later for new markets.
        </div>
      </div>
    );

  const filteredMarkets = markets.filter((m) => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" ||
      (m.category && m.category.toLowerCase() === selectedCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  const openMarkets = filteredMarkets.filter((m) => m.status === "open");
  const resolvingMarkets = filteredMarkets.filter((m) => m.status === "resolving");
  const upcomingMarkets = filteredMarkets.filter((m) => m.status === "upcoming");
  const activeMarket = activeBet
    ? markets.find((m) => m.id === activeBet.marketId)
    : null;

  const renderGrid = (items: Market[]) => (
    <PwaMarketGrid>
      {items.map((market) => (
        <PwaMarketCard
          key={market.id}
          market={market}
          onBet={(outcomeId) =>
            setActiveBet({ marketId: market.id, outcomeId })
          }
        />
      ))}
    </PwaMarketGrid>
  );

  return (
    <div
      style={{
        padding: "32px 16px 100px",
        maxWidth: 1200,
        margin: "0 auto",
        position: "relative",
      }}
    >
      <style>{`
        @keyframes heartbeat {
          0%   { transform: scale(1);    opacity: 1; }
          14%  { transform: scale(1.2);  opacity: 1; }
          28%  { transform: scale(1);    opacity: 0.9; }
          42%  { transform: scale(1.12); opacity: 1; }
          70%  { transform: scale(1);    opacity: 0.8; }
          100% { transform: scale(1);    opacity: 1; }
        }
        @keyframes liveBadgePulse {
          0%, 70%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
          14%            { box-shadow: 0 0 0 4px rgba(239,68,68,0.25); }
          42%            { box-shadow: 0 0 0 3px rgba(239,68,68,0.15); }
        }
      `}</style>
      <div className="mesh-bg" />


      {openMarkets.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 10px",
                borderRadius: 8,
                background: "rgba(34, 197, 94, 0.15)",
                color: "#22c55e",
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#22c55e",
                  animation: "heartbeat 2.4s ease-in-out infinite",
                }}
              />
              Live
            </div>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "var(--text-main)",
                margin: 0,
                fontFamily: "var(--font-display)",

              }}
            >
              Active Markets
            </h2>
            <LiveTicker />
          </div>
          {renderGrid(openMarkets)}
        </section>
      )}

      {resolvingMarkets.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                padding: "4px 10px",
                borderRadius: 8,
                background: "rgba(245, 158, 11, 0.15)",
                color: "#f59e0b",
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Wait
            </div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "var(--text-main)",
                margin: 0,
                fontFamily: "var(--font-display)",
              }}
            >
              Resolving
            </h2>
          </div>
          {renderGrid(resolvingMarkets)}
        </section>
      )}

      {upcomingMarkets.length > 0 && (
        <section style={{ marginBottom: 48 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                padding: "4px 10px",
                borderRadius: 8,
                background: "rgba(100, 116, 139, 0.15)",
                color: "var(--text-subtle)",
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Soon
            </div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "var(--text-main)",
                margin: 0,
                fontFamily: "var(--font-display)",
              }}
            >
              Upcoming
            </h2>
          </div>
          {renderGrid(upcomingMarkets)}
        </section>
      )}

      {activeMarket && activeBet && (
        <PwaPaymentModal
          isOpen={true}
          onClose={() => setActiveBet(null)}
          market={activeMarket}
          outcomeId={activeBet.outcomeId}
          onSuccess={handlePaymentSuccess}
          onFailure={(e) => console.error(e)}
        />
      )}
    </div>
  );
}
