import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import {
  Activity,
  Clock,
  User,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  LogIn,
  Eye,
  Trash2,
  AlertTriangle,
  RefreshCcw,
  Loader2,
} from "lucide-react";

interface ActivityLogPage {
  content: ActivityLog[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const Route = createFileRoute("/tracking")({
  head: () => ({ meta: [{ title: "Tracking Dashboard — TechStock" }] }),
  component: TrackingPage,
});

interface ActivityLog {
  id: number;
  actionType: string;
  pageUrl?: string;
  ipAddress?: string;
  location?: string;
  details?: string;
  timestamp: string;
  user?: {
    id: number;
    username: string;
    fullName: string;
    role: string;
  };
}

const actionConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  LOGIN: { label: "Login", icon: LogIn, className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  CREATE_PRODUCT: { label: "Create Product", icon: Eye, className: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  CREATE_INBOUND: { label: "Inbound Receipt", icon: Eye, className: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  CREATE_OUTBOUND: { label: "Outbound Order", icon: Eye, className: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  UPDATE_RECEIPT: { label: "Update Receipt", icon: Eye, className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  DELETE_RECEIPT: { label: "Delete Receipt", icon: Eye, className: "bg-red-500/15 text-red-400 border-red-500/30" },
  CREATE_USER: { label: "Create User", icon: User, className: "bg-green-500/15 text-green-400 border-green-500/30" },
  UPDATE_USER: { label: "Update User", icon: Eye, className: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" },
  DEACTIVATE_USER: { label: "Deactivate User", icon: Eye, className: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
  ACTIVATE_USER: { label: "Activate User", icon: Eye, className: "bg-teal-500/15 text-teal-400 border-teal-500/30" },
  DELETE_USER: { label: "Delete User", icon: Eye, className: "bg-red-500/15 text-red-400 border-red-500/30" },
};

const FALLBACK_CONFIG = { label: "Event", icon: Activity, className: "bg-secondary/40 text-muted-foreground border-border/60" };

function TrackingPage() {
  const { currentUser } = useApp();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState<string>("");
  const [page, setPage] = useState(0);
  const [clearing, setClearing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const pageSize = 20;

  const { data, isLoading, isFetching } = useQuery<ActivityLogPage>({
    queryKey: ["activity-logs", page, search, filterAction],
    queryFn: async () => {
      const res = await api.get("/logs", {
        params: {
          page,
          size: pageSize,
          search: search || undefined,
          actionType: filterAction || undefined,
        },
      });
      return res.data;
    },
    enabled: currentUser?.role === "Admin",
  });

  const logs = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;

  const totalPages = Math.max(1, data?.totalPages ?? 1);
  const safePage = Math.min(page + 1, totalPages);
  const currentPageLogs = logs;

  const loginCount = logs.filter((l) => l.actionType === "LOGIN").length;
  const uniqueUsers = new Set(logs.map((l) => l.user?.id).filter(Boolean)).size;
  const actionCount = logs.filter((l) => l.actionType !== "LOGIN").length;

  async function handleClear() {
    setClearing(true);
    try {
      await api.delete("/logs/clear");
      setShowConfirm(false);
      setPage(0);
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    } catch (err) {
      console.error("Failed to clear logs", err);
    } finally {
      setClearing(false);
    }
  }

  if (currentUser?.role !== "Admin") {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Activity className="size-12 mb-4 opacity-30" />
          <p className="text-sm">You do not have permission to view this page.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Tracking Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor user login history and system actions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setPage(0); queryClient.invalidateQueries({ queryKey: ["activity-logs"] }); }}
              disabled={isFetching}
              className="h-9 px-3 rounded-lg text-sm font-medium border border-border bg-secondary hover:bg-muted inline-flex items-center gap-2 disabled:opacity-40 transition-colors"
            >
              <RefreshCcw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className="h-9 px-3 rounded-lg text-sm font-medium border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 inline-flex items-center gap-2 transition-colors"
            >
              <Trash2 className="size-3.5" />
              Clear Data
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={LogIn} label="Total Logins" value={loginCount} tone="primary" />
          <Kpi icon={Eye} label="System Actions" value={actionCount} tone="accent" />
          <Kpi icon={User} label="Active Users" value={uniqueUsers} tone="warning" />
          <Kpi icon={Activity} label="Total Events" value={totalElements} tone="primary" />
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search user, action, IP..."
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <select
            value={filterAction}
            onChange={(e) => { setFilterAction(e.target.value); setPage(0); }}
            className="h-10 px-3 rounded-lg bg-secondary border border-border text-sm text-foreground"
          >
            <option value="">All actions</option>
            <option value="LOGIN">Login</option>
            <option value="CREATE_PRODUCT">Create Product</option>
            <option value="CREATE_INBOUND">Inbound Receipt</option>
            <option value="CREATE_OUTBOUND">Outbound Order</option>
            <option value="UPDATE_RECEIPT">Update Receipt</option>
            <option value="DELETE_RECEIPT">Delete Receipt</option>
            <option value="CREATE_USER">Create User</option>
            <option value="UPDATE_USER">Update User</option>
            <option value="DEACTIVATE_USER">Deactivate User</option>
            <option value="ACTIVATE_USER">Activate User</option>
            <option value="DELETE_USER">Delete User</option>
          </select>
        </div>

        {/* Table */}
        <div className="surface-card overflow-hidden rounded-xl border border-border/50 shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">Loading activity logs…</span>
            </div>
          ) : currentPageLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
              <Activity className="size-10 opacity-20" />
              <span className="text-sm font-medium">No activity logs found</span>
              <span className="text-xs text-muted-foreground/60">Actions will appear here as users interact with the system.</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40">
                    <tr>
                      <th className="text-left p-4 font-semibold">User</th>
                      <th className="text-left p-4 font-semibold">Action</th>
                      <th className="text-left p-4 font-semibold">Details</th>
                      <th className="text-left p-4 font-semibold">IP Address</th>
                      <th className="text-left p-4 font-semibold">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {currentPageLogs.map((log) => {
                      const cfg = actionConfig[log.actionType] ?? FALLBACK_CONFIG;
                      const Icon = cfg.icon;
                      return (
                        <tr key={log.id} className="hover:bg-secondary/30 transition-colors group">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="size-8 rounded-full grid place-items-center text-xs font-bold shrink-0 bg-primary/10 text-primary">
                                {log.user?.fullName?.charAt(0) || "?"}
                              </div>
                              <div>
                                <div className="font-medium text-sm">{log.user?.fullName || "—"}</div>
                                <div className="text-xs text-muted-foreground font-mono">@{log.user?.username || "—"}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.className}`}>
                              <Icon className="size-3" /> {cfg.label}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-xs text-foreground/80">{log.details || log.location || log.ipAddress || "—"}</span>
                          </td>
                          <td className="p-4">
                            <code className="text-xs font-mono text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded">{log.ipAddress || "—"}</code>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="size-3.5 shrink-0" />
                              <span className="text-xs whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-border/60 text-sm">
                  <div className="text-muted-foreground text-xs">
                    Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, totalElements)} of {totalElements} entries
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={safePage <= 1}
                      className="size-8 grid place-items-center rounded-md border border-border bg-secondary hover:bg-muted disabled:opacity-40 transition-colors"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        onClick={() => setPage(n - 1)}
                        className={`size-8 rounded-md text-xs font-medium transition-colors ${
                          n === safePage
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-secondary border border-border hover:bg-muted"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={safePage >= totalPages}
                      className="size-8 grid place-items-center rounded-md border border-border bg-secondary hover:bg-muted disabled:opacity-40 transition-colors"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !clearing && setShowConfirm(false)}>
          <div
            className="w-full max-w-md surface-card overflow-hidden animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-6 py-5 border-b border-border bg-red-500/5">
              <div className="size-10 rounded-full grid place-items-center bg-red-500/15 text-red-400 shrink-0">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <div className="font-semibold text-base">Clear all tracking data?</div>
                <div className="text-xs text-muted-foreground mt-0.5">This action cannot be undone.</div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted-foreground">
                This will permanently delete all activity logs, including login history and system actions.
                New logs will still be recorded going forward.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-secondary/30">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={clearing}
                className="h-9 px-4 rounded-lg text-sm font-medium border border-border bg-background hover:bg-secondary disabled:opacity-40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                disabled={clearing}
                className="h-9 px-4 rounded-lg text-sm font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 inline-flex items-center gap-2 transition-colors shadow-sm"
              >
                {clearing ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Clearing…
                  </>
                ) : (
                  <>
                    <Trash2 className="size-4" />
                    Delete all data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
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
