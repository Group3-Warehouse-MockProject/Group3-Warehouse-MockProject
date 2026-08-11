import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getToken } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/lib/app-context";
import {
  Star,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Truck,
  Award,
  Clock,
  Globe,
  Pencil,
  Trash2,
  Power,
  Filter,
  X,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { ModalShell, Field, inputCls, textareaCls } from "@/components/modal-shell";
import { toast } from "sonner";
import { ConfirmModal } from "@/components/confirm-modal";

export const Route = createFileRoute("/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers — TechStock" }] }),
  component: SuppliersPage,
});

const PAGE_SIZE = 10;
// const API_URL = "http://localhost:8080/api/suppliers";

type SupplierForm = {
  name: string;
  country: string;
  phone: string;
  email: string;
  address: string;
  status: string;
  onTimeDelivery: string;
  qualityPassRate: string;
};

const getAuthHeaders = () => {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const calculateRating = (onTime: any, quality: any) => {
  const scoreOnTime = (Number(onTime) / 100) * 5;
  const scoreQuality = (Number(quality) / 100) * 5;
  const final = scoreQuality * 0.5 + scoreOnTime * 0.5;
  return Number(Math.min(5, Math.max(0, final)).toFixed(1));
};

function SuppliersPage() {
  const queryClient = useQueryClient();
  const { currentUser } = useApp();
  const canAddSupplier = currentUser?.role === "Admin" || currentUser?.role === "Manager";
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");

  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [openView, setOpenView] = useState(false);
  const [viewingSupplier, setViewingSupplier] = useState<any>(null);

  const [selectedCountry, setSelectedCountry] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  const defaultCountries = ["Vietnam", "Singapore", "Taiwan"];

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isPending: boolean;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", isPending: false, onConfirm: () => { } });
  const closeModal = () => setConfirmModal((prev) => ({ ...prev, isOpen: false }));

  const { data: pageData } = useQuery({
    queryKey: ["suppliers", page, q, selectedStatus, selectedCountry],
    queryFn: async () => {
      const params: any = { page: page - 1, size: PAGE_SIZE };
      if (q) params.search = q;
      if (selectedStatus !== "ALL") params.status = selectedStatus;
      if (selectedCountry !== "ALL") params.country = selectedCountry;
      const res = await api.get("/suppliers", { params });
      return res.data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["suppliers-stats"],
    queryFn: async () => {
      const res = await api.get(`/suppliers/stats`);
      return res.data;
    },
  });

  // Maintain a separate query for all available countries for the dropdown if needed, or just hardcode some defaults.
  // For simplicity, we'll use a fixed list of default countries + any countries from the current page.
  const suppliersList = pageData?.content || [];

  const allAvailableCountries = Array.from(
    new Set([...defaultCountries, ...suppliersList.map((s: any) => s.country).filter(Boolean)]),
  );

  const invalidateSuppliers = () => {
    queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    queryClient.invalidateQueries({ queryKey: ["suppliers-stats"] });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/suppliers/${id}`),
    onSuccess: () => {
      invalidateSuppliers();
      toast.success("Delete successful!");
    },
    onError: () => {
      toast.error("Delete failed!");
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/suppliers/${id}/status`, { status }),
    onSuccess: () => {
      invalidateSuppliers();
      toast.success("Status updated!");
    },
    onError: () => {
      toast.error("Status update failed!");
    },
  });

  const handleDelete = async (id: number) => {
    setConfirmModal({
      isOpen: true,
      title: "Confirm Supplier Deletion",
      message: "Are you sure you want to delete this supplier?",
      isPending: false,
      onConfirm: () => {
        closeModal();
        deleteMutation.mutate(id);
      },
    });
  };

  const handleToggleStatus = async (supplier: any) => {
    const currentStatus = String(supplier.status || "ACTIVE").toUpperCase();
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await statusMutation.mutateAsync({ id: supplier.id, status: newStatus });
      toast.success("Status updated");
    } catch (err) {
      console.error("Error updating status:", err);
      toast.error("Failed to update status");
    }
  };

  const searchLower = q.toLowerCase().trim();

  // Kiểm tra xem từ khóa search có khớp với từng trường cụ thể không để hiện dot ở tiêu đề cột
  const hasSearchMatch = (fieldName: string) => {
    if (!searchLower) return false;
    return suppliersList.some((s: any) => {
      if (deletedIds.includes(s.id)) return false;
      if (fieldName === "supplier")
        return (
          String(s.name || "")
            .toLowerCase()
            .includes(searchLower) ||
          String(s.address || "")
            .toLowerCase()
            .includes(searchLower)
        );
      if (fieldName === "phone")
        return String(s.phoneNumber || "")
          .toLowerCase()
          .includes(searchLower);
      if (fieldName === "email")
        return String(s.email || "")
          .toLowerCase()
          .includes(searchLower);
      if (fieldName === "country")
        return String(s.country || "")
          .toLowerCase()
          .includes(searchLower);
      if (fieldName === "performance")
        return (
          String(s.rating || "")
            .toLowerCase()
            .includes(searchLower) ||
          String(s.onTimeDelivery || "")
            .toLowerCase()
            .includes(searchLower)
        );
      if (fieldName === "status")
        return String(s.status || "")
          .toLowerCase()
          .includes(searchLower);
      return false;
    });
  };

  // Lọc toàn bộ danh sách để tính chỉ số KPI tổng chính xác (đã chuyển xuống Backend)
  const slice = suppliersList.filter((s: any) => !deletedIds.includes(s.id));

  // Tính các chỉ số KPI dựa trên dữ liệu từ API Stats
  const avgRating = stats?.avgRating || "0.00";
  const avgOnTime = stats?.avgOnTime || "0%";
  const totalCountriesCount = stats?.countriesCount || 0;
  const totalSuppliersCount = stats?.total || 0;

  // Phân trang dữ liệu hiển thị bảng
  const totalPages = pageData?.totalPages || 1;
  const safePage = Math.max(1, Math.min(page, totalPages));

  const isFilterActive = selectedCountry !== "ALL" || selectedStatus !== "ALL";

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Suppliers</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Partners distributing components (Auto-Rating Mode)
            </p>
          </div>
          {canAddSupplier && <button
            onClick={() => setOpenAdd(true)}
            className="h-10 px-4 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Plus className="size-4" />
            Add supplier
          </button>}
        </div>

        {/* Các ô KPI hiển thị tổng hợp toàn bộ số liệu */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={Truck} label="Suppliers" value={totalSuppliersCount} tone="primary" />
          <Kpi icon={Award} label="Avg rating" value={avgRating} tone="accent" />
          <Kpi icon={Clock} label="Avg on-time" value={avgOnTime} tone="primary" />
          <Kpi icon={Globe} label="Countries" value={totalCountriesCount} tone="warning" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search across all fields..."
                className={`w-full h-10 pl-9 pr-8 rounded-lg bg-input border text-sm transition-colors ${q ? "border-emerald-500 ring-1 ring-emerald-500/20" : "border-border"}`}
              />
              {q && (
                <button
                  onClick={() => setQ("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            {q && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Searching: "{q}"</span>
                <button onClick={() => setQ("")} className="ml-1 hover:underline font-bold">
                  Clear
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
              className={`h-10 px-4 rounded-lg border text-sm flex items-center gap-2.5 transition-all ${isFilterActive
                ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-medium"
                : "bg-secondary/50 border-border text-foreground"
                }`}
            >
              <div className="flex items-center gap-2">
                <Filter className="size-3.5" />
                <span>Filter</span>
              </div>
              {isFilterActive && (
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>

            {filterDropdownOpen && (
              <div className="absolute right-0 top-12 mt-1 w-72 rounded-xl bg-card border border-border p-4 shadow-2xl z-20 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Filter Options
                    </span>
                    {isFilterActive && (
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </div>
                  {isFilterActive && (
                    <button
                      onClick={() => {
                        setSelectedCountry("ALL");
                        setSelectedStatus("ALL");
                        setPage(1);
                      }}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Country
                    </label>
                    {selectedCountry !== "ALL" && (
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </div>
                  <select
                    value={selectedCountry}
                    onChange={(e) => {
                      setSelectedCountry(e.target.value);
                      setPage(1);
                    }}
                    className={inputCls}
                  >
                    <option value="ALL">All Countries</option>
                    {allAvailableCountries.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase">
                      Status
                    </label>
                    {selectedStatus !== "ALL" && (
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </div>
                  <select
                    value={selectedStatus}
                    onChange={(e) => {
                      setSelectedStatus(e.target.value);
                      setPage(1);
                    }}
                    className={inputCls}
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-237.5">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40">
                <tr>
                  <th className="text-left p-4 w-[22%]">
                    <div className="flex items-center gap-1.5">
                      <span>Supplier</span>
                      {hasSearchMatch("supplier") && (
                        <span
                          className="size-2 rounded-full bg-emerald-500 animate-pulse"
                          title="Matched search"
                        />
                      )}
                    </div>
                  </th>
                  <th className="text-left p-4 w-[13%]">
                    <div className="flex items-center gap-1.5">
                      <span>Phone</span>
                      {hasSearchMatch("phone") && (
                        <span
                          className="size-2 rounded-full bg-emerald-500 animate-pulse"
                          title="Matched search"
                        />
                      )}
                    </div>
                  </th>
                  <th className="text-left p-4 w-[16%]">
                    <div className="flex items-center gap-1.5">
                      <span>Email</span>
                      {hasSearchMatch("email") && (
                        <span
                          className="size-2 rounded-full bg-emerald-500 animate-pulse"
                          title="Matched search"
                        />
                      )}
                    </div>
                  </th>
                  <th className="text-left p-4 w-[14%]">
                    <div className="flex items-center gap-1.5">
                      <span>Country</span>
                      {(selectedCountry !== "ALL" || hasSearchMatch("country")) && (
                        <span
                          className="size-2 rounded-full bg-emerald-500 animate-pulse"
                          title="Filtered or matched search"
                        />
                      )}
                    </div>
                  </th>
                  <th className="text-left p-4 w-[15%]">
                    <div className="flex items-center gap-1.5">
                      <span>Performance</span>
                      {hasSearchMatch("performance") && (
                        <span
                          className="size-2 rounded-full bg-emerald-500 animate-pulse"
                          title="Matched search"
                        />
                      )}
                    </div>
                  </th>
                  <th className="text-left p-4 w-[10%]">
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      {(selectedStatus !== "ALL" || hasSearchMatch("status")) && (
                        <span
                          className="size-2 rounded-full bg-emerald-500 animate-pulse"
                          title="Filtered or matched search"
                        />
                      )}
                    </div>
                  </th>
                  <th className="text-center p-4 w-[10%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((s: any) => {
                  const statusStr = String(s.status || "ACTIVE").toUpperCase();
                  const isActive = statusStr === "ACTIVE";

                  return (
                    <tr
                      key={s.id}
                      className="border-t border-border/60 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="p-4">
                        <button
                          onClick={() => {
                            setViewingSupplier(s);
                            setOpenView(true);
                          }}
                          className="font-medium text-left hover:text-primary hover:underline transition-colors block truncate max-w-50"
                          title={s.name}
                        >
                          {s.name}
                        </button>
                        <div className="text-xs text-muted-foreground font-mono">ID: {s.id}</div>
                      </td>
                      <td className="p-4 font-mono text-xs">{s.phoneNumber || "N/A"}</td>
                      <td className="p-4 text-muted-foreground truncate max-w-40" title={s.email}>
                        {s.email || "N/A"}
                      </td>
                      <td className="p-4 font-medium">{s.country || "N/A"}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="flex items-center gap-1 font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                            <Star className="size-3.5 fill-current" /> {s.rating ?? 4.5}
                          </span>
                          <span className="text-muted-foreground">{s.onTimeDelivery ?? 90}%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isActive ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-muted text-muted-foreground border border-border"}`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`}
                          />
                          {statusStr}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleToggleStatus(s)}
                            title="Toggle Status"
                            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                          >
                            <Power className="size-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingSupplier(s);
                              setOpenEdit(true);
                            }}
                            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            title="Delete"
                            className="p-1.5 rounded hover:bg-secondary text-destructive"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Thanh phân trang 6 dòng mỗi trang */}
          <div className="flex items-center justify-between p-4 border-t border-border/60 text-sm">
            <div className="text-muted-foreground text-xs">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, pageData?.totalElements || 0)} of{" "}
              {pageData?.totalElements || 0} entries
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="size-8 grid place-items-center rounded-md border bg-secondary disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`size-8 rounded-md text-xs font-medium ${n === safePage ? "bg-primary text-primary-foreground" : "bg-secondary border"}`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="size-8 grid place-items-center rounded-md border bg-secondary disabled:opacity-40"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {openAdd && (
        <AddSupplierModal
          open={openAdd}
          onClose={() => setOpenAdd(false)}
          onSave={invalidateSuppliers}
        />
      )}
      {openEdit && (
        <EditSupplierModal
          open={openEdit}
          supplier={editingSupplier}
          onClose={() => {
            setOpenEdit(false);
            setEditingSupplier(null);
          }}
          onSave={invalidateSuppliers}
        />
      )}
      {openView && (
        <ViewSupplierModal
          open={openView}
          supplier={viewingSupplier}
          onClose={() => {
            setOpenView(false);
            setViewingSupplier(null);
          }}
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

function ViewSupplierModal({
  open,
  supplier,
  onClose,
}: {
  open: boolean;
  supplier: any;
  onClose: () => void;
}) {
  if (!supplier) return null;
  const statusStr = String(supplier.status || "ACTIVE").toUpperCase();
  const isActive = statusStr === "ACTIVE";

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Supplier Details"
      icon={<Truck className="size-5" />}
      footer={
        <button
          onClick={onClose}
          className="h-10 px-5 rounded-lg bg-primary text-white font-medium"
        >
          Close
        </button>
      }
    >
      <div className="space-y-4 text-sm">
        <div className="bg-secondary/30 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase font-semibold">
              Supplier Name
            </span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${isActive ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-muted text-muted-foreground border border-border"}`}
            >
              <span
                className={`size-1.5 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`}
              />
              {statusStr}
            </span>
          </div>
          <div className="text-xl font-bold">{supplier.name}</div>
          <div className="text-xs font-mono text-muted-foreground">ID: {supplier.id}</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 border rounded-xl flex items-center gap-3 bg-card">
            <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
              <Phone className="size-4" />
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block uppercase font-semibold">
                Phone Number
              </span>
              <span className="font-mono font-medium">{supplier.phoneNumber || "N/A"}</span>
            </div>
          </div>
          <div className="p-3 border rounded-xl flex items-center gap-3 bg-card">
            <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
              <Mail className="size-4" />
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block uppercase font-semibold">
                Email Address
              </span>
              <span className="font-medium text-xs break-all">{supplier.email || "N/A"}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 border rounded-xl flex items-center gap-3 bg-card">
            <div className="size-9 rounded-lg bg-warning/10 text-warning grid place-items-center">
              <Globe className="size-4" />
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block uppercase font-semibold">
                Country
              </span>
              <span className="font-medium">{supplier.country || "N/A"}</span>
            </div>
          </div>
          <div className="p-3 border rounded-xl flex items-center gap-3 bg-card">
            <div className="size-9 rounded-lg bg-accent/10 text-accent grid place-items-center">
              <MapPin className="size-4" />
            </div>
            <div>
              <span className="text-[11px] text-muted-foreground block uppercase font-semibold">
                Address
              </span>
              <span className="font-medium text-xs truncate max-w-50" title={supplier.address}>
                {supplier.address || "N/A"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 border rounded-xl bg-card">
            <span className="text-[11px] text-muted-foreground uppercase font-semibold block">
              Auto-Calculated Rating
            </span>
            <span className="text-amber-500 font-bold flex items-center gap-1.5 text-lg mt-1">
              <Star className="size-5 fill-current" /> {supplier.rating ?? 4.5}{" "}
              <span className="text-xs text-muted-foreground font-normal">/ 5.0</span>
            </span>
          </div>
          <div className="p-3 border rounded-xl bg-card">
            <span className="text-[11px] text-muted-foreground uppercase font-semibold block">
              On-Time Delivery
            </span>
            <span className="font-bold text-lg mt-1 block text-foreground">
              {supplier.onTimeDelivery ?? 95}%
            </span>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function AddSupplierModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState<SupplierForm>({
    name: "",
    country: "",
    phone: "",
    email: "",
    address: "",
    status: "ACTIVE",
    onTimeDelivery: "95",
    qualityPassRate: "98",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SupplierForm, string>>>({});
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isPending: boolean;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", isPending: false, onConfirm: () => { } });
  const closeModal = () => setConfirmModal((prev) => ({ ...prev, isOpen: false }));

  const computedRating = calculateRating(form.onTimeDelivery, form.qualityPassRate);

  const updateForm = (field: keyof SupplierForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validateForm = () => {
    const nextErrors: Partial<Record<keyof SupplierForm, string>> = {};
    const name = form.name.trim();
    const country = form.country.trim();
    const phone = form.phone.trim();
    const email = form.email.trim();
    const address = form.address.trim();
    const onTimeDelivery = Number(form.onTimeDelivery);
    const qualityPassRate = Number(form.qualityPassRate);

    if (name.length < 2 || name.length > 100) nextErrors.name = "Supplier name must be 2–100 characters.";
    if (country.length < 2 || country.length > 100) nextErrors.country = "Enter a valid country name.";
    if (!/^\+?[0-9][0-9\s().-]{6,19}$/.test(phone)) nextErrors.phone = "Enter a valid phone number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) nextErrors.email = "Enter a valid email address.";
    if (address.length < 5) nextErrors.address = "Address must be at least 5 characters.";
    if (!form.onTimeDelivery.trim() || !Number.isInteger(onTimeDelivery) || onTimeDelivery < 0 || onTimeDelivery > 100) nextErrors.onTimeDelivery = "Enter a whole number from 0 to 100.";
    if (!form.qualityPassRate.trim() || !Number.isInteger(qualityPassRate) || qualityPassRate < 0 || qualityPassRate > 100) nextErrors.qualityPassRate = "Enter a whole number from 0 to 100.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const createMutation = useMutation({
    mutationFn: () =>
      api.post("/suppliers", {
        name: form.name.trim(),
        email: form.email.trim(),
        phoneNumber: form.phone.trim(),
        address: form.address.trim(),
        status: form.status,
        country: form.country.trim(),
        rating: computedRating,
        onTimeDelivery: parseInt(form.onTimeDelivery) || 95,
      }),
    onSuccess: () => {
      toast.success("Add successful!");
      onSave();
      onClose();
    },
    onError: () => {
      toast.error("Add failed!");
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setConfirmModal({
      isOpen: true,
      title: "Confirm Supplier Creation",
      message: "Are you sure you want to create this supplier?",
      isPending: false,
      onConfirm: () => {
        closeModal();
        createMutation.mutate();
      },
    });
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Add Supplier (Auto-Rating)"
      icon={<Truck className="size-5" />}
      footer={
        <>
          <button
            onClick={onClose}
            className="h-10 px-4 bg-secondary border rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-supplier-form"
            className="h-10 px-5 bg-primary text-white rounded-lg font-medium"
          >
            Save
          </button>
        </>
      }
    >
      <form id="add-supplier-form" onSubmit={onSubmit} noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Supplier Name" className="sm:col-span-2" required>
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => updateForm("name", e.target.value)}
              required
            />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
          </Field>
          <Field label="Country" required>
            <input
              className={inputCls}
              value={form.country}
              onChange={(e) => updateForm("country", e.target.value)}
              required
            />
            {errors.country && <p className="mt-1 text-xs text-destructive">{errors.country}</p>}
          </Field>
          <Field label="Phone" required>
            <input
              type="tel"
              className={inputCls}
              value={form.phone}
              onChange={(e) => updateForm("phone", e.target.value)}
              required
            />
            {errors.phone && <p className="mt-1 text-xs text-destructive">{errors.phone}</p>}
          </Field>
          <Field label="Email" required>
            <input
              type="email"
              className={inputCls}
              value={form.email}
              onChange={(e) => updateForm("email", e.target.value)}
              required
            />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
          </Field>
          <Field label="On-Time Delivery (%)" required>
            <input
              type="number"
              min="0"
              max="100"
              className={inputCls}
              value={form.onTimeDelivery}
              onChange={(e) => updateForm("onTimeDelivery", e.target.value)}
              required
            />
            {errors.onTimeDelivery && <p className="mt-1 text-xs text-destructive">{errors.onTimeDelivery}</p>}
          </Field>
          <Field label="Quality Pass Rate (%)" required>
            <input
              type="number"
              min="0"
              max="100"
              className={inputCls}
              value={form.qualityPassRate}
              onChange={(e) => updateForm("qualityPassRate", e.target.value)}
              required
            />
            {errors.qualityPassRate && <p className="mt-1 text-xs text-destructive">{errors.qualityPassRate}</p>}
          </Field>

          <div className="sm:col-span-2 p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-primary" />
              <span className="text-sm font-medium">System Auto-Calculated Rating:</span>
            </div>
            <span className="text-lg font-bold text-amber-500 flex items-center gap-1">
              <Star className="size-5 fill-current" /> {computedRating} / 5.0
            </span>
          </div>

          <Field label="Address" className="sm:col-span-2" required>
            <textarea
              className={textareaCls}
              value={form.address}
              onChange={(e) => updateForm("address", e.target.value)}
              required
            />
            {errors.address && <p className="mt-1 text-xs text-destructive">{errors.address}</p>}
          </Field>
        </div>
      </form>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        isPending={confirmModal.isPending}
        onClose={closeModal}
      />
    </ModalShell>
  );
}

function EditSupplierModal({
  open,
  supplier,
  onClose,
  onSave,
}: {
  open: boolean;
  supplier: any;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    country: "",
    phone: "",
    email: "",
    address: "",
    status: "ACTIVE",
    onTimeDelivery: "95",
    qualityPassRate: "95",
  });
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isPending: boolean;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", isPending: false, onConfirm: () => { } });
  const closeModal = () => setConfirmModal((prev) => ({ ...prev, isOpen: false }));

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name || "",
        country: supplier.country || "",
        phone: supplier.phoneNumber || "",
        email: supplier.email || "",
        address: supplier.address || "",
        status: supplier.status || "ACTIVE",
        onTimeDelivery:
          supplier.onTimeDelivery !== undefined ? String(supplier.onTimeDelivery) : "95",
        qualityPassRate: "95",
      });
    }
  }, [supplier]);

  const computedRating = calculateRating(form.onTimeDelivery, form.qualityPassRate);

  const updateMutation = useMutation({
    mutationFn: () =>
      api.put(`/suppliers/${supplier.id}`, {
        name: form.name,
        email: form.email,
        phoneNumber: form.phone,
        address: form.address,
        status: form.status,
        country: form.country,
        rating: computedRating,
        onTimeDelivery: parseInt(form.onTimeDelivery) || 95,
      }),
    onSuccess: () => {
      toast.success("Update successful!");
      onSave();
      onClose();
    },
    onError: () => {
      toast.error("Update failed!");
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmModal({
      isOpen: true,
      title: "Confirm Supplier Update",
      message: "Are you sure you want to update this supplier?",
      isPending: false,
      onConfirm: () => {
        closeModal();
        updateMutation.mutate();
      },
    });
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Edit Supplier (Auto-Rating)"
      icon={<Pencil className="size-5" />}
      footer={
        <>
          <button onClick={onClose} className="h-10 px-4 bg-secondary border rounded-lg">
            Cancel
          </button>
          <button
            type="submit"
            form="edit-supplier-form"
            className="h-10 px-5 bg-primary text-white rounded-lg font-medium"
          >
            Update
          </button>
        </>
      }
    >
      <form id="edit-supplier-form" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Supplier Name *" className="sm:col-span-2">
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Country *">
            <input
              className={inputCls}
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              required
            />
          </Field>
          <Field label="Phone *">
            <input
              className={inputCls}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </Field>
          <Field label="Email *">
            <input
              className={inputCls}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </Field>
          <Field label="On-Time Delivery (%)">
            <input
              type="number"
              min="0"
              max="100"
              className={inputCls}
              value={form.onTimeDelivery}
              onChange={(e) => setForm({ ...form, onTimeDelivery: e.target.value })}
              required
            />
          </Field>
          <Field label="Quality Pass Rate (%)">
            <input
              type="number"
              min="0"
              max="100"
              className={inputCls}
              value={form.qualityPassRate}
              onChange={(e) => setForm({ ...form, qualityPassRate: e.target.value })}
              required
            />
          </Field>

          <div className="sm:col-span-2 p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-primary" />
              <span className="text-sm font-medium">Updated Auto Rating:</span>
            </div>
            <span className="text-lg font-bold text-amber-500 flex items-center gap-1">
              <Star className="size-5 fill-current" /> {computedRating} / 5.0
            </span>
          </div>

          <Field label="Address *" className="sm:col-span-2">
            <textarea
              className={textareaCls}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              required
            />
          </Field>
        </div>
      </form>
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        isPending={confirmModal.isPending}
        onClose={closeModal}
      />
    </ModalShell>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: any;
  tone: any;
}) {
  const color =
    tone === "warning" ? "var(--warning)" : tone === "accent" ? "var(--accent)" : "var(--primary)";
  return (
    <div className="surface-card p-5 flex items-center justify-between">
      <div>
        <div className="text-xs uppercase text-muted-foreground">{label}</div>
        <div className="mt-2 text-2xl font-bold">{value}</div>
      </div>
      <div
        className="size-9 rounded-lg grid place-items-center"
        style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}
      >
        <Icon className="size-4" />
      </div>
    </div>
  );
}
