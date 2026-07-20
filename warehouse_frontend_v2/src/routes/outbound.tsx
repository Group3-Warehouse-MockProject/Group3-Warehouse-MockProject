import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { orders, products, users, warehouses, formatVND, warehouseCode } from "@/lib/warehouse-data";
import { useApp } from "@/lib/app-context";
import { ClipboardList, TrendingUp, Clock, Truck, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { ModalShell, Field, inputCls, selectCls, textareaCls } from "@/components/modal-shell";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { BarcodeScanner } from "@/components/barcode-scanner";

export const Route = createFileRoute("/outbound")({
  head: () => ({ meta: [{ title: "Outbound Orders — TechStock" }] }),
  component: OutboundPage,
});

const statusTone: Record<string, string> = {
  Pending: "bg-warning/15 text-warning",
  Shipping: "bg-primary/15 text-primary",
  Completed: "bg-success/15 text-success",
  Cancelled: "bg-destructive/15 text-destructive",
};

function OutboundPage() {
  const { activeWarehouseId } = useApp();
  const list = activeWarehouseId ? orders.filter((o) => o.warehouseId === activeWarehouseId) : orders;
  const [page, setPage] = useState(1);
  const limit = 10;
  const totalPages = Math.max(1, Math.ceil(list.length / limit));
  const safePage = Math.min(page, totalPages);
  const paginatedList = list.slice((safePage - 1) * limit, safePage * limit);
  
  const revenue = list.filter((o) => o.status !== "Cancelled").reduce((s, o) => s + o.total, 0);
  const pending = list.filter((o) => o.status === "Pending").length;
  const shipping = list.filter((o) => o.status === "Shipping").length;
  const [open, setOpen] = useState(false);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Outbound Orders</h1>
            <p className="text-sm text-muted-foreground mt-1">B2B & retail orders fulfillment</p>
          </div>
          <button onClick={() => setOpen(true)} className="h-10 px-4 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring" style={{ background: "var(--gradient-primary)" }}>
            <Plus className="size-4" />New order
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={ClipboardList} label="Total orders" value={list.length} tone="primary" />
          <Kpi icon={TrendingUp} label="Revenue" value={formatVND(revenue)} tone="accent" />
          <Kpi icon={Clock} label="Pending" value={pending} tone="warning" />
          <Kpi icon={Truck} label="Shipping" value={shipping} tone="primary" />
        </div>

        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[950px] text-sm">
              {/* Grid Table Header */}
              <div className="grid grid-cols-[100px_minmax(160px,1.5fr)_110px_110px_130px_130px_70px_120px_110px] items-center gap-3 px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40 font-medium border-b border-border/60">
                <div>Order #</div>
                <div>Customer</div>
                <div>Warehouse</div>
                <div>Date</div>
                <div>Created by</div>
                <div>Assigned to</div>
                <div className="text-right">Items</div>
                <div className="text-right">Total</div>
                <div className="text-center">Status</div>
              </div>

              {/* Grid Table Body */}
              <div className="divide-y divide-border/60">
                {paginatedList.map((o) => (
                  <div
                    key={o.id}
                    className="grid grid-cols-[100px_minmax(160px,1.5fr)_110px_110px_130px_130px_70px_120px_110px] items-center gap-3 px-4 py-3.5 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="font-mono text-xs">{o.id}</div>
                    <div className="font-medium truncate">{o.customer}</div>
                    <div className="font-mono text-xs">{warehouseCode(o.warehouseId)}</div>
                    <div className="text-muted-foreground">{o.date}</div>
                    <div className="truncate">{o.createdBy}</div>
                    <div className="truncate">{o.assignedTo}</div>
                    <div className="text-right">{o.items}</div>
                    <div className="text-right font-semibold">{formatVND(o.total)}</div>
                    <div className="text-center">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusTone[o.status]}`}>{o.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
      <AddOrderModal open={open} onClose={() => setOpen(false)} />
    </AppShell>
  );
}

function AddOrderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { activeWarehouseId } = useApp();

  const { data: dynamicWarehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get<any[]>("/warehouses");
      return res.data;
    },
  });

  const activeWarehouses = (dynamicWarehouses || warehouses).filter(
    (w: any) => (w.status ?? "ACTIVE").toUpperCase() === "ACTIVE"
  );

  const [warehouseId, setWarehouseId] = useState<string>(activeWarehouseId ?? activeWarehouses[0]?.id ?? warehouses[0].id);
  const [lines, setLines] = useState<{ sku: string; qty: number }[]>([]);
  
  const total = lines.reduce((s, l) => {
    const p = products.find((x) => x.sku === l.sku);
    return s + (p ? p.price * l.qty : 0);
  }, 0);

  const handleScan = (barcode: string) => {
    const product = products.find(p => p.sku.toLowerCase() === barcode.toLowerCase());
    if (!product) {
      alert(`Barcode ${barcode} not found in catalog.`);
      return;
    }
    if (product.warehouseId !== warehouseId) {
      alert(`Product ${barcode} does not belong to selected warehouse.`);
      return;
    }

    setLines(prev => {
      const existing = prev.find(l => l.sku === product.sku);
      if (existing) return prev.map(l => l.sku === product.sku ? { ...l, qty: l.qty + 1 } : l);
      
      const emptyIdx = prev.findIndex(l => !l.sku);
      if (emptyIdx >= 0) {
        const copy = [...prev];
        copy[emptyIdx] = { ...copy[emptyIdx], sku: product.sku, qty: 1 };
        return copy;
      }
      return [...prev, { sku: product.sku, qty: 1 }];
    });
  };

  const addLine = () => setLines((l) => [...l, { sku: "", qty: 1 }]);
  const removeLine = (i: number) => setLines((l) => l.filter((_, idx) => idx !== i));
  const updateLine = (i: number, patch: Partial<{ sku: string; qty: number }>) =>
    setLines((l) => l.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const handleClose = () => {
    setLines([]);
    onClose();
  };

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      title="New outbound order"
      subtitle="Create a customer sales order"
      icon={<ClipboardList className="size-5" />}
      maxWidth="52rem"
      footer={
        <>
          <div className="mr-auto text-sm">
            <span className="text-muted-foreground">Total: </span>
            <span className="font-bold text-lg">{formatVND(total)}</span>
          </div>
          <button onClick={handleClose} type="button" className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm hover:bg-muted">Cancel</button>
          <button onClick={handleClose} type="button" className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground glow-ring" style={{ background: "var(--gradient-primary)" }}>Create order</button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Customer" required className="sm:col-span-2"><input className={inputCls} placeholder="Customer / company name" /></Field>
        <Field label="Warehouse" required>
          <select className={selectCls} value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
            <option value="" disabled>Select warehouse</option>
            {activeWarehouses.map((w: any) => <option key={w.id} value={w.id}>{w.code} — {w.city}</option>)}
          </select>
        </Field>
        <Field label="Order date" required><input type="date" className={inputCls} defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
        <Field label="Created by" required>
          <select className={selectCls} defaultValue="">
            <option value="" disabled>Select staff</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} — {u.role}</option>)}
          </select>
        </Field>
        <Field label="Assigned to" required>
          <select className={selectCls} defaultValue="">
            <option value="" disabled>Select assignee</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} — {u.role}</option>)}
          </select>
        </Field>
        <Field label="Status" className="sm:col-span-2">
          <select className={selectCls} defaultValue="Pending">
            <option>Pending</option>
            <option>Shipping</option>
            <option>Completed</option>
            <option>Cancelled</option>
          </select>
        </Field>
      </div>

      <div className="mt-6 space-y-4">
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Items</div>
          <BarcodeScanner onScan={handleScan} />
        </div>

        <div className="flex justify-end">
          <button type="button" onClick={addLine} className="text-xs text-primary hover:underline flex items-center gap-1"><Plus className="size-3.5" />Manual entry</button>
        </div>

        <div className="surface-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left p-3">Product</th>
                <th className="text-right p-3 w-24">Qty</th>
                <th className="text-right p-3 w-32">Price</th>
                <th className="text-right p-3 w-36">Subtotal</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((row, i) => {
                const p = products.find((x) => x.sku === row.sku);
                return (
                  <tr key={i} className="border-t border-border/60">
                    <td className="p-2">
                      <select className={selectCls} value={row.sku} onChange={(e) => updateLine(i, { sku: e.target.value })}>
                        <option value="">Select product</option>
                        {products.filter(pr => pr.warehouseId === warehouseId).map((pr) => <option key={pr.sku} value={pr.sku}>{pr.sku} — {pr.name}</option>)}
                      </select>
                    </td>
                    <td className="p-2"><input type="number" min={1} className={inputCls + " text-right"} value={row.qty} onChange={(e) => updateLine(i, { qty: Math.max(1, Number(e.target.value)) })} /></td>
                    <td className="p-3 text-right text-muted-foreground">{p ? formatVND(p.price) : "—"}</td>
                    <td className="p-3 text-right font-semibold">{p ? formatVND(p.price * row.qty) : "—"}</td>
                    <td className="p-2 text-center">
                      <button type="button" onClick={() => removeLine(i)} className="size-8 grid place-items-center rounded-md hover:bg-destructive/15 hover:text-destructive disabled:opacity-30">
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4">
        <Field label="Notes"><textarea className={textareaCls} placeholder="Delivery instructions, PO reference, ..." /></Field>
      </div>
    </ModalShell>
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
