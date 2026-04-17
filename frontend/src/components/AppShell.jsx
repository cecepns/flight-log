import { NavLink, useLocation } from "react-router-dom";
import { Plane, PlaneTakeoff } from "lucide-react";
import BottomNav from "./BottomNav";

const menus = [
  { to: "/flights", label: "Flights" },
  { to: "/add", label: "Add" },
  { to: "/summary", label: "Summary" },
  { to: "/settings", label: "Settings" },
];

export default function AppShell({ children }) {
  const location = useLocation();

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
      </header>

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
