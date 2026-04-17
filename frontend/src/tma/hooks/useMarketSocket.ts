import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const WS_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3000"
).replace(/\/api\/?$/, "");

export interface MarketOutcomeUpdate {
  id: string;
  totalBetAmount: number;
  lmsrProbability: number | null;
  currentOdds: number;
}

export interface MarketUpdate {
  marketId: string;
  totalPool: number;
  outcomes: MarketOutcomeUpdate[];
}

/**
 * Subscribes to live market updates for a single market via WebSocket.
 * Returns the latest update payload (null until the first event arrives).
 *
 * Usage:
 *   const liveData = useMarketSocket(marketId);
 *   // liveData?.outcomes[i].lmsrProbability is always the latest value
 */
const DEBOUNCE_MS = 300;

export function useMarketSocket(
  marketId: string | undefined,
): MarketUpdate | null {
  const [update, setUpdate] = useState<MarketUpdate | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSetUpdate = useCallback((payload: MarketUpdate) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setUpdate(payload), DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    if (!marketId) return;

    const socket = io(`${WS_URL}/markets`, {
      query: { marketId },
      transports: ["websocket", "polling"],
      reconnectionDelay: 2000,
      reconnectionAttempts: 20,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.debug(`[WS] connected to market:${marketId} socket id=${socket.id}`);
    });

    socket.on("market_updated", (payload: MarketUpdate) => {
      if (payload.marketId === marketId) {
        debouncedSetUpdate(payload);
      }
    });

    socket.on("connect_error", (err) => {
      console.warn(`[WS] connect_error: ${err.message}`);
    });

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [marketId, debouncedSetUpdate]);

  return update;
}
