# Oro — Prediction Market (Telegram Mini App)

Oro is a parimutuel prediction market built as a **Telegram Mini App** for Bhutan. Users predict outcomes of real-world events — sports, politics, weather, and more — stake Oro credits (Nu), and earn payouts based on the pool odds. Everything runs inside Telegram, no separate download required.

---

## What is Oro?

Oro lets you:

- **Predict** — Browse open markets, pick an outcome, and place a stake
- **Earn** — Win from the pool when the market resolves in your favour
- **Duel** — Challenge another user 1-vs-1 on any open market and stake Oro on the result
- **Climb the leaderboard** — Build a prediction streak, earn reputation, and top the weekly rankings
- **Manage your wallet** — Deposit and withdraw via DK Bank (Bhutan's digital payment network)

---

## Tech Stack

| Layer             | Technology                                |
| ----------------- | ----------------------------------------- |
| Mini App frontend | React + TypeScript + Vite                 |
| Backend API       | NestJS (Node.js)                          |
| Database          | PostgreSQL + TypeORM                      |
| Cache / Locks     | Redis                                     |
| Payments          | DK Bank gateway                           |
| Bot               | Telegram Bot API                          |
| Hosting           | Vercel (frontend) + Railway/VPS (backend) |

---

## Key Features

### 🎯 Prediction Markets

Parimutuel pool mechanic — all stakes go into a shared pool, payouts are proportional to stake size and pool odds. Markets are created and resolved by admins

### ⚔️ Duels

1-vs-1 prediction challenges. Create a duel on a market you've bet on, post it to the Open Feed, and the first user to accept takes the opposite side. Winner takes the pot (minus a 10% platform fee, waived with a Double Down power card).

### 🔥 Streaks & Power Cards

Maintain a daily bet streak for bonus multipliers. Reach win milestones in duels to unlock power cards:

- **Double Down** — fee waived on duel payout (full 2× pot)
- **Shield** — streak protected even on a loss
- **Ghost** — your wager hidden as "???" until opponent accepts

### 🏆 Leaderboard

Weekly ranking by prediction accuracy and duel wins. Reputation score (based on Brier score calibration) displayed alongside each market.

### 💳 DK Bank Integration

Real-money flow via Bhutan's DK Bank. Users link their DK account and phone number before placing stakes. Deposits and withdrawals go through the DK gateway.

### 🛡️ Admin Portal

Separate admin dashboard for creating markets, setting outcome images, managing users, resolving disputes, viewing audit logs, and monitoring settlement.

---

## Project Structure

```
/
├── frontend/          # Telegram Mini App (React + Vite)
├── backend/           # NestJS API server
├── tara-admin/        # Admin portal (separate React app)
└── docs/              # Architecture docs, DB schema, product design
```

---

## Getting Started

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend (TMA)

```bash
cd frontend
npm install
npx vite --port 5173 --strictPort --host
```

### Admin Portal

```bash
cd ../tara-admin
npm install
npm run dev
```

> The frontend connects to the backend via `VITE_API_BASE_URL` in `frontend/.env`.

---

## Useful Links

- [Telegram Mini Apps docs](https://docs.telegram-mini-apps.com/)
- [TON Connect](https://docs.ton.org/develop/dapps/ton-connect/overview)
- [DK Bank (Bhutan)](https://www.dkbank.bt/)
