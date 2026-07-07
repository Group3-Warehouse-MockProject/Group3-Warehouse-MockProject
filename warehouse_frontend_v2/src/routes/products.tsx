import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { formatVND, warehouseCode } from "@/lib/warehouse-data";
import { useApp } from "@/lib/app-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Filter, Plus, Download, Package, Boxes, AlertTriangle, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/products")({
  head: () => ({ meta: [{ title: "Products — TechStock" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  const { activeWarehouseId } = useApp();
  
  const { data: inventoryData, isLoading, error } = useQuery({
    queryKey: ["inventory", activeWarehouseId],
    queryFn: async () => {
      const res = await api.get("/inventory", {
        params: activeWarehouseId ? { warehouseIdParam: activeWarehouseId } : {}
      });
      return res.data;
    }
  });

  const list = inventoryData || [];
  
  const units = list.reduce((s: number, p: any) => s + p.stock, 0);
  const low = list.filter((p: any) => p.stock < p.reorder).length;
  const value = list.reduce((s: number, p: any) => s + p.stock * p.cost, 0);

  if (isLoading) return <AppShell><div className="p-8">Loading data...</div></AppShell>;
  if (error) return <AppShell><div className="p-8 text-destructive">Error loading data</div></AppShell>;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Products</h1>
            <p className="text-sm text-muted-foreground mt-1">{list.length} SKUs in scope</p>
          </div>
          <div className="flex gap-2">
            <button className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm flex items-center gap-2 hover:bg-muted"><Filter className="size-4" />Filter</button>
            <button className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm flex items-center gap-2 hover:bg-muted"><Download className="size-4" />Export</button>
            <button className="h-10 px-4 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring" style={{ background: "var(--gradient-primary)" }}>
              <Plus className="size-4" />Add SKU
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={Package} label="Total SKUs" value={list.length} tone="primary" />
          <Kpi icon={Boxes} label="Units in stock" value={units.toLocaleString()} tone="accent" />
          <Kpi icon={TrendingUp} label="Inventory value" value={formatVND(value)} tone="primary" />
          <Kpi icon={AlertTriangle} label="Low stock" value={low} tone="warning" />
        </div>

        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40">
                <tr>
                  <th className="text-left p-4">SKU</th>
                  <th className="text-left p-4">Product</th>
                  <th className="text-left p-4">Category</th>
                  <th className="text-left p-4">Warehouse</th>
                  <th className="text-left p-4">Location</th>
                  <th className="text-right p-4">Stock</th>
                  <th className="text-right p-4">Price</th>
                  <th className="text-center p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p: any) => {
                  const low = p.stock < p.reorder;
                  const out = p.stock === 0;
                  return (
                    <tr key={p.sku} className="border-t border-border/60 hover:bg-secondary/30 transition-colors">
                      <td className="p-4 font-mono text-xs text-muted-foreground">{p.sku}</td>
                      <td className="p-4">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.brand}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded-md text-xs bg-secondary border border-border">{p.category}</span>
                      </td>
                      <td className="p-4 font-mono text-xs">{warehouseCode(p.warehouseId)}</td>
                      <td className="p-4 font-mono text-xs">{p.location}</td>
                      <td className="p-4 text-right font-semibold">{p.stock}</td>
                      <td className="p-4 text-right">{formatVND(p.price)}</td>
                      <td className="p-4 text-center">
                        {out ? (
                          <span className="px-2 py-1 rounded-md text-xs bg-destructive/15 text-destructive">Out</span>
                        ) : low ? (
                          <span className="px-2 py-1 rounded-md text-xs bg-warning/15 text-warning">Low</span>
                        ) : (
                          <span className="px-2 py-1 rounded-md text-xs bg-success/15 text-success">In stock</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: number | string; tone: "primary" | "accent" | "warning" }) {
  const color = tone === "warning" ? "var(--warning)" : tone === "accent" ? "var(--accent)" : "var(--primary)";
  return (
    <div className="surface-card p-5">
      <div className="flex items-start justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="size-9 rounded-lg grid place-items-center" style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}>
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
    </div>
  );
}
