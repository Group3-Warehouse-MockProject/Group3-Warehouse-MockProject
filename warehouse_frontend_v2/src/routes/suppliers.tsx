import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit2,
  Globe,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  Search,
  Star,
  Trash2,
  Truck,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Field, inputCls, ModalShell, selectCls, textareaCls } from "@/components/modal-shell";
import { useApp } from "@/lib/app-context";
import { api } from "@/lib/api";

export const Route = createFileRoute("/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers — TechStock" }] }),
  component: SuppliersPage,
});

type SupplierStatus = "ACTIVE" | "INACTIVE";

interface Supplier {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  address: string;
  status: SupplierStatus;
  country: string;
  contactPerson: string | null;
  categories: string;
  rating: number;
  onTimeDelivery: number;
  notes: string | null;
  productCount: number;
}

interface SupplierFormValues {
  name: string;
  email: string;
  phoneNumber: string;
  address: string;
  country: string;
  contactPerson: string;
  categories: string;
  rating: number;
  onTimeDelivery: number;
  notes: string;
  status: SupplierStatus;
}

interface Notice {
  type: "success" | "error";
  text: string;
}

const PAGE_SIZE = 6;

function SuppliersPage() {
  const { currentUser } = useApp();
  const queryClient = useQueryClient();
  const canManage = currentUser?.role === "Admin" || currentUser?.role === "Manager";
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"ALL" | SupplierStatus>("ALL");
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null | undefined>(undefined);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  const suppliersQuery = useQuery<Supplier[]>({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const response = await api.get("/suppliers");
      return response.data;
    },
  });

  const suppliers = suppliersQuery.data ?? [];
  const filtered = useMemo(() => {
    const normalizedQuery = q.trim().toLowerCase();
    return suppliers.filter((supplier) => {
      const matchesStatus = status === "ALL" || supplier.status === status;
      const searchable = [
        supplier.name,
        supplier.contactPerson,
        supplier.email,
        supplier.phoneNumber,
        supplier.categories,
        supplier.country,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [q, status, suppliers]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const activeSuppliers = suppliers.filter((supplier) => supplier.status === "ACTIVE");
  const averageRating = suppliers.length
    ? suppliers.reduce((sum, supplier) => sum + Number(supplier.rating || 0), 0) / suppliers.length
    : 0;
  const averageOnTime = suppliers.length
    ? suppliers.reduce((sum, supplier) => sum + Number(supplier.onTimeDelivery || 0), 0) / suppliers.length
    : 0;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const saveMutation = useMutation({
    mutationFn: async ({ values, supplier }: { values: SupplierFormValues; supplier: Supplier | null }) => {
      if (supplier) {
        const response = await api.put(`/suppliers/${supplier.id}`, values);
        return response.data as Supplier;
      }
      const response = await api.post("/suppliers", values);
      return response.data as Supplier;
    },
    onSuccess: (savedSupplier, variables) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setEditingSupplier(undefined);
      setNotice({
        type: "success",
        text: variables.supplier
          ? `${savedSupplier.name} was updated successfully.`
          : `${savedSupplier.name} was added successfully.`,
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async (supplier: Supplier) => {
      const nextStatus: SupplierStatus = supplier.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      const response = await api.patch(`/suppliers/${supplier.id}/status`, { status: nextStatus });
      return response.data as Supplier;
    },
    onSuccess: (supplier) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setNotice({
        type: "success",
        text: `${supplier.name} is now ${supplier.status.toLowerCase()}.`,
      });
    },
    onError: (error) => setNotice({ type: "error", text: getApiError(error) }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (supplier: Supplier) => {
      await api.delete(`/suppliers/${supplier.id}`);
      return supplier;
    },
    onSuccess: (supplier) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setDeletingSupplier(null);
      setNotice({ type: "success", text: `${supplier.name} was deleted.` });
    },
    onError: (error) => {
      setDeletingSupplier(null);
      setNotice({ type: "error", text: getApiError(error) });
    },
  });

  const handleSave = async (values: SupplierFormValues) => {
    setNotice(null);
    try {
      await saveMutation.mutateAsync({ values, supplier: editingSupplier ?? null });
    } catch (error) {
      throw new Error(getApiError(error));
    }
  };

  const start = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const end = Math.min(safePage * PAGE_SIZE, filtered.length);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Suppliers</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage component and device distribution partners</p>
          </div>
          {canManage && (
            <button
              onClick={() => setEditingSupplier(null)}
              className="glow-ring flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Plus className="size-4" /> Add supplier
            </button>
          )}
        </div>

        {notice && (
          <div
            role="status"
            className={`flex items-center justify-between gap-3 rounded-lg border p-3 text-sm ${
              notice.type === "success"
                ? "border-success/30 bg-success/10 text-success"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            <span className="flex items-center gap-2">
              {notice.type === "success" ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
              {notice.text}
            </span>
            <button onClick={() => setNotice(null)} className="text-xs underline">Dismiss</button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi icon={Truck} label="Active suppliers" value={`${activeSuppliers.length}/${suppliers.length}`} tone="primary" />
          <Kpi icon={Award} label="Avg rating" value={averageRating.toFixed(2)} tone="accent" />
          <Kpi icon={Clock} label="Avg on-time" value={`${Math.round(averageOnTime)}%`} tone="primary" />
          <Kpi icon={Globe} label="Countries" value={new Set(suppliers.map((supplier) => supplier.country)).size} tone="warning" />
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-64 max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                setPage(1);
              }}
              placeholder="Search name, contact, email, category..."
              className="h-10 w-full rounded-lg border border-border bg-input pl-9 pr-3 text-sm"
            />
          </div>
          <select
            aria-label="Filter supplier status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as "ALL" | SupplierStatus);
              setPage(1);
            }}
            className="h-10 min-w-40 rounded-lg border border-border bg-input px-3 text-sm"
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <button
            aria-label="Refresh suppliers"
            onClick={() => suppliersQuery.refetch()}
            disabled={suppliersQuery.isFetching}
            className="grid size-10 place-items-center rounded-lg border border-border bg-secondary hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${suppliersQuery.isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="p-4 text-left">Supplier</th>
                  <th className="p-4 text-left">Contact</th>
                  <th className="p-4 text-left">Categories</th>
                  <th className="p-4 text-left">Country</th>
                  <th className="p-4 text-center">Performance</th>
                  <th className="p-4 text-center">Status</th>
                  {canManage && <th className="p-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {pageItems.map((supplier) => (
                  <tr key={supplier.id} className="border-t border-border/60 transition-colors hover:bg-secondary/30">
                    <td className="p-4">
                      <div className="font-medium">{supplier.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">SUP-{String(supplier.id).padStart(3, "0")}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{supplier.productCount} linked products</div>
                    </td>
                    <td className="p-4">
                      <div>{supplier.contactPerson || "—"}</div>
                      <a href={`mailto:${supplier.email}`} className="text-xs text-primary hover:underline">{supplier.email}</a>
                      <div className="font-mono text-xs text-muted-foreground">{supplier.phoneNumber}</div>
                    </td>
                    <td className="max-w-56 p-4 text-muted-foreground">{supplier.categories || "—"}</td>
                    <td className="p-4">
                      <div>{supplier.country}</div>
                      <div className="max-w-48 truncate text-xs text-muted-foreground" title={supplier.address}>{supplier.address}</div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="inline-flex items-center gap-1 text-warning">
                        <Star className="size-3.5 fill-current" /> {Number(supplier.rating || 0).toFixed(1)}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-success">{supplier.onTimeDelivery || 0}% on-time</div>
                    </td>
                    <td className="p-4 text-center">
                      <StatusBadge status={supplier.status} />
                    </td>
                    {canManage && (
                      <td className="p-4">
                        <div className="flex justify-end gap-1">
                          <ActionButton label={`Edit ${supplier.name}`} onClick={() => setEditingSupplier(supplier)} icon={Edit2} />
                          <ActionButton
                            label={`${supplier.status === "ACTIVE" ? "Deactivate" : "Activate"} ${supplier.name}`}
                            onClick={() => statusMutation.mutate(supplier)}
                            icon={Power}
                            disabled={statusMutation.isPending}
                          />
                          <ActionButton
                            label={`Delete ${supplier.name}`}
                            onClick={() => setDeletingSupplier(supplier)}
                            icon={Trash2}
                            destructive
                          />
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {suppliersQuery.isLoading && (
                  <tr><td colSpan={canManage ? 7 : 6} className="p-10 text-center text-muted-foreground"><Loader2 className="mx-auto mb-2 size-5 animate-spin" />Loading suppliers...</td></tr>
                )}
                {suppliersQuery.isError && (
                  <tr><td colSpan={canManage ? 7 : 6} className="p-10 text-center text-destructive">Failed to load suppliers. Use refresh to try again.</td></tr>
                )}
                {!suppliersQuery.isLoading && !suppliersQuery.isError && pageItems.length === 0 && (
                  <tr><td colSpan={canManage ? 7 : 6} className="p-10 text-center text-muted-foreground">No suppliers match the current filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-border/60 p-4 text-sm">
            <div className="text-xs text-muted-foreground">Showing {start}–{end} of {filtered.length}</div>
            <div className="flex items-center gap-1">
              <PageButton label="Previous page" disabled={safePage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="size-4" /></PageButton>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => (
                <button
                  key={number}
                  onClick={() => setPage(number)}
                  className={`size-8 rounded-md text-xs font-medium ${number === safePage ? "bg-primary text-primary-foreground" : "border border-border bg-secondary hover:bg-muted"}`}
                >
                  {number}
                </button>
              ))}
              <PageButton label="Next page" disabled={safePage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}><ChevronRight className="size-4" /></PageButton>
            </div>
          </div>
        </div>
      </div>

      {editingSupplier !== undefined && (
        <SupplierFormModal
          supplier={editingSupplier}
          saving={saveMutation.isPending}
          onClose={() => setEditingSupplier(undefined)}
          onSave={handleSave}
        />
      )}
      {deletingSupplier && (
        <DeleteSupplierModal
          supplier={deletingSupplier}
          deleting={deleteMutation.isPending}
          onClose={() => setDeletingSupplier(null)}
          onConfirm={() => deleteMutation.mutate(deletingSupplier)}
        />
      )}
    </AppShell>
  );
}

function SupplierFormModal({ supplier, saving, onClose, onSave }: {
  supplier: Supplier | null;
  saving: boolean;
  onClose: () => void;
  onSave: (values: SupplierFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<SupplierFormValues>(() => supplierToForm(supplier));
  const [error, setError] = useState<string | null>(null);
  const formId = supplier ? `edit-supplier-${supplier.id}` : "add-supplier";

  const update = <K extends keyof SupplierFormValues,>(field: K, value: SupplierFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await onSave(values);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save supplier");
    }
  };

  return (
    <ModalShell
      open
      onClose={onClose}
      title={supplier ? "Edit supplier" : "Add supplier"}
      subtitle={supplier ? `Update ${supplier.name}` : "Register a new distribution partner"}
      icon={<Truck className="size-5" />}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} className="h-10 rounded-lg border border-border bg-secondary px-4 text-sm hover:bg-muted disabled:opacity-50">Cancel</button>
          <button type="submit" form={formId} disabled={saving} className="glow-ring flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-medium text-primary-foreground disabled:opacity-50" style={{ background: "var(--gradient-primary)" }}>
            {saving && <Loader2 className="size-4 animate-spin" />}{supplier ? "Save changes" : "Save supplier"}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {error && <div className="sm:col-span-2 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="size-4" />{error}</div>}
        <Field label="Supplier name" required className="sm:col-span-2"><input required maxLength={255} value={values.name} onChange={(event) => update("name", event.target.value)} className={inputCls} placeholder="e.g. FPT Distribution" /></Field>
        <Field label="Contact person"><input maxLength={100} value={values.contactPerson} onChange={(event) => update("contactPerson", event.target.value)} className={inputCls} placeholder="Full name" /></Field>
        <Field label="Country" required><input required value={values.country} onChange={(event) => update("country", event.target.value)} className={inputCls} placeholder="Vietnam" /></Field>
        <Field label="Phone" required><input required maxLength={20} value={values.phoneNumber} onChange={(event) => update("phoneNumber", event.target.value)} className={inputCls} placeholder="+84 ..." /></Field>
        <Field label="Email" required><input required type="email" maxLength={100} value={values.email} onChange={(event) => update("email", event.target.value)} className={inputCls} placeholder="sales@partner.com" /></Field>
        <Field label="Address" required className="sm:col-span-2"><input required value={values.address} onChange={(event) => update("address", event.target.value)} className={inputCls} placeholder="Street, district, city" /></Field>
        <Field label="Categories supplied" className="sm:col-span-2" hint="Comma-separated, e.g. GPU, CPU, RAM"><input maxLength={500} value={values.categories} onChange={(event) => update("categories", event.target.value)} className={inputCls} placeholder="GPU, CPU, Laptop" /></Field>
        <Field label="Rating (0–5)"><input required type="number" step="0.1" min={0} max={5} value={values.rating} onChange={(event) => update("rating", Number(event.target.value))} className={inputCls} /></Field>
        <Field label="On-time delivery (%)"><input required type="number" min={0} max={100} value={values.onTimeDelivery} onChange={(event) => update("onTimeDelivery", Number(event.target.value))} className={inputCls} /></Field>
        {supplier && <Field label="Status"><select value={values.status} onChange={(event) => update("status", event.target.value as SupplierStatus)} className={selectCls}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></Field>}
        <Field label="Notes" className="sm:col-span-2"><textarea value={values.notes} onChange={(event) => update("notes", event.target.value)} className={textareaCls} placeholder="Payment terms, lead time, service notes..." /></Field>
      </form>
    </ModalShell>
  );
}

function DeleteSupplierModal({ supplier, deleting, onClose, onConfirm }: {
  supplier: Supplier;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const hasProducts = supplier.productCount > 0;
  return (
    <ModalShell
      open
      onClose={onClose}
      title={hasProducts ? "Supplier cannot be deleted" : "Delete supplier"}
      subtitle={supplier.name}
      icon={<Trash2 className="size-5" />}
      footer={
        <>
          <button onClick={onClose} className="h-10 rounded-lg border border-border bg-secondary px-4 text-sm hover:bg-muted">{hasProducts ? "Close" : "Cancel"}</button>
          {!hasProducts && <button onClick={onConfirm} disabled={deleting} className="flex h-10 items-center gap-2 rounded-lg bg-destructive px-5 text-sm font-medium text-destructive-foreground disabled:opacity-50">{deleting && <Loader2 className="size-4 animate-spin" />}Delete permanently</button>}
        </>
      }
    >
      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
        {hasProducts
          ? `This supplier is linked to ${supplier.productCount} product${supplier.productCount === 1 ? "" : "s"}. Deactivate it instead to preserve product history.`
          : "This action cannot be undone. The supplier record will be permanently removed."}
      </div>
    </ModalShell>
  );
}

function supplierToForm(supplier: Supplier | null): SupplierFormValues {
  return {
    name: supplier?.name ?? "",
    email: supplier?.email ?? "",
    phoneNumber: supplier?.phoneNumber ?? "",
    address: supplier?.address ?? "",
    country: supplier?.country ?? "",
    contactPerson: supplier?.contactPerson ?? "",
    categories: supplier?.categories ?? "",
    rating: Number(supplier?.rating ?? 4.5),
    onTimeDelivery: supplier?.onTimeDelivery ?? 90,
    notes: supplier?.notes ?? "",
    status: supplier?.status ?? "ACTIVE",
  };
}

function StatusBadge({ status }: { status: SupplierStatus }) {
  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${status === "ACTIVE" ? "border-success/30 bg-success/10 text-success" : "border-border bg-muted text-muted-foreground"}`}>{status === "ACTIVE" ? "Active" : "Inactive"}</span>;
}

function ActionButton({ label, icon: Icon, onClick, destructive = false, disabled = false }: {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className={`grid size-8 place-items-center rounded-md border transition-colors disabled:opacity-40 ${destructive ? "border-destructive/30 text-destructive hover:bg-destructive/10" : "border-border bg-secondary hover:bg-muted"}`}><Icon className="size-3.5" /></button>;
}

function PageButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button aria-label={label} onClick={onClick} disabled={disabled} className="grid size-8 place-items-center rounded-md border border-border bg-secondary hover:bg-muted disabled:opacity-40">{children}</button>;
}

function Kpi({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: number | string; tone: "primary" | "accent" | "warning" }) {
  const color = tone === "warning" ? "var(--warning)" : tone === "accent" ? "var(--accent)" : "var(--primary)";
  return (
    <div className="surface-card p-5">
      <div className="flex items-start justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="grid size-9 place-items-center rounded-lg" style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}><Icon className="size-4" /></div>
      </div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
    </div>
  );
}

function getApiError(error: unknown): string {
  const apiError = error as { response?: { data?: { message?: string; errors?: Record<string, string> } } };
  const data = apiError.response?.data;
  if (data?.errors) return Object.values(data.errors)[0] ?? data.message ?? "Validation failed";
  return data?.message ?? (error instanceof Error ? error.message : "The request could not be completed");
}
