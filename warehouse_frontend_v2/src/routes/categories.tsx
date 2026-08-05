import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/lib/app-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Layers,
  Pencil,
  Trash2,
  AlertCircle,
  FolderOpen,
  Package,
  CheckCircle2,
  Archive,
  Eye,
  AlertTriangle,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ModalShell, Field, inputCls, selectCls } from "@/components/modal-shell";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/categories")({
  head: () => ({ meta: [{ title: "Categories — TechStock" }] }),
  component: CategoriesPage,
});

/* ── Helpers ── */
const GROUPS = ["Components", "Peripherals", "Devices", "Accessories"] as const;

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);

interface Category {
  id: number;
  code: string;
  name: string;
  categoryGroup: string;
  description: string | null;
  deleted: boolean;
  skuCount: number;
  totalStock: number;
  inventoryValue: number;
}

function CategoriesPage() {
  const { currentUser } = useApp();
  const queryClient = useQueryClient();
  
  // Filter & Pagination States
  const [q, setQ] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filterGroup, setFilterGroup] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [page, setPage] = useState(0);
  const limit = 15;

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<Category | null>(null);

  const isAdmin = currentUser?.role === "Admin";
  const canManage = currentUser?.role === "Admin" || currentUser?.role === "Manager";

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [q, filterGroup, filterStatus]);

  const { data: pageData, isLoading } = useQuery({
    queryKey: ["categories", page, q, filterGroup, filterStatus],
    queryFn: async () => {
      const res = await api.get("/categories", {
        params: {
          ...(q ? { search: q } : {}),
          ...(filterGroup ? { categoryGroup: filterGroup } : {}),
          ...(filterStatus ? { status: filterStatus } : {}),
          page,
          size: limit,
        }
      });
      return res.data as { content: Category[]; totalPages: number; totalElements: number };
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ["category-stats"],
    queryFn: async () => {
      const res = await api.get("/categories/stats");
      return res.data as { totalCategories: number; activeCount: number; archivedCount: number; totalUnitsInStock: number };
    }
  });

  const list = pageData?.content ?? [];
  const totalPages = pageData?.totalPages ?? 1;
  const totalElements = pageData?.totalElements ?? 0;

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["category-stats"] });
      toast.success("Category created successfully");
      setAddOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to create category"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.put(`/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["category-stats"] });
      toast.success("Category updated successfully");
      setEditCategory(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to update category"),
  });

  const softDeleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["category-stats"] });
      toast.success("Category archived");
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to archive category"),
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/categories/${id}/hard`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["category-stats"] });
      toast.success("Category permanently deleted");
      setHardDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to permanently delete category"),
  });

  return (
    <AppShell>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Categories</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Create, edit and archive catalog categories
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => setAddOpen(true)}
              className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring hover:brightness-110 active:scale-[0.97] transition-all duration-200"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Plus className="size-4" />
              Add category
            </button>
          )}
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Categories"
            value={statsData ? statsData.totalCategories : "—"}
            icon={Eye}
            tone="primary"
          />
          <StatCard
            label="Active"
            value={statsData ? statsData.activeCount : "—"}
            icon={CheckCircle2}
            tone="accent"
          />
          <StatCard
            label="Units in Stock"
            value={statsData ? statsData.totalUnitsInStock.toLocaleString() : "—"}
            icon={Package}
            tone="primary"
          />
          <StatCard
            label="Archived"
            value={statsData ? statsData.archivedCount : "—"}
            icon={AlertTriangle}
            tone="warning"
          />
        </div>

        {/* ── Search & Filter ── */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative max-w-md w-full sm:w-96 group">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Search category, code, group…"
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-input border border-border text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50"
            />
          </div>
          <div className="relative flex items-center gap-2">
            <button 
              onClick={() => setShowFilter(!showFilter)} 
              className={`h-10 px-4 rounded-lg border text-sm flex items-center gap-2 transition-colors shrink-0 ${showFilter ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border hover:bg-muted"}`}
            >
              <Filter className="size-4" />Filter
            </button>
            {showFilter && (
              <div className="absolute top-full right-0 mt-2 z-20 flex flex-col gap-5 p-5 surface-card rounded-xl border border-border/60 shadow-xl w-72">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Group</div>
                  <select
                    value={filterGroup}
                    onChange={(e) => {
                      setFilterGroup(e.target.value);
                      setPage(0);
                    }}
                    className="w-full h-9 px-3 rounded-md bg-input border border-border text-sm"
                  >
                    <option value="">All Groups</option>
                    {GROUPS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Status</div>
                  <select
                    value={filterStatus}
                    onChange={(e) => {
                      setFilterStatus(e.target.value);
                      setPage(0);
                    }}
                    className="w-full h-9 px-3 rounded-md bg-input border border-border text-sm"
                  >
                    <option value="">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="surface-card overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-5 py-3">Category</TableHead>
                  <TableHead className="px-5 py-3">Code</TableHead>
                  <TableHead className="px-5 py-3">Group</TableHead>
                  <TableHead className="px-5 py-3 text-center">SKUs</TableHead>
                  <TableHead className="px-5 py-3 text-center">Stock</TableHead>
                  <TableHead className="px-5 py-3 text-right">Inventory Value</TableHead>
                  <TableHead className="px-5 py-3 text-center">Status</TableHead>
                  {canManage && <TableHead className="px-5 py-3 text-center">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse hover:bg-transparent">
                      <TableCell className="p-5">
                        <div className="space-y-1.5">
                          <div className="h-4 w-28 rounded bg-secondary/60" />
                          <div className="h-3 w-44 rounded bg-secondary/40" />
                        </div>
                      </TableCell>
                      <TableCell className="p-5"><div className="h-4 w-12 rounded bg-secondary/50" /></TableCell>
                      <TableCell className="p-5"><div className="h-4 w-24 rounded bg-secondary/40" /></TableCell>
                      <TableCell className="p-5"><div className="mx-auto h-4 w-8 rounded bg-secondary/40" /></TableCell>
                      <TableCell className="p-5"><div className="mx-auto h-4 w-10 rounded bg-secondary/40" /></TableCell>
                      <TableCell className="p-5"><div className="ml-auto h-4 w-28 rounded bg-secondary/40" /></TableCell>
                      <TableCell className="p-5"><div className="mx-auto h-6 w-16 rounded-full bg-secondary/40" /></TableCell>
                      {canManage && <TableCell className="p-5"><div className="mx-auto h-8 w-20 rounded bg-secondary/40" /></TableCell>}
                    </TableRow>
                  ))
                ) : list.length > 0 ? (
                  list.map((cat) => (
                    <TableRow key={cat.id} className="border-border/60 hover:bg-secondary/30 transition-colors">
                      {/* Category: name + description */}
                      <TableCell className="px-5 py-4">
                        <div>
                          <div className="font-semibold text-sm">{cat.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 max-w-60 truncate">
                            {cat.description || "—"}
                          </div>
                        </div>
                      </TableCell>

                      {/* Code */}
                      <TableCell className="px-5 py-4">
                        <span className="font-mono text-sm text-muted-foreground">{cat.code}</span>
                      </TableCell>

                      {/* Group */}
                      <TableCell className="px-5 py-4">
                        <span className="text-sm" style={{ color: "var(--primary)" }}>
                          {cat.categoryGroup || "—"}
                        </span>
                      </TableCell>

                      {/* SKUs */}
                      <TableCell className="px-5 py-4 text-center">
                        <span className="text-sm font-medium">{cat.skuCount ?? 0}</span>
                      </TableCell>

                      {/* Stock */}
                      <TableCell className="px-5 py-4 text-center">
                        <span className="text-sm font-semibold">{(cat.totalStock ?? 0).toLocaleString()}</span>
                      </TableCell>

                      {/* Inventory Value */}
                      <TableCell className="px-5 py-4 text-right">
                        <span className="text-sm font-medium tabular-nums">
                          {fmt(cat.inventoryValue ?? 0)}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="px-5 py-4 text-center">
                        {cat.deleted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-warning/15 text-warning border border-warning/25">
                            Archived
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-success/15 text-success border border-success/25">
                            Active
                          </span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      {canManage && (
                        <TableCell className="px-5 py-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setEditCategory(cat)}
                              className="size-8 rounded-md flex items-center justify-center hover:bg-secondary border border-transparent hover:border-border transition-colors"
                              title="Edit"
                            >
                              <Pencil className="size-3.5 text-muted-foreground" />
                            </button>
                            {!cat.deleted && (
                              <button
                                onClick={() => setDeleteTarget(cat)}
                                className="size-8 rounded-md flex items-center justify-center hover:bg-destructive/15 border border-transparent hover:border-destructive/30 transition-colors"
                                title="Archive"
                              >
                                <Archive className="size-3.5 text-destructive" />
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => setHardDeleteTarget(cat)}
                                className="size-8 rounded-md flex items-center justify-center bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                                title="Permanently delete"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={canManage ? 8 : 7} className="py-20 text-center">
                      <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-secondary/50 mb-4">
                        <FolderOpen className="size-8 text-muted-foreground/40" />
                      </div>
                      <div className="text-muted-foreground font-medium text-base">No categories found</div>
                      <div className="text-sm text-muted-foreground/60 mt-1.5">
                        {q || filterGroup || filterStatus ? "Try adjusting your search/filter criteria" : "Get started by adding your first category"}
                      </div>
                      {canManage && !(q || filterGroup || filterStatus) && (
                        <button
                          onClick={() => setAddOpen(true)}
                          className="mt-5 h-9 px-4 rounded-lg text-sm font-medium text-primary-foreground inline-flex items-center gap-2 glow-ring hover:brightness-110 transition-all duration-200"
                          style={{ background: "var(--gradient-primary)" }}
                        >
                          <Plus className="size-4" />
                          Add category
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border/60 text-sm bg-secondary/10 mt-auto">
              <div className="text-muted-foreground text-xs">
                Showing {page * limit + 1}–{Math.min((page + 1) * limit, totalElements)} of {totalElements} entries
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="size-8 grid place-items-center rounded-md border border-border bg-background hover:bg-secondary disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="size-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`size-8 rounded-md text-xs font-medium transition-colors ${
                      n === page
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-background border border-border hover:bg-secondary"
                    }`}
                  >
                    {n + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="size-8 grid place-items-center rounded-md border border-border bg-background hover:bg-secondary disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Category Modal ── */}
      <AddCategoryModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={(data: any) => createMutation.mutate(data)}
        saving={createMutation.isPending}
      />

      {/* ── Edit Category Modal ── */}
      {editCategory && (
        <EditCategoryModal
          category={editCategory}
          onClose={() => setEditCategory(null)}
          onSave={(data: any) => updateMutation.mutate({ id: editCategory.id, data })}
          saving={updateMutation.isPending}
        />
      )}

      {/* ── Archive Confirmation ── */}
      <ModalShell
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Archive Category"
        subtitle="This will hide the category from active listings"
        icon={<Archive className="size-5" />}
        maxWidth="28rem"
        footer={
          <>
            <button
              onClick={() => setDeleteTarget(null)}
              className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={() => deleteTarget && softDeleteMutation.mutate(deleteTarget.id)}
              disabled={softDeleteMutation.isPending}
              className="h-10 px-5 rounded-lg bg-warning text-warning-foreground text-sm font-medium hover:bg-warning/90"
            >
              {softDeleteMutation.isPending ? "Archiving..." : "Confirm Archive"}
            </button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Are you sure you want to archive <strong>{deleteTarget?.name}</strong> ({deleteTarget?.code})? 
          The category will be hidden from active listings but can be restored later.
        </p>
      </ModalShell>

      {/* ── Hard Delete Confirmation ── */}
      <ModalShell
        open={!!hardDeleteTarget}
        onClose={() => setHardDeleteTarget(null)}
        title="Permanently Delete Category"
        subtitle="This action cannot be undone"
        icon={<AlertCircle className="size-5" />}
        maxWidth="28rem"
        footer={
          <>
            <button
              onClick={() => setHardDeleteTarget(null)}
              className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={() => hardDeleteTarget && hardDeleteMutation.mutate(hardDeleteTarget.id)}
              disabled={hardDeleteMutation.isPending}
              className="h-10 px-5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90"
            >
              {hardDeleteMutation.isPending ? "Deleting..." : "Permanently Delete"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to{" "}
            <strong className="text-destructive">permanently delete</strong>{" "}
            <strong>{hardDeleteTarget?.name}</strong> ({hardDeleteTarget?.code})?
          </p>
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
            ⚠️ This will remove the category permanently. Categories with existing products cannot
            be deleted.
          </div>
        </div>
      </ModalShell>
    </AppShell>
  );
}

/* ── Stat Card ── */
function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
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

/* ── Add Category Modal ── */
function AddCategoryModal({
  open,
  onClose,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  saving: boolean;
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSave({
      code: fd.get("code"),
      name: fd.get("name"),
      categoryGroup: fd.get("categoryGroup"),
      description: fd.get("description") || null,
    });
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Add category"
      subtitle="Categories group SKUs across every warehouse"
      icon={<Layers className="size-5" />}
      footer={
        <>
          <button
            onClick={onClose}
            disabled={saving}
            className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-cat-form"
            disabled={saving}
            className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground glow-ring"
            style={{ background: "var(--gradient-primary)" }}
          >
            {saving ? "Creating..." : "Create category"}
          </button>
        </>
      }
    >
      <form id="add-cat-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Code" required>
            <input
              name="code"
              className={inputCls}
              placeholder="e.g. CPU"
              required
              style={{ textTransform: "uppercase" }}
            />
          </Field>
          <Field label="Name" required>
            <input name="name" className={inputCls} placeholder="e.g. Processors" required />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Group">
            <select name="categoryGroup" className={selectCls} defaultValue="Components">
              {GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Description">
          <textarea
            name="description"
            className={`${inputCls} min-h-20 resize-y py-2`}
            placeholder="Optional description..."
          />
        </Field>
      </form>
    </ModalShell>
  );
}

/* ── Edit Category Modal ── */
function EditCategoryModal({
  category,
  onClose,
  onSave,
  saving,
}: {
  category: Category;
  onClose: () => void;
  onSave: (data: any) => void;
  saving: boolean;
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSave({
      code: fd.get("code"),
      name: fd.get("name"),
      categoryGroup: fd.get("categoryGroup"),
      status: fd.get("status"),
      description: fd.get("description") || null,
    });
  };

  return (
    <ModalShell
      open={true}
      onClose={onClose}
      title="Edit category"
      subtitle="Categories group SKUs across every warehouse"
      icon={<Pencil className="size-5" />}
      footer={
        <>
          <button
            onClick={onClose}
            disabled={saving}
            className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-cat-form"
            disabled={saving}
            className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground glow-ring"
            style={{ background: "var(--gradient-primary)" }}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </>
      }
    >
      <form id="edit-cat-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Code" required>
            <input
              name="code"
              className={inputCls}
              defaultValue={category.code}
              required
              style={{ textTransform: "uppercase" }}
            />
          </Field>
          <Field label="Name" required>
            <input name="name" className={inputCls} defaultValue={category.name} required />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Group">
            <select
              name="categoryGroup"
              className={selectCls}
              defaultValue={category.categoryGroup || "Components"}
            >
              {GROUPS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              name="status"
              className={selectCls}
              defaultValue={category.deleted ? "Archived" : "Active"}
            >
              <option value="Active">Active</option>
              <option value="Archived">Archived</option>
            </select>
          </Field>
        </div>
        <Field label="Description">
          <textarea
            name="description"
            className={`${inputCls} min-h-20 resize-y py-2`}
            defaultValue={category.description || ""}
          />
        </Field>
      </form>
    </ModalShell>
  );
}
