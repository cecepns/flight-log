import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader2, Plane, PlaneTakeoff, RefreshCw, WifiOff } from "lucide-react";
import api from "../api/client";
import BottomNav from "./BottomNav";
import { useOfflineQueueLength } from "../hooks/useOfflineQueueLength";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { flushOfflineFlightQueue } from "../utils/offlineFlightQueue";

const menus = [
  { to: "/flights", label: "Flights" },
  { to: "/add", label: "Add" },
  { to: "/summary", label: "Summary" },
  { to: "/settings", label: "Settings" },
];

export default function AppShell({ children }) {
  const location = useLocation();
  const isOnline = useOnlineStatus();
  const pendingOfflineFlights = useOfflineQueueLength();
  const [syncing, setSyncing] = useState(false);

  const syncNow = async () => {
    if (!isOnline || syncing) return;
    setSyncing(true);
    try {
      const synced = await flushOfflineFlightQueue(api);
      if (synced > 0) {
        toast.success(`Synced ${synced} flight log(s) to the server.`);
      }
    } finally {
      setSyncing(false);
    }
  };

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline) {
      syncNow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  return (
    <div className="min-h-screen bg-bg-main text-slate-100">
      <header className="sticky top-0 z-20 border-b border-line-soft bg-bg-main/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-brand/20 p-2 text-brand">
              <PlaneTakeoff size={22} />
            </div>
            <div>
              <p className="text-lg font-semibold">Flight Log</p>
              <p className="text-xs text-text-soft">Cabin Crew Logbook</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Online / offline indicator dot */}
            <div className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-400" : "bg-red-500"}`}
              />
              <span className="hidden text-xs text-text-soft sm:block">
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>

            <nav className="hidden items-center gap-1 rounded-xl border border-line-soft bg-bg-card px-2 py-1 md:flex">
              {menus.map((menu) => (
                <NavLink
                  key={menu.to}
                  to={menu.to}
                  className={({ isActive }) =>
                    `rounded-lg px-4 py-2 text-sm ${
                      isActive
                        ? "bg-brand text-white"
                        : "text-text-soft hover:text-slate-100"
                    }`
                  }
                >
                  {menu.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Offline status banner */}
      {!isOnline && (
        <div className="mx-auto max-w-6xl px-4 pt-3">
          <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            <WifiOff size={15} className="shrink-0" />
            <span>
              You are offline. New flights will be saved locally and synced automatically when you
              reconnect.
            </span>
          </div>
        </div>
      )}

      {/* Pending queue banner (only when online, so user can sync) */}
      {isOnline && pendingOfflineFlights > 0 && (
        <div className="mx-auto max-w-6xl px-4 pt-3">
          <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            <span>
              {pendingOfflineFlights} flight log(s) pending sync to the server.
            </span>
            <button
              type="button"
              onClick={syncNow}
              disabled={syncing}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-xs font-medium text-amber-200 hover:bg-amber-400/25 disabled:opacity-60"
            >
              {syncing ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RefreshCw size={13} />
              )}
              {syncing ? "Syncing…" : "Sync now"}
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 md:pb-8">{children}</main>

      {location.pathname !== "/login" && <BottomNav />}
      <button
        type="button"
        className="fixed bottom-24 right-4 hidden rounded-full bg-brand p-3 text-white shadow-card md:block"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        <Plane size={16} />
      </button>
    </div>
  );
}
