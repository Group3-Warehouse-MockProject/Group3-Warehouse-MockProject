import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { ReceiptModal } from "@/components/receipt-modal";
import { InboundDetailModal } from "@/components/inbound-detail-modal";
import { type ReceiptMovement } from "@/types";
import { useApp } from "@/lib/app-context";
import { api } from "@/lib/api";
import {
  ArrowDownToLine, Plus, ChevronLeft, ChevronRight,
  Loader2, AlertCircle, CheckCircle2, Clock, XCircle, Eye,
  Search, Filter, X, Upload, Download,
} from "lucide-react";
import { InboundImportModal } from "@/components/inbound-import-modal";

export const Route = createFileRoute("/inbound")({
  head: () => ({ meta: [{ title: "Inbound — TechStock" }] }),
  component: InboundPage,
});

interface WarehouseInfo { id: string; code: string; }

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  PENDING:  { label: "Pending",  icon: Clock,        className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  APPROVED: { label: "Approved", icon: CheckCircle2, className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  REJECTED: { label: "Rejected", icon: XCircle,      className: "bg-red-500/15 text-red-400 border-red-500/30" },
};

function StatusBadge({ status }: { status?: string }) {
  const cfg = STATUS_CONFIG[status ?? ""] ?? STATUS_CONFIG["PENDING"];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.className}`}>
      <Icon className="size-3" />{cfg.label}
    </span>
  );
}

interface Filters {
  warehouse: string;
  status: string;
  staff: string;
  qtyMin: string;
  qtyMax: string;
  dateFrom: string;
  dateTo: string;
}

const DEFAULT_FILTERS: Filters = {
  warehouse: "", status: "", staff: "",
  qtyMin: "", qtyMax: "", dateFrom: "", dateTo: "",
};

function InboundPage() {
  const { activeWarehouseId, canSwitchWarehouse, refreshTick } = useApp();

  const [movements, setMovements] = useState<ReceiptMovement[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseInfo[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  
  // Server-side pagination state
  const [page, setPage]             = useState(0); // 0-indexed for backend
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const limit = 15;

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters]         = useState<Filters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen]   = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Modal state
  const [createOpen, setCreateOpen]         = useState(false);
  const [importOpen, setImportOpen]         = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<ReceiptMovement | null>(null);

  // Close filter panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    api.get<WarehouseInfo[]>("/warehouses").then((res) => setWarehouses(res.data)).catch(() => {});
  }, []);

  useEffect(() => { fetchReceipts(page); }, [page, activeWarehouseId, refreshTick]);

  function fetchReceipts(currentPage: number) {
    setLoading(true); setError(null);
    const params: Record<string, string | number> = { type: "INBOUND", page: currentPage, size: limit };
    if (activeWarehouseId) params.warehouseIdParam = activeWarehouseId;
    api.get<{ content: ReceiptMovement[], totalPages: number, totalElements: number }>("/receipts", { params })
      .then((res) => {
        setMovements(res.data?.content ?? (res.data as any));
        setTotalPages(res.data?.totalPages ?? 1);
        setTotalElements(res.data?.totalElements ?? 0);
      })
      .catch(() => setError("Failed to load inbound receipts. Please try again."))
      .finally(() => setLoading(false));
  }

  function handleUpdated(updated: ReceiptMovement[]) {
    if (!updated.length) return;
    const rid = updated[0].receiptId;
    setMovements((prev) =>
      [...prev.filter((m) => m.receiptId !== rid), ...updated].sort((a, b) => {
        const timeA = a.createdAt || "";
        const timeB = b.createdAt || "";
        const cmp = timeB.localeCompare(timeA);
        if (cmp !== 0) return cmp;
        return b.id.localeCompare(a.id);
      })
    );
    setSelectedMovement((prev) => (prev?.receiptId === rid ? updated[0] : prev));
  }

  const warehouseCode = (id: string) => warehouses.find((w) => w.id === id)?.code ?? id;

  // Unique dropdown options derived from data
  const staffOptions  = useMemo(() => [...new Set(movements.map((m) => m.staff))].sort(),  [movements]);

  // Active filter count (for badge on Filter button)
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // Inline filter validation
  const qtyRangeError =
    filters.qtyMin !== "" && filters.qtyMax !== "" && Number(filters.qtyMin) > Number(filters.qtyMax)
      ? "Min qty must be less than or equal to Max qty"
      : filters.qtyMin !== "" && Number(filters.qtyMin) < 0
      ? "Qty cannot be negative"
      : filters.qtyMax !== "" && Number(filters.qtyMax) < 0
      ? "Max qty cannot be negative"
      : null;

  const dateRangeError =
    filters.dateFrom !== "" && filters.dateTo !== "" && filters.dateFrom > filters.dateTo
      ? "\"From\" date must be on or before \"To\" date"
      : null;

  const hasFilterError = !!qtyRangeError || !!dateRangeError;

  // Apply search + filters
  const filteredMovements = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return movements.filter((m) => {
      // Search: Receipt #, Product Name, SKU, Supplier
      if (q) {
        const receiptNum = `r-${m.receiptId}`;
        if (
          !receiptNum.includes(q) &&
          !m.product.toLowerCase().includes(q) &&
          !m.sku.toLowerCase().includes(q) &&
          !m.partner.toLowerCase().includes(q)
        ) return false;
      }

      // Warehouse dropdown
      if (filters.warehouse && m.warehouseId !== filters.warehouse) return false;
      // Status dropdown
      if (filters.status && m.status !== filters.status) return false;
      // Staff dropdown
      if (filters.staff && m.staff !== filters.staff) return false;
      // Qty range
      if (filters.qtyMin && m.qty < Number(filters.qtyMin)) return false;
      if (filters.qtyMax && m.qty > Number(filters.qtyMax)) return false;
      // Date range
      if (filters.dateFrom && m.date < filters.dateFrom) return false;
      if (filters.dateTo   && m.date > filters.dateTo)   return false;
      return true;
    });
  }, [movements, searchQuery, filters]);

  // Reset page whenever filters change
  useEffect(() => { setPage(0); }, [searchQuery, filters, activeWarehouseId]);

  // Group movements by receiptId after filtering
  const groupedMovements = useMemo(() => {
    const groups = new Map<number, ReceiptMovement[]>();
    for (const m of filteredMovements) {
      if (!groups.has(m.receiptId)) groups.set(m.receiptId, []);
      groups.get(m.receiptId)!.push(m);
    }
    return Array.from(groups.values());
  }, [filteredMovements]);

  const totalReceiptsCount = new Set(movements.map((m) => m.receiptId)).size;
  const totalIn          = filteredMovements.reduce((s, m) => s + (m.qty ?? 0), 0);
  const suppliersSet     = new Set(filteredMovements.map((m) => m.partner));

  function setFilter<K extends keyof Filters>(key: K, val: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: val }));
  }
  function clearFilters() { setFilters(DEFAULT_FILTERS); setSearchQuery(""); }

  const handleExport = () => {
    if (filteredMovements.length === 0) return;
    const headers = ["Receipt #", "Product", "SKU", "Supplier", "Warehouse", "Qty", "Date", "Status", "Received by"];
    const csvContent = [
      headers.join(","),
      ...filteredMovements.map((m) =>
        [
          `"R-${m.receiptId}"`,
          `"${m.product.replace(/"/g, '""')}"`,
          `"${m.sku.replace(/"/g, '""')}"`,
          `"${m.partner.replace(/"/g, '""')}"`,
          `"${warehouseCode(m.warehouseId).replace(/"/g, '""')}"`,
          m.qty,
          m.date,
          m.status,
          `"${m.staff.replace(/"/g, '""')}"`
        ].join(",")
      )
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `inbound_receipts_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sq = searchQuery.toLowerCase().trim();
  const isSearchMatchingReceipt = sq && filteredMovements.some(m => `r-${m.receiptId}`.includes(sq));
  const isSearchMatchingProduct = sq && filteredMovements.some(m => m.product.toLowerCase().includes(sq) || m.sku.toLowerCase().includes(sq));
  const isSearchMatchingSupplier = sq && filteredMovements.some(m => m.partner.toLowerCase().includes(sq));

  return (
    <AppShell>
      <div className="space-y-6">

        {/* Title row */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Inbound</h1>
            <p className="text-sm text-muted-foreground mt-1">Goods received from suppliers</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setImportOpen(true)}
              className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm flex items-center gap-2 hover:bg-muted"
            >
              <Download className="size-4" /> Import
            </button>
            <button
              onClick={handleExport}
              className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm flex items-center gap-2 hover:bg-muted"
            >
              <Upload className="size-4" /> Export
            </button>
            <button
              onClick={() => setCreateOpen(true)}
              className="h-10 px-4 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Plus className="size-4" /> New inbound receipt
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="surface-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Units received</div>
            <div className="mt-2 flex items-center gap-3">
              <div className="size-10 rounded-lg grid place-items-center text-primary"
                style={{ background: "color-mix(in oklab, var(--primary) 15%, transparent)" }}>
                <ArrowDownToLine className="size-5" />
              </div>
              <div className="text-3xl font-bold">{loading ? "—" : totalIn}</div>
            </div>
          </div>
          <div className="surface-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Receipts</div>
            <div className="mt-2 text-3xl font-bold">{loading ? "—" : groupedMovements.length}</div>
            <div className="text-xs text-muted-foreground mt-1">All time</div>
          </div>
          <div className="surface-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Suppliers</div>
            <div className="mt-2 text-3xl font-bold">{loading ? "—" : suppliersSet.size}</div>
            <div className="text-xs text-muted-foreground mt-1">Active</div>
          </div>
        </div>

        {/* Search + Filter bar */}
        <div className="flex items-center gap-3">
          {/* Search input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search receipt #, product, supplier…"
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Clear all */}
          {(activeFilterCount > 0 || searchQuery) && (
            <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
              Clear all
            </button>
          )}

          {/* Filter button + panel */}
          <div className="relative ml-auto" ref={filterRef}>
            <button
              onClick={() => setFilterOpen((o) => !o)}
              className={`h-10 px-4 rounded-lg text-sm font-medium flex items-center gap-2 border transition-colors ${
                filterOpen || activeFilterCount > 0
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary border-border hover:bg-muted"
              }`}
            >
              <Filter className="size-4" />
              Filter
              {activeFilterCount > 0 && (
                <span className="ml-0.5 size-5 rounded-full bg-white/20 text-xs grid place-items-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Filter panel */}
            {filterOpen && (
              <div className="absolute right-0 top-12 z-30 w-72 surface-card rounded-xl shadow-xl border border-border p-4 space-y-4">

                {/* Warehouse */}
                {canSwitchWarehouse && (
                  <FilterField label="Warehouse" isActive={!!filters.warehouse}>
                    <select value={filters.warehouse} onChange={(e) => setFilter("warehouse", e.target.value)} className="filter-select">
                      <option value="">All Warehouses</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>{w.code}</option>
                      ))}
                    </select>
                  </FilterField>
                )}

                {/* Status */}
                <FilterField label="Status" isActive={!!filters.status}>
                  <select value={filters.status} onChange={(e) => setFilter("status", e.target.value)} className="filter-select">
                    <option value="">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </FilterField>

                {/* Received by */}
                <FilterField label="Received by" isActive={!!filters.staff}>
                  <select value={filters.staff} onChange={(e) => setFilter("staff", e.target.value)} className="filter-select">
                    <option value="">All Staff</option>
                    {staffOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </FilterField>

                {/* Qty range */}
                <FilterField label="Qty range" isActive={!!filters.qtyMin || !!filters.qtyMax}>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={0} placeholder="Min"
                      value={filters.qtyMin} onChange={(e) => setFilter("qtyMin", e.target.value)}
                      className={`filter-input ${qtyRangeError ? "border-destructive" : ""}`}
                    />
                    <span className="text-muted-foreground text-sm">—</span>
                    <input
                      type="number" min={0} placeholder="Max"
                      value={filters.qtyMax} onChange={(e) => setFilter("qtyMax", e.target.value)}
                      className={`filter-input ${qtyRangeError ? "border-destructive" : ""}`}
                    />
                  </div>
                  {qtyRangeError && (
                    <p className="text-xs text-destructive mt-1">{qtyRangeError}</p>
                  )}
                </FilterField>

                {/* Date range */}
                <FilterField label="Date range" isActive={!!filters.dateFrom || !!filters.dateTo}>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={filters.dateFrom} onChange={(e) => setFilter("dateFrom", e.target.value)}
                      className={`filter-input ${dateRangeError ? "border-destructive" : ""}`}
                    />
                    <span className="text-muted-foreground text-sm">—</span>
                    <input
                      type="date"
                      value={filters.dateTo} onChange={(e) => setFilter("dateTo", e.target.value)}
                      className={`filter-input ${dateRangeError ? "border-destructive" : ""}`}
                    />
                  </div>
                  {dateRangeError && (
                    <p className="text-xs text-destructive mt-1">{dateRangeError}</p>
                  )}
                </FilterField>

                {/* Reset filters */}
                {activeFilterCount > 0 && (
                  <button
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                    className="w-full h-8 rounded-lg text-xs border border-border hover:bg-secondary text-muted-foreground"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="surface-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">Loading inbound receipts…</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center gap-3 py-20 text-destructive">
              <AlertCircle className="size-5" />
              <span className="text-sm">{error}</span>
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
              <Search className="size-8 opacity-30" />
              <span className="text-sm">
                {hasFilterError
                  ? "Fix the filter errors above to see results."
                  : "No receipts match your search or filters."}
              </span>
              {(searchQuery || activeFilterCount > 0) && !hasFilterError && (
                <button onClick={clearFilters} className="text-xs text-primary underline underline-offset-2 mt-1">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <div className="min-w-[850px] text-sm">
                  {/* Grid Table Header */}
                  <div className="grid grid-cols-[90px_minmax(140px,2fr)_minmax(100px,1.5fr)_90px_60px_90px_100px_110px_110px_40px] items-center gap-2 px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40 font-medium border-b border-border/60">
                    <div>Date{(filters.dateFrom || filters.dateTo) && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 ml-1.5 align-middle" />}</div>
                    <div>Status{filters.status && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 ml-1.5 align-middle" />}</div>
                    <div>Received by{filters.staff && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 ml-1.5 align-middle" />}</div>
                    <div>Assignee</div>
                    <div />
                  </div>

                  {/* Grid Table Body */}
                  <div className="divide-y divide-border/60">
                    {filteredMovements.map((m) => (
                      <div
                        key={m.id}
                        className="grid grid-cols-[90px_minmax(140px,2fr)_minmax(100px,1.5fr)_90px_60px_90px_100px_110px_110px_40px] items-center gap-2 px-4 py-3.5 hover:bg-secondary/30 transition-colors"
                      >
                        <div className="font-mono text-xs">R-{m.receiptId}</div>
                        <div>
                          <div className="font-medium">{m.product}</div>
                          <div className="text-xs text-muted-foreground font-mono">{m.sku}</div>
                        </div>
                        <div className="truncate">{m.partner}</div>
                        <div className="font-mono text-xs">{warehouseCode(m.warehouseId)}</div>
                        <div className="text-right font-semibold text-primary">+{m.qty}</div>
                        <div className="text-muted-foreground">{m.date}</div>
                        <div><StatusBadge status={m.status} /></div>
                        <div className="text-muted-foreground truncate">{m.staff}</div>
                        <div className="text-muted-foreground truncate">{m.assignedUserName ?? "—"}</div>
                        <div className="text-center">
                          <button
                            onClick={() => setSelectedMovement(m)}
                            title="View detail"
                            className="size-8 rounded-md grid place-items-center text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                          >
                            <Eye className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-border/60 text-sm">
                  <div className="text-muted-foreground text-xs">
                    Showing {page * limit + 1}–{Math.min((page + 1) * limit, totalElements)} of {totalElements} entries
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="size-8 grid place-items-center rounded-md border border-border bg-secondary hover:bg-muted disabled:opacity-40"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i).map((n) => (
                      <button
                        key={n}
                        onClick={() => setPage(n)}
                        className={`size-8 rounded-md text-xs font-medium ${
                          n === page ? "bg-primary text-primary-foreground" : "bg-secondary border border-border hover:bg-muted"
                        }`}
                      >
                        {n + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="size-8 grid place-items-center rounded-md border border-border bg-secondary hover:bg-muted disabled:opacity-40"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ReceiptModal open={createOpen} onClose={() => setCreateOpen(false)} type="Inbound" onSaved={fetchReceipts} />

      <InboundImportModal open={importOpen} onClose={() => setImportOpen(false)} onSaved={fetchReceipts} />

      {selectedMovement && (
        <InboundDetailModal
          allMovements={movements}
          movement={selectedMovement}
          warehouseCode={warehouseCode}
          onClose={() => setSelectedMovement(null)}
          onUpdated={handleUpdated}
        />
      )}

      <style>{`
        .filter-select {
          width: 100%; height: 2.25rem; padding: 0 0.75rem;
          border-radius: 0.5rem; background: var(--input);
          border: 1px solid var(--border); font-size: 0.8125rem;
          color: var(--foreground);
        }
        .filter-select:focus { outline: none; box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent); }
        .filter-input {
          flex: 1; height: 2.25rem; padding: 0 0.5rem;
          border-radius: 0.5rem; background: var(--input);
          border: 1px solid var(--border); font-size: 0.8125rem;
          color: var(--foreground); min-width: 0;
        }
        .filter-input:focus { outline: none; box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent); }
      `}</style>
    </AppShell>
  );
}

function FilterField({ label, isActive, children }: { label: string; isActive?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
        {label}
        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-green-500" />}
      </div>
      {children}
    </div>
  );
}
