import { NavLink } from "react-router-dom";
import { Clock3, Plane, Plus, Settings } from "lucide-react";

const items = [
  { to: "/flights", icon: Plane, label: "Flights" },
  { to: "/add", icon: Plus, label: "Add" },
  { to: "/summary", icon: Clock3, label: "Summary" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line-soft bg-bg-card/95 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2 text-xs ${
                isActive ? "text-brand" : "text-text-soft"
              }`
            }
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
