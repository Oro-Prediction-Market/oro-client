import { useState, useEffect } from "react";
import {
  getMarkets,
  placeBet,
  type Market
} from "@/api/client";
import { PwaPaymentModal } from "../components/PwaPaymentModal";
import type { PaymentResponse } from "@/types/payment";
import { PwaMarketCard } from "../components/PwaMarketCard";
import { PwaMarketGrid } from "../components/PwaMarketGrid";
import { useFilter } from "@/contexts/FilterContext";

export function PwaMarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBet, setActiveBet] = useState<{
    marketId: string;
    outcomeId: string;
  } | null>(null);
  const { searchQuery } = useFilter();
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce the global search query → 400 ms before hitting the server
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Fetch from server whenever the committed search term changes
  useEffect(() => {
    setLoading(true);
    getMarkets(debouncedSearch.trim() || undefined)
      .then(setMarkets)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [debouncedSearch]);

  const handlePaymentSuccess = async (_payment: PaymentResponse) => {
    if (!activeBet) return;
    const betAmt = _payment?.amount ?? 0;

    // Snapshot before optimistic update so we can roll back on failure
    const prevMarkets = markets;

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
    const market = prevMarkets.find((m) => m.id === activeBet.marketId);
    if (market) {
      try {
        await placeBet(market.id, {
          outcomeId: activeBet.outcomeId,
          amount: betAmt,
        });
      } catch (e: any) {
        // Bet failed — roll back the optimistic update
        setMarkets(prevMarkets);
        console.warn("Bet placement failed, rolled back:", e.message);
      }
    }
    // Sync with server to get authoritative pool numbers
    getMarkets(debouncedSearch.trim() || undefined).then(setMarkets).catch(console.error);
  };

  if (loading)
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "100px 0" }}>
        <div style={{ textAlign: "center", color: "var(--text-subtle)" }}>
          <div style={{ fontSize: 48, marginBottom: 16, animation: "bounce 2s infinite" }}>🔮</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Syncing predictions…</div>
        </div>
      </div>
    );

  const openMarkets = markets.filter((m) => m.status === "open");
  const upcomingMarkets = markets.filter((m) => m.status === "upcoming");
  const settledMarkets = markets.filter(
    (m) => !["open", "upcoming"].includes(m.status),
  );
  const activeMarket = activeBet
    ? markets.find((m) => m.id === activeBet.marketId)
    : null;

  const hasResults = markets.length > 0;

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
    <div style={{ padding: "0 0 100px", maxWidth: 1240, margin: "0 auto", position: "relative" }}>
      <div className="mesh-bg" />

      {/* ── Page Hero/Header ── */}
      <div style={{ padding: "var(--space-xl) var(--space-md) var(--space-lg)" }}>

        {/* No results */}
        {!hasResults && debouncedSearch.trim() && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-subtle)" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "var(--text-main)", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>No markets found</div>
            <div style={{ fontSize: "1rem", marginTop: 8, fontWeight: 500 }}>Try a different search term.</div>
          </div>
        )}

        {openMarkets.length > 0 && (
          <section style={{ marginBottom: "var(--space-xl)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "var(--space-md)" }}>
              <div style={{ padding: "4px 10px", borderRadius: "var(--radius-sm)", background: "rgba(34, 197, 94, 0.1)", color: "var(--color-success)", fontSize: "0.65rem", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>Live</div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--text-main)", margin: 0, fontFamily: "var(--font-display)", letterSpacing: "-0.03em" }}>Active Markets</h2>
            </div>
            {renderGrid(openMarkets)}
          </section>
        )}

        {upcomingMarkets.length > 0 && (
          <section style={{ marginBottom: "var(--space-xl)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "var(--space-md)" }}>
              <div style={{ padding: "4px 10px", borderRadius: "var(--radius-sm)", background: "rgba(59, 130, 246, 0.1)", color: "var(--color-info)", fontSize: "0.65rem", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>Soon</div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--text-main)", margin: 0, fontFamily: "var(--font-display)", letterSpacing: "-0.03em" }}>Coming Up</h2>
            </div>
            {renderGrid(upcomingMarkets)}
          </section>
        )}

        {settledMarkets.length > 0 && (
          <section style={{ marginBottom: "var(--space-xl)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "var(--space-md)" }}>
              <div style={{ padding: "4px 10px", borderRadius: "var(--radius-sm)", background: "rgba(148, 163, 184, 0.1)", color: "var(--text-subtle)", fontSize: "0.65rem", fontWeight: 900, letterSpacing: "0.08em", textTransform: "uppercase" }}>Past</div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--text-main)", margin: 0, fontFamily: "var(--font-display)", letterSpacing: "-0.03em" }}>Market History</h2>
            </div>
            {renderGrid(settledMarkets)}
          </section>
        )}
      </div>

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
