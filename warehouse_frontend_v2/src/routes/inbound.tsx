import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ReceiptModal } from "@/components/receipt-modal";
import { movements, warehouseCode } from "@/lib/warehouse-data";
import { useApp } from "@/lib/app-context";
import { ArrowDownToLine, Plus, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/inbound")({
  head: () => ({ meta: [{ title: "Inbound — TechStock" }] }),
  component: InboundPage,
});

function InboundPage() {
  const { activeWarehouseId } = useApp();
  const [open, setOpen] = useState(false);
  const list = movements
    .filter((m) => m.type === "Inbound")
    .filter((m) => !activeWarehouseId || m.warehouseId === activeWarehouseId);
  
  const [page, setPage] = useState(1);
  const limit = 15;
  const totalPages = Math.max(1, Math.ceil(list.length / limit));
  const safePage = Math.min(page, totalPages);
  const paginatedList = list.slice((safePage - 1) * limit, safePage * limit);

  const totalIn = list.reduce((s, m) => s + m.qty, 0);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Inbound</h1>
            <p className="text-sm text-muted-foreground mt-1">Goods received from suppliers</p>
          </div>
          <button onClick={() => setOpen(true)} className="h-10 px-4 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring" style={{ background: "var(--gradient-primary)" }}>
            <Plus className="size-4" />New inbound receipt
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="surface-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Units received</div>
            <div className="mt-2 flex items-center gap-3">
              <div className="size-10 rounded-lg grid place-items-center text-primary" style={{ background: "color-mix(in oklab, var(--primary) 15%, transparent)" }}>
                <ArrowDownToLine className="size-5" />
              </div>
              <div className="text-3xl font-bold">{totalIn}</div>
            </div>
          </div>
          <div className="surface-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Receipts</div>
            <div className="mt-2 text-3xl font-bold">{list.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Last 7 days</div>
          </div>
          <div className="surface-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Suppliers</div>
            <div className="mt-2 text-3xl font-bold">{new Set(list.map((m) => m.partner)).size}</div>
            <div className="text-xs text-muted-foreground mt-1">Active this week</div>
          </div>
        </div>

        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40">
                <tr>
                  <th className="text-left p-4">Receipt #</th>
                  <th className="text-left p-4">Date</th>
                  <th className="text-left p-4">Product</th>
                  <th className="text-left p-4">Supplier</th>
                  <th className="text-left p-4">Warehouse</th>
                  <th className="text-right p-4">Qty</th>
                  <th className="text-left p-4">Received by</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.map((m) => (
                  <tr key={m.id} className="border-t border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="p-4 font-mono text-xs">{m.id}</td>
                    <td className="p-4 text-muted-foreground">{m.date}</td>
                    <td className="p-4">
                      <div className="font-medium">{m.product}</div>
                      <div className="text-xs text-muted-foreground font-mono">{m.sku}</div>
                    </td>
                    <td className="p-4">{m.partner}</td>
                    <td className="p-4 font-mono text-xs">{warehouseCode(m.warehouseId)}</td>
                    <td className="p-4 text-right font-semibold text-primary">+{m.qty}</td>
                    <td className="p-4 text-muted-foreground">{m.staff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border/60 text-sm">
              <div className="text-muted-foreground text-xs">
                Showing {(safePage - 1) * limit + 1}–{Math.min(safePage * limit, list.length)} of {list.length} entries
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="size-8 grid place-items-center rounded-md border border-border bg-secondary hover:bg-muted disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`size-8 rounded-md text-xs font-medium ${
                      n === safePage
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary border border-border hover:bg-muted"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="size-8 grid place-items-center rounded-md border border-border bg-secondary hover:bg-muted disabled:opacity-40"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <ReceiptModal open={open} onClose={() => setOpen(false)} type="Inbound" />
    </AppShell>
  );
}
