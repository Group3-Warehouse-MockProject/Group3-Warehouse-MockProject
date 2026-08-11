import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { api, getErrorMessage } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { ArrowRightLeft, MapPin, Search, Plus, Trash2, ChevronLeft, ChevronRight, CheckCircle2, Truck, XCircle, Pencil, History, Clock } from "lucide-react";
import { ModalShell, Field, inputCls, selectCls, textareaCls } from "@/components/modal-shell";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { toast } from "sonner";

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
  assignedById?: number | null;
  assignedBy?: string;
  sourceLocationId?: number | null;
  destinationLocationId?: number | null;
  totalQuantity: number;
  lines: TransferLine[];
};

type ApprovalHistory = {
  id: number;
  oldStatus?: string | null;
  newStatus: string;
  note?: string | null;
  approverName?: string | null;
  createdAt?: string | null;
};

function formatLocation(location?: { zoneCode?: string; rackCode?: string; binCode?: string }) {
  if (!location) return "";
  return [location.zoneCode, location.rackCode, location.binCode].filter(Boolean).join(" - ");
}

const statusTone: Record<Transfer["status"], string> = {
  Pending: "bg-warning/15 text-warning",
  InTransit: "bg-primary/15 text-primary",
  Completed: "bg-success/15 text-success",
  Cancelled: "bg-destructive/15 text-destructive",
};

function TransferPage() {
  const { activeWarehouseId, currentUser } = useApp();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [viewingTransfer, setViewingTransfer] = useState<Transfer | null>(null);
  const [page, setPage] = useState(0); // 0-based server page
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const limit = 15;

  // Reset to page 0 when warehouse or search changes
  useEffect(() => { setPage(0); }, [activeWarehouseId, q, statusFilter, typeFilter]);

  const { data: pageData, isLoading, error } = useQuery({
    queryKey: ["transfers", activeWarehouseId, page, q, statusFilter, typeFilter],
    queryFn: async () => {
      const res = await api.get("/transfers", {
        params: {
          ...(activeWarehouseId ? { warehouseIdParam: activeWarehouseId } : {}),
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(typeFilter ? { type: typeFilter } : {}),
          ...(q.trim() ? { keyword: q.trim() } : {}),
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

  const { data: stats } = useQuery({
    queryKey: ["transfers-stats", activeWarehouseId],
    queryFn: async () => {
      const res = await api.get("/transfers/stats", {
        params: {
          ...(activeWarehouseId ? { warehouseIdParam: activeWarehouseId } : {}),
        },
      });
      return res.data as {
        total: number;
        pending: number;
        inTransit: number;
        crossWarehouse: number;
        internal: number;
      };
    },
  });

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
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Could not update transfer status."));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/transfers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Could not delete transfer."));
    },
  });

  const list = transfers;



  const isGlobalManager =
    currentUser?.role === "Admin" ||
    currentUser?.role === "Manager";

  const isSourceWarehouse = (transfer: Transfer) =>
    isGlobalManager ||
    String(currentUser?.warehouseId) ===
      String(transfer.sourceWarehouseId);

  const isDestinationWarehouse = (transfer: Transfer) =>
    isGlobalManager ||
    String(currentUser?.warehouseId) ===
      String(transfer.destinationWarehouseId);

  const isAdmin = currentUser?.role === "Admin";
  const openNewTransfer = () => {
    setEditingTransfer(null);
    setOpen(true);
  };

  const openEditTransfer = (transfer: Transfer) => {
    setEditingTransfer(transfer);
    setOpen(true);
  };

  const deleteTransfer = (transfer: Transfer) => {
    if (window.confirm(`Delete ${transfer.code}? This cannot be undone.`)) {
      deleteMutation.mutate(transfer.id);
    }
  };

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
          <button onClick={openNewTransfer} className="h-10 px-4 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring" style={{ background: "var(--gradient-primary)" }}>
            <Plus className="size-4" />New transfer
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={ArrowRightLeft} label="Total transfers" value={stats?.total ?? "—"} tone="primary" />
          <Kpi icon={Search} label="Pending" value={stats?.pending ?? "—"} tone="warning" />
          <Kpi icon={Truck} label="In transit" value={stats?.inTransit ?? "—"} tone="primary" />
          <Kpi icon={MapPin} label="Cross / Internal" value={stats ? `${stats.crossWarehouse} / ${stats.internal}` : "—"} tone="accent" />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative max-w-md w-full sm:w-80">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search transfer, SKU, warehouse..."
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-input border border-border text-sm"
            />
          </div>
          <select aria-label="Filter by transfer type" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className={`${selectCls} h-10 w-full sm:w-48`}>
            <option value="">All types</option>
            <option value="cross">Cross-Warehouse</option>
            <option value="internal">Internal Movement</option>
          </select>
          <select aria-label="Filter by transfer status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${selectCls} h-10 w-full sm:w-40`}>
            <option value="">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="InTransit">In transit</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40">
                <tr>
                  <th className="text-left p-4">Transfer</th>
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
                      <button type="button" onClick={() => setViewingTransfer(t)} className="font-mono text-xs text-primary hover:underline" title="View transfer details">
                        {t.code}
                      </button>
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
                      <div className="text-[11px] text-muted-foreground">Receiving manager: {t.assignedBy || "Unassigned"}</div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusTone[t.status]}`}>{t.status}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        {t.type === "Cross-Warehouse" && t.status === "Pending" && isSourceWarehouse(t) && (
                          <button
                            onClick={() => statusMutation.mutate({ id: t.id, status: "InTransit" })}
                            disabled={statusMutation.isPending}
                            className="h-8 px-2 rounded-md bg-secondary border border-border text-xs hover:bg-muted inline-flex items-center gap-1"
                          >
                            <Truck className="size-3.5" />Dispatch
                          </button>
                        )}
                        {((t.type === "Internal Movement" && t.status === "Pending" && isSourceWarehouse(t))
                          || (t.type === "Cross-Warehouse" && t.status === "InTransit" && isDestinationWarehouse(t))) && (
                          <button
                            onClick={() => statusMutation.mutate({ id: t.id, status: "Completed" })}
                            disabled={statusMutation.isPending}
                            className="h-8 px-2 rounded-md bg-success/15 text-success text-xs hover:bg-success/20 inline-flex items-center gap-1"
                          >
                            <CheckCircle2 className="size-3.5" />Complete
                          </button>
                        )}
                        {(t.status === "Pending" || t.status === "InTransit") && isSourceWarehouse(t) && (
                          <button
                            onClick={() => statusMutation.mutate({ id: t.id, status: "Cancelled" })}
                            disabled={statusMutation.isPending}
                            className="h-8 px-2 rounded-md bg-destructive/15 text-destructive text-xs hover:bg-destructive/20 inline-flex items-center gap-1"
                          >
                            <XCircle className="size-3.5" />Cancel
                          </button>
                        )}
                        {t.status === "Pending" && isSourceWarehouse(t) && (
                          <button
                            type="button"
                            title="Edit transfer"
                            onClick={() => openEditTransfer(t)}
                            className="size-8 grid place-items-center rounded-md border border-border bg-secondary hover:bg-muted"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        )}
                        {isAdmin && (t.status === "Pending" || t.status === "Cancelled") && (
                          <button
                            type="button"
                            title="Delete transfer"
                            onClick={() => deleteTransfer(t)}
                            disabled={deleteMutation.isPending}
                            className="size-8 grid place-items-center rounded-md border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50"
                          >
                            <Trash2 className="size-3.5" />
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
      <AddTransferModal open={open} transfer={editingTransfer} onClose={() => { setOpen(false); setEditingTransfer(null); }} />
      <TransferDetailModal transfer={viewingTransfer} onClose={() => setViewingTransfer(null)} />
    </AppShell>
  );
}

function TransferDetailModal({ transfer, onClose }: { transfer: Transfer | null; onClose: () => void }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["transfer-history", transfer?.id],
    queryFn: async () => (await api.get(`/transfers/${transfer?.id}/history`)).data as ApprovalHistory[],
    enabled: Boolean(transfer),
  });

  if (!transfer) return null;

  return (
    <ModalShell
      open={Boolean(transfer)}
      onClose={onClose}
      title={transfer.code}
      subtitle={`${transfer.type} - ${transfer.status}`}
      icon={<History className="size-5" />}
      maxWidth="48rem"
      footer={<button type="button" onClick={onClose} className="h-10 px-4 ml-auto rounded-lg bg-secondary border border-border text-sm hover:bg-muted">Close</button>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <div><div className="text-xs text-muted-foreground">From</div><div className="mt-1 font-medium">{transfer.sourceWarehouseCode} - {transfer.sourceWarehouseName}</div></div>
        <div><div className="text-xs text-muted-foreground">To</div><div className="mt-1 font-medium">{transfer.destinationWarehouseCode ? `${transfer.destinationWarehouseCode} - ${transfer.destinationWarehouseName}` : "Internal movement"}</div></div>
        <div><div className="text-xs text-muted-foreground">Created by</div><div className="mt-1 font-medium">{transfer.createdBy}</div></div>
        <div><div className="text-xs text-muted-foreground">Assigned manager</div><div className="mt-1 font-medium">{transfer.assignedBy || "Unassigned"}</div></div>
      </div>

      {transfer.remark && <div className="mt-5 border-y border-border/60 py-4 text-sm text-muted-foreground">{transfer.remark}</div>}

      <section className="mt-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Items</div>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="text-left p-3">SKU</th><th className="text-left p-3">Product</th><th className="text-right p-3">Quantity</th></tr></thead>
            <tbody>{transfer.lines.map((line) => <tr key={line.sku} className="border-t border-border/60"><td className="p-3 font-mono text-xs">{line.sku}</td><td className="p-3">{line.productName}</td><td className="p-3 text-right font-semibold">{line.quantity}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="mt-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><History className="size-3.5" /> Processing history</div>
        {isLoading ? <div className="text-sm text-muted-foreground">Loading history...</div> : (
          <div className="border-l-2 border-border/60 ml-2 space-y-5">
            {history.slice().reverse().map((event) => (
              <div key={event.id} className="relative pl-5">
                <div className="absolute -left-[7px] top-1 size-3 rounded-full bg-primary border-2 border-background" />
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1">
                  <div><div className="font-medium text-sm">{event.newStatus}</div><div className="text-xs text-muted-foreground mt-1">By {event.approverName || "Unknown"}{event.note ? ` - ${event.note}` : ""}</div></div>
                  {event.createdAt && <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="size-3" />{new Date(event.createdAt).toLocaleString()}</div>}
                </div>
              </div>
            ))}
            {history.length === 0 && <div className="pl-5 text-sm text-muted-foreground">No history recorded.</div>}
          </div>
        )}
      </section>
    </ModalShell>
  );
}

function AddTransferModal({ open, transfer, onClose }: { open: boolean; transfer: Transfer | null; onClose: () => void }) {
  const { activeWarehouseId, canSwitchWarehouse } = useApp();
  const queryClient = useQueryClient();
  const [type, setType] = useState<"cross" | "internal">("cross");
  const [sourceWarehouse, setSourceWarehouse] = useState<string>(activeWarehouseId ?? "");
  const [destWarehouse, setDestWarehouse] = useState<string>("");
  const [assignedById, setAssignedById] = useState<string>("");
  const [sourceLocationId, setSourceLocationId] = useState<string>("");
  const [destinationLocationId, setDestinationLocationId] = useState<string>("");
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

  const { data: locations = [] } = useQuery({
    queryKey: ["locations", sourceWarehouse, "transfer-selector"],
    queryFn: async () => (await api.get("/locations", { params: { warehouseId: sourceWarehouse } })).data,
    enabled: open && Boolean(sourceWarehouse),
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
    if (transfer) {
      const note = transfer.remark?.split(" | ").filter((part) => !part.startsWith("From: ") && !part.startsWith("To: ")).join(" | ") ?? "";
      setType(transfer.type === "Cross-Warehouse" ? "cross" : "internal");
      setSourceWarehouse(String(transfer.sourceWarehouseId));
      setDestWarehouse(transfer.destinationWarehouseId ? String(transfer.destinationWarehouseId) : "");
      setAssignedById(transfer.assignedById ? String(transfer.assignedById) : "");
      setSourceLocationId(transfer.sourceLocationId ? String(transfer.sourceLocationId) : "");
      setDestinationLocationId(transfer.destinationLocationId ? String(transfer.destinationLocationId) : "");
      setRemark(note);
      setLines(transfer.lines.map((line) => ({ sku: line.sku, qty: line.quantity })));
      return;
    }
    const activeSelection = activeWarehouses.some((w: any) => String(w.id) === String(activeWarehouseId))
      ? activeWarehouseId
      : canSwitchWarehouse ? activeWarehouses[0]?.id : "";
    const defaultWarehouse = activeSelection ?? "";
    setSourceWarehouse(String(defaultWarehouse));
  }, [activeWarehouseId, canSwitchWarehouse, open, transfer, warehouses]);

  const availableProducts = products.filter((p: any) => String(p.warehouseId) === String(sourceWarehouse) && p.stock > 0);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const cleanLines = lines.filter((line) => line.sku && line.qty > 0);
      if (!sourceWarehouse) throw new Error("Select a source warehouse.");
      if (type === "cross" && !destWarehouse) throw new Error("Select a destination warehouse.");
      if (type === "internal" && (!sourceLocationId || !destinationLocationId)) throw new Error("Select source and destination locations.");
      if (type === "internal" && sourceLocationId === destinationLocationId) throw new Error("Destination location must differ from source location.");
      if (cleanLines.length === 0) throw new Error("Add at least one product.");

      const payload = {
        type,
        sourceWarehouseId: Number(sourceWarehouse),
        destinationWarehouseId: type === "cross" ? Number(destWarehouse) : null,
        assignedById: assignedById ? Number(assignedById) : null,
        sourceLocationId: type === "internal" ? Number(sourceLocationId) : null,
        destinationLocationId: type === "internal" ? Number(destinationLocationId) : null,
        sourceLocation: type === "internal" ? formatLocation(locations.find((location: any) => String(location.id) === sourceLocationId)) : null,
        destinationLocation: type === "internal" ? formatLocation(locations.find((location: any) => String(location.id) === destinationLocationId)) : null,
        remark,
        lines: cleanLines.map((line) => ({ sku: line.sku, quantity: Number(line.qty) })),
      };
      const res = transfer
        ? await api.put(`/transfers/${transfer.id}`, payload)
        : await api.post("/transfers", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      handleClose();
    },
    onError: (err: unknown) => {
      toast.error(getErrorMessage(err, "Could not save transfer."));
    },
  });

  const handleScan = (barcode: string) => {
    const product = availableProducts.find((p: any) => p.sku.toLowerCase() === barcode.toLowerCase());
    if (!product) {
      toast.error(`Barcode ${barcode} not found in source warehouse stock.`);
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
    setType("cross");
    setDestWarehouse("");
    setAssignedById("");
    setSourceLocationId("");
    setDestinationLocationId("");
    setRemark("");
    setLines([]);
    onClose();
  };

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      title={transfer ? `Edit ${transfer.code}` : "New Transfer"}
      subtitle={transfer ? "Update a pending transfer before dispatch" : "Record internal product movements"}
      icon={<ArrowRightLeft className="size-5" />}
      maxWidth="52rem"
      footer={
        <>
          <button onClick={handleClose} type="button" disabled={saveMutation.isPending} className="h-10 px-4 ml-auto rounded-lg bg-secondary border border-border text-sm hover:bg-muted">Cancel</button>
          <button onClick={() => saveMutation.mutate()} type="button" disabled={saveMutation.isPending} className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground glow-ring" style={{ background: "var(--gradient-primary)" }}>
            {saveMutation.isPending ? "Saving..." : transfer ? "Save changes" : "Confirm Transfer"}
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
              <select className={selectCls} value={sourceWarehouse} disabled={!canSwitchWarehouse} onChange={(e) => { setSourceWarehouse(e.target.value); setDestWarehouse(""); setAssignedById(""); setLines([]); }}>
                <option value="" disabled>Select source</option>
                {activeWarehouses.map((w: any) => <option key={w.id} value={w.id}>{w.code} — {w.city}</option>)}
              </select>
            </Field>
            <Field label="Destination Warehouse" required>
              <select className={selectCls} value={destWarehouse} onChange={(e) => { setDestWarehouse(e.target.value); setAssignedById(""); }}>
                <option value="" disabled>Select destination</option>
                {activeWarehouses.filter((w: any) => String(w.id) !== String(sourceWarehouse)).map((w: any) => <option key={w.id} value={w.id}>{w.code} — {w.city}</option>)}
              </select>
            </Field>
          </>
        ) : (
          <>
            <Field label="Warehouse" required className="sm:col-span-2">
              <select className={selectCls} value={sourceWarehouse} disabled={!canSwitchWarehouse} onChange={(e) => { setSourceWarehouse(e.target.value); setSourceLocationId(""); setDestinationLocationId(""); setAssignedById(""); setLines([]); }}>
                <option value="" disabled>Select warehouse</option>
                {activeWarehouses.map((w: any) => <option key={w.id} value={w.id}>{w.code} — {w.city}</option>)}
              </select>
            </Field>
            <Field label="Source Location" required>
              <select className={selectCls} value={sourceLocationId} onChange={(e) => setSourceLocationId(e.target.value)} disabled={!sourceWarehouse}>
                <option value="" disabled>Select source location</option>
                {locations.filter((location: any) => location.effectiveStatus === "ACTIVE").map((location: any) => <option key={location.id} value={location.id}>{formatLocation(location)}</option>)}
              </select>
            </Field>
            <Field label="Destination Location" required>
              <select className={selectCls} value={destinationLocationId} onChange={(e) => setDestinationLocationId(e.target.value)} disabled={!sourceWarehouse}>
                <option value="" disabled>Select destination location</option>
                {locations.filter((location: any) => location.effectiveStatus === "ACTIVE" && String(location.id) !== sourceLocationId).map((location: any) => <option key={location.id} value={location.id}>{formatLocation(location)}</option>)}
              </select>
            </Field>
          </>
        )}
        <Field label="Date" required><input type="date" className={inputCls} value={new Date().toISOString().slice(0, 10)} readOnly /></Field>
        <Field label="Receiving manager">
          <select className={selectCls} value={assignedById} onChange={(e) => setAssignedById(e.target.value)}>
            <option value="">No receiving manager</option>
            {users
              .filter((u: any) => u.role === "WAREHOUSE_MANAGER" && !u.isDeleted
                && String(u.warehouseId) === String(type === "cross" ? destWarehouse : sourceWarehouse))
              .map((u: any) => <option key={u.id} value={u.id}>{u.fullName} - {u.role}</option>)}
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
