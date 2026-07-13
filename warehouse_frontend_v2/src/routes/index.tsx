import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import {
  weeklyFlow,
  categoryShare,
  movements,
  formatVND,
} from "@/lib/warehouse-data";
import { useApp } from "@/lib/app-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Package, TrendingUp, TrendingDown, AlertTriangle, Boxes, ArrowUpRight } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — TechStock Warehouse" },
      { name: "description", content: "Smart computers & components warehouse management." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { activeWarehouseId } = useApp();
  
  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ["inventory", activeWarehouseId],
    queryFn: async () => {
      const res = await api.get("/inventory", {
        params: activeWarehouseId ? { warehouseIdParam: activeWarehouseId } : {}
      });
      return res.data;
    }
  });

  const { data: warehousesData } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data;
    }
  });
  const warehouses = warehousesData || [];

  const getWarehouseCode = (id: string) => {
    return warehouses.find((w: any) => w.id === id)?.code || id;
  };

  const scopedProducts = inventoryData || [];
    
  const scopedMovements = activeWarehouseId
    ? movements.filter((m) => m.warehouseId === activeWarehouseId)
    : movements;
  const lowStock = scopedProducts.filter((p: any) => p.stock < p.reorder).slice(0, 5);

  const kpis = [
    { label: "Total SKUs", value: scopedProducts.length.toString(), delta: "+3 this week", icon: Package, tone: "primary" },
    { label: "Units in stock", value: scopedProducts.reduce((s: number, p: any) => s + p.stock, 0).toLocaleString(), delta: "+128 units", icon: Boxes, tone: "accent" },
    { label: "Inventory value", value: formatVND(scopedProducts.reduce((s: number, p: any) => s + p.stock * p.cost, 0)), delta: "+2.4%", icon: TrendingUp, tone: "primary" },
    { label: "Low stock", value: scopedProducts.filter((p: any) => p.stock < p.reorder).length.toString(), delta: "Reorder needed", icon: AlertTriangle, tone: "warning" },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Warehouse overview</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Smart computers & components warehouse — {activeWarehouseId ? getWarehouseCode(activeWarehouseId) : "All warehouses"} • Updated Jun 24, 2026
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <div key={k.label} className="surface-card p-5">
              <div className="flex items-start justify-between">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</div>
                <div
                  className="size-9 rounded-lg grid place-items-center"
                  style={{
                    background:
                      k.tone === "warning"
                        ? "color-mix(in oklab, var(--warning) 18%, transparent)"
                        : k.tone === "accent"
                        ? "color-mix(in oklab, var(--accent) 18%, transparent)"
                        : "color-mix(in oklab, var(--primary) 18%, transparent)",
                    color:
                      k.tone === "warning"
                        ? "var(--warning)"
                        : k.tone === "accent"
                        ? "var(--accent)"
                        : "var(--primary)",
                  }}
                >
                  <k.icon className="size-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold">{k.value}</div>
              <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                <ArrowUpRight className="size-3" />
                {k.delta}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="surface-card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Inbound / Outbound flow — last 7 days</h3>
                <p className="text-xs text-muted-foreground">Units per day</p>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary"></span>Inbound</span>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-accent"></span>Outbound</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={weeklyFlow}>
                <defs>
                  <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.16 195)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.78 0.16 195)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.18 155)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.72 0.18 155)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(0.3 0.025 252)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" stroke="oklch(0.68 0.02 250)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0.02 250)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--background)", border: "1px solid oklch(0.3 0.025 252)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="in" stroke="oklch(0.78 0.16 195)" fill="url(#gIn)" strokeWidth={2} />
                <Area type="monotone" dataKey="out" stroke="oklch(0.72 0.18 155)" fill="url(#gOut)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="surface-card p-5">
            <h3 className="font-semibold">Stock by category</h3>
            <p className="text-xs text-muted-foreground">Units in stock</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={categoryShare} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid stroke="oklch(0.3 0.025 252)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" stroke="oklch(0.68 0.02 250)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" stroke="oklch(0.68 0.02 250)" fontSize={12} tickLine={false} axisLine={false} width={70} />
                <Tooltip contentStyle={{ background: "var(--background)", border: "1px solid oklch(0.3 0.025 252)", borderRadius: 8 }} />
                <Bar dataKey="value" fill="oklch(0.78 0.16 195)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="surface-card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Recent activity</h3>
              <button className="text-xs text-primary hover:underline">View all →</button>
            </div>
            <div className="space-y-3">
              {scopedMovements.slice(0, 6).map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/40 border border-border/60">
                  <div
                    className={`size-9 rounded-lg grid place-items-center ${
                      m.type === "Inbound" ? "text-primary" : "text-accent"
                    }`}
                    style={{
                      background:
                        m.type === "Inbound"
                          ? "color-mix(in oklab, var(--primary) 15%, transparent)"
                          : "color-mix(in oklab, var(--accent) 15%, transparent)",
                    }}
                  >
                    {m.type === "Inbound" ? <TrendingDown className="size-4" /> : <TrendingUp className="size-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{m.product}</div>
                    <div className="text-xs text-muted-foreground">{m.partner} • {m.staff} • {getWarehouseCode(m.warehouseId)}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-semibold ${m.type === "Inbound" ? "text-primary" : "text-accent"}`}>
                      {m.type === "Inbound" ? "+" : "−"}{m.qty}
                    </div>
                    <div className="text-xs text-muted-foreground">{m.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Low stock alerts</h3>
                <p className="text-xs text-muted-foreground">Below reorder threshold</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-md bg-warning/15 text-warning font-medium">{lowStock.length}</span>
            </div>
            <div className="space-y-3">
              {lowStock.map((p: any) => (
                <div key={p.sku} className="p-3 rounded-lg border border-border/60">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{p.sku}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-warning">{p.stock}</div>
                      <div className="text-[10px] text-muted-foreground">/ {p.reorder}</div>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-warning rounded-full" style={{ width: `${Math.min(100, (p.stock / p.reorder) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
