import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { users, warehouseName, warehouseCode } from "@/lib/warehouse-data";
import { useApp, roleLabels } from "@/lib/app-context";
import { Info, Users, Shield, Building2, UserCheck } from "lucide-react";

export const Route = createFileRoute("/staff")({
  head: () => ({ meta: [{ title: "Staff — TechStock" }] }),
  component: StaffPage,
});

const roleTone: Record<string, string> = {
  Admin: "bg-destructive/15 text-destructive",
  Manager: "bg-primary/15 text-primary",
  Warehouse_Manager: "bg-accent/15 text-accent",
  Staff: "bg-muted text-muted-foreground",
};

function StaffPage() {
  const { currentUser, activeWarehouseId } = useApp();

  // Scope rules:
  // - Warehouse_Manager: only sees Staff in their own warehouse.
  // - Staff: only sees teammates in their own warehouse.
  // - Admin / Manager: see everyone; filtered by Active Warehouse selector when set.
  let list = users.filter((u) => u.role === "Staff" || u.role === "Warehouse_Manager");
  if (currentUser.role === "Warehouse_Manager" || currentUser.role === "Staff") {
    list = list.filter((u) => u.warehouseId === currentUser.warehouseId);
  } else if (activeWarehouseId) {
    list = list.filter((u) => u.warehouseId === activeWarehouseId);
  }

  const scopeLabel =
    currentUser.role === "Warehouse_Manager" || currentUser.role === "Staff"
      ? `Scoped to ${warehouseName(currentUser.warehouseId!)}`
      : activeWarehouseId
      ? `Filtered: ${warehouseName(activeWarehouseId)}`
      : "All warehouses";

  const managers = list.filter((u) => u.role === "Warehouse_Manager").length;
  const staffCount = list.filter((u) => u.role === "Staff").length;
  const warehouseSet = new Set(list.map((u) => u.warehouseId)).size;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Warehouse staff</h1>
            <p className="text-sm text-muted-foreground mt-1">Team members and roles</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary border border-border text-xs">
            <Info className="size-3.5 text-primary" />
            {scopeLabel}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={Users} label="Total people" value={list.length} tone="primary" />
          <Kpi icon={UserCheck} label="Warehouse managers" value={managers} tone="accent" />
          <Kpi icon={Shield} label="Staff members" value={staffCount} tone="primary" />
          <Kpi icon={Building2} label="Warehouses covered" value={warehouseSet} tone="warning" />
        </div>

        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40">
                <tr>
                  <th className="text-left p-4">Employee</th>
                  <th className="text-left p-4">Title</th>
                  <th className="text-left p-4">Role</th>
                  <th className="text-left p-4">Warehouse</th>
                  <th className="text-left p-4">Location</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} className="border-t border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full grid place-items-center text-xs font-semibold" style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}>
                          {s.initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{s.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{s.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{s.title}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${roleTone[s.role]}`}>{roleLabels[s.role]}</span>
                    </td>
                    <td className="p-4 font-mono text-xs">{s.warehouseId ? warehouseCode(s.warehouseId) : "—"}</td>
                    <td className="p-4 text-muted-foreground">{s.warehouseId ? warehouseName(s.warehouseId) : "All warehouses"}</td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
                      No staff assigned to this warehouse yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
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
