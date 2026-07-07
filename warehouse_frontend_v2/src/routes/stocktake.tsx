import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import {
  products,
  stocktakes,
  users,
  warehouseCode,
  warehouseName,
} from "@/lib/warehouse-data";
import { useApp } from "@/lib/app-context";
import { ClipboardCheck, Plus, X, Save, ListChecks, AlertTriangle, CheckCircle2, Boxes } from "lucide-react";

export const Route = createFileRoute("/stocktake")({
  head: () => ({ meta: [{ title: "Stocktake — TechStock" }] }),
  component: StocktakePage,
});

const statusTone: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  "In Progress": "bg-warning/15 text-warning",
  Completed: "bg-success/15 text-success",
};

function StocktakePage() {
  const { currentUser, activeWarehouseId } = useApp();
  const [creating, setCreating] = useState(false);
  const [counting, setCounting] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const canCreate = currentUser.role === "Warehouse_Manager" || currentUser.role === "Admin" || currentUser.role === "Manager";
  const canCount = currentUser.role === "Staff" || currentUser.role === "Warehouse_Manager";

  const list = useMemo(() => {
    let base = stocktakes;
    if (currentUser.role === "Warehouse_Manager" || currentUser.role === "Staff") {
      base = base.filter((s) => s.warehouseId === currentUser.warehouseId);
    } else if (activeWarehouseId) {
      base = base.filter((s) => s.warehouseId === activeWarehouseId);
    }
    return base;
  }, [currentUser, activeWarehouseId]);

  const countingTake = counting ? stocktakes.find((s) => s.id === counting) : null;
  const countingProducts = countingTake ? products.filter((p) => p.warehouseId === countingTake.warehouseId) : [];

  const totalItems = list.reduce((s, x) => s + x.items, 0);
  const totalVar = list.reduce((s, x) => s + x.variance, 0);
  const inProgress = list.filter((s) => s.status === "In Progress").length;
  const completed = list.filter((s) => s.status === "Completed").length;

  return (
    <AppShell>
      <div className="space-y-6">
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
              <Plus className="size-4" />New stocktake sheet
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={ListChecks} label="Total sheets" value={list.length} tone="primary" />
          <Kpi icon={AlertTriangle} label="In progress" value={inProgress} tone="warning" />
          <Kpi icon={CheckCircle2} label="Completed" value={completed} tone="accent" />
          <Kpi icon={Boxes} label="Items / variance" value={`${totalItems} / ${totalVar}`} tone="primary" />
        </div>

        <div className="surface-card overflow-hidden">
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
                  <th className="text-right p-4"></th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} className="border-t border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="p-4 font-mono text-xs">{s.id}</td>
                    <td className="p-4 text-muted-foreground">{s.date}</td>
                    <td className="p-4 font-mono text-xs">{warehouseCode(s.warehouseId)}</td>
                    <td className="p-4">{s.createdBy}</td>
                    <td className="p-4">{s.assignedTo}</td>
                    <td className="p-4 text-right">{s.items}</td>
                    <td className={`p-4 text-right font-semibold ${s.variance > 0 ? "text-warning" : "text-muted-foreground"}`}>
                      {s.variance > 0 ? `±${s.variance}` : "0"}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusTone[s.status]}`}>{s.status}</span>
                    </td>
                    <td className="p-4 text-right">
                      {canCount && s.status !== "Completed" && (
                        <button
                          onClick={() => {
                            setCounting(s.id);
                            setCounts({});
                          }}
                          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                        >
                          <ClipboardCheck className="size-3.5" />
                          Count
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground text-sm">
                      No stocktake sheets yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {creating && (
        <Modal onClose={() => setCreating(false)} title="Create stocktake sheet">
          <CreateForm onClose={() => setCreating(false)} />
        </Modal>
      )}

      {countingTake && (
        <Modal onClose={() => setCounting(null)} title={`Count — ${countingTake.id} • ${warehouseName(countingTake.warehouseId)}`}>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Enter the actual quantity counted on the shelf for each SKU. Variance is calculated against system stock.
            </p>
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
                  {countingProducts.map((p) => {
                    const actual = counts[p.sku];
                    const variance = actual === undefined ? null : actual - p.stock;
                    return (
                      <tr key={p.sku} className="border-t border-border/60">
                        <td className="p-3 font-mono text-xs">{p.sku}</td>
                        <td className="p-3">{p.name}</td>
                        <td className="p-3 text-right">{p.stock}</td>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            min={0}
                            value={actual ?? ""}
                            onChange={(e) =>
                              setCounts((c) => ({ ...c, [p.sku]: Number(e.target.value) }))
                            }
                            className="w-20 h-8 px-2 rounded-md bg-input border border-border text-right text-sm"
                          />
                        </td>
                        <td
                          className={`p-3 text-right font-semibold ${
                            variance === null
                              ? "text-muted-foreground"
                              : variance === 0
                              ? "text-success"
                              : "text-warning"
                          }`}
                        >
                          {variance === null ? "—" : variance > 0 ? `+${variance}` : variance}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setCounting(null)} className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm">
                Cancel
              </button>
              <button
                onClick={() => setCounting(null)}
                className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring"
                style={{ background: "var(--gradient-primary)" }}
              >
                <Save className="size-4" />Save count
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
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

function CreateForm({ onClose }: { onClose: () => void }) {
  const { currentUser } = useApp();
  const staffOptions = users.filter(
    (u) => u.role === "Staff" && (currentUser.warehouseId ? u.warehouseId === currentUser.warehouseId : true),
  );
  return (
    <div className="space-y-4">
      <Field label="Warehouse">
        <input
          readOnly
          value={currentUser.warehouseId ? warehouseName(currentUser.warehouseId) : "Select on save"}
          className="w-full h-10 px-3 rounded-lg bg-input border border-border text-sm"
        />
      </Field>
      <Field label="Created by">
        <input readOnly value={currentUser.name} className="w-full h-10 px-3 rounded-lg bg-input border border-border text-sm" />
      </Field>
      <Field label="Assign to staff">
        <select className="w-full h-10 px-3 rounded-lg bg-input border border-border text-sm">
          {staffOptions.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Notes">
        <textarea rows={3} placeholder="Scope: full cycle / category / zone..." className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm" />
      </Field>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm">Cancel</button>
        <button
          onClick={onClose}
          className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground glow-ring"
          style={{ background: "var(--gradient-primary)" }}
        >
          Create sheet
        </button>
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
