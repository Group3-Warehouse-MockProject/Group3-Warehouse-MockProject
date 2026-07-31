/* eslint-disable */
// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/lib/app-context";
import {
  MapPin, Plus, Search, Pencil, Trash2,
  ChevronRight, ChevronDown, Layers, LayoutGrid,
  Package, PackageOpen, X, Warehouse as WarehouseIcon, AlertTriangle,
  Eye, CheckCircle2, DollarSign, Tag, Info, Building2, Power, RefreshCw
} from "lucide-react";
import { ModalShell, Field, inputCls, selectCls } from "@/components/modal-shell";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/confirm-modal"

export const Route = createFileRoute("/location")({
  head: () => ({ meta: [{ title: "Locations — TechStock" }] }),
  component: LocationPage,
});

/* ─── Formatters ─── */
function formatVND(val?: number | string | null) {
  if (val == null) return "0 ₫";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
}

function StatusBadge({ status, label }: { status: string; label?: string }) {
  const active = String(status || "ACTIVE").toUpperCase() === "ACTIVE";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${active ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
      <span className={`size-1.5 rounded-full ${active ? "bg-emerald-500 animate-pulse" : "bg-destructive"}`} />
      {label || (active ? "Active" : "Inactive")}
    </span>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: any; label: string; value: any; tone: string }) {
  const color = tone === "warning" ? "var(--warning)" : tone === "accent" ? "var(--accent)" : "var(--primary)";
  return (
    <div className="surface-card p-5 flex items-center justify-between">
      <div>
        <div className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">{label}</div>
        <div className="mt-2 text-2xl font-bold">{value}</div>
      </div>
      <div className="size-10 rounded-xl grid place-items-center" style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}>
        <Icon className="size-5" />
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="size-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />;
}

/* ══════════════════════════════════════════════════════════
   MAIN LOCATION PAGE (Warehouse -> Rack -> Bin -> Product)
══════════════════════════════════════════════════════════ */
function LocationPage() {
  const { activeWarehouseId } = useApp();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");

  const [openAddModal, setOpenAddModal] = useState(false);
  const [prefilledAdd, setPrefilledAdd] = useState<{ warehouseId?: string; rackCode?: string }>({});
  const [editingLocation, setEditingLocation] = useState<any>(null);

  // Modals for Details
  const [viewingRack, setViewingRack] = useState<{ warehouse: any; rackCode: string; bins: any[] } | null>(null);
  const [viewingBin, setViewingBin] = useState<any>(null);
  const [viewingProduct, setViewingProduct] = useState<any>(null);

  // Fetch warehouses from DB
  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return (res.data?.content ?? res.data ?? []) as any[];
    },
  });

  // Fetch all locations from /api/locations
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await api.get("/locations");
      return (res.data?.content ?? res.data ?? []) as any[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["locations"] });

  // Map locations directly: Warehouse -> Rack -> Bins (No Zone level!)
  const wmsTree = useMemo(() => {
    const whMap: Record<string, { warehouse: any; racks: Record<string, any[]> }> = {};

    warehouses.forEach((w) => {
      whMap[String(w.id)] = {
        warehouse: w,
        racks: {},
      };
    });

    const defaultWh = { id: "default", name: "Unassigned Warehouse", code: "DEFAULT", status: "ACTIVE" };

    locations.forEach((loc) => {
      const wId = loc.warehouseId ? String(loc.warehouseId) : "default";
      if (!whMap[wId]) {
        whMap[wId] = {
          warehouse: warehouses.find((w) => String(w.id) === wId) || defaultWh,
          racks: {},
        };
      }

      const rackKey = (loc.rackCode || "01").toUpperCase();

      if (!whMap[wId].racks[rackKey]) {
        whMap[wId].racks[rackKey] = [];
      }
      whMap[wId].racks[rackKey].push(loc);
    });

    return whMap;
  }, [locations, warehouses]);

  // Apply Warehouse & Search query filters
  const filteredWhIds = useMemo(() => {
    let ids = Object.keys(wmsTree);

    // Global Header warehouse filter
    if (activeWarehouseId) {
      ids = ids.filter((id) => id === String(activeWarehouseId));
    }

    if (!q) return ids;
    const ql = q.toLowerCase();

    return ids.filter((id) => {
      const { warehouse, racks } = wmsTree[id];
      if (warehouse.name?.toLowerCase().includes(ql) || warehouse.warehouseName?.toLowerCase().includes(ql) || warehouse.code?.toLowerCase().includes(ql)) {
        return true;
      }

      return Object.keys(racks).some((rCode) => {
        if (rCode.toLowerCase().includes(ql)) return true;
        return racks[rCode].some((bin) =>
          String(bin.binCode ?? "").toLowerCase().includes(ql) ||
          `${bin.rackCode}-${bin.binCode}`.toLowerCase().includes(ql) ||
          bin.items?.some((item: any) =>
            item.productName?.toLowerCase().includes(ql) || item.productSku?.toLowerCase().includes(ql)
          )
        );
      });
    });
  }, [wmsTree, activeWarehouseId, q]);

  // Metrics
  const totalLocations = locations.length;
  const activeLocations = locations.filter((l) => (l.effectiveStatus || l.status || "ACTIVE").toUpperCase() === "ACTIVE").length;
  const occupiedBins = locations.filter((l) => (l.currentQuantity && l.currentQuantity > 0) || (l.items && l.items.length > 0)).length;

  /* Mutate delete */
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/locations/${id}`),
    onSuccess: () => {
      invalidate();
      toast.success("Location deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data || "Failed to delete location");
    },
  });

  /* Mutate toggle bin status */
  const toggleBinStatusMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/locations/${id}/status`),
    onSuccess: () => {
      invalidate();
      toast.success("Bin status updated successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data || "Failed to update bin status");
    },
  });

  /* Mutate toggle rack status */
  const toggleRackStatusMutation = useMutation({
    mutationFn: ({ warehouseId, rackCode }: { warehouseId?: any; rackCode: string }) =>
      api.patch("/locations/racks/status", null, {
        params: { warehouseId, rackCode },
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Rack status updated successfully for all bins");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data || "Failed to update rack status");
    },
  });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isPending: boolean;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", isPending: false, onConfirm: () => { } });
  const closeModal = () => setConfirmModal((prev) => ({ ...prev, isOpen: false }));

  const handleDeleteBin = async (loc: any) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete Bin ${loc.rackCode}-${loc.binCode}`,
      message: `Are you sure you want to delete Bin ${loc.rackCode}-${loc.binCode}?`,
      isPending: false,
      onConfirm: () => {
        closeModal();
        deleteMutation.mutateAsync(loc.id);
      },
    })
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Locations</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Standard location hierarchy: <strong className="text-foreground">Warehouse → Rack → Bin</strong>
            </p>
          </div>
          <button
            onClick={() => {
              setPrefilledAdd({});
              setOpenAddModal(true);
            }}
            className="h-10 px-4 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Plus className="size-4" />
            Add Location
          </button>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={Building2} label="Total Warehouses" value={warehouses.length || Object.keys(wmsTree).length} tone="primary" />
          <Kpi icon={MapPin} label="Total Locations (Bins)" value={totalLocations} tone="accent" />
          <Kpi icon={Layers} label="Active Locations" value={activeLocations} tone="warning" />
          <Kpi icon={Package} label="Occupied Bins" value={occupiedBins} tone="primary" />
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search Warehouse, Rack, Bin, Product…"
              className={`w-full h-10 pl-9 pr-8 rounded-lg bg-input border text-sm ${q ? "border-emerald-500 ring-1 ring-emerald-500/20" : "border-border"}`}
            />
            {q && (
              <button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            )}
          </div>
          {activeWarehouseId && (
            <div className="text-xs text-muted-foreground bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-lg flex items-center gap-2">
              <Info className="size-3.5" /> Filtered by active header warehouse
            </div>
          )}
        </div>

        {/* Tree View Container: Warehouse -> Rack -> Bin */}
        <div className="surface-card overflow-hidden rounded-xl border">
          {isLoading ? (
            <div className="p-14 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Spinner /> Loading location tree…
            </div>
          ) : filteredWhIds.length === 0 ? (
            <div className="p-14 text-center text-muted-foreground">
              <Building2 className="size-12 mx-auto mb-3 opacity-20" />
              <div className="font-medium text-base">No locations found</div>
              <div className="text-xs mt-1">Click "Add Location" to create a new location</div>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredWhIds.map((whId) => (
                <WarehouseNode
                  key={whId}
                  warehouse={wmsTree[whId].warehouse}
                  racksMap={wmsTree[whId].racks}
                  onAddBin={(rackCode) => {
                    setPrefilledAdd({ warehouseId: whId, rackCode });
                    setOpenAddModal(true);
                  }}
                  onViewRackDetails={(warehouse, rackCode, bins) => {
                    setViewingRack({ warehouse, rackCode, bins });
                  }}
                  onToggleRackStatus={(rackCode) => {
                    toggleRackStatusMutation.mutate({ warehouseId: whId !== "default" ? Number(whId) : undefined, rackCode });
                  }}
                  onViewBin={(bin) => setViewingBin(bin)}
                  onEditBin={(bin) => setEditingLocation(bin)}
                  onDeleteBin={handleDeleteBin}
                  onToggleBinStatus={(binId) => toggleBinStatusMutation.mutate(binId)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Add Location */}
      {openAddModal && (
        <LocationFormModal
          open={openAddModal}
          warehouses={warehouses}
          initialValues={prefilledAdd}
          onClose={() => setOpenAddModal(false)}
          onSuccess={invalidate}
        />
      )}

      {/* Modal Edit Location */}
      {editingLocation && (
        <LocationFormModal
          open={!!editingLocation}
          warehouses={warehouses}
          location={editingLocation}
          onClose={() => setEditingLocation(null)}
          onSuccess={invalidate}
        />
      )}

      {/* Modal Rack Details */}
      {viewingRack && (
        <RackDetailsModal
          open={!!viewingRack}
          warehouse={viewingRack.warehouse}
          rackCode={viewingRack.rackCode}
          bins={viewingRack.bins}
          onClose={() => setViewingRack(null)}
          onViewBin={(bin) => {
            setViewingRack(null);
            setViewingBin(bin);
          }}
          onToggleBinStatus={(binId) => {
            toggleBinStatusMutation.mutate(binId);
            setViewingRack(null);
          }}
        />
      )}

      {/* Modal Bin Details */}
      {viewingBin && (
        <BinDetailsModal
          open={!!viewingBin}
          bin={viewingBin}
          onClose={() => setViewingBin(null)}
          onSelectProduct={(product) => setViewingProduct(product)}
          onEditBin={(b) => setEditingLocation(b)}
          onDeleteBin={(b) => handleDeleteBin(b)}
          onToggleBinStatus={(binId) => toggleBinStatusMutation.mutate(binId)}
        />
      )}

      {/* Modal Product Details */}
      {viewingProduct && (
        <ProductDetailsModal
          open={!!viewingProduct}
          product={viewingProduct}
          onClose={() => setViewingProduct(null)}
        />
      )}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        isPending={confirmModal.isPending}
        onClose={closeModal}
      />
    </AppShell>
  );
}

/* ══════════════════════════════════════════════════════════
   PAGINATION CONTROLS HELPER
══════════════════════════════════════════════════════════ */
function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
}) {
  if (totalPages <= 1) return null;

  const start = totalItems && pageSize ? (currentPage - 1) * pageSize + 1 : 0;
  const end = totalItems && pageSize ? Math.min(currentPage * pageSize, totalItems) : 0;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-secondary/20 border-t border-border/30 text-xs">
      <div className="text-muted-foreground font-medium">
        {totalItems ? `Showing ${start}–${end} of ${totalItems}` : `Page ${currentPage} of ${totalPages}`}
      </div>
      <div className="flex items-center gap-1">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="px-2 py-1 rounded border border-border bg-background text-foreground disabled:opacity-40 hover:bg-secondary transition-colors"
        >
          Previous
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`px-2.5 py-1 rounded border font-mono text-xs transition-colors ${p === currentPage
              ? "bg-primary text-primary-foreground font-bold border-primary"
              : "bg-background border-border text-foreground hover:bg-secondary"
              }`}
          >
            {p}
          </button>
        ))}
        <button
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="px-2 py-1 rounded border border-border bg-background text-foreground disabled:opacity-40 hover:bg-secondary transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   LEVEL 1: WAREHOUSE NODE
══════════════════════════════════════════════════════════ */
function WarehouseNode({
  warehouse,
  racksMap,
  onAddBin,
  onViewRackDetails,
  onToggleRackStatus,
  onViewBin,
  onEditBin,
  onDeleteBin,
  onToggleBinStatus,
}: {
  warehouse: any;
  racksMap: Record<string, any[]>;
  onAddBin: (rackCode: string) => void;
  onViewRackDetails: (warehouse: any, rackCode: string, bins: any[]) => void;
  onToggleRackStatus: (rackCode: string) => void;
  onViewBin: (bin: any) => void;
  onEditBin: (loc: any) => void;
  onDeleteBin: (loc: any) => void;
  onToggleBinStatus: (binId: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const rackCodes = Object.keys(racksMap);
  const totalBins = rackCodes.reduce((acc, r) => acc + racksMap[r].length, 0);

  const whActive = String(warehouse.status || "ACTIVE").toUpperCase() === "ACTIVE";

  return (
    <div className="transition-colors border-b border-border/40 last:border-b-0">
      {/* Warehouse Header Bar */}
      <div
        className={`flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/30 transition-colors cursor-pointer ${!whActive ? "bg-destructive/5" : ""}`}
        onClick={() => setExpanded((v) => !v)}
      >
        <button className="size-6 grid place-items-center text-muted-foreground shrink-0 rounded-md hover:bg-secondary">
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>

        <div className={`size-10 rounded-xl grid place-items-center font-bold text-sm shrink-0 ${whActive ? "bg-primary/10 text-primary border border-primary/20" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>
          <Building2 className="size-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-base text-foreground">
              {warehouse.warehouseName || warehouse.name || "Warehouse"}
            </span>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-secondary border border-border text-muted-foreground">
              {warehouse.code || "WH"}
            </span>
            <StatusBadge status={warehouse.status} label={whActive ? "Warehouse Active" : "Warehouse INACTIVE"} />
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
            <span>{rackCodes.length} Racks</span>
            <span>·</span>
            <span>{totalBins} Bins</span>
            {warehouse.location && (
              <>
                <span>·</span>
                <span className="truncate max-w-xs">{warehouse.location}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Level 2: Racks List */}
      {expanded && (
        <div className="bg-secondary/10 border-t border-border/40 divide-y divide-border/30">
          {rackCodes.length === 0 ? (
            <div className="pl-14 pr-4 py-4 text-xs text-muted-foreground italic">
              No racks or locations assigned to this warehouse.
            </div>
          ) : (
            rackCodes.map((rackCode) => (
              <RackNode
                key={rackCode}
                rackCode={rackCode}
                bins={racksMap[rackCode]}
                warehouse={warehouse}
                onAddBin={() => onAddBin(rackCode)}
                onViewRackDetails={() => onViewRackDetails(warehouse, rackCode, racksMap[rackCode])}
                onToggleRackStatus={() => onToggleRackStatus(rackCode)}
                onViewBin={onViewBin}
                onEditBin={onEditBin}
                onDeleteBin={onDeleteBin}
                onToggleBinStatus={onToggleBinStatus}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   LEVEL 2: RACK NODE
══════════════════════════════════════════════════════════ */
function RackNode({
  rackCode,
  bins,
  warehouse,
  onAddBin,
  onViewRackDetails,
  onToggleRackStatus,
  onViewBin,
  onEditBin,
  onDeleteBin,
  onToggleBinStatus,
}: {
  rackCode: string;
  bins: any[];
  warehouse: any;
  onAddBin: () => void;
  onViewRackDetails: () => void;
  onToggleRackStatus: () => void;
  onViewBin: (bin: any) => void;
  onEditBin: (loc: any) => void;
  onDeleteBin: (loc: any) => void;
  onToggleBinStatus: (binId: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(bins.length / pageSize);

  const pagedBins = useMemo(() => {
    const start = (page - 1) * pageSize;
    return bins.slice(start, start + pageSize);
  }, [bins, page, pageSize]);

  // Check if all bins in rack are inactive
  const isRackInactive = bins.length > 0 && bins.every((b) => String(b.status || "ACTIVE").toUpperCase() === "INACTIVE");
  const isWhInactive = String(warehouse?.status || "ACTIVE").toUpperCase() === "INACTIVE";

  return (
    <div>
      {/* Rack Header Bar */}
      <div className={`flex items-center gap-3 pl-8 pr-4 py-2.5 hover:bg-secondary/30 transition-colors group ${isRackInactive || isWhInactive ? "bg-destructive/5" : ""}`}>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="size-5 grid place-items-center text-muted-foreground shrink-0 rounded hover:bg-secondary/70"
        >
          {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        </button>

        <Layers className={`size-4 shrink-0 ${isRackInactive || isWhInactive ? "text-destructive" : "text-amber-500"}`} />

        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="font-mono font-bold text-sm">Rack {rackCode}</span>
          <span className="text-xs text-muted-foreground font-mono">({bins.length} Bins)</span>

          {(isRackInactive || isWhInactive) && (
            <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-destructive/10 text-destructive border border-destructive/20">
              {isWhInactive ? "Warehouse INACTIVE" : "Rack INACTIVE"}
            </span>
          )}
        </div>

        {/* Rack Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onViewRackDetails}
            title="View Rack Details"
            className="h-7 px-2 rounded text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1 transition-colors"
          >
            <Eye className="size-3.5" /> Detail
          </button>

          <button
            onClick={onToggleRackStatus}
            title={isRackInactive ? "Reactivate Rack" : "Deactivate all bins in Rack"}
            className={`h-7 px-2 rounded text-xs font-medium border flex items-center gap-1 transition-colors ${isRackInactive ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20"}`}
          >
            <Power className="size-3.5" /> {isRackInactive ? "Activate Rack" : "Deactivate Rack"}
          </button>
        </div>
      </div>

      {/* Level 3: Bins List */}
      {expanded && (
        <div>
          <div className="divide-y divide-border/20 border-t border-border/20 bg-background/50">
            {pagedBins.map((bin) => (
              <BinNode
                key={bin.id}
                bin={bin}
                warehouse={warehouse}
                onViewBin={onViewBin}
                onEditBin={onEditBin}
                onDeleteBin={onDeleteBin}
                onToggleBinStatus={onToggleBinStatus}
              />
            ))}
          </div>
          <PaginationControls
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={bins.length}
            pageSize={pageSize}
          />
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   LEVEL 3: BIN NODE
══════════════════════════════════════════════════════════ */
function BinNode({
  bin,
  warehouse,
  onViewBin,
  onEditBin,
  onDeleteBin,
  onToggleBinStatus,
}: {
  bin: any;
  warehouse: any;
  onViewBin: (bin: any) => void;
  onEditBin: (loc: any) => void;
  onDeleteBin: (loc: any) => void;
  onToggleBinStatus: (binId: number) => void;
}) {
  const hasItems = bin.items && bin.items.length > 0;
  const totalQty = bin.currentQuantity || (hasItems ? bin.items.reduce((a: number, i: any) => a + (i.quantity || 0), 0) : 0);

  const binActive = String(bin.status || "ACTIVE").toUpperCase() === "ACTIVE";
  const whActive = String(warehouse?.status || "ACTIVE").toUpperCase() === "ACTIVE";
  const effectiveActive = binActive && whActive;

  return (
    <div className={`flex items-center gap-3 pl-16 pr-4 py-2.5 hover:bg-secondary/20 transition-colors group ${!effectiveActive ? "opacity-75 bg-destructive/5" : ""}`}>
      <LayoutGrid className="size-3.5 text-muted-foreground shrink-0" />

      <div className="w-20 shrink-0 font-mono text-xs font-bold text-foreground">
        Bin {bin.binCode}
      </div>



      {/* Stored products summary */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {hasItems ? (
          <div className="flex items-center gap-1.5 overflow-hidden">
            <Package className="size-3.5 text-primary shrink-0" />
            <span className="text-xs font-medium truncate">
              {bin.items[0].productName || bin.items[0].productSku}
            </span>
            {bin.items.length > 1 && (
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20 shrink-0">
                +{bin.items.length - 1} more items
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/60 italic flex items-center gap-1">
            <PackageOpen className="size-3.5" /> Empty Bin
          </span>
        )}
      </div>

      {bin.maxCapacity && (
        <span className="text-xs text-muted-foreground tabular-nums hidden sm:inline font-mono">
          {totalQty} / {bin.maxCapacity} units
        </span>
      )}

      {/* Status Badge */}
      {!whActive ? (
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive border border-destructive/20">
          Warehouse INACTIVE
        </span>
      ) : (
        <StatusBadge status={bin.status} />
      )}

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onViewBin(bin)}
          title="Detail"
          className="h-7 px-2.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1 text-xs font-medium"
        >
          <Eye className="size-3.5" />
          <span>Detail</span>
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   RACK DETAILS MODAL
══════════════════════════════════════════════════════════ */
function RackDetailsModal({
  open,
  warehouse,
  rackCode,
  bins = [],
  onClose,
  onViewBin,
  onToggleBinStatus,
}: {
  open: boolean;
  warehouse: any;
  rackCode: string;
  bins: any[];
  onClose: () => void;
  onViewBin: (bin: any) => void;
  onToggleBinStatus: (binId: number) => void;
}) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(bins.length / pageSize);
  const pagedBins = bins.slice((page - 1) * pageSize, page * pageSize);

  const activeBins = bins.filter((b) => String(b.status || "ACTIVE").toUpperCase() === "ACTIVE").length;
  const totalItems = bins.reduce((acc, b) => acc + (b.items ? b.items.length : 0), 0);
  const totalQty = bins.reduce((acc, b) => acc + (b.currentQuantity || 0), 0);
  const totalCapacity = bins.reduce((acc, b) => acc + (b.maxCapacity || 0), 0);

  const fillPercent = totalCapacity > 0 ? Math.min(100, Math.round((totalQty / totalCapacity) * 100)) : 0;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={`Rack Details — Rack ${rackCode}`}
      icon={<Layers className="size-5 text-amber-500" />}
      footer={
        <button onClick={onClose} className="h-10 px-5 bg-primary text-white rounded-lg font-medium text-sm">
          Close
        </button>
      }
    >
      <div className="space-y-5">
        {/* Info stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl surface-card border">
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Warehouse</span>
            <span className="font-bold text-xs sm:text-sm text-foreground mt-1 block break-words leading-tight" title={warehouse?.warehouseName || warehouse?.name}>
              {warehouse?.warehouseName || warehouse?.name || "Warehouse"}
            </span>
          </div>

          <div className="p-3.5 rounded-xl surface-card border">
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Bin Status (Active/Total)</span>
            <span className="font-bold text-sm text-foreground mt-1 block">
              <span className="text-emerald-500">{activeBins}</span> / {bins.length} Bins
            </span>
          </div>

          <div className="p-3.5 rounded-xl surface-card border">
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Total Stored Quantity</span>
            <span className="font-bold text-sm text-primary mt-1 block">
              {totalQty} <span className="text-xs font-normal text-muted-foreground">units ({totalItems} items)</span>
            </span>
          </div>

          <div className="p-3.5 rounded-xl surface-card border">
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Rack Capacity Usage</span>
            <span className="font-bold text-sm text-foreground mt-1 block">
              {fillPercent}%
            </span>
          </div>
        </div>

        {/* Capacity Bar */}
        {totalCapacity > 0 && (
          <div className="p-4 surface-card border rounded-xl space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span>Capacity Usage ({totalQty} / {totalCapacity} units)</span>
              <span className="font-bold">{fillPercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${fillPercent}%`,
                  background: fillPercent > 90 ? "var(--destructive)" : "var(--primary)",
                }}
              />
            </div>
          </div>
        )}

        {/* Bins Table in Rack */}
        <div>
          <h4 className="text-xs uppercase font-semibold text-muted-foreground mb-3">
            Bins in Rack {rackCode} ({bins.length})
          </h4>

          {bins.length === 0 ? (
            <div className="p-6 text-center border rounded-xl text-muted-foreground text-sm">
              No bins found in this rack.
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden surface-card">
              <div className="divide-y">
                {pagedBins.map((b) => {
                  const bActive = String(b.status || "ACTIVE").toUpperCase() === "ACTIVE";
                  return (
                    <div key={b.id} className="p-3 flex items-center justify-between gap-3 hover:bg-secondary/30 transition-colors">
                      <div className="flex items-center gap-3 font-mono text-xs">
                        <LayoutGrid className="size-4 text-muted-foreground" />
                        <span className="font-bold">Bin {b.binCode}</span>
                        <span className="text-muted-foreground">({b.rackCode}-{b.binCode})</span>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground">
                          {b.currentQuantity || 0} {b.maxCapacity ? `/ ${b.maxCapacity}` : ""} units
                        </span>

                        <StatusBadge status={b.status} />

                        <button
                          onClick={() => onViewBin(b)}
                          className="px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 font-medium text-xs flex items-center gap-1"
                        >
                          <Eye className="size-3" /> Detail
                        </button>

                        <button
                          onClick={() => onToggleBinStatus(b.id)}
                          className={`p-1 rounded ${bActive ? "hover:bg-destructive/10 text-muted-foreground hover:text-destructive" : "text-emerald-500 hover:bg-emerald-500/10"}`}
                          title={bActive ? "Deactivate Bin" : "Activate Bin"}
                        >
                          <Power className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <PaginationControls
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalItems={bins.length}
                pageSize={pageSize}
              />
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

/* ══════════════════════════════════════════════════════════
   BIN DETAILS MODAL
══════════════════════════════════════════════════════════ */
function BinDetailsModal({
  open,
  bin,
  onClose,
  onSelectProduct,
  onEditBin,
  onDeleteBin,
  onToggleBinStatus,
}: {
  open: boolean;
  bin: any;
  onClose: () => void;
  onSelectProduct: (product: any) => void;
  onEditBin: (bin: any) => void;
  onDeleteBin: (bin: any) => void;
  onToggleBinStatus: (binId: number) => void;
}) {
  const [page, setPage] = useState(1);
  const pageSize = 5;

  const items = bin?.items || [];
  const totalPages = Math.ceil(items.length / pageSize);
  const pagedItems = items.slice((page - 1) * pageSize, page * pageSize);

  const totalQty = bin?.currentQuantity || items.reduce((a: number, i: any) => a + (i.quantity || 0), 0);
  const binActive = String(bin?.status || "ACTIVE").toUpperCase() === "ACTIVE";

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={`Bin Details — ${bin?.rackCode}-${bin?.binCode}`}
      icon={<LayoutGrid className="size-5 text-primary" />}
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onEditBin(bin);
              }}
              className="h-9 px-3 rounded-lg border border-border bg-secondary hover:bg-secondary/80 font-medium text-xs flex items-center gap-1.5 transition-colors"
            >
              <Pencil className="size-3.5" /> Edit
            </button>

            <button
              onClick={() => {
                onToggleBinStatus(bin.id);
                onClose();
              }}
              className={`h-9 px-3 rounded-lg font-medium text-xs border flex items-center gap-1.5 transition-colors ${binActive
                ? "bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20"
                }`}
            >
              <Power className="size-3.5" /> {binActive ? "Deactivate Bin" : "Activate Bin"}
            </button>

            <button
              onClick={() => {
                onClose();
                onDeleteBin(bin);
              }}
              className="h-9 px-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 font-medium text-xs flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="size-3.5" /> Delete
            </button>
          </div>

          <button onClick={onClose} className="h-9 px-5 bg-primary text-white rounded-lg font-medium text-xs">
            Close
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Summary info cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl surface-card border">
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Location Code</span>
            <span className="font-mono font-bold text-sm text-foreground mt-1 block">
              {bin?.rackCode}-{bin?.binCode}
            </span>
          </div>

          <div className="p-3.5 rounded-xl surface-card border">
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Max Capacity</span>
            <span className="font-bold text-sm text-foreground mt-1 block">
              {bin?.maxCapacity ? `${bin.maxCapacity} units` : "Unlimited"}
            </span>
          </div>

          <div className="p-3.5 rounded-xl surface-card border">
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Stored Items</span>
            <span className="font-bold text-sm text-primary mt-1 block">
              {totalQty} units
            </span>
          </div>

          <div className="p-3.5 rounded-xl surface-card border">
            <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Bin Status</span>
            <div className="mt-1">
              <StatusBadge status={bin?.status} />
            </div>
          </div>
        </div>

        {/* Product items list in this bin */}
        <div>
          <h4 className="text-xs uppercase font-semibold text-muted-foreground mb-3 flex items-center justify-between">
            <span>Stored Products ({items.length})</span>
            <span className="text-[11px] font-normal text-muted-foreground">Click a product to view details</span>
          </h4>

          {items.length === 0 ? (
            <div className="p-8 text-center border rounded-xl bg-secondary/10 text-muted-foreground text-sm">
              <PackageOpen className="size-8 mx-auto mb-2 opacity-30" />
              This bin is currently empty.
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden surface-card">
              <div className="divide-y">
                {pagedItems.map((item: any, idx: number) => (
                  <div
                    key={item.productId || idx}
                    onClick={() => onSelectProduct(item)}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-secondary/40 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.productName} className="size-10 rounded-lg object-cover border shrink-0" />
                      ) : (
                        <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                          <Package className="size-5" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                          {item.productName || item.productSku}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 font-mono mt-0.5">
                          <span>SKU: {item.productSku}</span>
                          {item.category && <span>· {item.category}</span>}
                          {item.brand && <span>· {item.brand}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-bold text-foreground tabular-nums">
                          {item.quantity ?? 0} units
                        </div>
                        {item.price && (
                          <div className="text-xs text-muted-foreground">
                            {formatVND(item.price)}
                          </div>
                        )}
                      </div>

                      <button className="size-8 rounded-lg border grid place-items-center text-muted-foreground group-hover:text-primary group-hover:border-primary/30 transition-colors">
                        <Eye className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <PaginationControls
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalItems={items.length}
                pageSize={pageSize}
              />
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

/* ══════════════════════════════════════════════════════════
   PRODUCT DETAILS MODAL
══════════════════════════════════════════════════════════ */
function ProductDetailsModal({
  open,
  product,
  onClose,
}: {
  open: boolean;
  product: any;
  onClose: () => void;
}) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={`Product Details — ${product?.productSku || product?.sku}`}
      icon={<Package className="size-5 text-primary" />}
      footer={
        <button onClick={onClose} className="h-10 px-5 bg-primary text-white rounded-lg font-medium text-sm">
          Close
        </button>
      }
    >
      <div className="space-y-6">
        {/* Main Header Card */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-xl surface-card border">
          {product?.imageUrl ? (
            <img src={product.imageUrl} alt={product.productName} className="size-20 rounded-xl object-cover border shrink-0" />
          ) : (
            <div className="size-20 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
              <Package className="size-10" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-primary/10 text-primary border border-primary/20 mb-1">
              SKU: {product?.productSku || product?.sku}
            </div>
            <h3 className="text-lg font-bold text-foreground leading-snug">
              {product?.productName || product?.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              {product?.category && <span>Category: <strong className="text-foreground">{product.category}</strong></span>}
              {product?.brand && <span>· Brand: <strong className="text-foreground">{product.brand}</strong></span>}
            </p>
          </div>
        </div>

        {/* Detailed Grid Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl surface-card border">
            <div className="text-[11px] text-muted-foreground uppercase font-medium flex items-center gap-1.5">
              <Package className="size-3.5 text-primary" /> Quantity in Bin
            </div>
            <div className="text-xl font-bold text-foreground mt-1">
              {product?.quantity ?? product?.stock ?? 0} <span className="text-xs font-normal text-muted-foreground">units</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl surface-card border">
            <div className="text-[11px] text-muted-foreground uppercase font-medium flex items-center gap-1.5">
              <DollarSign className="size-3.5 text-emerald-500" /> Price
            </div>
            <div className="text-lg font-bold text-emerald-500 mt-1">
              {formatVND(product?.price)}
            </div>
          </div>

          <div className="p-3.5 rounded-xl surface-card border">
            <div className="text-[11px] text-muted-foreground uppercase font-medium flex items-center gap-1.5">
              <Tag className="size-3.5 text-accent" /> Cost
            </div>
            <div className="text-lg font-bold text-foreground mt-1">
              {formatVND(product?.cost)}
            </div>
          </div>

          {product?.lowStockThreshold != null && (
            <div className="p-3.5 rounded-xl surface-card border">
              <div className="text-[11px] text-muted-foreground uppercase font-medium flex items-center gap-1.5">
                <AlertTriangle className="size-3.5 text-amber-500" /> Reorder Threshold
              </div>
              <div className="text-base font-bold text-foreground mt-1">
                {product.lowStockThreshold} units
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

/* ══════════════════════════════════════════════════════════
   LOCATION FORM MODAL (Add / Edit Bin)
══════════════════════════════════════════════════════════ */
function LocationFormModal({
  open,
  warehouses,
  location,
  initialValues,
  onClose,
  onSuccess,
}: {
  open: boolean;
  warehouses: any[];
  location?: any;
  initialValues?: { warehouseId?: string; rackCode?: string };
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!location;

  const [form, setForm] = useState({
    warehouseId: location?.warehouseId || initialValues?.warehouseId || (warehouses[0] ? String(warehouses[0].id) : ""),
    rackCode: location?.rackCode || initialValues?.rackCode || "",
    binCode: location?.binCode || "",
    status: location?.status || "ACTIVE",
    maxCapacity: location?.maxCapacity != null ? String(location.maxCapacity) : "",
  });

  const [saving, setSaving] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.rackCode.trim() || !form.binCode.trim()) {
      toast.error("Rack Code and Bin Code are required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        warehouseId: form.warehouseId ? Number(form.warehouseId) : null,
        rackCode: form.rackCode.toUpperCase().trim(),
        binCode: form.binCode.toUpperCase().trim(),
        status: form.status,
        maxCapacity: form.maxCapacity ? Number(form.maxCapacity) : null,
      };

      if (isEdit) {
        await api.put(`/locations/${location.id}`, payload);
        toast.success("Location updated successfully!");
      } else {
        await api.post("/locations", payload);
        toast.success("New Location created successfully!");
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data || (isEdit ? "Failed to update location" : "Failed to create location"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit Location #${location.id}` : "Add New Location"}
      icon={<MapPin className="size-5 text-primary" />}
      footer={
        <>
          <button onClick={onClose} className="h-10 px-4 bg-secondary border rounded-lg text-sm">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="h-10 px-5 bg-primary text-white rounded-lg font-medium text-sm disabled:opacity-60 flex items-center gap-2"
          >
            {saving && <Spinner />}
            {isEdit ? "Update Location" : "Save Location"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Select Warehouse *" hint="Select the warehouse for this location" className="sm:col-span-2">
          <select
            className={inputCls}
            value={form.warehouseId}
            onChange={(e) => set("warehouseId", e.target.value)}
          >
            <option value="">-- Select Warehouse --</option>
            {warehouses.map((w: any) => (
              <option key={w.id} value={String(w.id)}>
                {w.warehouseName || w.name} ({w.code})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Rack Code *" hint="e.g. R01, RACK-A">
          <input
            className={inputCls}
            placeholder="R01"
            value={form.rackCode}
            onChange={(e) => set("rackCode", e.target.value)}
          />
        </Field>

        <Field label="Bin Code *" hint="e.g. B01, BIN-01">
          <input
            className={inputCls}
            placeholder="B01"
            value={form.binCode}
            onChange={(e) => set("binCode", e.target.value)}
          />
        </Field>

        <Field label="Max Capacity" hint="Optional maximum units" className="sm:col-span-2">
          <input
            type="number"
            min="0"
            className={inputCls}
            placeholder="e.g. 100"
            value={form.maxCapacity}
            onChange={(e) => set("maxCapacity", e.target.value)}
          />
        </Field>

        <Field label="Status" className="sm:col-span-2">
          <select
            className={inputCls}
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </Field>
      </div>
    </ModalShell>
  );
}
