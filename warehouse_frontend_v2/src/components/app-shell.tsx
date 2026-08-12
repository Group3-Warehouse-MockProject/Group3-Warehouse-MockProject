import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Layers,
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
  MessageSquareText,
  LogOut,
  Sun,
  Moon,
  ArrowRightLeft,
  Activity,
  MapPin,
  Menu,
} from "lucide-react";
import { useEffect, useId, useMemo, useState, type KeyboardEvent, type ReactNode } from "react";
import { useApp, roleLabels } from "@/lib/app-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { NotificationModal } from "@/components/notification-modal";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface WarehouseOption {
  id: string;
  code: string;
  city: string;
  status?: string;
  capacity?: number;
  usedCapacity?: number;
}

interface NavItem {
  to: string;
  label: string;
  description: string;
  aliases: string[];
  icon: React.ElementType;
  adminOnly?: boolean;
}

const nav: NavItem[] = [
  {
    to: "/",
    label: "Dashboard",
    description: "Warehouse overview",
    aliases: ["home", "overview"],
    icon: LayoutDashboard,
  },
  {
    to: "/products",
    label: "Products",
    description: "SKU and inventory",
    aliases: ["sku", "inventory", "stock", "items"],
    icon: Package,
  },
  {
    to: "/categories",
    label: "Categories",
    description: "Product groups",
    aliases: ["groups", "types"],
    icon: Layers,
  },
  {
    to: "/inbound",
    label: "Inbound",
    description: "Receive stock and receipts",
    aliases: ["receive", "receiving", "receipt", "import"],
    icon: ArrowDownToLine,
  },
  {
    to: "/outbound",
    label: "Outbound",
    description: "Ship stock and orders",
    aliases: ["ship", "shipping", "order", "export"],
    icon: ArrowUpFromLine,
  },
  {
    to: "/stocktake",
    label: "Stocktake",
    description: "Inventory checks",
    aliases: ["check", "count", "audit"],
    icon: ClipboardCheck,
  },
  {
    to: "/transfer",
    label: "Transfer",
    description: "Move stock between warehouses",
    aliases: ["move", "relocate", "warehouse transfer"],
    icon: ArrowRightLeft,
  },
  {
    to: "/suppliers",
    label: "Suppliers",
    description: "Supplier directory",
    aliases: ["vendor", "partners"],
    icon: Truck,
  },
  {
    to: "/location",
    label: "Locations",
    description: "Warehouses, racks, and bins",
    aliases: ["warehouse", "rack", "bin", "storage"],
    icon: MapPin,
  },
  {
    to: "/staff",
    label: "Staff",
    description: "User and team management",
    aliases: ["users", "team", "employees"],
    icon: Users,
  },
  {
    to: "/tracking",
    label: "Tracking",
    description: "Activity logs",
    aliases: ["activity", "logs", "audit trail"],
    icon: Activity,
    adminOnly: true,
  },
  {
    to: "/settings",
    label: "Settings",
    description: "Application preferences",
    aliases: ["preferences", "configuration"],
    icon: Settings,
  },
  {
    to: "/feedback",
    label: "Feedback",
    description: "Share product feedback",
    aliases: ["support", "help", "comments"],
    icon: MessageSquareText,
  },
] as const;

const roleTone: Record<string, string> = {
  Admin: "bg-destructive/15 text-destructive border-destructive/30",
  Manager: "bg-primary/15 text-primary border-primary/30",
  Warehouse_Manager: "bg-accent/15 text-accent border-accent/30",
  Staff: "bg-muted text-muted-foreground border-border",
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { currentUser, activeWarehouseId, setActiveWarehouseId, canSwitchWarehouse, logout } =
    useApp();
  const [roleOpen, setRoleOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const searchListId = useId();
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
    },
  });

  const warehouses: WarehouseOption[] = warehousesData || [];
  const visibleNav = useMemo(
    () => nav.filter((item) => !item.adminOnly || currentUser?.role === "Admin"),
    [currentUser?.role],
  );
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matches = query
      ? visibleNav.filter((item) =>
          [item.label, item.description, item.to, ...item.aliases]
            .join(" ")
            .toLowerCase()
            .includes(query),
        )
      : visibleNav.filter((item) => ["/", "/products", "/inbound", "/outbound"].includes(item.to));
    return matches;
  }, [searchQuery, visibleNav]);

  const selectPage = (to: string) => {
    setSearchQuery("");
    setSearchOpen(false);
    setActiveSearchIndex(0);
    setMobileNavOpen(false);
    navigate({ to });
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setSearchOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSearchIndex((index) => Math.min(index + 1, Math.max(searchResults.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSearchIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && searchResults[activeSearchIndex]) {
      event.preventDefault();
      selectPage(searchResults[activeSearchIndex].to);
    }
  };

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
        <Link 
          to="/" 
          className="p-6 flex items-center gap-3 hover:opacity-90 transition-opacity"
          onClick={() => {
            setSearchQuery("");
            setSearchOpen(false);
            setMobileNavOpen(false);
          }}
        >
          <div
            className="size-10 rounded-xl grid place-items-center glow-ring shrink-0"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Cpu className="size-5 text-primary-foreground" />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold leading-tight text-foreground">TechStock</div>
            <div className="text-[11px] text-muted-foreground leading-tight">
              Computer Warehouse
            </div>
          </div>
        </Link>

        <div className="px-3 pb-3">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground px-1">
            Active Warehouse
          </label>
          <select
            value={activeWarehouseId ?? "ALL"}
            onChange={(e) => setActiveWarehouseId(e.target.value === "ALL" ? null : e.target.value)}
            disabled={!canSwitchWarehouse}
            className="mt-1 w-full h-9 px-2 rounded-lg bg-input border border-border text-sm disabled:opacity-70"
          >
            {canSwitchWarehouse && <option value="ALL">All warehouses</option>}
            {warehouses
              .filter((w) => (w.status ?? "ACTIVE").toUpperCase() === "ACTIVE")
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {w.code} — {w.city}
                </option>
              ))}
          </select>
        </div>

        <nav className="px-3 py-2 flex-1 space-y-1 overflow-y-auto">
          {visibleNav.map(({ to, label, icon: Icon }) => {
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

        {(() => {
          let totalCapacity = 0;
          let totalUsed = 0;

          if (activeWarehouseId) {
            const w = warehouses.find((x) => x.id === activeWarehouseId);
            if (w) {
              totalCapacity = w.capacity || 0;
              totalUsed = w.usedCapacity || 0;
            }
          } else {
            warehouses.forEach((w) => {
              totalCapacity += w.capacity || 0;
              totalUsed += w.usedCapacity || 0;
            });
          }

          const pct = totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0;

          return (
            <div className="m-3 p-4 rounded-xl surface-card">
              <div className="text-xs text-muted-foreground">Capacity used</div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gradient">{pct}%</span>
                <span className="text-xs text-muted-foreground">
                  / {totalCapacity.toLocaleString()} units
                </span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: "var(--gradient-primary)" }}
                />
              </div>
              <div className="mt-1 text-[10px] text-muted-foreground text-right">
                {totalUsed.toLocaleString()} units used
              </div>
            </div>
          );
        })()}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/70 border-b border-border">
          <div className="px-4 md:px-8 h-16 flex items-center gap-2 md:gap-4">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation"
                className="md:hidden size-10 shrink-0 rounded-lg bg-secondary border border-border grid place-items-center hover:bg-muted transition-colors"
              >
                <Menu className="size-5" />
              </button>
              <SheetContent side="left" className="p-0 flex flex-col bg-sidebar">
                <SheetHeader className="p-6 pb-4">
                  <SheetTitle asChild>
                    <Link 
                      to="/" 
                      onClick={() => {
                        setSearchQuery("");
                        setSearchOpen(false);
                        setMobileNavOpen(false);
                      }} 
                      className="flex items-center gap-3 hover:opacity-90 transition-opacity"
                    >
                      <span
                        className="size-10 rounded-xl grid place-items-center glow-ring shrink-0"
                        style={{ background: "var(--gradient-primary)" }}
                      >
                        <Cpu className="size-5 text-primary-foreground" />
                      </span>
                      <span className="text-left">
                        <span className="block text-sm text-foreground">TechStock</span>
                        <span className="block text-[11px] font-normal text-muted-foreground">
                          Computer Warehouse
                        </span>
                      </span>
                    </Link>
                  </SheetTitle>
                </SheetHeader>
                <div className="px-4 pb-3">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground px-1">
                    Active Warehouse
                  </label>
                  <select
                    value={activeWarehouseId ?? "ALL"}
                    onChange={(e) =>
                      setActiveWarehouseId(e.target.value === "ALL" ? null : e.target.value)
                    }
                    disabled={!canSwitchWarehouse}
                    className="mt-1 w-full h-9 px-2 rounded-lg bg-input border border-border text-sm disabled:opacity-70"
                  >
                    {canSwitchWarehouse && <option value="ALL">All warehouses</option>}
                    {warehouses
                      .filter((w) => (w.status ?? "ACTIVE").toUpperCase() === "ACTIVE")
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.code} — {w.city}
                        </option>
                      ))}
                  </select>
                </div>
                <nav className="px-4 py-2 flex-1 space-y-1 overflow-y-auto">
                  {visibleNav.map(({ to, label, icon: Icon }) => {
                    const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
                    return (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setMobileNavOpen(false)}
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
              </SheetContent>
            </Sheet>

            <div className="relative flex-1 min-w-0 max-w-xl mr-auto">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setActiveSearchIndex(0);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                onBlur={() => window.setTimeout(() => setSearchOpen(false), 150)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Find a page..."
                aria-label="Find a page"
                aria-expanded={searchOpen}
                aria-controls={searchListId}
                aria-activedescendant={
                  searchResults[activeSearchIndex]
                    ? `${searchListId}-${activeSearchIndex}`
                    : undefined
                }
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-input border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
              {searchOpen && (
                <div
                  id={searchListId}
                  role="listbox"
                  className="absolute top-full mt-2 left-0 right-0 z-50 rounded-xl surface-card shadow-xl p-2 max-h-80 overflow-y-auto"
                >
                  <div className="px-2 py-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                    {searchQuery.trim() ? "Matching pages" : "Quick navigation"}
                  </div>
                  {searchResults.length ? (
                    searchResults.map((item, index) => {
                      const Icon = item.icon;
                      const highlighted = index === activeSearchIndex;
                      return (
                        <button
                          key={item.to}
                          id={`${searchListId}-${index}`}
                          role="option"
                          aria-selected={highlighted}
                          type="button"
                          onMouseEnter={() => setActiveSearchIndex(index)}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectPage(item.to)}
                          className={`w-full px-2 py-2 rounded-lg flex items-center gap-3 text-left transition-colors ${highlighted ? "bg-secondary" : "hover:bg-secondary"}`}
                        >
                          <Icon className="size-4 text-primary shrink-0" />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">{item.label}</span>
                            <span className="block text-[11px] text-muted-foreground truncate">
                              {item.description}
                            </span>
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-2 py-4 text-sm text-muted-foreground">
                      No matching pages. Try Products, Inbound, or Settings.
                    </div>
                  )}
                </div>
              )}
            </div>

            <span
              className={`hidden lg:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-xs font-medium ${roleTone[currentUser.role]}`}
            >
              <Shield className="size-3" />
              {roleLabels[currentUser.role]}
            </span>

            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="size-10 rounded-lg bg-secondary border border-border grid place-items-center hover:bg-muted transition-colors relative"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>

            <NotificationModal />

            <div className="relative">
              <button
                onClick={() => setRoleOpen((v) => !v)}
                className="flex items-center gap-3 pl-3 border-l border-border h-10 hover:opacity-90"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium leading-tight">{currentUser.name}</div>
                  <div className="text-xs text-muted-foreground leading-tight">
                    {currentUser.title}
                  </div>
                </div>
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt="Avatar"
                    className="size-10 rounded-full object-cover ring-2 ring-border/50"
                  />
                ) : (
                  <div
                    className="size-10 rounded-full grid place-items-center text-sm font-semibold"
                    style={{
                      background: "var(--gradient-primary)",
                      color: "var(--primary-foreground)",
                    }}
                  >
                    {currentUser.initials}
                  </div>
                )}
                <ChevronDown className="size-4 text-muted-foreground" />
              </button>

              {roleOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl surface-card p-2 shadow-xl z-50">
                  <Link
                    to="/profile"
                    onClick={() => setRoleOpen(false)}
                    className="w-full text-left px-2 py-2 rounded-lg flex items-center gap-2 hover:bg-secondary"
                  >
                    <div
                      className="size-8 rounded-full grid place-items-center"
                      style={{
                        background: "color-mix(in oklab, var(--primary) 15%, transparent)",
                        color: "var(--primary)",
                      }}
                    >
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
