import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getMyResults,
  getResolvedMarkets,
  getMe,
  type Bet,
  type ResolvedMarket,
  type AuthUser,
} from "@/api/client";

export function PwaResultsPage() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<ResolvedMarket[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [me, setMe] = useState<AuthUser | null>(null);
  const [repOpen, setRepOpen] = useState(true);

  useEffect(() => {
    getMyResults()
      .then(setBets)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    getResolvedMarkets()
      .then(setResolved)
      .catch(() => {});
    getMe()
      .then(setMe)
      .catch(() => {});
  }, []);

  const won = bets.filter((b) => b.status === "won");
  const lost = bets.filter((b) => b.status === "lost");
  const winRate =
    bets.filter((b) => b.status !== "refunded").length > 0
      ? (
          (won.length / bets.filter((b) => b.status !== "refunded").length) *
          100
        ).toFixed(0)
      : "0";

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
        Results
      </h1>
      <p
        style={{
          fontSize: "0.85rem",
          color: "var(--text-muted)",
          marginBottom: 20,
        }}
      >
        Resolution record
      </p>

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

      {!loading && !error && (
        <>
          {/* Summary strip */}
          {bets.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 10,
                marginBottom: 24,
              }}
            >
              {[
                { label: "Contracts", value: bets.length },
                { label: "Won", value: won.length, color: "#22c55e" },
                { label: "Lost", value: lost.length, color: "#ef4444" },
                {
                  label: "Win rate",
                  value: `${winRate}%`,
                  color: Number(winRate) >= 50 ? "#22c55e" : "#f59e0b",
                },
              ].map((s) => (
                <div
                  key={s.label}
                  style={{
                    background: "var(--glass-bg)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: 12,
                    padding: "12px 10px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 800,
                      color: (s as any).color ?? "var(--text-main)",
                    }}
                  >
                    {s.value}
                  </div>
                  <div
                    style={{
                      fontSize: "0.68rem",
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Prediction Reputation */}
          <div
            style={{
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              borderRadius: 14,
              padding: "16px 18px",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                userSelect: "none",
              }}
              onClick={() => setRepOpen((o) => !o)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
                  <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                </svg>
                <span
                  style={{
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    color: "var(--text-main)",
                  }}
                >
                  Prediction Reputation
                </span>
                {(() => {
                  const tier = me?.reputationTier ?? "newcomer";
                  const label =
                    tier === "expert"
                      ? "Legend"
                      : tier === "reliable"
                        ? "Hot Hand"
                        : tier === "regular"
                          ? "Sharpshooter"
                          : "Rookie";
                  const bg =
                    tier === "expert"
                      ? "#fef3c7"
                      : tier === "reliable"
                        ? "#d1fae5"
                        : tier === "regular"
                          ? "#dbeafe"
                          : "var(--glass-bg)";
                  const color =
                    tier === "expert"
                      ? "#92400e"
                      : tier === "reliable"
                        ? "#065f46"
                        : tier === "regular"
                          ? "#1e40af"
                          : "var(--text-muted)";
                  return (
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: bg,
                        color,
                      }}
                    >
                      {label}
                    </span>
                  );
                })()}
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-subtle)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transition: "transform 0.2s",
                  transform: repOpen ? "rotate(0deg)" : "rotate(-90deg)",
                  flexShrink: 0,
                }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>

            {repOpen && (
              <div style={{ marginTop: 14 }}>
                {(me?.totalPredictions ?? 0) === 0 ? (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: "var(--text-muted)",
                      lineHeight: 1.6,
                    }}
                  >
                    Make your first prediction to start building your reputation
                    score. Top predictors earn a Legend badge and their
                    predictions carry more weight in market probabilities.
                  </p>
                ) : (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        marginBottom: 12,
                      }}
                    >
                      {me?.reputationScore != null && (
                        <span
                          style={{ fontSize: 13, color: "var(--text-subtle)" }}
                        >
                          {Math.round(me.reputationScore * 100)}% confidence
                          score
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 20,
                        fontSize: 13,
                        color: "var(--text-subtle)",
                        marginBottom: 14,
                      }}
                    >
                      <span>
                        <strong
                          style={{ color: "var(--text-main)", fontSize: 15 }}
                        >
                          {me?.totalPredictions ?? 0}
                        </strong>{" "}
                        predictions
                      </span>
                      <span>
                        <strong
                          style={{ color: "var(--text-main)", fontSize: 15 }}
                        >
                          {me?.correctPredictions ?? 0}
                        </strong>{" "}
                        correct
                      </span>
                    </div>
                    {(() => {
                      const total = me?.totalPredictions ?? 0;
                      const correct = me?.correctPredictions ?? 0;
                      const accuracy = total > 0 ? correct / total : 0;
                      const tier = me?.reputationTier ?? "newcomer";
                      if (tier === "expert") {
                        return (
                          <>
                            <div
                              style={{
                                background: "var(--glass-border)",
                                borderRadius: 99,
                                height: 6,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  borderRadius: 99,
                                  background:
                                    "linear-gradient(90deg, #f59e0b, #fbbf24)",
                                }}
                              />
                            </div>
                            <div
                              style={{
                                marginTop: 6,
                                fontSize: 11,
                                color: "#92400e",
                                fontWeight: 700,
                              }}
                            >
                              🏆 Maximum tier reached
                            </div>
                          </>
                        );
                      }
                      let label: string,
                        color: string,
                        progressPct: number,
                        hint: string;
                      if (tier === "newcomer") {
                        progressPct = Math.min((total / 10) * 100, 100);
                        const rem = 10 - total;
                        label = "Sharpshooter";
                        color = "#3b82f6";
                        hint = `${rem} more prediction${rem !== 1 ? "s" : ""} to reach Sharpshooter`;
                      } else if (tier === "regular") {
                        progressPct =
                          ((Math.min(total / 50, 1) +
                            Math.min(accuracy / 0.65, 1)) /
                            2) *
                          100;
                        const rem = Math.max(0, 50 - total);
                        label = "Hot Hand";
                        color = "#059669";
                        hint =
                          rem > 0 && accuracy < 0.65
                            ? `${rem} more predictions & ${Math.round(accuracy * 100)}% → 65% accuracy for Hot Hand`
                            : rem > 0
                              ? `${rem} more predictions to reach Hot Hand`
                              : `Reach 65% accuracy to unlock Hot Hand (currently ${Math.round(accuracy * 100)}%)`;
                      } else {
                        progressPct =
                          ((Math.min(total / 100, 1) +
                            Math.min(accuracy / 0.75, 1)) /
                            2) *
                          100;
                        const rem = Math.max(0, 100 - total);
                        label = "Legend";
                        color = "#f59e0b";
                        hint =
                          rem > 0 && accuracy < 0.75
                            ? `${rem} more predictions & ${Math.round(accuracy * 100)}% → 75% accuracy for Legend`
                            : rem > 0
                              ? `${rem} more predictions to reach Legend`
                              : `Reach 75% accuracy to unlock Legend (currently ${Math.round(accuracy * 100)}%)`;
                      }
                      return (
                        <>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 5,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "var(--text-subtle)",
                              }}
                            >
                              Progress to <span style={{ color }}>{label}</span>
                            </span>
                            <span
                              style={{ fontSize: 11, fontWeight: 800, color }}
                            >
                              {Math.round(progressPct)}%
                            </span>
                          </div>
                          <div
                            style={{
                              background: "var(--glass-border)",
                              borderRadius: 99,
                              height: 6,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${progressPct}%`,
                                height: "100%",
                                borderRadius: 99,
                                background: color,
                                transition: "width 0.8s ease",
                              }}
                            />
                          </div>
                          <div
                            style={{
                              marginTop: 5,
                              fontSize: 11,
                              color: "var(--text-subtle)",
                              fontWeight: 600,
                            }}
                          >
                            {hint}
                          </div>
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Resolution Record */}
          <div style={{ marginTop: bets.length > 0 ? 8 : 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--text-subtle)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="8" r="6" />
                <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
              </svg>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  color: "var(--text-subtle)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Resolution Record
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                }}
              >
                {resolved.length} market{resolved.length !== 1 ? "s" : ""}
              </span>
            </div>

            {resolved.length === 0 ? (
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
                  <circle cx="12" cy="8" r="6" />
                  <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                </svg>
                <div>
                  No resolved markets yet.{" "}
                  <Link to="/markets" style={{ color: "var(--accent)" }}>
                    Browse markets →
                  </Link>
                </div>
              </div>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {resolved.slice(0, showAll ? undefined : 5).map((m) => (
                  <Link
                    key={m.id}
                    to={`/market/${m.id}`}
                    style={{ textDecoration: "none" }}
                  >
                    <div
                      style={{
                        background: "var(--glass-bg)",
                        border: "1px solid var(--glass-border)",
                        borderRadius: 12,
                        padding: "14px 16px",
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
                            fontWeight: 700,
                            fontSize: "0.88rem",
                            color: "var(--text-main)",
                            flex: 1,
                            lineHeight: 1.3,
                          }}
                        >
                          {m.title}
                        </span>
                        {m.category && (
                          <span
                            style={{
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              color: "var(--text-muted)",
                              background: "var(--glass-bg)",
                              border: "1px solid var(--glass-border)",
                              padding: "2px 8px",
                              borderRadius: 6,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {m.category}
                          </span>
                        )}
                      </div>
                      {m.winner && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#22c55e"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span
                            style={{
                              fontSize: "0.8rem",
                              fontWeight: 700,
                              color: "#22c55e",
                            }}
                          >
                            {m.winner.label}
                          </span>
                        </div>
                      )}
                      {m.resolutionCriteria && (
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.75rem",
                            color: "var(--text-subtle)",
                            lineHeight: 1.5,
                            fontStyle: "italic",
                          }}
                        >
                          "{m.resolutionCriteria}"
                        </p>
                      )}
                      <div
                        style={{
                          display: "flex",
                          gap: 14,
                          flexWrap: "wrap",
                          paddingTop: 4,
                          borderTop: "1px solid var(--glass-border)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--text-muted)",
                            fontWeight: 600,
                          }}
                        >
                          BTN {Number(m.totalPool).toLocaleString()} pool
                        </span>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--text-muted)",
                            fontWeight: 600,
                          }}
                        >
                          {m.participantCount} bettors
                        </span>
                        {m.resolvedAt && (
                          <span
                            style={{
                              fontSize: "0.72rem",
                              color: "var(--text-muted)",
                              fontWeight: 600,
                            }}
                          >
                            {new Date(m.resolvedAt).toLocaleDateString(
                              "en-BT",
                              {
                                timeZone: "Asia/Thimphu",
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {resolved.length > 5 && (
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
                {showAll
                  ? "Show Less"
                  : `View More History (${resolved.length - 5} more)`}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
