import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { warehouses } from "@/lib/warehouse-data";
import { MapPin, Building2, Plus, Package, TrendingUp, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { ModalShell, Field, inputCls, textareaCls } from "@/components/modal-shell";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — TechStock" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const totalCap = warehouses.reduce((s, w) => s + w.capacity, 0);
  const [open, setOpen] = useState(false);
  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage warehouses, thresholds and system info</p>
          </div>
          <button className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity" onClick={() => setOpen(true)}><Plus className="size-4" />Add warehouse</button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={Building2} label="Warehouses" value={warehouses.length} tone="primary" />
          <Kpi icon={Package} label="Total capacity" value={totalCap.toLocaleString()} tone="accent" />
          <Kpi icon={TrendingUp} label="Utilization" value="68%" tone="primary" />
          <Kpi icon={AlertTriangle} label="Low-stock rule" value="20 units" tone="warning" />
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
          <button className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground glow-ring" style={{ background: "var(--gradient-primary)" }}>
            Save changes
          </button>
        </div>
      </div>
      <AddWarehouseModal open={open} onClose={() => setOpen(false)} />
    </AppShell>
  );
}

function AddWarehouseModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Add warehouse"
      subtitle="Register a new warehouse facility"
      icon={<Building2 className="size-5" />}
      maxWidth="40rem"
      footer={
        <>
          <button onClick={onClose} className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm hover:bg-muted transition-colors">Cancel</button>
          <button onClick={onClose} className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground glow-ring" style={{ background: "var(--gradient-primary)" }}>Create warehouse</button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Warehouse code" required><input className={inputCls} placeholder="TS-HCM-02" /></Field>
        <Field label="Name" required><input className={inputCls} placeholder="TechStock Hub" /></Field>
        <Field label="Street address" required className="sm:col-span-2"><input className={inputCls} placeholder="Lot / Street / District" /></Field>
        <Field label="City" required><input className={inputCls} placeholder="Ho Chi Minh City" /></Field>
        <Field label="Country"><input className={inputCls} defaultValue="Vietnam" /></Field>
        <Field label="Capacity (units)" required><input type="number" className={inputCls} defaultValue={10000} min={0} /></Field>
        <Field label="Manager in charge"><input className={inputCls} placeholder="Warehouse Manager name" /></Field>
        <Field label="Notes" className="sm:col-span-2"><textarea className={textareaCls} placeholder="Optional description" /></Field>
      </div>
    </ModalShell>
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
