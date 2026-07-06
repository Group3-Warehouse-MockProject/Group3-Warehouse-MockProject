import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { warehouses } from "@/lib/warehouse-data";
import { MapPin, Building2, Plus } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — TechStock" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage warehouses, thresholds and system info</p>
          </div>
          <button className="h-10 px-4 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring" style={{ background: "var(--gradient-primary)" }}>
            <Plus className="size-4" />Add warehouse
          </button>
        </div>

        <div className="surface-card p-6">
          <h2 className="font-semibold flex items-center gap-2"><Building2 className="size-4 text-primary" />Warehouses</h2>
          <p className="text-xs text-muted-foreground mt-1">All warehouses and their addresses.</p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {warehouses.map((w) => (
              <div key={w.id} className="p-4 rounded-xl border border-border/60 bg-secondary/30">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{w.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{w.code}</div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-md bg-primary/15 text-primary">{w.capacity.toLocaleString()} units</span>
                </div>
                <div className="mt-3 flex items-start gap-2 text-sm">
                  <MapPin className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <div>{w.address}</div>
                    <div className="text-muted-foreground">{w.city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

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

        <div className="flex justify-end gap-2">
          <button className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm">Cancel</button>
          <button className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground glow-ring" style={{ background: "var(--gradient-primary)" }}>
            Save changes
          </button>
        </div>
      </div>
    </AppShell>
  );
}
