import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyBets, type Bet } from "@/api/client";

const STATUS_COLOR: Record<Bet["status"], string> = {
  pending: "#f59e0b",
  won: "#22c55e",
  lost: "#ef4444",
  refunded: "#64748b",
};

const STATUS_LABEL: Record<Bet["status"], string> = {
  pending: "Active",
  won: "Won",
  lost: "Lost",
  refunded: "Refunded",
};

function BetCard({ bet }: { bet: Bet }) {
  const color = STATUS_COLOR[bet.status];
  const pool = bet.market ? Number(bet.market.totalPool) : 0;
  const edge = bet.market ? Number(bet.market.houseEdgePct) : 5;
  const outcomePool = bet.outcome ? Number(bet.outcome.totalBetAmount) : 0;
  const displayOdds =
    outcomePool > 0
      ? ((pool * (1 - edge / 100)) / outcomePool).toFixed(2)
      : bet.oddsAtPlacement
        ? Number(bet.oddsAtPlacement).toFixed(2)
        : "—";

  return (
    <div
      style={{
        background: "var(--glass-bg)",
        border: "1px solid var(--glass-border)",
        borderRadius: 14,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        <span
          style={{
            fontWeight: 600,
            fontSize: "0.9rem",
            color: "var(--text-main)",
            flex: 1,
          }}
        >
          {bet.market?.title ?? bet.marketId}
        </span>
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 20,
            background: `${color}22`,
            color,
            whiteSpace: "nowrap",
          }}
        >
          {STATUS_LABEL[bet.status]}
        </span>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
          Pick:
        </span>
        <span
          style={{
            fontSize: "0.78rem",
            fontWeight: 600,
            color: "var(--text-main)",
          }}
        >
          {bet.outcome?.label ?? bet.outcomeId}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.82rem",
          color: "var(--text-subtle)",
        }}
      >
        <span>BTN {Number(bet.amount).toLocaleString()}</span>
        <span>Odds {displayOdds}x</span>
        {bet.payout != null && (
          <span style={{ color: "#22c55e", fontWeight: 700 }}>
            +BTN {Number(bet.payout).toLocaleString()}
          </span>
        )}
      </div>

      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
        {new Date(bet.placedAt).toLocaleString()} ·{" "}
        <Link
          to={`/market/${bet.marketId}`}
          style={{ color: "var(--accent)", textDecoration: "none" }}
        >
          View market →
        </Link>
      </div>
    </div>
  );
}

export function PwaMyBetsPage() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [filter, setFilter] = useState<Bet["status"] | "all">("all");

  const changeFilter = (key: Bet["status"] | "all") => {
    setFilter(key);
    setShowAll(false);
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setLoading(true);
    getMyBets()
      .then(setBets)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === "all" ? bets : bets.filter((b) => b.status === filter);

  const tabs: Array<{ key: Bet["status"] | "all"; label: string }> = [
    { key: "all", label: "All" },
    { key: "pending", label: "Active" },
    { key: "won", label: "Won" },
    { key: "lost", label: "Lost" },
    { key: "refunded", label: "Refunded" },
  ];

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px" }}>
      <h1
        style={{
          fontSize: "1.4rem",
          fontWeight: 800,
          marginBottom: 4,
          color: "var(--text-main)",
        }}
      >
        My Predictions
      </h1>
      <p
        style={{
          fontSize: "0.85rem",
          color: "var(--text-muted)",
          marginBottom: 20,
        }}
      >
        {bets.length} prediction{bets.length !== 1 ? "s" : ""} placed
      </p>

      {/* Filter tabs */}
      <div
        style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}
      >
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => changeFilter(t.key)}
            style={{
              padding: "5px 14px",
              borderRadius: 20,
              border: "1px solid var(--glass-border)",
              background:
                filter === t.key ? "var(--accent)" : "var(--glass-bg)",
              color: filter === t.key ? "#fff" : "var(--text-subtle)",
              fontWeight: 600,
              fontSize: "0.78rem",
              cursor: "pointer",
            }}
          >
            {t.label}
            {t.key !== "all" && (
              <span style={{ marginLeft: 4, opacity: 0.7 }}>
                ({bets.filter((b) => b.status === t.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 0",
            color: "var(--text-subtle)",
          }}
        >
          Loading…
        </div>
      )}
      {error && (
        <div
          style={{ textAlign: "center", padding: "40px 0", color: "#ef4444" }}
        >
          {error}
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 0",
            color: "var(--text-subtle)",
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-subtle)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginBottom: 12 }}
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
          <div>
            No predictions yet.{" "}
            <Link to="/markets" style={{ color: "var(--accent)" }}>
              Browse markets →
            </Link>
          </div>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.slice(0, showAll ? undefined : 5).map((bet) => (
          <BetCard key={bet.id} bet={bet} />
        ))}
      </div>
      {filtered.length > 5 && (
        <button
          onClick={() => setShowAll((s) => !s)}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: 12,
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            borderRadius: 12,
            color: "var(--text-main)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: showAll ? "rotate(180deg)" : "none",
              transition: "transform 0.2s",
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          {showAll ? "Show Less" : `View More (${filtered.length - 5} more)`}
        </button>
      )}
    </div>
  );
}
