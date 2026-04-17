import React, { useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Building2,
  Coins,
  Target,
  BarChart2,
  Trophy,
  Sword,
  Lock,
} from "lucide-react";

interface Step {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

const STEPS: Step[] = [
  {
    icon: <User size={32} />,
    title: "Open the app",
    desc: "Launch Oro via Telegram. Your account is created automatically — no complicated sign-up needed.",
  },
  {
    icon: <Building2 size={32} />,
    title: "Link your DK Bank account",
    desc: "Connect your DK Bank account using your 11-digit CID. This allows you to instantly deposit and withdraw money with zero friction.",
  },
  {
    icon: <Lock size={32} />,
    title: "Set your website password",
    desc: "To access Oro on the web, open Telegram → Oro app → Settings → Website Access → Set Password. Then visit the site and sign in with your CID and that password.",
  },
  {
    icon: <Coins size={32} />,
    title: "Add funds to your wallet",
    desc: "Deposit money from your DK Bank account. Your Oro credits top up instantly so you can start predicting straight away.",
  },
  {
    icon: <Target size={32} />,
    title: "Pick a market & predict",
    desc: 'Browse the Feed, choose an outcome (e.g. "Real Madrid wins"), and enter your amount. Your prediction is locked in immediately.',
  },
  {
    icon: <BarChart2 size={32} />,
    title: "Watch the odds move",
    desc: "Oro uses a parimutuel pool — odds shift as more people bet. The more people agree with you, the lower your potential payout.",
  },
  {
    icon: <Trophy size={32} />,
    title: "Win & Collect",
    desc: "When the real-world event ends, admins resolve the market. If your outcome wins, your share of the pool lands in your wallet automatically.",
  },
  {
    icon: <Sword size={32} />,
    title: "Challenge a friend (Duels)",
    desc: "Already placed a bet? Create a duel! Pick your outcome, set a wager, and share the link. Winner takes the entire pot.",
  },
];

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
      // Optionally reset for next time?
      setTimeout(() => setCurrentStep(0), 300);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const current = STEPS[currentStep];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      
      <div
        style={{
          background: "var(--bg-card)",
          width: "100%",
          maxWidth: 420,
          borderRadius: 24,
          border: "1px solid var(--glass-border)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
          position: "relative",
          overflow: "hidden",
          animation: "fadeIn 0.3s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 0", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Card */}
        <div key={currentStep} style={{ padding: "0 32px 32px", textAlign: "center", animation: "slideIn 0.3s ease-out" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(62,207,110,0.1))",
              border: "1px solid rgba(59,130,246,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
              color: "#3b82f6",
            }}
          >
            {current.icon}
          </div>

          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "var(--text-main)",
              marginBottom: 12,
              letterSpacing: "-0.02em",
            }}
          >
            {current.title}
          </h2>

          <p
            style={{
              fontSize: "0.95rem",
              color: "var(--text-muted)",
              lineHeight: 1.6,
              marginBottom: 32,
              minHeight: 80,
            }}
          >
            {current.desc}
          </p>

          {/* Progress Dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 32 }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === currentStep ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i === currentStep ? "#3b82f6" : "var(--glass-border)",
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </div>

          {/* Controls */}
          <div style={{ display: "flex", gap: 12 }}>
            {currentStep > 0 ? (
              <button
                onClick={prevStep}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  height: 48,
                  borderRadius: 14,
                  border: "1px solid var(--glass-border)",
                  background: "transparent",
                  color: "var(--text-main)",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                <ChevronLeft size={18} />
                Back
              </button>
            ) : null}

            <button
              onClick={nextStep}
              style={{
                flex: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                height: 48,
                borderRadius: 14,
                border: "none",
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#fff",
                fontWeight: 800,
                fontSize: "0.95rem",
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(37,99,235,0.3)",
              }}
            >
              {currentStep === STEPS.length - 1 ? "Get Started" : "Next"}
              {currentStep < STEPS.length - 1 && <ChevronRight size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
