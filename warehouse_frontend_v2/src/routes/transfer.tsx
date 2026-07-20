import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { products, users, warehouses, warehouseCode } from "@/lib/warehouse-data";
import { useApp } from "@/lib/app-context";
import { ArrowRightLeft, MapPin, Search, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { ModalShell, Field, inputCls, selectCls, textareaCls } from "@/components/modal-shell";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { BarcodeScanner } from "@/components/barcode-scanner";

export const Route = createFileRoute("/transfer")({
  head: () => ({ meta: [{ title: "Transfers — TechStock" }] }),
  component: TransferPage,
});

const statusTone: Record<string, string> = {
  Pending: "bg-warning/15 text-warning",
  InTransit: "bg-primary/15 text-primary",
  Completed: "bg-success/15 text-success",
  Cancelled: "bg-destructive/15 text-destructive",
};

// Mock transfers
const mockTransfers = [
  {
    id: "TRF-2026-001",
    type: "Cross-Warehouse",
    from: "W01",
    to: "W02",
    date: "2026-07-14",
    items: 45,
    status: "Completed",
    createdBy: "Admin User"
  },
  {
    id: "TRF-2026-002",
    type: "Internal Movement",
    from: "Zone A - Rack 1",
    to: "Zone C - Rack 4",
    date: "2026-07-14",
    items: 120,
    status: "Pending",
    createdBy: "Staff User"
  }
];

function TransferPage() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 15;
  const totalPages = Math.max(1, Math.ceil(mockTransfers.length / limit));
  const safePage = Math.min(page, totalPages);
  const paginatedList = mockTransfers.slice((safePage - 1) * limit, safePage * limit);

  const pending = mockTransfers.filter(t => t.status === "Pending").length;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Transfers</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage cross-warehouse and internal movements</p>
          </div>
          <button onClick={() => setOpen(true)} className="h-10 px-4 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring" style={{ background: "var(--gradient-primary)" }}>
            <Plus className="size-4" />New transfer
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={ArrowRightLeft} label="Total Transfers" value={mockTransfers.length} tone="primary" />
          <Kpi icon={Search} label="Pending" value={pending} tone="warning" />
          <Kpi icon={MapPin} label="Cross-Warehouse" value={mockTransfers.filter(t => t.type === "Cross-Warehouse").length} tone="accent" />
          <Kpi icon={MapPin} label="Internal" value={mockTransfers.filter(t => t.type === "Internal Movement").length} tone="primary" />
        </div>

        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40">
                <tr>
                  <th className="text-left p-4">Transfer #</th>
                  <th className="text-left p-4">Type</th>
                  <th className="text-left p-4">From</th>
                  <th className="text-left p-4">To</th>
                  <th className="text-left p-4">Date</th>
                  <th className="text-right p-4">Items Qty</th>
                  <th className="text-left p-4">Created by</th>
                  <th className="text-center p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.map((t) => (
                  <tr key={t.id} className="border-t border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="p-4 font-mono text-xs">{t.id}</td>
                    <td className="p-4 font-medium">{t.type}</td>
                    <td className="p-4 font-mono text-xs">{t.from}</td>
                    <td className="p-4 font-mono text-xs">{t.to}</td>
                    <td className="p-4 text-muted-foreground">{t.date}</td>
                    <td className="p-4 text-right font-semibold">{t.items}</td>
                    <td className="p-4">{t.createdBy}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusTone[t.status]}`}>{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border/60 text-sm">
              <div className="text-muted-foreground text-xs">
                Showing {(safePage - 1) * limit + 1}–{Math.min(safePage * limit, mockTransfers.length)} of {mockTransfers.length} entries
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
      <AddTransferModal open={open} onClose={() => setOpen(false)} />
    </AppShell>
  );
}

function AddTransferModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { activeWarehouseId } = useApp();
  const [type, setType] = useState<"cross" | "internal">("cross");
  
  const [sourceWarehouse, setSourceWarehouse] = useState<string>(activeWarehouseId ?? warehouses[0].id);
  const [destWarehouse, setDestWarehouse] = useState<string>("");

  const [sourceZone, setSourceZone] = useState<string>("");
  const [destZone, setDestZone] = useState<string>("");

  const [lines, setLines] = useState<{ sku: string; qty: number }[]>([]);

  const handleScan = (barcode: string) => {
    const product = products.find(p => p.sku.toLowerCase() === barcode.toLowerCase());
    if (!product) {
      alert(`Barcode ${barcode} not found in catalog.`);
      return;
    }
    
    // For cross warehouse, ensure it exists in source
    if (type === "cross" && product.warehouseId !== sourceWarehouse) {
      alert(`Product ${barcode} does not belong to source warehouse.`);
      return;
    }

    // For internal, ensure it exists in selected warehouse
    if (type === "internal" && product.warehouseId !== sourceWarehouse) {
      alert(`Product ${barcode} does not belong to the selected warehouse.`);
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

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      title="New Transfer"
      subtitle="Record internal product movements"
      icon={<ArrowRightLeft className="size-5" />}
      maxWidth="52rem"
      footer={
        <>
          <button onClick={handleClose} type="button" className="h-10 px-4 ml-auto rounded-lg bg-secondary border border-border text-sm hover:bg-muted">Cancel</button>
          <button onClick={handleClose} type="button" className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground glow-ring" style={{ background: "var(--gradient-primary)" }}>Confirm Transfer</button>
        </>
      }
    >
      <div className="flex gap-4 mb-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" checked={type === "cross"} onChange={() => setType("cross")} className="accent-primary" />
          <span className="text-sm font-medium">Cross-Warehouse</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="radio" checked={type === "internal"} onChange={() => setType("internal")} className="accent-primary" />
          <span className="text-sm font-medium">Internal Movement</span>
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {type === "cross" ? (
          <>
            <Field label="Source Warehouse" required>
              <select className={selectCls} value={sourceWarehouse} onChange={e => setSourceWarehouse(e.target.value)}>
                {activeWarehouses.map((w: any) => <option key={w.id} value={w.id}>{w.code} — {w.city}</option>)}
              </select>
            </Field>
            <Field label="Destination Warehouse" required>
              <select className={selectCls} value={destWarehouse} onChange={e => setDestWarehouse(e.target.value)}>
                <option value="" disabled>Select destination</option>
                {activeWarehouses.filter((w: any) => String(w.id) !== String(sourceWarehouse)).map((w: any) => <option key={w.id} value={w.id}>{w.code} — {w.city}</option>)}
              </select>
            </Field>
          </>
        ) : (
          <>
            <Field label="Warehouse" required className="sm:col-span-2">
              <select className={selectCls} value={sourceWarehouse} onChange={e => setSourceWarehouse(e.target.value)}>
                {activeWarehouses.map((w: any) => <option key={w.id} value={w.id}>{w.code} — {w.city}</option>)}
              </select>
            </Field>
            <Field label="Source Location" required>
              <input className={inputCls} placeholder="e.g. Zone A - Rack 1 - Bin 2" value={sourceZone} onChange={e => setSourceZone(e.target.value)} />
            </Field>
            <Field label="Destination Location" required>
              <input className={inputCls} placeholder="e.g. Zone B - Rack 3 - Bin 1" value={destZone} onChange={e => setDestZone(e.target.value)} />
            </Field>
          </>
        )}
        <Field label="Date" required><input type="date" className={inputCls} defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
        <Field label="Created by" required>
          <select className={selectCls} defaultValue="">
            <option value="" disabled>Select staff</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} — {u.role}</option>)}
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
                <th className="text-right p-3 w-32">Qty</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((row, i) => {
                return (
                  <tr key={i} className="border-t border-border/60">
                    <td className="p-2">
                      <select className={selectCls} value={row.sku} onChange={(e) => updateLine(i, { sku: e.target.value })}>
                        <option value="">Select product</option>
                        {products.filter(pr => pr.warehouseId === sourceWarehouse).map((pr) => <option key={pr.sku} value={pr.sku}>{pr.sku} — {pr.name}</option>)}
                      </select>
                    </td>
                    <td className="p-2"><input type="number" min={1} className={inputCls + " text-right"} value={row.qty} onChange={(e) => updateLine(i, { qty: Math.max(1, Number(e.target.value)) })} /></td>
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
        <Field label="Notes"><textarea className={textareaCls} placeholder="Reason for transfer, handling instructions..." /></Field>
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
