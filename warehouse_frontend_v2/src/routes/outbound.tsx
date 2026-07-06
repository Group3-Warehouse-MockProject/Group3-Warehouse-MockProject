import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ReceiptModal } from "@/components/receipt-modal";
import { movements, warehouseCode } from "@/lib/warehouse-data";
import { useApp } from "@/lib/app-context";
import { ArrowUpFromLine, Plus } from "lucide-react";

export const Route = createFileRoute("/outbound")({
  head: () => ({ meta: [{ title: "Outbound — TechStock" }] }),
  component: OutboundPage,
});

function OutboundPage() {
  const { activeWarehouseId } = useApp();
  const [open, setOpen] = useState(false);
  const list = movements
    .filter((m) => m.type === "Outbound")
    .filter((m) => !activeWarehouseId || m.warehouseId === activeWarehouseId);
  const totalOut = list.reduce((s, m) => s + m.qty, 0);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Outbound</h1>
            <p className="text-sm text-muted-foreground mt-1">Goods shipped to customers</p>
          </div>
          <button onClick={() => setOpen(true)} className="h-10 px-4 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring" style={{ background: "var(--gradient-primary)" }}>
            <Plus className="size-4" />New outbound order
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="surface-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Units shipped</div>
            <div className="mt-2 flex items-center gap-3">
              <div className="size-10 rounded-lg grid place-items-center text-accent" style={{ background: "color-mix(in oklab, var(--accent) 15%, transparent)" }}>
                <ArrowUpFromLine className="size-5" />
              </div>
              <div className="text-3xl font-bold">{totalOut}</div>
            </div>
          </div>
          <div className="surface-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Shipments</div>
            <div className="mt-2 text-3xl font-bold">{list.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Last 7 days</div>
          </div>
          <div className="surface-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Customers</div>
            <div className="mt-2 text-3xl font-bold">{new Set(list.map((m) => m.partner)).size}</div>
            <div className="text-xs text-muted-foreground mt-1">Active this week</div>
          </div>
        </div>

        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40">
                <tr>
                  <th className="text-left p-4">Shipment #</th>
                  <th className="text-left p-4">Date</th>
                  <th className="text-left p-4">Product</th>
                  <th className="text-left p-4">Customer</th>
                  <th className="text-left p-4">Warehouse</th>
                  <th className="text-right p-4">Qty</th>
                  <th className="text-left p-4">Shipped by</th>
                </tr>
              </thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id} className="border-t border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="p-4 font-mono text-xs">{m.id}</td>
                    <td className="p-4 text-muted-foreground">{m.date}</td>
                    <td className="p-4">
                      <div className="font-medium">{m.product}</div>
                      <div className="text-xs text-muted-foreground font-mono">{m.sku}</div>
                    </td>
                    <td className="p-4">{m.partner}</td>
                    <td className="p-4 font-mono text-xs">{warehouseCode(m.warehouseId)}</td>
                    <td className="p-4 text-right font-semibold text-accent">−{m.qty}</td>
                    <td className="p-4 text-muted-foreground">{m.staff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <ReceiptModal open={open} onClose={() => setOpen(false)} type="Outbound" />
    </AppShell>
  );
}
