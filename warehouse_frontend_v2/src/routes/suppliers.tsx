import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { suppliers } from "@/lib/warehouse-data";
import { Star, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";

export const Route = createFileRoute("/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers — TechStock" }] }),
  component: SuppliersPage,
});

const PAGE_SIZE = 6;

function SuppliersPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");

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
          <button className="h-10 px-4 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring" style={{ background: "var(--gradient-primary)" }}>
            <Plus className="size-4" />Add supplier
          </button>
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
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40">
                <tr>
                  <th className="text-left p-4">Supplier</th>
                  <th className="text-left p-4">Contact</th>
                  <th className="text-left p-4">Phone</th>
                  <th className="text-left p-4">Email</th>
                  <th className="text-left p-4">Categories</th>
                  <th className="text-left p-4">Country</th>
                  <th className="text-center p-4">Rating</th>
                  <th className="text-right p-4">On-time</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((s) => (
                  <tr key={s.id} className="border-t border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="p-4">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{s.id}</div>
                    </td>
                    <td className="p-4">{s.contact}</td>
                    <td className="p-4 font-mono text-xs">{s.phone}</td>
                    <td className="p-4 text-muted-foreground">{s.email}</td>
                    <td className="p-4">{s.categories}</td>
                    <td className="p-4">{s.country}</td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1 text-warning text-sm">
                        <Star className="size-3.5 fill-current" />
                        {s.rating}
                      </span>
                    </td>
                    <td className="p-4 text-right font-semibold text-success">{s.onTime}%</td>
                  </tr>
                ))}
                {slice.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground text-sm">
                      No suppliers match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
    </AppShell>
  );
}
