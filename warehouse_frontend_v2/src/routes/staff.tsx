import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { users, warehouseName, warehouseCode } from "@/lib/warehouse-data";
import { useApp, roleLabels } from "@/lib/app-context";
import { Info } from "lucide-react";

export const Route = createFileRoute("/staff")({
  head: () => ({ meta: [{ title: "Staff — TechStock" }] }),
  component: StaffPage,
});

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((s) => (
            <div key={s.id} className="surface-card p-5">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-full grid place-items-center font-semibold" style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}>
                  {s.initials}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.title}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-secondary/40">
                  <div className="text-xs text-muted-foreground">Role</div>
                  <div className="font-medium">{roleLabels[s.role]}</div>
                </div>
                <div className="p-3 rounded-lg bg-secondary/40">
                  <div className="text-xs text-muted-foreground">Warehouse</div>
                  <div className="font-medium font-mono text-xs">{s.warehouseId ? warehouseCode(s.warehouseId) : "—"}</div>
                </div>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <div className="surface-card p-8 text-center text-muted-foreground text-sm md:col-span-2 lg:col-span-3">
              No staff assigned to this warehouse yet.
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
