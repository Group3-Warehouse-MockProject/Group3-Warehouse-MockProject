import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  Truck,
  ClipboardList,
  Users,
  Settings,
  Search,
  Bell,
  Cpu,
  ClipboardCheck,
  ChevronDown,
  Shield,
  UserCircle,
  LogOut,
  Sun,
  Moon,
  ArrowRightLeft
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useApp, roleLabels } from "@/lib/app-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/products", label: "Products", icon: Package },
  { to: "/inbound", label: "Inbound", icon: ArrowDownToLine },
  { to: "/outbound", label: "Outbound", icon: ArrowUpFromLine },
  { to: "/stocktake", label: "Stocktake", icon: ClipboardCheck },
  { to: "/transfer", label: "Transfer", icon: ArrowRightLeft },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
  { to: "/staff", label: "Staff", icon: Users },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const roleTone: Record<string, string> = {
  Admin: "bg-destructive/15 text-destructive border-destructive/30",
  Manager: "bg-primary/15 text-primary border-primary/30",
  Warehouse_Manager: "bg-accent/15 text-accent border-accent/30",
  Staff: "bg-muted text-muted-foreground border-border",
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { currentUser, activeWarehouseId, setActiveWarehouseId, canSwitchWarehouse, logout } = useApp();
  const [roleOpen, setRoleOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = (localStorage.getItem("ts-theme") as "dark" | "light") || "dark";
    setTheme(saved);
    document.documentElement.classList.toggle("light", saved === "light");
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("light", nextTheme === "light");
    localStorage.setItem("ts-theme", nextTheme);
  };

  const { data: warehousesData } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data;
    }
  });
  
  const warehouses = warehousesData || [];

  // Auto redirect to login if no valid session
  if (!currentUser) {
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    return null;
  }

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border sticky top-0 h-screen">
        <div className="p-6 flex items-center gap-3">
          <div className="size-10 rounded-xl grid place-items-center glow-ring" style={{ background: "var(--gradient-primary)" }}>
            <Cpu className="size-5 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">TechStock</div>
            <div className="text-[11px] text-muted-foreground leading-tight">Computer Warehouse</div>
          </div>
        </div>

        <div className="px-3 pb-3">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground px-1">Active Warehouse</label>
          <select
            value={activeWarehouseId ?? "ALL"}
            onChange={(e) => setActiveWarehouseId(e.target.value === "ALL" ? null : e.target.value)}
            disabled={!canSwitchWarehouse}
            className="mt-1 w-full h-9 px-2 rounded-lg bg-input border border-border text-sm disabled:opacity-70"
          >
            {canSwitchWarehouse && <option value="ALL">All warehouses</option>}
            {warehouses.map((w: any) => (
              <option key={w.id} value={w.id}>
                {w.code} — {w.city}
              </option>
            ))}
          </select>
        </div>

        <nav className="px-3 py-2 flex-1 space-y-1 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-primary font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="size-4" />
                {label}
                {active && <span className="ml-auto size-1.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>

        <div className="m-3 p-4 rounded-xl surface-card">
          <div className="text-xs text-muted-foreground">Capacity used</div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-gradient">68%</span>
            <span className="text-xs text-muted-foreground">/ 12,400 units</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full" style={{ width: "68%", background: "var(--gradient-primary)" }} />
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/70 border-b border-border">
          <div className="px-4 md:px-8 h-16 flex items-center gap-4">
            <div className="relative flex-1 max-w-xl mr-auto">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search SKU, product, order..."
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-input border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>

            <span className={`hidden lg:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-xs font-medium ${roleTone[currentUser.role]}`}>
              <Shield className="size-3" />
              {roleLabels[currentUser.role]}
            </span>

            <button 
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="size-10 rounded-lg bg-secondary border border-border grid place-items-center hover:bg-muted transition-colors relative">
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>

            <button className="size-10 rounded-lg bg-secondary border border-border grid place-items-center hover:bg-muted transition-colors relative">
              <Bell className="size-4" />
              <span className="absolute top-2 right-2 size-2 rounded-full bg-destructive" />
            </button>

            <div className="relative">
              <button
                onClick={() => setRoleOpen((v) => !v)}
                className="flex items-center gap-3 pl-3 border-l border-border h-10 hover:opacity-90"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium leading-tight">{currentUser.name}</div>
                  <div className="text-xs text-muted-foreground leading-tight">{currentUser.title}</div>
                </div>
                <div className="size-10 rounded-full grid place-items-center text-sm font-semibold" style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}>
                  {currentUser.initials}
                </div>
                <ChevronDown className="size-4 text-muted-foreground" />
              </button>

              {roleOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl surface-card p-2 shadow-xl z-50">
                  <Link
                    to="/profile"
                    onClick={() => setRoleOpen(false)}
                    className="w-full text-left px-2 py-2 rounded-lg flex items-center gap-2 hover:bg-secondary"
                  >
                    <div className="size-8 rounded-full grid place-items-center" style={{ background: "color-mix(in oklab, var(--primary) 15%, transparent)", color: "var(--primary)" }}>
                      <UserCircle className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">My profile</div>
                      <div className="text-[11px] text-muted-foreground">View & edit account</div>
                    </div>
                  </Link>
                  <button
                    onClick={() => {
                      setRoleOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-2 py-2 rounded-lg flex items-center gap-2 hover:bg-secondary"
                  >
                    <div className="size-8 rounded-full grid place-items-center bg-destructive/15 text-destructive">
                      <LogOut className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">Sign out</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
