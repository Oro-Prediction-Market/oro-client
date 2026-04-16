import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { PwaFeedPage } from "./pages/PwaFeedPage";
import { PwaMarketsPage } from "./pages/PwaMarketsPage";
import { PwaMarketDetailPage } from "./pages/PwaMarketDetailPage";
import { PwaPaymentTestPage } from "./pages/PwaPaymentTestPage";
import { PwaBottomNav } from "./components/PwaBottomNav";

import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { publicUrl } from "@/helpers/publicUrl.ts";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { OroLogo } from "@/components/OroLogo";
import { FilterProvider, useFilter } from "@/contexts/FilterContext";
import { Search, ChevronDown, CircleHelp } from "lucide-react";
import { HowItWorksModal } from "./components/HowItWorksModal";

// ── Navbar Controls ──────────────────────────────────────────────────────────

function NavbarControls({ isMobile, onShowHowItWorks }: { isMobile: boolean, onShowHowItWorks: () => void }) {
  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    availableCategories,
  } = useFilter();

  return (
    <>
      {!isMobile && (
        <div
          style={{
            position: "relative",
            flex: 1,
            maxWidth: 300,
            marginLeft: 0,
          }}
        >
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-subtle)",
              pointerEvents: "none",
            }}
          />
          <input
            type="text"
            placeholder="Search Oro Markets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--glass-border)",
              borderRadius: 20,
              padding: "8px 14px 8px 40px",
              color: "var(--text-main)",
              fontSize: "0.85rem",
              fontWeight: 600,
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--text-muted)")}
            onBlur={(e) =>
              (e.target.style.borderColor = "var(--glass-border)")
            }
          />
        </div>
      )}

      {/* Right side controls (Filters + Telegram) */}
      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
                padding: "8px 0",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--text-main)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-muted)")
              }
              onClick={onShowHowItWorks}
            >
              <CircleHelp size={16} />
              How it works
            </button>

            <div style={{ position: "relative" }}>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  appearance: "none",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: 16,
                  padding: "6px 32px 6px 14px",
                  color: "var(--text-main)",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  outline: "none",
                  cursor: "pointer",
                  minWidth: 100,
                }}
              >
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>
        )}

        <a
          href="https://t.me/OroPredictBot"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "linear-gradient(135deg, #229ed9, #1a7abf)",
            color: "#fff",
            padding: "7px 14px",
            borderRadius: 20,
            textDecoration: "none",
            fontSize: "0.75rem",
            fontWeight: 700,
            boxShadow: "0 2px 8px rgba(34,158,217,0.3)",
            letterSpacing: "0.01em",
            flexShrink: 0,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
          </svg>
          Telegram
        </a>
      </div>
    </>
  );
}

// ── Layout ───────────────────────────────────────────────────────────────────

function PwaLayout() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "transparent",
        color: "var(--text-main)",
        fontFamily: "var(--font-primary)",
      }}
    >
      <div className="mesh-bg" />
      <header
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "var(--glass-blur)",
          WebkitBackdropFilter: "var(--glass-blur)",
          borderBottom: "1px solid var(--glass-border)",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 8px",
            height: 64,
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          {/* Logo + branding */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div>
              <OroLogo size={54} />
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                lineHeight: 1.1,
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                  fontSize: "1.2rem",
                  color: "var(--text-main)",
                  letterSpacing: "-0.03em",
                  fontFamily: "var(--font-display)",
                }}
              >
                Oro
              </span>
              <span
                style={{
                  fontSize: "0.65rem",
                  color: "var(--text-muted)",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Parimutuel Predictions
              </span>
            </div>
          </div>

          <NavbarControls isMobile={isMobile} onShowHowItWorks={() => setShowHowItWorks(true)} />
        </div>
      </header>

      <div style={{ paddingBottom: isMobile ? 80 : 20 }}>
        <Routes>
          <Route path="/" element={<PwaFeedPage />} />
          <Route path="/markets" element={<PwaMarketsPage />} />
          <Route path="/market/:id" element={<PwaMarketDetailPage />} />
          <Route path="/payment-test" element={<PwaPaymentTestPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>

      <PwaBottomNav />
      
      <HowItWorksModal 
        isOpen={showHowItWorks} 
        onClose={() => setShowHowItWorks(false)} 
      />
    </div>
  );
}

// ── App Root ─────────────────────────────────────────────────────────────────

export function PwaApp() {
  return (
    <ThemeProvider>
      <TonConnectUIProvider manifestUrl={publicUrl("tonconnect-manifest.json")}>
        <FilterProvider>
          <HashRouter>
            <PwaLayout />
          </HashRouter>
        </FilterProvider>
      </TonConnectUIProvider>
    </ThemeProvider>
  );
}
