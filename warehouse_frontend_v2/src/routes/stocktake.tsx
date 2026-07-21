import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/lib/app-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { warehouses } from "@/lib/warehouse-data";
import {
  ClipboardCheck, Plus, X, Save, ListChecks,
  AlertTriangle, CheckCircle2, Boxes,
  ChevronLeft, ChevronRight, Loader2
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

// ----------------------------------------------------------------
// Page chính
// ----------------------------------------------------------------
function StocktakePage() {
  const { currentUser, activeWarehouseId } = useApp();
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

  // Chỉ Warehouse_Manager mới được đóng phiếu
  const canComplete = currentUser?.role === "Warehouse_Manager";

  // --- Lấy danh sách phiếu từ API ---
  const { data: stocktakes = [], isLoading } = useQuery<Stocktake[]>({
    queryKey: ["stocktake", activeWarehouseId],
    queryFn: async () => {
      const res = await api.get("/stocktake", {
        params: activeWarehouseId ? { warehouseIdParam: activeWarehouseId } : {},
      });
      return res.data;
    },
  });



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

  // Phân trang
  const totalPages = Math.max(1, Math.ceil(stocktakes.length / limit));
  const safePage = Math.min(page, totalPages);
  const paginatedList = stocktakes.slice((safePage - 1) * limit, safePage * limit);

  // KPI
  const totalItems = stocktakes.reduce((s, x) => s + x.items, 0);
  const totalVar = stocktakes.reduce((s, x) => s + x.variance, 0);
  const inProgress = stocktakes.filter((s) => s.status === "IN_PROGRESS").length;
  const completed = stocktakes.filter((s) => s.status === "COMPLETED").length;

  // Số sản phẩm đã được nhập actual qty
  const filledCount = counting
    ? counting.details.filter((d) => counts[String(d.id)] !== undefined).length
    : 0;
  const totalCount = counting ? counting.details.length : 0;
  const allFilled = counting ? filledCount === totalCount : false;

  // Submit số đếm
  const handleSaveCount = () => {
    if (!counting) return;
    if (!allFilled) {
      toast.error(`Please count all products first (${filledCount}/${totalCount} done)`);
      return;
    }
    const details = counting.details.map((d) => ({
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
              <Plus className="size-4" /> New stocktake sheet
            </button>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={ListChecks} label="Total sheets" value={stocktakes.length} tone="primary" />
          <Kpi icon={AlertTriangle} label="In progress" value={inProgress} tone="warning" />
          <Kpi icon={CheckCircle2} label="Completed" value={completed} tone="accent" />
          <Kpi icon={Boxes} label="Items / variance" value={`${totalItems} / ${totalVar}`} tone="primary" />
        </div>

        {/* Bảng danh sách */}
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[950px] text-sm">
              {/* Grid Table Header */}
              <div className="grid grid-cols-[100px_110px_110px_130px_130px_70px_90px_110px_48px] items-center gap-3 px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40 font-medium border-b border-border/60">
                <div>Sheet #</div>
                <div>Date</div>
                <div>Warehouse</div>
                <div>Created by</div>
                <div>Assigned to</div>
                <div className="text-right">Items</div>
                <div className="text-right">Variance</div>
                <div className="text-center">Status</div>
                <div />
              </div>

              {/* Grid Table Body */}
              <div className="divide-y divide-border/60">
                {isLoading ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    <Loader2 className="size-5 animate-spin mx-auto" />
                  </div>
                ) : paginatedList.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No stocktake sheets yet.
                  </div>
                ) : (
                  paginatedList.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setViewing(s)}
                      className="grid grid-cols-[100px_110px_110px_130px_130px_70px_90px_110px_48px] items-center gap-3 px-4 py-3.5 hover:bg-secondary/30 transition-colors cursor-pointer"
                    >
                      <div className="font-mono text-xs">ST-{String(s.id).padStart(4, "0")}</div>
                      <div className="text-muted-foreground">{s.date}</div>
                      <div className="font-mono text-xs">{s.warehouseCode}</div>
                      <div className="truncate">{s.createdByName}</div>
                      <div className="text-muted-foreground truncate">{s.assignedUserName ?? "—"}</div>
                      <div className="text-right">{s.items}</div>
                      <div className={`text-right font-semibold ${s.variance > 0 ? "text-warning" : "text-muted-foreground"}`}>
                        {s.variance > 0 ? `±${s.variance}` : "0"}
                      </div>
                      <div className="text-center">
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusTone[s.status]}`}>
                          {statusLabel[s.status]}
                        </span>
                      </div>
                      <div className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {/* Staff / WH_Manager nhập số đếm */}
                          {canCount && s.status !== "COMPLETED" && s.status !== "CANCELLED" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setCounting(s); setCounts({}); }}
                              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                            >
                              <ClipboardCheck className="size-3.5" /> Count
                            </button>
                          )}
                          {/* Chỉ WH_Manager được Complete */}
                          {canComplete && s.status === "IN_PROGRESS" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: s.id, status: "COMPLETED" }); }}
                              className="text-xs text-success hover:underline inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="size-3.5" /> Complete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Phân trang */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border/60 text-sm">
              <div className="text-muted-foreground text-xs">
                Showing {(safePage - 1) * limit + 1}–{Math.min(safePage * limit, stocktakes.length)} of {stocktakes.length} entries
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
        <Modal onClose={() => setCounting(null)} title={`Count — ST-${String(counting.id).padStart(4, "0")} • ${counting.warehouseName}`}>
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
                  {counting.details.map((d) => {
                    const actual = counts[String(d.id)];
                    const variance = actual === undefined ? null : actual - d.systemQuantity;
                    return (
                      <tr key={d.id} className="border-t border-border/60">
                        <td className="p-3 font-mono text-xs">{d.sku}</td>
                        <td className="p-3">{d.productName}</td>
                        <td className="p-3 text-right">{d.systemQuantity}</td>
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
                  })}
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
          title={`Detail — ST-${String(viewing.id).padStart(4, "0")} • ${viewing.warehouseName}`}
        >
          <div className="space-y-4">
            {/* Thông tin tổng hợp */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Status", value: <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusTone[viewing.status]}`}>{statusLabel[viewing.status]}</span> },
                { label: "Created by", value: viewing.createdByName },
                { label: "Assigned to", value: viewing.assignedUserName ?? "—" },
                { label: "Total variance", value: <span className={viewing.variance > 0 ? "text-warning font-semibold" : "text-success font-semibold"}>{viewing.variance > 0 ? `±${viewing.variance}` : "0"}</span> },
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
                  {viewing.details.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-muted-foreground text-xs">
                        No count data yet — staff has not submitted counts.
                      </td>
                    </tr>
                  ) : (
                    viewing.details.map((d) => {
                      const variance = d.actualQuantity - d.systemQuantity;
                      return (
                        <tr key={d.id} className="border-t border-border/60">
                          <td className="p-3 font-mono text-xs">{d.sku}</td>
                          <td className="p-3">{d.productName}</td>
                          <td className="p-3 text-right">{d.systemQuantity}</td>
                          <td className="p-3 text-right font-medium">{d.actualQuantity}</td>
                          <td className={`p-3 text-right font-semibold ${
                            variance === 0 ? "text-success" : "text-warning"
                          }`}>
                            {variance === 0 ? "0" : variance > 0 ? `+${variance}` : variance}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Warehouse Manager: review xong thì Complete ngay từ đây */}
            <div className="flex justify-end gap-2">
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
  const { data: apiWarehouses = [] } = useQuery<any[]>({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data;
    },
  });

  const warehousesList = apiWarehouses.length > 0 ? apiWarehouses : warehouses;

  // Kho mặc định được chọn
  const initialWarehouseId =
    currentUserWarehouseId ??
    activeWarehouseId ??
    (warehousesList[0]?.id ? String(warehousesList[0].id) : "1");

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(initialWarehouseId);
  const [remark, setRemark] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [assignedUserId, setAssignedUserId] = useState<number | "">("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Lấy danh sách sản phẩm theo kho đã chọn
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventory", selectedWarehouseId],
    queryFn: async () => {
      if (!selectedWarehouseId) return [];
      const res = await api.get("/inventory", {
        params: { warehouseIdParam: selectedWarehouseId },
      });
      return res.data;
    },
    enabled: !!selectedWarehouseId,
  });

  // Lấy danh sách staff thuộc kho đã chọn
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.get("/users");
      return res.data;
    },
  });

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

  const createMutation = useMutation({
    mutationFn: async (payload: {
      warehouseId: number;
      assignedUserId?: number;
      remark: string;
      productIds: number[];
    }) => {
      const res = await api.post("/stocktake", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stocktake"] });
      toast.success("Stocktake sheet created");
      onClose();
    },
    onError: () => toast.error("Failed to create stocktake sheet"),
  });

  const toggleProduct = (id: number) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    if (!selectedWarehouseId) {
      toast.error("No warehouse selected");
      return;
    }
    createMutation.mutate({
      warehouseId: Number(selectedWarehouseId),
      assignedUserId: assignedUserId !== "" ? Number(assignedUserId) : undefined,
      remark,
      productIds: selectedProductIds,
    });
  };

  const currentWarehouseObj = warehousesList.find(
    (w: any) => String(w.id) === String(selectedWarehouseId)
  );

  return (
    <div className="space-y-4">
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
                {w.code ? `${w.code} - ${w.name}` : w.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            readOnly
            value={
              currentWarehouseObj
                ? `${currentWarehouseObj.code ? `${currentWarehouseObj.code} - ` : ""}${currentWarehouseObj.name}`
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
              {[...new Set(inventoryItems.map((i: any) => i.category))].map((cat: any) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {/* Select All / None */}
            <button
              type="button"
              onClick={() => setSelectedProductIds(filteredItems.map((i: any) => i.productId))}
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
            <p className="p-3 text-xs text-muted-foreground">No products found.</p>
          ) : (
            filteredItems.map((item: any) => (
              <label
                key={item.productId}
                className="flex items-center gap-3 px-3 py-2 hover:bg-secondary/40 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedProductIds.includes(item.productId)}
                  onChange={() => toggleProduct(item.productId)}
                  className="rounded"
                />
                <span className="text-xs font-mono text-muted-foreground w-28 shrink-0">{item.sku}</span>
                <span className="text-sm truncate">{item.name}</span>
                <span className="text-xs text-muted-foreground ml-auto shrink-0 pl-2">qty: {item.stock}</span>
              </label>
            ))
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

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm">
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={createMutation.isPending || selectedProductIds.length === 0}
          className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground glow-ring flex items-center gap-2 disabled:opacity-60"
          style={{ background: "var(--gradient-primary)" }}
        >
          {createMutation.isPending && <Loader2 className="size-4 animate-spin" />}
          Create sheet
        </button>
      </div>
    </div>
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="surface-card w-full max-w-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="size-8 grid place-items-center rounded-md hover:bg-secondary">
            <X className="size-4" />
          </button>
        </div>
        {children}
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
