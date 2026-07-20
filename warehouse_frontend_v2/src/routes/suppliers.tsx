import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { suppliers } from "@/lib/warehouse-data";
import { Star, ChevronLeft, ChevronRight, Plus, Search, Truck, Award, Clock, Globe } from "lucide-react";
import { ModalShell, Field, inputCls, textareaCls } from "@/components/modal-shell";


export const Route = createFileRoute("/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers — TechStock" }] }),
  component: SuppliersPage,
});

const PAGE_SIZE = 6;

function SuppliersPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(q.toLowerCase()) ||
      s.contact.toLowerCase().includes(q.toLowerCase()) ||
      s.categories.toLowerCase().includes(q.toLowerCase()),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Suppliers</h1>
            <p className="text-sm text-muted-foreground mt-1">Partners distributing components & devices</p>
          </div>
          <button onClick={() => setOpen(true)} className="h-10 px-4 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring" style={{ background: "var(--gradient-primary)" }}>
            <Plus className="size-4" />Add supplier
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={Truck} label="Suppliers" value={suppliers.length} tone="primary" />
          <Kpi icon={Award} label="Avg rating" value={(suppliers.reduce((s, x) => s + x.rating, 0) / suppliers.length).toFixed(2)} tone="accent" />
          <Kpi icon={Clock} label="Avg on-time" value={`${Math.round(suppliers.reduce((s, x) => s + x.onTime, 0) / suppliers.length)}%`} tone="primary" />
          <Kpi icon={Globe} label="Countries" value={new Set(suppliers.map((s) => s.country)).size} tone="warning" />
        </div>

        <div className="relative max-w-md">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search supplier, contact, category..."
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-input border border-border text-sm"
          />
        </div>

        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[950px] text-sm">
              {/* Grid Table Header */}
              <div className="grid grid-cols-[minmax(180px,1.5fr)_130px_120px_180px_140px_100px_80px_80px] items-center gap-3 px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40 font-medium border-b border-border/60">
                <div>Supplier</div>
                <div>Contact</div>
                <div>Phone</div>
                <div>Email</div>
                <div>Categories</div>
                <div>Country</div>
                <div className="text-center">Rating</div>
                <div className="text-right">On-time</div>
              </div>

              {/* Grid Table Body */}
              <div className="divide-y divide-border/60">
                {slice.map((s) => (
                  <div
                    key={s.id}
                    className="grid grid-cols-[minmax(180px,1.5fr)_130px_120px_180px_140px_100px_80px_80px] items-center gap-3 px-4 py-3.5 hover:bg-secondary/30 transition-colors"
                  >
                    <div>
                      <div className="font-medium truncate">{s.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{s.id}</div>
                    </div>
                    <div className="truncate">{s.contact}</div>
                    <div className="font-mono text-xs">{s.phone}</div>
                    <div className="text-muted-foreground truncate">{s.email}</div>
                    <div className="truncate">{s.categories}</div>
                    <div className="truncate">{s.country}</div>
                    <div className="text-center">
                      <span className="inline-flex items-center gap-1 text-warning text-sm">
                        <Star className="size-3.5 fill-current" />
                        {s.rating}
                      </span>
                    </div>
                    <div className="text-right font-semibold text-success">{s.onTime}%</div>
                  </div>
                ))}
                {slice.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No suppliers match your search.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border-t border-border/60 text-sm">
            <div className="text-muted-foreground text-xs">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
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
                  className={`size-8 rounded-md text-xs font-medium ${
                    n === safePage
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary border border-border hover:bg-muted"
                  }`}
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
        </div>
      </div>
      <AddSupplierModal open={open} onClose={() => setOpen(false)} />
    </AppShell>
  );
}

function AddSupplierModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Add supplier"
      subtitle="Register a new distribution partner"
      icon={<Truck className="size-5" />}
      footer={
        <>
          <button onClick={onClose} className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm hover:bg-muted">Cancel</button>
          <button onClick={onClose} className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground glow-ring" style={{ background: "var(--gradient-primary)" }}>Save supplier</button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Supplier name" required className="sm:col-span-2"><input className={inputCls} placeholder="e.g. FPT Distribution" /></Field>
        <Field label="Contact person" required><input className={inputCls} placeholder="Full name" /></Field>
        <Field label="Country" required><input className={inputCls} placeholder="Vietnam" /></Field>
        <Field label="Phone" required><input className={inputCls} placeholder="+84 ..." /></Field>
        <Field label="Email" required><input type="email" className={inputCls} placeholder="sales@partner.com" /></Field>
        <Field label="Categories supplied" className="sm:col-span-2" hint="Comma-separated, e.g. GPU, CPU, RAM">
          <input className={inputCls} placeholder="GPU, CPU, Laptop" />
        </Field>
        <Field label="Initial rating (0-5)"><input type="number" step="0.1" min={0} max={5} className={inputCls} defaultValue={4.5} /></Field>
        <Field label="On-time delivery (%)"><input type="number" min={0} max={100} className={inputCls} defaultValue={90} /></Field>
        <Field label="Notes" className="sm:col-span-2"><textarea className={textareaCls} placeholder="Payment terms, lead time, ..." /></Field>
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
