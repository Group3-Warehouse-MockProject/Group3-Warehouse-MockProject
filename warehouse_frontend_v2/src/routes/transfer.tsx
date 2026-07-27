import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { ArrowRightLeft, MapPin, Search, Plus, Trash2, ChevronLeft, ChevronRight, CheckCircle2, Truck } from "lucide-react";
import { ModalShell, Field, inputCls, selectCls, textareaCls } from "@/components/modal-shell";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarcodeScanner } from "@/components/barcode-scanner";

export const Route = createFileRoute("/transfer")({
  head: () => ({ meta: [{ title: "Transfers - TechStock" }] }),
  component: TransferPage,
});

type TransferLine = {
  sku: string;
  productName: string;
  quantity: number;
};

type Transfer = {
  id: number;
  code: string;
  type: "Cross-Warehouse" | "Internal Movement";
  status: "Pending" | "InTransit" | "Completed" | "Cancelled";
  remark?: string;
  date: string;
  sourceWarehouseId: number;
  sourceWarehouseCode: string;
  sourceWarehouseName: string;
  destinationWarehouseId?: number | null;
  destinationWarehouseCode?: string;
  destinationWarehouseName?: string;
  createdBy: string;
  assignedBy?: string;
  totalQuantity: number;
  lines: TransferLine[];
};

const statusTone: Record<Transfer["status"], string> = {
  Pending: "bg-warning/15 text-warning",
  InTransit: "bg-primary/15 text-primary",
  Completed: "bg-success/15 text-success",
  Cancelled: "bg-destructive/15 text-destructive",
};

function TransferPage() {
  const { activeWarehouseId } = useApp();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0); // 0-based server page
  const [q, setQ] = useState("");
  const limit = 15;

  // Reset to page 0 when warehouse or search changes
  useEffect(() => { setPage(0); }, [activeWarehouseId, q]);

  const { data: pageData, isLoading, error } = useQuery({
    queryKey: ["transfers", activeWarehouseId, page],
    queryFn: async () => {
      const res = await api.get("/transfers", {
        params: {
          ...(activeWarehouseId ? { warehouseIdParam: activeWarehouseId } : {}),
          page,
          size: limit, // Backend sends exactly 'limit' records per page
        },
      });
      return res.data as {
        content: Transfer[];
        totalPages: number;
        totalElements: number;
        last: boolean;
      };
    },
  });

  const transfers = pageData?.content ?? [];
  const totalPages = pageData?.totalPages ?? 1;
  const totalElements = pageData?.totalElements ?? 0;

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: Transfer["status"] }) => {
      const res = await api.put(`/transfers/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.message || "Could not update transfer status.");
    },
  });

  // Client-side search on current page data
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return transfers;
    return transfers.filter((t) =>
      [
        t.code,
        t.type,
        t.status,
        t.sourceWarehouseCode,
        t.destinationWarehouseCode,
        t.createdBy,
        t.assignedBy,
        t.remark,
        ...(t.lines || []).flatMap((line) => [line.sku, line.productName]),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [q, transfers]);

  const pending      = transfers.filter((t) => t.status === "Pending").length;
  const inTransit    = transfers.filter((t) => t.status === "InTransit").length;
  const crossWarehouse = transfers.filter((t) => t.type === "Cross-Warehouse").length;
  const internal     = transfers.filter((t) => t.type === "Internal Movement").length;

  if (isLoading) return <AppShell><div className="p-8">Loading transfers...</div></AppShell>;
  if (error) return <AppShell><div className="p-8 text-destructive">Error loading transfers</div></AppShell>;

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
          <Kpi icon={ArrowRightLeft} label="Total transfers" value={list.length} tone="primary" />
          <Kpi icon={Search} label="Pending" value={pending} tone="warning" />
          <Kpi icon={Truck} label="In transit" value={inTransit} tone="primary" />
          <Kpi icon={MapPin} label="Cross / Internal" value={`${crossWarehouse} / ${internal}`} tone="accent" />
        </div>

        <div className="relative max-w-md w-full sm:w-96">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search transfer, SKU, warehouse..."
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-input border border-border text-sm"
          />
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
                  <th className="text-right p-4">Qty</th>
                  <th className="text-left p-4">Created by</th>
                  <th className="text-center p-4">Status</th>
                  <th className="text-right p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((t) => (
                  <tr key={t.id} className="border-t border-border/60 hover:bg-secondary/30 transition-colors align-top">
                    <td className="p-4">
                      <div className="font-mono text-xs">{t.code}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">{t.lines?.length || 0} SKU(s)</div>
                    </td>
                    <td className="p-4 font-medium">{t.type}</td>
                    <td className="p-4">
                      <div className="font-mono text-xs">{t.sourceWarehouseCode}</div>
                      <div className="text-[11px] text-muted-foreground">{t.sourceWarehouseName}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-mono text-xs">{t.destinationWarehouseCode || "Internal"}</div>
                      <div className="text-[11px] text-muted-foreground">{t.destinationWarehouseName || t.remark || "Same warehouse"}</div>
                    </td>
                    <td className="p-4 text-muted-foreground">{t.date}</td>
                    <td className="p-4 text-right font-semibold">{t.totalQuantity}</td>
                    <td className="p-4">
                      <div>{t.createdBy}</div>
                      {t.assignedBy && <div className="text-[11px] text-muted-foreground">Assigned: {t.assignedBy}</div>}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusTone[t.status]}`}>{t.status}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        {t.status === "Pending" && (
                          <button
                            onClick={() => statusMutation.mutate({ id: t.id, status: "InTransit" })}
                            disabled={statusMutation.isPending}
                            className="h-8 px-2 rounded-md bg-secondary border border-border text-xs hover:bg-muted inline-flex items-center gap-1"
                          >
                            <Truck className="size-3.5" />Dispatch
                          </button>
                        )}
                        {(t.status === "Pending" || t.status === "InTransit") && (
                          <button
                            onClick={() => statusMutation.mutate({ id: t.id, status: "Completed" })}
                            disabled={statusMutation.isPending}
                            className="h-8 px-2 rounded-md bg-success/15 text-success text-xs hover:bg-success/20 inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="size-3.5" />Complete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground text-sm">
                      No transfers match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border/60 text-sm">
              <div className="text-muted-foreground text-xs">
                Showing {page * limit + 1}-{Math.min((page + 1) * limit, totalElements)} of {totalElements} entries
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="size-8 grid place-items-center rounded-md border border-border bg-secondary hover:bg-muted disabled:opacity-40">
                  <ChevronLeft className="size-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i).map((n) => (
                  <button key={n} onClick={() => setPage(n)} className={`size-8 rounded-md text-xs font-medium ${n === page ? "bg-primary text-primary-foreground" : "bg-secondary border border-border hover:bg-muted"}`}>
                    {n + 1}
                  </button>
                ))}
                <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="size-8 grid place-items-center rounded-md border border-border bg-secondary hover:bg-muted disabled:opacity-40">
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
  const { activeWarehouseId, canSwitchWarehouse } = useApp();
  const queryClient = useQueryClient();
  const [type, setType] = useState<"cross" | "internal">("cross");
  const [sourceWarehouse, setSourceWarehouse] = useState<string>(activeWarehouseId ?? "");
  const [destWarehouse, setDestWarehouse] = useState<string>("");
  const [assignedById, setAssignedById] = useState<string>("");
  const [sourceZone, setSourceZone] = useState<string>("");
  const [destZone, setDestZone] = useState<string>("");
  const [remark, setRemark] = useState("");
  const [lines, setLines] = useState<{ sku: string; qty: number }[]>([]);

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => (await api.get("/warehouses")).data,
    enabled: open,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get("/users")).data,
    enabled: open,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", sourceWarehouse, "transfer-selector"],
    queryFn: async () => {
      const res = await api.get("/products", {
        params: {
          ...(sourceWarehouse ? { warehouseIdParam: sourceWarehouse } : {}),
          page: 0,
          size: 100,
        },
      });
      return (res.data as any)?.content ?? [];
    },
    enabled: open && Boolean(sourceWarehouse),
  });

  const activeWarehouses = warehouses.filter(
    (w: any) => (w.status ?? "ACTIVE").toUpperCase() === "ACTIVE"
  );

  useEffect(() => {
    if (!open) return;
    const defaultWarehouse = activeWarehouseId ?? warehouses[0]?.id ?? "";
    setSourceWarehouse(String(defaultWarehouse));
  }, [activeWarehouseId, open, warehouses]);

  const availableProducts = products.filter((p: any) => String(p.warehouseId) === String(sourceWarehouse) && p.stock > 0);

  const createMutation = useMutation({
    mutationFn: async () => {
      const cleanLines = lines.filter((line) => line.sku && line.qty > 0);
      if (!sourceWarehouse) throw new Error("Select a source warehouse.");
      if (type === "cross" && !destWarehouse) throw new Error("Select a destination warehouse.");
      if (type === "internal" && (!sourceZone || !destZone)) throw new Error("Enter source and destination locations.");
      if (cleanLines.length === 0) throw new Error("Add at least one product.");

      const payload = {
        type,
        sourceWarehouseId: Number(sourceWarehouse),
        destinationWarehouseId: type === "cross" ? Number(destWarehouse) : null,
        assignedById: assignedById ? Number(assignedById) : null,
        sourceLocation: type === "internal" ? sourceZone : null,
        destinationLocation: type === "internal" ? destZone : null,
        remark,
        lines: cleanLines.map((line) => ({ sku: line.sku, quantity: Number(line.qty) })),
      };
      const res = await api.post("/transfers", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      handleClose();
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || err.message || "Could not create transfer.");
    },
  });

  const handleScan = (barcode: string) => {
    const product = availableProducts.find((p: any) => p.sku.toLowerCase() === barcode.toLowerCase());
    if (!product) {
      alert(`Barcode ${barcode} not found in source warehouse stock.`);
      return;
    }

    setLines((prev) => {
      const existing = prev.find((l) => l.sku === product.sku);
      if (existing) return prev.map((l) => l.sku === product.sku ? { ...l, qty: l.qty + 1 } : l);
      const emptyIdx = prev.findIndex((l) => !l.sku);
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
    setDestWarehouse("");
    setAssignedById("");
    setSourceZone("");
    setDestZone("");
    setRemark("");
    setLines([]);
    onClose();
  };

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
          <button onClick={handleClose} type="button" disabled={createMutation.isPending} className="h-10 px-4 ml-auto rounded-lg bg-secondary border border-border text-sm hover:bg-muted">Cancel</button>
          <button onClick={() => createMutation.mutate()} type="button" disabled={createMutation.isPending} className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground glow-ring" style={{ background: "var(--gradient-primary)" }}>
            {createMutation.isPending ? "Creating..." : "Confirm Transfer"}
          </button>
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
              <select className={selectCls} value={sourceWarehouse} disabled={!canSwitchWarehouse} onChange={(e) => { setSourceWarehouse(e.target.value); setLines([]); }}>
                <option value="" disabled>Select source</option>
                {activeWarehouses.map((w: any) => <option key={w.id} value={w.id}>{w.code} — {w.city}</option>)}
              </select>
            </Field>
            <Field label="Destination Warehouse" required>
              <select className={selectCls} value={destWarehouse} onChange={(e) => setDestWarehouse(e.target.value)}>
                <option value="" disabled>Select destination</option>
                {activeWarehouses.filter((w: any) => String(w.id) !== String(sourceWarehouse)).map((w: any) => <option key={w.id} value={w.id}>{w.code} — {w.city}</option>)}
              </select>
            </Field>
          </>
        ) : (
          <>
            <Field label="Warehouse" required className="sm:col-span-2">
              <select className={selectCls} value={sourceWarehouse} disabled={!canSwitchWarehouse} onChange={(e) => { setSourceWarehouse(e.target.value); setLines([]); }}>
                <option value="" disabled>Select warehouse</option>
                {activeWarehouses.map((w: any) => <option key={w.id} value={w.id}>{w.code} — {w.city}</option>)}
              </select>
            </Field>
            <Field label="Source Location" required>
              <input className={inputCls} placeholder="e.g. Zone A - Rack 1 - Bin 2" value={sourceZone} onChange={(e) => setSourceZone(e.target.value)} />
            </Field>
            <Field label="Destination Location" required>
              <input className={inputCls} placeholder="e.g. Zone B - Rack 3 - Bin 1" value={destZone} onChange={(e) => setDestZone(e.target.value)} />
            </Field>
          </>
        )}
        <Field label="Date" required><input type="date" className={inputCls} value={new Date().toISOString().slice(0, 10)} readOnly /></Field>
        <Field label="Assigned manager">
          <select className={selectCls} value={assignedById} onChange={(e) => setAssignedById(e.target.value)}>
            <option value="">No assignee</option>
            {users.map((u: any) => <option key={u.id} value={u.id}>{u.fullName} - {u.role}</option>)}
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
                const selected = availableProducts.find((p: any) => p.sku === row.sku);
                const max = selected?.stock ?? undefined;
                return (
                  <tr key={i} className="border-t border-border/60">
                    <td className="p-2">
                      <select className={selectCls} value={row.sku} onChange={(e) => updateLine(i, { sku: e.target.value })}>
                        <option value="">Select product</option>
                        {availableProducts.map((pr: any) => <option key={`${pr.sku}-${pr.warehouseId}`} value={pr.sku}>{pr.sku} - {pr.name} ({pr.stock} available)</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        min={1}
                        max={max}
                        className={inputCls + " text-right"}
                        value={row.qty}
                        onChange={(e) => updateLine(i, { qty: Math.max(1, Number(e.target.value)) })}
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button type="button" onClick={() => removeLine(i)} className="size-8 grid place-items-center rounded-md hover:bg-destructive/15 hover:text-destructive disabled:opacity-30">
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-sm text-muted-foreground">Add products by scanner or manual entry.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4">
        <Field label="Notes"><textarea className={textareaCls} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Reason for transfer, handling instructions..." /></Field>
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