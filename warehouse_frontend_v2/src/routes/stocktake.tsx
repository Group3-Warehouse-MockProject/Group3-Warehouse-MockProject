import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/lib/app-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { warehouses } from "@/lib/warehouse-data";
import { ApprovalHistoryItem } from "@/types";
import {
  ClipboardCheck, Plus, X, Save, ListChecks,
  AlertTriangle, CheckCircle2, Boxes,
  ChevronLeft, ChevronRight, Loader2,
  Search, Filter, History, Clock
} from "lucide-react";

export const Route = createFileRoute("/stocktake")({
  head: () => ({ meta: [{ title: "Stocktake — TechStock" }] }),
  component: StocktakePage,
});

// ----------------------------------------------------------------
// Kiểu dữ liệu
// ----------------------------------------------------------------
interface StocktakeDetail {
  id: number;
  sku: string;
  productName: string;
  systemQuantity: number;
  actualQuantity: number;
  difference: number;
  remark?: string;
}

interface Stocktake {
  id: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  remark?: string;
  warehouseId: number;
  warehouseName: string;
  warehouseCode: string;
  createdByUserId: number;
  createdByName: string;
  assignedUserId?: number;
  assignedUserName?: string;
  date: string;
  items: number;
  variance: number;
  details: StocktakeDetail[];
  history?: ApprovalHistoryItem[];
}

// Map status DB → label hiển thị
const statusLabel: Record<string, string> = {
  PENDING: "Draft",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const statusTone: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-warning/15 text-warning",
  COMPLETED: "bg-success/15 text-success",
  CANCELLED: "bg-destructive/15 text-destructive",
};

interface StocktakeFilters {
  status: string;
  warehouseCode: string;
  dateFrom: string;
  dateTo: string;
  varianceStatus: string;
}

const DEFAULT_FILTERS: StocktakeFilters = {
  status: "",
  warehouseCode: "",
  dateFrom: "",
  dateTo: "",
  varianceStatus: "",
};

// ----------------------------------------------------------------
// Page chính
// ----------------------------------------------------------------
function StocktakePage() {
  const { currentUser, activeWarehouseId, canSwitchWarehouse } = useApp();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Stocktake | null>(null);
  const [counting, setCounting] = useState<Stocktake | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const limit = 15;

  const canCreate =
    currentUser?.role === "Warehouse_Manager" ||
    currentUser?.role === "Admin" ||
    currentUser?.role === "Manager";

  const canCount =
    currentUser?.role === "Staff" ||
    currentUser?.role === "Warehouse_Manager";

  // Chỉ nhân viên được gán (hoặc Manager/Admin/Phiếu chưa gán) mới được bấm đếm
  const isUserAssignedOrManager = (sheet: Stocktake) => {
    if (currentUser?.role === "Warehouse_Manager" || currentUser?.role === "Admin" || currentUser?.role === "Manager") {
      return true;
    }
    // Nếu phiếu chưa gán cho ai, Staff trong kho đều được đếm
    if (!sheet.assignedUserId && (!sheet.assignedUserName || sheet.assignedUserName === "—")) {
      return true;
    }
    // Kiểm tra theo ID nhân viên
    if (currentUser?.id && sheet.assignedUserId) {
      if (String(sheet.assignedUserId) === String(currentUser.id)) {
        return true;
      }
    }
    // Kiểm tra theo tên / username nhân viên
    if (currentUser?.name && sheet.assignedUserName) {
      const uName = currentUser.name.trim().toLowerCase();
      const aName = sheet.assignedUserName.trim().toLowerCase();
      if (aName === uName || aName.includes(uName) || uName.includes(aName)) {
        return true;
      }
    }
    // Phiếu đã gán cho người khác -> STAFF này không được đếm!
    return false;
  };

  // Chỉ Warehouse_Manager mới được đóng phiếu
  const canComplete = currentUser?.role === "Warehouse_Manager";

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<StocktakeFilters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

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

  function setFilter<K extends keyof StocktakeFilters>(key: K, val: StocktakeFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: val }));
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery("");
    setPage(1);
  }

  // --- Lấy một trang phiếu từ API ---
  const { data: stocktakePage, isLoading } = useQuery<{
    content: Stocktake[];
    totalPages: number;
    totalElements: number;
  }>({
    queryKey: ["stocktake", activeWarehouseId, page],
    queryFn: async () => {
      const res = await api.get("/stocktake", {
        params: {
          ...(activeWarehouseId ? { warehouseIdParam: activeWarehouseId } : {}),
          page: page - 1,
          size: limit,
        },
      });
      return res.data;
    },
  });
  const stocktakes = stocktakePage?.content ?? [];

  // Lấy danh sách tất cả các kho phục vụ filter
  const { data: rawApiWarehouses = [] } = useQuery<any[]>({
    queryKey: ["warehouses"],
    queryFn: async () => {
      try {
        const res = await api.get("/warehouses");
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });
  const apiWarehouses = Array.isArray(rawApiWarehouses) ? rawApiWarehouses : [];

  const warehousesList = apiWarehouses.length > 0 ? apiWarehouses : warehouses;

  // --- Mutation: Đổi trạng thái phiếu ---
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await api.put(`/stocktake/${id}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stocktake"] });
      toast.success("Status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  // --- Mutation: Lưu số đếm thực tế ---
  const submitCountMutation = useMutation({
    mutationFn: async ({
      id,
      details,
    }: {
      id: number;
      details: { productId: number; actualQuantity: number; systemQuantity: number }[];
    }) => {
      const res = await api.post(`/stocktake/${id}/details`, details);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stocktake"] });
      setCounting(null);
      setCounts({});
      toast.success("Count saved successfully");
    },
    onError: () => toast.error("Failed to save count"),
  });

  // Lọc danh sách phiếu kiểm kê
  const filteredStocktakes = useMemo(() => {
    return stocktakes.filter((s) => {
      // 1. Search Query (Free-text)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const sheetNum = `st-${String(s.id).padStart(4, "0")}`.toLowerCase();
        const rawNum = String(s.id);
        const createdBy = (s.createdByName || "").toLowerCase();
        const assignedTo = (s.assignedUserName || "").toLowerCase();

        const matchesSheet = sheetNum.includes(q) || rawNum === q;
        const matchesCreatedBy = createdBy.includes(q);
        const matchesAssignedTo = assignedTo.includes(q);

        if (!matchesSheet && !matchesCreatedBy && !matchesAssignedTo) {
          return false;
        }
      }

      // 2. Status
      if (filters.status && s.status !== filters.status) {
        return false;
      }

      // 3. Warehouse Code
      if (filters.warehouseCode && s.warehouseCode !== filters.warehouseCode) {
        return false;
      }

      // 4. Date Range
      if (filters.dateFrom && s.date < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && s.date > filters.dateTo) {
        return false;
      }

      // 5. Variance Status
      if (filters.varianceStatus === "HAS_VARIANCE" && s.variance === 0) {
        return false;
      }
      if (filters.varianceStatus === "NO_VARIANCE" && s.variance !== 0) {
        return false;
      }

      return true;
    });
  }, [stocktakes, searchQuery, filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status) count++;
    if (filters.warehouseCode) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.varianceStatus) count++;
    return count;
  }, [filters]);

  // The server applies page boundaries. Filters currently apply to this page.
  const totalPages = Math.max(1, stocktakePage?.totalPages ?? 1);
  const safePage = Math.min(page, totalPages);
  const paginatedList = filteredStocktakes;

  // KPI (tính dựa trên filteredStocktakes)
  const totalItems = filteredStocktakes.reduce((s, x) => s + (x?.items || 0), 0);
  const totalVar = filteredStocktakes.reduce((s, x) => s + (x?.variance || 0), 0);
  const inProgress = filteredStocktakes.filter((s) => s?.status === "IN_PROGRESS").length;
  const completed = filteredStocktakes.filter((s) => s?.status === "COMPLETED").length;

  // Số sản phẩm đã được nhập actual qty
  const countingDetails = (counting?.details || []).filter(Boolean);
  const filledCount = counting
    ? countingDetails.filter((d) => d && d.id !== undefined && counts[String(d.id)] !== undefined).length
    : 0;
  const totalCount = countingDetails.length;
  const allFilled = counting ? filledCount === totalCount && totalCount > 0 : false;

  // Submit số đếm
  const handleSaveCount = () => {
    if (!counting) return;
    if (!allFilled) {
      toast.error(`Please count all products first (${filledCount}/${totalCount} done)`);
      return;
    }
    const details = countingDetails.map((d) => ({
      productId: d.id,
      actualQuantity: counts[String(d.id)] ?? d.actualQuantity,
      systemQuantity: d.systemQuantity,
    }));
    submitCountMutation.mutate({ id: counting.id, details });
  };

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Stocktake</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Warehouse Managers create count sheets; Staff record actual on-hand quantities.
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() => setCreating(true)}
              className="h-10 px-4 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Plus className="size-4" /> Create stocktake sheet
            </button>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={ListChecks} label="Total sheets" value={filteredStocktakes.length} tone="primary" />
          <Kpi icon={AlertTriangle} label="In progress" value={inProgress} tone="warning" />
          <Kpi icon={CheckCircle2} label="Completed" value={completed} tone="accent" />
          <Kpi icon={Boxes} label="Items / variance" value={`${totalItems} / ${totalVar}`} tone="primary" />
        </div>

        {/* Search + Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Free-text Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search sheet # (e.g. ST-0001), staff name..."
              className="w-full h-10 pl-9 pr-8 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Filter Popover & Clear All */}
          <div className="flex items-center gap-2 ml-auto" ref={filterRef}>
            {(activeFilterCount > 0 || searchQuery) && (
              <button
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Clear all
              </button>
            )}

            <div className="relative">
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

              {/* Filter Panel */}
              {filterOpen && (
                <div className="absolute right-0 top-12 z-30 w-80 surface-card rounded-xl shadow-xl border border-border p-4 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <span className="text-sm font-semibold">Filter Stocktakes</span>
                    {activeFilterCount > 0 && (
                      <button
                        onClick={() => {
                          setFilters(DEFAULT_FILTERS);
                          setPage(1);
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Reset filters
                      </button>
                    )}
                  </div>

                  {/* 1. Warehouse Filter (chỉ hiển thị với Admin & Manager) */}
                  {canSwitchWarehouse && (
                    <FilterField label="Warehouse">
                      <select
                        value={filters.warehouseCode}
                        onChange={(e) => {
                          setFilter("warehouseCode", e.target.value);
                          setPage(1);
                        }}
                        className="w-full h-9 px-3 rounded-lg bg-input border border-border text-xs focus:outline-none"
                      >
                        <option value="">All Warehouses</option>
                        {warehousesList.map((w: any) => (
                          <option key={w.id} value={w.code}>
                            {w.code} - {w.name}
                          </option>
                        ))}
                      </select>
                    </FilterField>
                  )}

                  {/* 2. Status Filter */}
                  <FilterField label="Status">
                    <select
                      value={filters.status}
                      onChange={(e) => {
                        setFilter("status", e.target.value);
                        setPage(1);
                      }}
                      className="w-full h-9 px-3 rounded-lg bg-input border border-border text-xs focus:outline-none"
                    >
                      <option value="">All Statuses</option>
                      <option value="PENDING">Draft</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </FilterField>

                  {/* 3. Variance Status Filter */}
                  <FilterField label="Variance Status">
                    <select
                      value={filters.varianceStatus}
                      onChange={(e) => {
                        setFilter("varianceStatus", e.target.value);
                        setPage(1);
                      }}
                      className="w-full h-9 px-3 rounded-lg bg-input border border-border text-xs focus:outline-none"
                    >
                      <option value="">All</option>
                      <option value="HAS_VARIANCE">Has Variance (≠ 0)</option>
                      <option value="NO_VARIANCE">No Variance (= 0)</option>
                    </select>
                  </FilterField>

                  {/* 4. Date Range Filter */}
                  <FilterField label="Date Range">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-muted-foreground block mb-1">From</span>
                        <input
                          type="date"
                          value={filters.dateFrom}
                          onChange={(e) => {
                            setFilter("dateFrom", e.target.value);
                            setPage(1);
                          }}
                          className="w-full h-9 px-2 rounded-lg bg-input border border-border text-xs"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground block mb-1">To</span>
                        <input
                          type="date"
                          value={filters.dateTo}
                          onChange={(e) => {
                            setFilter("dateTo", e.target.value);
                            setPage(1);
                          }}
                          className="w-full h-9 px-2 rounded-lg bg-input border border-border text-xs"
                        />
                      </div>
                    </div>
                  </FilterField>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bảng danh sách */}
        <div className="surface-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">Loading stocktake sheets…</span>
            </div>
          ) : paginatedList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
              <Search className="size-8 opacity-30" />
              <span className="text-sm">
                {activeFilterCount > 0 || searchQuery
                  ? "No stocktake sheets match your search or filters."
                  : "No stocktake sheets yet."}
              </span>
              {(searchQuery || activeFilterCount > 0) && (
                <button onClick={clearFilters} className="text-xs text-primary underline underline-offset-2 mt-1">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40">
                    <tr>
                      <th className="text-left p-4">Sheet #</th>
                      <th className="text-left p-4">Date</th>
                      <th className="text-left p-4">Warehouse</th>
                      <th className="text-left p-4">Created by</th>
                      <th className="text-left p-4">Assigned to</th>
                      <th className="text-right p-4">Items</th>
                      <th className="text-right p-4">Variance</th>
                      <th className="text-center p-4">Status</th>
                      <th className="text-right p-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedList.map((s) => {
                      if (!s) return null;
                      return (
                        <tr
                          key={s.id || Math.random()}
                          onClick={() => setViewing(s)}
                          className="border-t border-border/60 hover:bg-secondary/30 transition-colors cursor-pointer"
                        >
                          <td className="p-4 font-mono text-xs">ST-{String(s.id || 0).padStart(4, "0")}</td>
                          <td className="p-4 text-muted-foreground">{s.date || "—"}</td>
                          <td className="p-4 font-mono text-xs">{s.warehouseCode || "—"}</td>
                          <td className="p-4">{s.createdByName || "—"}</td>
                          <td className="p-4 text-muted-foreground">{s.assignedUserName ?? "—"}</td>
                          <td className="p-4 text-right font-medium">{s.items ?? 0}</td>
                          <td className={`p-4 text-right font-semibold ${(s.status === "PENDING" || s.status === "CANCELLED") ? "text-muted-foreground" : (s.variance || 0) > 0 ? "text-warning" : "text-muted-foreground"}`}>
                            {(s.status === "PENDING" || s.status === "CANCELLED") ? "0" : (s.variance || 0) > 0 ? `±${s.variance}` : "0"}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-medium inline-block ${statusTone[s.status] || "bg-muted text-muted-foreground"}`}>
                              {statusLabel[s.status] || s.status || "Draft"}
                            </span>
                          </td>
                          <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              {/* Staff được gán / WH_Manager nhập số đếm */}
                              {canCount && isUserAssignedOrManager(s) && s.status !== "COMPLETED" && s.status !== "CANCELLED" && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setCounting(s); setCounts({}); }}
                                  className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
                                >
                                  <ClipboardCheck className="size-3.5" /> Count
                                </button>
                              )}
                              {/* Chỉ WH_Manager được Complete */}
                              {canComplete && s.status === "IN_PROGRESS" && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: s.id, status: "COMPLETED" }); }}
                                  className="text-xs text-success hover:underline inline-flex items-center gap-1 font-medium"
                                >
                                  <CheckCircle2 className="size-3.5" /> Complete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Phân trang */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-border/60 text-sm">
                  <div className="text-muted-foreground text-xs">
                    Showing {(safePage - 1) * limit + 1}–{Math.min(safePage * limit, stocktakePage?.totalElements ?? stocktakes.length)} of {stocktakePage?.totalElements ?? stocktakes.length} entries
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
                        className={`size-8 rounded-md text-xs font-medium ${n === safePage ? "bg-primary text-primary-foreground" : "bg-secondary border border-border hover:bg-muted"}`}
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
            </>
          )}
        </div>
      </div>

      {/* Modal tạo phiếu */}
      {creating && (
        <Modal onClose={() => setCreating(false)} title="Create stocktake sheet">
          <CreateForm
            onClose={() => setCreating(false)}
            activeWarehouseId={activeWarehouseId}
            currentUserWarehouseId={currentUser?.warehouseId ?? null}
          />
        </Modal>
      )}

      {/* Modal nhập số đếm */}
      {counting && (
        <Modal onClose={() => setCounting(null)} title={`Count — ST-${String(counting.id ?? "").padStart(4, "0")} • ${counting.warehouseName ?? ""}`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Enter the actual quantity counted on the shelf for each SKU.
              </p>
              {/* Progress đếm */}
              <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                allFilled ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
              }`}>
                {filledCount}/{totalCount} filled
              </span>
            </div>
            <div className="max-h-[420px] overflow-auto rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40 sticky top-0">
                  <tr>
                    <th className="text-left p-3">SKU</th>
                    <th className="text-left p-3">Product</th>
                    <th className="text-right p-3">System</th>
                    <th className="text-right p-3">Actual</th>
                    <th className="text-right p-3">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {countingDetails.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground text-xs">
                        No products found in this sheet.
                      </td>
                    </tr>
                  ) : (
                    countingDetails.map((d) => {
                      if (!d) return null;
                      const actual = counts[String(d.id)];
                      const sysQty = d.systemQuantity ?? 0;
                      const variance = actual === undefined ? null : actual - sysQty;
                      return (
                        <tr key={d.id} className="border-t border-border/60">
                          <td className="p-3 font-mono text-xs">{d.sku || "—"}</td>
                          <td className="p-3">{d.productName || "—"}</td>
                          <td className="p-3 text-right">{sysQty}</td>
                          <td className="p-3 text-right">
                            <input
                              type="number"
                              min={0}
                              value={actual ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === "") {
                                  // Xóa key → ô trống thực sự, không nhảy về 0
                                  setCounts((c) => {
                                    const next = { ...c };
                                    delete next[String(d.id)];
                                    return next;
                                  });
                                } else {
                                  setCounts((c) => ({ ...c, [String(d.id)]: Number(raw) }));
                                }
                              }}
                              className="w-20 h-8 px-2 rounded-md bg-input border border-border text-right text-sm"
                            />
                          </td>
                          <td className={`p-3 text-right font-semibold ${variance === null ? "text-muted-foreground" : variance === 0 ? "text-success" : "text-warning"}`}>
                            {variance === null ? "—" : variance > 0 ? `+${variance}` : variance}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCounting(null)}
                className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCount}
                disabled={submitCountMutation.isPending || !allFilled}
                title={!allFilled ? `Fill all products first (${filledCount}/${totalCount})` : ""}
                className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "var(--gradient-primary)" }}
              >
                {submitCountMutation.isPending
                  ? <Loader2 className="size-4 animate-spin" />
                  : <Save className="size-4" />}
                Save count
              </button>
            </div>
          </div>
        </Modal>
      )}
      {/* Modal xem chi tiết phiếu */}
      {viewing && (
        <Modal
          onClose={() => setViewing(null)}
          title={`Detail — ST-${String(viewing.id ?? "").padStart(4, "0")} • ${viewing.warehouseName ?? ""}`}
        >
          <div className="space-y-4">
            {/* Thông tin tổng hợp */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Status", value: <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusTone[viewing.status] || "bg-muted text-muted-foreground"}`}>{statusLabel[viewing.status] || viewing.status}</span> },
                { label: "Created by", value: viewing.createdByName ?? "—" },
                { label: "Assigned to", value: viewing.assignedUserName ?? "—" },
                { label: "Total variance", value: <span className={(viewing.variance || 0) > 0 ? "text-warning font-semibold" : "text-success font-semibold"}>{(viewing.variance || 0) > 0 ? `±${viewing.variance}` : "0"}</span> },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-lg bg-secondary/40 p-3">
                  <div className="text-xs text-muted-foreground mb-1">{label}</div>
                  <div className="text-sm">{value}</div>
                </div>
              ))}
            </div>

            {/* Bảng chi tiết từng sản phẩm */}
            <div className="max-h-[380px] overflow-auto rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40 sticky top-0">
                  <tr>
                    <th className="text-left p-3">SKU</th>
                    <th className="text-left p-3">Product</th>
                    <th className="text-right p-3">System</th>
                    <th className="text-right p-3">Actual</th>
                    <th className="text-right p-3">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const viewingDetails = (viewing?.details || []).filter(Boolean);
                    if (viewingDetails.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-muted-foreground text-xs">
                            No count data yet — staff has not submitted counts.
                          </td>
                        </tr>
                      );
                    }
                    return viewingDetails.map((d) => {
                      if (!d) return null;
                      const sys = d.systemQuantity ?? 0;
                      const isDraft = viewing.status === "PENDING";
                      const hasActual = !isDraft && d.actualQuantity !== null && d.actualQuantity !== undefined;
                      const variance = hasActual ? (d.actualQuantity! - sys) : null;
                      return (
                        <tr key={d.id} className="border-t border-border/60">
                          <td className="p-3 font-mono text-xs">{d.sku || "—"}</td>
                          <td className="p-3">{d.productName || "—"}</td>
                          <td className="p-3 text-right">{sys}</td>
                          <td className="p-3 text-right font-medium">{hasActual ? d.actualQuantity : "—"}</td>
                          <td className={`p-3 text-right font-semibold ${
                            variance === null ? "text-muted-foreground" : variance === 0 ? "text-success" : "text-warning"
                          }`}>
                            {variance === null ? "—" : variance === 0 ? "0" : variance > 0 ? `+${variance}` : variance}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Approval History Timeline */}
            <div className="pt-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5">
                <History className="size-3.5" /> Approval History
              </div>
              
              <div className="relative border-l-2 border-border/60 ml-2 space-y-6">
                {[...(viewing.history || [])]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((event, idx, arr) => {
                    const isLatest = idx === 0;
                    
                    let ringColor = "bg-muted-foreground";
                    if (isLatest) {
                        if (event.newStatus === "COMPLETED" || event.newStatus === "APPROVED") ringColor = "bg-emerald-500";
                        else if (event.newStatus === "CANCELLED" || event.newStatus === "REJECTED") ringColor = "bg-red-500";
                        else if (event.newStatus === "IN_PROGRESS" || event.newStatus === "DELIVERING") ringColor = "bg-warning";
                        else ringColor = "bg-blue-500";
                    }

                    return (
                      <div key={event.id} className="relative pl-6">
                        <div className={`absolute -left-[9px] top-1 size-4 rounded-full border-[3px] border-background ${ringColor}`} />
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-foreground">
                              {statusLabel[event.newStatus] || event.newStatus}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              By: <strong className="text-foreground">{event.approverName}</strong>
                            </div>
                            {event.note && (
                              <div className="text-xs mt-0.5 text-muted-foreground italic">
                                "{event.note}"
                              </div>
                            )}
                          </div>
                          <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 bg-secondary px-2 py-1 rounded-md">
                            <Clock className="size-3" /> {new Date(event.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                {(!viewing.history || viewing.history.length === 0) && (
                  <div className="text-sm text-muted-foreground italic pl-4">No history recorded</div>
                )}
              </div>
            </div>

            {/* Footer action buttons */}
            <div className="flex items-center justify-between pt-2">
              <div>
                {canCreate && viewing.status !== "COMPLETED" && viewing.status !== "CANCELLED" && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to cancel stocktake sheet ST-${String(viewing.id).padStart(4, "0")}?`)) {
                        updateStatusMutation.mutate({ id: viewing.id, status: "CANCELLED" });
                        setViewing(null);
                      }
                    }}
                    disabled={updateStatusMutation.isPending}
                    className="h-10 px-4 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive/25 text-sm font-medium transition-colors"
                  >
                    Cancel sheet
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewing(null)}
                  className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm"
                >
                  Close
                </button>
                {canComplete && viewing.status === "IN_PROGRESS" && (
                  <button
                    onClick={() => {
                      updateStatusMutation.mutate({ id: viewing.id, status: "COMPLETED" });
                      setViewing(null);
                    }}
                    disabled={updateStatusMutation.isPending}
                    className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring disabled:opacity-60"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    <CheckCircle2 className="size-4" /> Complete sheet
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}

// ----------------------------------------------------------------
// CreateForm — Tạo phiếu kiểm kê mới
// ----------------------------------------------------------------
function CreateForm({
  onClose,
  activeWarehouseId,
  currentUserWarehouseId,
}: {
  onClose: () => void;
  activeWarehouseId: string | null;
  currentUserWarehouseId: string | null;
}) {
  const { currentUser, canSwitchWarehouse } = useApp();
  const queryClient = useQueryClient();

  // Lấy danh sách tất cả các kho
  const { data: rawApiWarehouses = [] } = useQuery<any[]>({
    queryKey: ["warehouses"],
    queryFn: async () => {
      try {
        const res = await api.get("/warehouses");
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });
  const apiWarehouses = Array.isArray(rawApiWarehouses) ? rawApiWarehouses : [];

  const warehousesList = apiWarehouses.length > 0 ? apiWarehouses : warehouses;

  // Kho mặc định được chọn
  const initialWarehouseId =
    currentUserWarehouseId ??
    activeWarehouseId ??
    (warehousesList[0]?.id ? String(warehousesList[0].id) : "1");

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(initialWarehouseId);
  const [remark, setRemark] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [assignedUserId, setAssignedUserId] = useState<number | "">("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Lấy danh sách sản phẩm theo kho đã chọn
  const { data: rawInventoryItems = [] } = useQuery({
    queryKey: ["inventory", selectedWarehouseId],
    queryFn: async () => {
      if (!selectedWarehouseId) return [];
      try {
        const res = await api.get("/inventory", {
          params: { warehouseIdParam: selectedWarehouseId, page: 0, size: 15 },
        });
        // Backend returns PageResponse; extract content
        const arr = res.data?.content ?? res.data;
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    },
    enabled: !!selectedWarehouseId,
  });
  const inventoryItems = Array.isArray(rawInventoryItems) ? rawInventoryItems : [];

  // Lấy danh sách staff thuộc kho đã chọn
  const { data: rawAllUsers = [] } = useQuery<any[]>({
    queryKey: ["users"],
    queryFn: async () => {
      try {
        const res = await api.get("/users");
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        return [];
      }
    },
  });
  const allUsers = Array.isArray(rawAllUsers) ? rawAllUsers : [];

  const staffOptions = allUsers.filter(
    (u: any) =>
      (u.role === "STAFF" || u.role === "Staff") &&
      u.warehouseId !== null &&
      String(u.warehouseId) === String(selectedWarehouseId) &&
      !u.isDeleted
  );

  // Lọc sản phẩm theo category đã chọn
  const filteredItems = categoryFilter
    ? inventoryItems.filter((i: any) => i.category === categoryFilter)
    : inventoryItems;

  // Tự động chọn tất cả sản phẩm theo mặc định khi tải kho
  useEffect(() => {
    if (inventoryItems.length > 0 && selectedProductIds.length === 0) {
      setSelectedProductIds(inventoryItems.map((i: any) => Number(i.productId ?? i.id)));
    }
  }, [inventoryItems]);

  const createMutation = useMutation({
    mutationFn: async (payload: {
      warehouseId: number;
      assignedUserId?: number;
      remark: string;
      productIds: number[];
    }) => {
      setFormError(null);
      const res = await api.post("/stocktake", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stocktake"] });
      toast.success("Stocktake sheet created successfully!");
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || "Failed to create stocktake sheet";
      setFormError(String(msg));
      toast.error(msg);
    },
  });

  const getProductId = (item: any) => Number(item.productId ?? item.id);

  const toggleProduct = (id: number) => {
    const numId = Number(id);
    setSelectedProductIds((prev) =>
      prev.includes(numId) ? prev.filter((x) => x !== numId) : [...prev, numId]
    );
  };

  const handleCreate = () => {
    setFormError(null);
    if (!selectedWarehouseId) {
      setFormError("Please select a warehouse");
      return;
    }
    if (selectedProductIds.length === 0) {
      setFormError("Please select at least 1 product to count");
      return;
    }
    createMutation.mutate({
      warehouseId: Number(selectedWarehouseId),
      assignedUserId: assignedUserId !== "" ? Number(assignedUserId) : undefined,
      remark,
      productIds: selectedProductIds.map(Number),
    });
  };

  const currentWarehouseObj = warehousesList.find(
    (w: any) => String(w.id) === String(selectedWarehouseId)
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleCreate();
      }}
      className="space-y-4"
    >
      {/* Thẻ báo lỗi trực tiếp (nếu có) */}
      {formError && (
        <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}
      {/* Grid Warehouse + Created by */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Warehouse select / readonly */}
        <Field label="Warehouse">
          {canSwitchWarehouse ? (
            <select
              value={selectedWarehouseId}
              onChange={(e) => {
                setSelectedWarehouseId(e.target.value);
                setSelectedProductIds([]);
                setAssignedUserId("");
              }}
              className="w-full h-10 px-3 rounded-lg bg-input border border-border text-sm"
            >
              {warehousesList.map((w: any) => (
                <option key={w.id} value={String(w.id)}>
                  {w.code || w.warehouseCode} - {w.warehouseName || w.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              readOnly
              value={
                currentWarehouseObj
                  ? `${currentWarehouseObj.code || currentWarehouseObj.warehouseCode} - ${currentWarehouseObj.warehouseName || currentWarehouseObj.name}`
                  : `Warehouse #${selectedWarehouseId}`
              }
              className="w-full h-10 px-3 rounded-lg bg-input border border-border text-sm opacity-70"
            />
          )}
        </Field>

        {/* Created by (readonly) */}
        <Field label="Created by">
          <input
            readOnly
            value={currentUser?.name ?? ""}
            className="w-full h-10 px-3 rounded-lg bg-input border border-border text-sm opacity-70"
          />
        </Field>
      </div>

      {/* Assign to staff */}
      <Field label="Assign to staff">
        <select
          value={assignedUserId}
          onChange={(e) => setAssignedUserId(e.target.value === "" ? "" : Number(e.target.value))}
          className="w-full h-10 px-3 rounded-lg bg-input border border-border text-sm"
        >
          <option value="">— Select staff —</option>
          {staffOptions.map((s: any) => (
            <option key={s.id} value={s.id}>{s.fullName}</option>
          ))}
        </select>
        {staffOptions.length === 0 && (
          <p className="mt-1 text-xs text-muted-foreground">No staff found in this warehouse.</p>
        )}
      </Field>

      {/* Chọn sản phẩm cần đếm */}
      <Field label={`Select products to count (${selectedProductIds.length} / ${inventoryItems.length} selected)`}>
        {inventoryItems.length > 0 && (
          <div className="flex items-center gap-2 mb-2">
            {/* Filter theo category */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-8 px-2 rounded-lg bg-input border border-border text-xs flex-1"
            >
              <option value="">All categories</option>
              {[...new Set(inventoryItems.map((i: any) => i.category).filter(Boolean))].map((cat: any) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {/* Select All / None */}
            <button
              type="button"
              onClick={() => setSelectedProductIds(filteredItems.map((i: any) => getProductId(i)))}
              className="h-8 px-3 rounded-lg bg-secondary border border-border text-xs hover:bg-muted"
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSelectedProductIds([])}
              className="h-8 px-3 rounded-lg bg-secondary border border-border text-xs hover:bg-muted"
            >
              None
            </button>
          </div>
        )}
        <div className="max-h-48 overflow-auto rounded-lg border border-border/60 divide-y divide-border/40">
          {filteredItems.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">No products found for this warehouse.</p>
          ) : (
            filteredItems.map((item: any) => {
              const pId = getProductId(item);
              return (
                <label
                  key={pId}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-secondary/40 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedProductIds.includes(pId)}
                    onChange={() => toggleProduct(pId)}
                    className="rounded"
                  />
                  <span className="text-xs font-mono text-muted-foreground w-28 shrink-0">{item.sku}</span>
                  <span className="text-sm truncate">{item.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto shrink-0 pl-2">qty: {item.stock}</span>
                </label>
              );
            })
          )}
        </div>
      </Field>

      {/* Ghi chú */}
      <Field label="Notes">
        <textarea
          rows={2}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="Scope: full cycle / category / zone..."
          className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm"
        />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm hover:bg-muted">
          Cancel
        </button>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground glow-ring flex items-center gap-2 disabled:opacity-60 cursor-pointer"
          style={{ background: "var(--gradient-primary)" }}
        >
          {createMutation.isPending && <Loader2 className="size-4 animate-spin" />}
          {createMutation.isPending ? "Creating..." : "Create Stocktake"}
        </button>
      </div>
    </form>
  );
}

// ----------------------------------------------------------------
// UI Components nhỏ
// ----------------------------------------------------------------
function Kpi({ icon: Icon, label, value, tone }: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  tone: "primary" | "accent" | "warning";
}) {
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

function Modal({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto" onClick={onClose}>
      <div className="surface-card w-full max-w-2xl max-h-[85vh] flex flex-col p-4 sm:p-6 rounded-2xl shadow-2xl border border-border" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/60 shrink-0">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <button onClick={onClose} className="size-8 grid place-items-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto pr-1">
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
