import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { products, formatVND, warehouseCode } from "@/lib/warehouse-data";
import { useApp } from "@/lib/app-context";
import { Filter, Plus, Download } from "lucide-react";

export const Route = createFileRoute("/products")({
  head: () => ({ meta: [{ title: "Products — TechStock" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  const { activeWarehouseId } = useApp();
  const list = activeWarehouseId ? products.filter((p) => p.warehouseId === activeWarehouseId) : products;
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
                {list.map((p) => {
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
