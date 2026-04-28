import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useTrack } from "../hooks/useTrack";

const ROUTE_LABELS: Record<string, string> = {
  "/": "feed",
  "/leaderboard": "leaderboard",
  "/challenges": "challenges",
  "/wallet": "wallet",
  "/profile": "profile",
};

/** Drop inside HashRouter — fires page.view on every route change. */
export function RouteTracker() {
  const location = useLocation();
  const track = useTrack();
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    if (location.pathname === prevPath.current) return;
    prevPath.current = location.pathname;

    const page = ROUTE_LABELS[location.pathname] ?? (location.pathname.replace("/", "") || "feed");
    track("page.view", { page });
  }, [location.pathname, track]);

  return null;
}
