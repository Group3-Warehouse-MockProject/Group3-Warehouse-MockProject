import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { MapPin, Building2, Plus, Package, TrendingUp, AlertTriangle, Loader2, Pencil, Power, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { ModalShell, Field, inputCls } from "@/components/modal-shell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useApp } from "@/lib/app-context";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — TechStock" }] }),
  component: SettingsPage,
});

interface WarehouseData {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  capacity: number;
  usedCapacity: number;
  status?: string;
  managerName?: string | null;
}

interface ManagerUser {
  id: number;
  fullName: string;
  warehouseId: number | null;
}

function SettingsPage() {
  const { currentUser } = useApp();
  const [open, setOpen] = useState(false);
  const [editWarehouse, setEditWarehouse] = useState<WarehouseData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: warehousesData, isLoading } = useQuery<WarehouseData[]>({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data;
    },
  });

  const warehouses = warehousesData ?? [];
  const filteredWarehouses = warehouses.filter((w) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      w.name.toLowerCase().includes(q) ||
      w.code.toLowerCase().includes(q) ||
      (w.address && w.address.toLowerCase().includes(q)) ||
      (w.city && w.city.toLowerCase().includes(q)) ||
      (w.managerName && w.managerName.toLowerCase().includes(q))
    );
  });

  const totalCap = warehouses.reduce((s, w) => s + (w.capacity ?? 0), 0);
  const totalUsed = warehouses.reduce((s, w) => s + (w.usedCapacity ?? 0), 0);
  const utilization = totalCap > 0 ? Math.round((totalUsed / totalCap) * 100) : 0;

  const canManage = currentUser?.role === "Admin" || currentUser?.role === "Manager";

  const queryClient = useQueryClient();

  const toggleStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/warehouses/${id}/status`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
    },
  });

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage warehouses, thresholds and system info</p>
          </div>
          {canManage && (
            <button
              className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
              onClick={() => setOpen(true)}
            >
              <Plus className="size-4" />Add warehouse
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground gap-2">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm">Loading warehouses…</span>
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Kpi icon={Building2} label="Warehouses" value={warehouses.length} tone="primary" />
              <Kpi icon={Package} label="Total capacity" value={totalCap.toLocaleString()} tone="accent" />
              <Kpi icon={TrendingUp} label="Utilization" value={`${utilization}%`} tone="primary" />
              <Kpi icon={AlertTriangle} label="Low-stock rule" value="20 units" tone="warning" />
            </div>

            {/* Warehouse list */}
            <div className="surface-card p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold flex items-center gap-2">
                    <Building2 className="size-4 text-primary" />Warehouses
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">All warehouses and their addresses.</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search warehouse..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-lg bg-input border border-border text-xs focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>
              </div>
              {filteredWarehouses.length === 0 ? (
                <div className="mt-6 text-center text-sm text-muted-foreground py-8">
                  {searchQuery ? `No warehouses found matching "${searchQuery}".` : "No warehouses found."}
                </div>
              ) : (
                <div className="mt-4 max-h-[460px] overflow-y-auto pr-1.5 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredWarehouses.map((w) => {
                    const usedPct = w.capacity > 0 ? Math.round((w.usedCapacity / w.capacity) * 100) : 0;
                    const isActive = (w.status ?? "ACTIVE").toUpperCase() === "ACTIVE";
                    return (
                      <div key={w.id} className={`p-4 rounded-xl border transition-all ${isActive ? "border-border/60 bg-secondary/30" : "border-destructive/30 bg-destructive/5 opacity-80"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{w.name}</span>
                              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isActive ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-destructive/15 text-destructive"}`}>
                                {isActive ? "Active" : "Inactive"}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">{w.code}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 rounded-md bg-primary/15 text-primary">
                              {(w.capacity ?? 0).toLocaleString()} units
                            </span>
                            {canManage && (
                              <>
                                <button
                                  onClick={() => toggleStatusMutation.mutate(w.id)}
                                  disabled={toggleStatusMutation.isPending}
                                  className={`size-7 rounded-lg grid place-items-center border transition-colors ${isActive ? "bg-secondary border-border hover:bg-destructive/15 hover:text-destructive hover:border-destructive/30" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/20"}`}
                                  title={isActive ? "Deactivate warehouse" : "Activate warehouse"}
                                >
                                  <Power className="size-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditWarehouse(w)}
                                  className="size-7 rounded-lg grid place-items-center bg-secondary border border-border hover:bg-muted transition-colors"
                                  title="Edit warehouse"
                                >
                                  <Pencil className="size-3.5 text-muted-foreground" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex items-start gap-2 text-sm">
                          <MapPin className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <div>{w.address}</div>
                            <div className="text-muted-foreground">{w.city}</div>
                          </div>
                        </div>
                        {/* Manager in charge */}
                        {w.managerName && (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent/15 text-accent">
                              <svg xmlns="http://www.w3.org/2000/svg" className="size-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                              {w.managerName}
                            </span>
                          </div>
                        )}
                        {/* Utilization mini bar per warehouse */}
                        <div className="mt-3">
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>Used: {(w.usedCapacity ?? 0).toLocaleString()} units</span>
                            <span>{usedPct}%</span>
                          </div>
                          <div className="h-1 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${usedPct}%`, background: "var(--gradient-primary)" }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Alert thresholds — UI only, not yet connected to backend */}
        <div className="surface-card p-6 space-y-4">
          <h2 className="font-semibold">Alert thresholds</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Default low-stock threshold</label>
              <input defaultValue="20" className="mt-1 w-full h-10 px-3 rounded-lg bg-input border border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Out-of-stock warning (days)</label>
              <input defaultValue="3" className="mt-1 w-full h-10 px-3 rounded-lg bg-input border border-border text-sm" />
            </div>
          </div>
        </div>

        {/* System info */}
        <div className="surface-card p-6 space-y-4">
          <h2 className="font-semibold">System info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div><div className="text-xs text-muted-foreground">Version</div><div className="font-semibold mt-1">TechStock 1.4.2</div></div>
            <div><div className="text-xs text-muted-foreground">Region</div><div className="font-semibold mt-1">ap-southeast-1</div></div>
            <div><div className="text-xs text-muted-foreground">Support</div><div className="font-semibold mt-1">ops@techstock.vn</div></div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm">Cancel</button>
          <button
            className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground glow-ring"
            style={{ background: "var(--gradient-primary)" }}
          >
            Save changes
          </button>
        </div>
      </div>

      {canManage && (
        <AddWarehouseModal open={open} onClose={() => setOpen(false)} />
      )}
      {canManage && editWarehouse && (
        <EditWarehouseModal
          warehouse={editWarehouse}
          onClose={() => setEditWarehouse(null)}
        />
      )}
    </AppShell>
  );
}

function AddWarehouseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    code: "",
    name: "",
    address: "",
    city: "",
    capacity: "10000",
    managerId: "",   // ID của WarehouseManager user (string vì select value)
  });
  const [error, setError] = useState<string | null>(null);

  // Fetch danh sách user có role WAREHOUSE_MANAGER
  const { data: managersData, isLoading: managersLoading } = useQuery<ManagerUser[]>({
    queryKey: ["users", "WAREHOUSE_MANAGER"],
    queryFn: async () => {
      const res = await api.get("/users", { params: { role: "WAREHOUSE_MANAGER" } });
      return res.data;
    },
    enabled: open, // chỉ fetch khi modal đang mở
  });
  const managers = managersData ?? [];

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const fullAddress = form.city ? `${form.address}, ${form.city}` : form.address;
      await api.post("/warehouses", {
        code: form.code,
        name: form.name,
        address: fullAddress,
        capacity: Number(form.capacity),
        managerId: form.managerId ? Number(form.managerId) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      // Invalidate danh sách user vì manager đã được gán warehouse mới
      queryClient.invalidateQueries({ queryKey: ["users"] });
      handleClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data ?? err?.message ?? "Failed to create warehouse";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    },
  });

  function handleClose() {
    setForm({ code: "", name: "", address: "", city: "", capacity: "10000", managerId: "" });
    setError(null);
    onClose();
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <ModalShell
      open={open}
      onClose={handleClose}
      title="Add warehouse"
      subtitle="Register a new warehouse facility"
      icon={<Building2 className="size-5" />}
      maxWidth="40rem"
      footer={
        <>
          <button
            onClick={handleClose}
            className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm hover:bg-muted transition-colors"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            onClick={() => { setError(null); mutate(); }}
            disabled={isPending || !form.code || !form.name || !form.address || !form.city}
            className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground glow-ring flex items-center gap-2 disabled:opacity-60"
            style={{ background: "var(--gradient-primary)" }}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Create warehouse
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Warehouse code" required>
          <input className={inputCls} placeholder="TS-HCM-02" value={form.code} onChange={set("code")} />
        </Field>
        <Field label="Name" required>
          <input className={inputCls} placeholder="TechStock Hub" value={form.name} onChange={set("name")} />
        </Field>
        <Field label="Street address" required className="sm:col-span-2">
          <input className={inputCls} placeholder="Lot / Street / District" value={form.address} onChange={set("address")} />
        </Field>
        <Field label="City" required>
          <input className={inputCls} placeholder="Ho Chi Minh City" value={form.city} onChange={set("city")} />
        </Field>
        <Field label="Country">
          <input className={inputCls} defaultValue="Vietnam" readOnly />
        </Field>
        <Field label="Capacity (units)" required>
          <input type="number" className={inputCls} value={form.capacity} onChange={set("capacity")} min={0} />
        </Field>
        <Field label="Manager in charge">
          <select
            className={inputCls}
            value={form.managerId}
            onChange={set("managerId")}
            disabled={managersLoading}
          >
            <option value="">— None —</option>
            {managers.map((m) => (
              <option key={m.id} value={String(m.id)}>
                {m.fullName}
              </option>
            ))}
          </select>
        </Field>
        {error && (
          <div className="sm:col-span-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>
    </ModalShell>
  );
}

function EditWarehouseModal({
  warehouse,
  onClose,
}: {
  warehouse: WarehouseData;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: warehouse.name,
    address: warehouse.address,   // address đã không còn chứa city (đã fix ở backend)
    city: warehouse.city,
    capacity: String(warehouse.capacity ?? ""),
    status: warehouse.status ?? "ACTIVE",
    managerId: "-1",   // default — sẽ được update bởi useEffect khi managers load
  });
  const [error, setError] = useState<string | null>(null);

  // Fetch danh sách WAREHOUSE_MANAGER
  const { data: managersData, isLoading: managersLoading } = useQuery<ManagerUser[]>({
    queryKey: ["users", "WAREHOUSE_MANAGER"],
    queryFn: async () => {
      const res = await api.get("/users", { params: { role: "WAREHOUSE_MANAGER" } });
      return res.data;
    },
  });
  const managers = managersData ?? [];

  // Pre-select manager hiện tại khi data load xong
  useEffect(() => {
    if (!managersData) return;
    const current = managersData.find((m) => String(m.warehouseId) === warehouse.id);
    setForm((prev) => ({ ...prev, managerId: current ? String(current.id) : "-1" }));
  }, [managersData, warehouse.id]);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const fullAddress = form.city
        ? `${form.address.trim()}, ${form.city.trim()}`
        : form.address.trim();

      await api.put(`/warehouses/${warehouse.id}`, {
        name: form.name,
        address: fullAddress,
        capacity: Number(form.capacity),
        status: form.status,
        managerId: Number(form.managerId),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data ?? err?.message ?? "Failed to update warehouse";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    },
  });

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <ModalShell
      open={true}
      onClose={onClose}
      title={`Edit — ${warehouse.code}`}
      subtitle="Update warehouse information"
      icon={<Pencil className="size-5" />}
      maxWidth="40rem"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={isPending}
            className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { setError(null); mutate(); }}
            disabled={isPending || !form.name || !form.address || !form.city || !form.capacity}
            className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground glow-ring flex items-center gap-2 disabled:opacity-60"
            style={{ background: "var(--gradient-primary)" }}
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Code readonly */}
        <Field label="Warehouse code">
          <input className={`${inputCls} opacity-60 cursor-not-allowed`} value={warehouse.code} readOnly />
        </Field>
        <Field label="Name" required>
          <input className={inputCls} value={form.name} onChange={set("name")} />
        </Field>
        <Field label="Street address" required className="sm:col-span-2">
          <input className={inputCls} value={form.address} onChange={set("address")} />
        </Field>
        <Field label="City" required>
          <input className={inputCls} value={form.city} onChange={set("city")} />
        </Field>
        <Field label="Capacity (units)" required>
          <input type="number" className={inputCls} value={form.capacity} onChange={set("capacity")} min={0} />
        </Field>
        <Field label="Status">
          <select className={inputCls} value={form.status} onChange={set("status")}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </Field>
        <Field label="Manager in charge" className="sm:col-span-2">
          <select
            className={inputCls}
            value={form.managerId}
            onChange={set("managerId")}
            disabled={managersLoading}
          >
            <option value="-1">— None —</option>
            {managers.map((m) => (
              <option key={m.id} value={String(m.id)}>
                {m.fullName}
              </option>
            ))}
          </select>
        </Field>
        {error && (
          <div className="sm:col-span-2 text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>
    </ModalShell>
  );
}


function Kpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  tone: "primary" | "accent" | "warning";
}) {
  const color =
    tone === "warning" ? "var(--warning)" : tone === "accent" ? "var(--accent)" : "var(--primary)";
  return (
    <div className="surface-card p-5">
      <div className="flex items-start justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div
          className="size-9 rounded-lg grid place-items-center"
          style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}
        >
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
    </div>
  );
}
