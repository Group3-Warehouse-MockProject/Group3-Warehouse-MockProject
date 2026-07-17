import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AppShell } from "@/components/app-shell";
import { useApp, roleLabels } from "@/lib/app-context";
import { Info, Users, Shield, Building2, UserCheck, UserPlus, X, Eye, EyeOff, ChevronLeft, ChevronRight, Trash2, Edit, Save, Search, Filter, RefreshCcw, UserMinus, Activity, Clock, LogIn, Globe } from "lucide-react";

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
  const [registerOpen, setRegisterOpen] = useState(false);
  const [viewUser, setViewUser] = useState<any>(null);
  const [q, setQ] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("Active"); // Default to Active
  const queryClient = useQueryClient();

  if (!currentUser) return null;

  const { data: dbUsers = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.get("/users");
      return res.data;
    }
  });

  const { data: dbWarehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data;
    }
  });

  const getWarehouseName = (id: number | string | null) => {
    if (!id) return "All warehouses";
    const w = dbWarehouses.find((x: any) => String(x.id) === String(id));
    return w ? w.name : "Unknown";
  };

  const getWarehouseCode = (id: number | string | null) => {
    if (!id) return "—";
    const w = dbWarehouses.find((x: any) => String(x.id) === String(id));
    return w ? w.code : "—";
  };

  let list = dbUsers.filter((u: any) => true);
  
  list = list.map((u: any) => ({
    ...u,
    role: u.role === "WAREHOUSE_MANAGER" ? "Warehouse_Manager" : u.role === "ADMIN" ? "Admin" : u.role === "MANAGER" ? "Manager" : "Staff"
  }));

  if (currentUser.role === "Warehouse_Manager" || currentUser.role === "Staff") {
    list = list.filter((u: any) => u.warehouseId === currentUser.warehouseId);
  } else if (activeWarehouseId) {
    list = list.filter((u: any) => u.warehouseId === activeWarehouseId);
  }

  const scopeLabel =
    currentUser.role === "Warehouse_Manager" || currentUser.role === "Staff"
      ? `Scoped to ${getWarehouseName(currentUser.warehouseId)}`
      : activeWarehouseId
      ? `Filtered: ${getWarehouseName(activeWarehouseId)}`
      : "All warehouses";

  // Apply search and filter
  list = list.filter((u: any) => {
    const matchesQ = 
      (u.fullName || "").toLowerCase().includes(q.toLowerCase()) ||
      (u.username || "").toLowerCase().includes(q.toLowerCase()) ||
      (u.email || "").toLowerCase().includes(q.toLowerCase());
    
    const matchesRole = filterRole ? u.role === filterRole : true;
    
    let matchesStatus = true;
    if (filterStatus === "Active") matchesStatus = u.isDeleted !== true;
    else if (filterStatus === "Deactive") matchesStatus = u.isDeleted === true;

    return matchesQ && matchesRole && matchesStatus;
  });

  const managers = list.filter((u: any) => u.role === "Warehouse_Manager").length;
  const staffCount = list.filter((u: any) => u.role === "Staff").length;
  const warehouseSet = new Set(list.map((u: any) => u.warehouseId).filter(Boolean)).size;

  const [page, setPage] = useState(1);
  const limit = 15;
  const totalPages = Math.max(1, Math.ceil(list.length / limit));
  const safePage = Math.min(page, totalPages);
  const paginatedList = list.slice((safePage - 1) * limit, safePage * limit);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Warehouse staff</h1>
            <p className="text-sm text-muted-foreground mt-1">Team members and roles</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary border border-border text-xs">
              <Info className="size-3.5 text-primary" />
              {scopeLabel}
            </div>
            {(currentUser.role === "Admin" || currentUser.role === "Manager") && (
              <button
                onClick={() => setRegisterOpen(true)}
                className="h-9 px-4 rounded-lg text-sm font-semibold text-primary-foreground glow-ring inline-flex items-center gap-2"
                style={{ background: "var(--gradient-primary)" }}
              >
                <UserPlus className="size-4" /> Create Account
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={Users} label="Total people" value={list.length} tone="primary" />
          <Kpi icon={UserCheck} label="Warehouse managers" value={managers} tone="accent" />
          <Kpi icon={Shield} label="Staff members" value={staffCount} tone="primary" />
          <Kpi icon={Building2} label="Warehouses covered" value={warehouseSet} tone="warning" />
        </div>

        <div className="flex flex-col gap-4 relative">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative max-w-md w-full sm:w-96">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name, username, email..."
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-input border border-border text-sm"
              />
            </div>
            <div className="relative">
              <button onClick={() => setShowFilter(!showFilter)} className={`h-10 px-4 rounded-lg border text-sm flex items-center gap-2 transition-colors shrink-0 ${showFilter ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border hover:bg-muted"}`}>
                <Filter className="size-4" />Filter
              </button>
              
              {showFilter && (
                <div className="absolute top-full right-0 mt-2 z-20 flex flex-col gap-5 p-5 surface-card rounded-xl border border-border/60 shadow-xl w-64">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Role</div>
                    <select
                      value={filterRole}
                      onChange={(e) => {
                        setFilterRole(e.target.value);
                        setPage(1);
                      }}
                      className="w-full h-9 px-3 rounded-md bg-input border border-border text-sm"
                    >
                      <option value="">All Roles</option>
                      <option value="Admin">Admin</option>
                      <option value="Manager">Manager</option>
                      <option value="Warehouse_Manager">Warehouse Manager</option>
                      <option value="Staff">Staff</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Status</div>
                    <select
                      value={filterStatus}
                      onChange={(e) => {
                        setFilterStatus(e.target.value);
                        setPage(1);
                      }}
                      className="w-full h-9 px-3 rounded-md bg-input border border-border text-sm"
                    >
                      <option value="">All Statuses</option>
                      <option value="Active">Active</option>
                      <option value="Deactive">Deactive</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="surface-card overflow-hidden border border-border/50 shadow-sm rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary/60 border-b border-border/80">
                <tr>
                  <th className="text-left py-4 px-6 font-semibold">Employee</th>
                  <th className="text-left py-4 px-6 font-semibold">Title</th>
                  <th className="text-left py-4 px-6 font-semibold">Role</th>
                  <th className="text-left py-4 px-6 font-semibold">Status</th>
                  <th className="text-left py-4 px-6 font-semibold">Warehouse</th>
                  <th className="text-left py-4 px-6 font-semibold">Location</th>
                  <th className="text-right py-4 px-6 font-semibold w-20">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedList.map((s: any) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-all duration-200 group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-full grid place-items-center text-sm font-bold shrink-0 shadow-sm border border-white/10 ring-2 ring-transparent group-hover:ring-primary/20 transition-all" style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}>
                          {s.initials}
                        </div>
                        <div className="min-w-0 flex items-center gap-2">
                          <div>
                            <div className="font-semibold text-foreground truncate">{s.fullName}</div>
                            <div className="text-xs text-muted-foreground font-mono mt-0.5">@{s.username}</div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-muted-foreground font-medium">{s.title}</td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1.5 rounded-full text-[11px] uppercase tracking-wider font-bold shadow-sm ${roleTone[s.role] || roleTone.Staff}`}>{roleLabels[s.role as keyof typeof roleLabels] || s.role}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className={`size-2 rounded-full ${s.isDeleted ? "bg-muted-foreground" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"}`}></div>
                        <span className={`text-xs font-medium ${s.isDeleted ? "text-muted-foreground" : "text-emerald-600 dark:text-emerald-400"}`}>
                          {s.isDeleted ? "Deactive" : "Active"}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono text-xs font-medium">{getWarehouseCode(s.warehouseId)}</td>
                    <td className="py-4 px-6 text-muted-foreground font-medium">{getWarehouseName(s.warehouseId)}</td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={() => setViewUser(s)}
                        className="size-8 inline-grid place-items-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors border border-transparent hover:border-border shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="View details"
                      >
                        <Eye className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                      No staff assigned to this warehouse yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border/60 text-sm">
              <div className="text-muted-foreground text-xs">
                Showing {(safePage - 1) * limit + 1}–{Math.min(safePage * limit, list.length)} of {list.length} entries
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
          )}
        </div>
      </div>
      {registerOpen && <RegisterModal onClose={() => { setRegisterOpen(false); queryClient.invalidateQueries({queryKey: ["users"]}); }} dbWarehouses={dbWarehouses} />}
      {viewUser && <UserDetailModal user={viewUser} dbWarehouses={dbWarehouses} onClose={() => setViewUser(null)} onUpdated={() => { queryClient.invalidateQueries({queryKey: ["users"]}); setViewUser(null); }} />}
    </AppShell>
  );
}

function UserDetailModal({ user, dbWarehouses, onClose, onUpdated }: { user: any, dbWarehouses: any[], onClose: () => void, onUpdated: () => void }) {
  const { currentUser } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "activity">("details");
  const canViewActivity = currentUser?.role === "Admin" || currentUser?.role === "Manager";
  const [role, setRole] = useState(user.role);
  const [warehouseId, setWarehouseId] = useState(user.warehouseId ? String(user.warehouseId) : "");
  const [fullName, setFullName] = useState(user.fullName || "");
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [department, setDepartment] = useState(user.department || "");
  const [error, setError] = useState<string | null>(null);

  if (!currentUser) return null;

  const canEdit = (currentUser.role === "Admin" || currentUser.role === "Manager") && user.role !== "Admin";
  
  const getWarehouseName = (id: number | string | null) => {
    if (!id) return "All warehouses";
    const w = dbWarehouses.find((x: any) => String(x.id) === String(id));
    return w ? w.name : "Unknown";
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload: any = { 
        fullName,
        email,
        phone,
        department,
        role: role === "Warehouse_Manager" ? "WAREHOUSE_MANAGER" : role.toUpperCase() 
      };
      if (role !== "Admin" && role !== "Manager" && warehouseId) {
        payload.warehouseId = parseInt(warehouseId);
      }
      await api.put(`/users/${user.id}`, payload);
    },
    onSuccess: onUpdated,
    onError: (err: any) => setError(err.response?.data?.message || "Failed to update user")
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/users/${user.id}`);
    },
    onSuccess: onUpdated,
    onError: (err: any) => setError(err.response?.data?.message || "Failed to deactivate user")
  });

  const activateMutation = useMutation({
    mutationFn: async () => {
      await api.put(`/users/${user.id}/activate`);
    },
    onSuccess: onUpdated,
    onError: (err: any) => setError(err.response?.data?.message || "Failed to activate user")
  });

  const handleDeactivate = () => {
    if (confirm("Are you sure you want to deactivate this account?")) {
      deleteMutation.mutate();
    }
  };

  const handleActivate = () => {
    if (confirm("Are you sure you want to reactivate this account?")) {
      activateMutation.mutate();
    }
  };

  const hardDeleteMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/users/${user.id}/hard`);
    },
    onSuccess: onUpdated,
    onError: (err: any) => setError(err.response?.data?.message || "Failed to delete user permanently")
  });

  const handleHardDelete = () => {
    if (confirm("WARNING: This will permanently delete the user and all their data. Are you absolutely sure?")) {
      hardDeleteMutation.mutate();
    }
  };

  const handleSave = () => {
    if ((role === "Staff" || role === "Warehouse_Manager") && !warehouseId) {
      setError("Please select a warehouse for this role.");
      return;
    }
    updateMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg surface-card overflow-hidden animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30">
          <div className="font-semibold flex items-center gap-2">
            <Info className="size-4 text-primary" /> User Details
          </div>
          <button onClick={onClose} className="size-8 grid place-items-center rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6 pt-4 gap-1">
          <button
            onClick={() => setActiveTab("details")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === "details"
                ? "bg-background text-foreground border border-border border-b-transparent -mb-px"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <Info className="size-3.5 inline mr-1.5" />Details
          </button>
          {canViewActivity && (
            <button
              onClick={() => setActiveTab("activity")}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === "activity"
                  ? "bg-background text-foreground border border-border border-b-transparent -mb-px"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <Activity className="size-3.5 inline mr-1.5" />Activity
            </button>
          )}
        </div>

        {activeTab === "details" && (
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-full grid place-items-center text-lg font-bold shrink-0" style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}>
              {user.initials}
            </div>
            <div>
              <div className="text-lg font-bold">{user.fullName}</div>
              <div className="text-sm text-muted-foreground font-mono">@{user.username}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Email</div>
              <div className="font-medium truncate" title={user.email}>{user.email}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Phone</div>
              <div className="font-medium">{user.phone || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Department</div>
              <div className="font-medium">{user.department || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">System Title</div>
              <div className="font-medium text-muted-foreground">{user.title}</div>
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Access & Role</div>
            
            {!isEditing ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Role</div>
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${roleTone[user.role] || roleTone.Staff}`}>{roleLabels[user.role as keyof typeof roleLabels] || user.role}</span>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Status</div>
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${user.isDeleted ? "bg-muted text-muted-foreground" : "bg-success/15 text-success"}`}>{user.isDeleted ? "Deactive" : "Active"}</span>
                </div>
                <div className="col-span-2 mt-2">
                  <div className="text-xs text-muted-foreground mb-1">Assigned Warehouse</div>
                  <div className="font-medium truncate" title={getWarehouseName(user.warehouseId)}>{getWarehouseName(user.warehouseId)}</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <Input label="Full Name" value={fullName} onChange={setFullName} />
                <Input label="Email" value={email} onChange={setEmail} type="email" />
                <Input label="Phone" value={phone} onChange={setPhone} />
                <Input label="Department" value={department} onChange={setDepartment} />
                
                <label className="block">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Role</div>
                  <select 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Warehouse_Manager">Warehouse Manager</option>
                    <option value="Staff">Staff</option>
                  </select>
                </label>
                {(role !== "Admin" && role !== "Manager") && (
                  <label className="block">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Warehouse</div>
                    <select 
                      value={warehouseId} 
                      onChange={(e) => setWarehouseId(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                    >
                      <option value="" disabled>Select a warehouse</option>
                      {dbWarehouses.map(w => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </label>
                )}
                {error && <div className="col-span-2 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">{error}</div>}
              </div>
            )}
          </div>
        </div>
        )} {/* End details tab */}

        {activeTab === "activity" && canViewActivity && (
          <div className="p-6">
            <ActivityTimeline userId={user.id} />
          </div>
        )}

        {canEdit && (
          <div className="flex items-center justify-between px-6 py-4 bg-secondary/30 border-t border-border">
            <div className="flex items-center gap-2">
              {user.isDeleted ? (
                <button 
                  onClick={handleActivate}
                  disabled={activateMutation.isPending}
                  className="h-9 px-3 rounded-lg text-sm font-medium text-emerald-600 hover:bg-emerald-600/10 inline-flex items-center gap-2 transition-colors disabled:opacity-40"
                >
                  <RefreshCcw className="size-4" /> Activate
                </button>
              ) : (
                <button 
                  onClick={handleDeactivate}
                  disabled={deleteMutation.isPending || currentUser.id === user.id}
                  className="h-9 px-3 rounded-lg text-sm font-medium text-warning hover:bg-warning/10 inline-flex items-center gap-2 transition-colors disabled:opacity-40"
                  title={currentUser.id === user.id ? "Cannot deactivate your own account" : ""}
                  style={{ color: "var(--warning)" }}
                >
                  <UserMinus className="size-4" /> Deactive
                </button>
              )}
              <button 
                onClick={handleHardDelete}
                disabled={hardDeleteMutation.isPending || currentUser.id === user.id}
                className="h-9 px-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 inline-flex items-center gap-2 transition-colors disabled:opacity-40"
                title={currentUser.id === user.id ? "Cannot delete your own account" : ""}
              >
                <Trash2 className="size-4" /> Delete
              </button>
            </div>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="h-9 px-4 rounded-lg text-sm font-medium border border-border hover:bg-secondary"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="h-9 px-4 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2"
                  >
                    <Save className="size-4" /> Save Changes
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="h-9 px-4 rounded-lg text-sm font-medium border border-border hover:bg-secondary inline-flex items-center gap-2"
                >
                  <Edit className="size-4" /> Edit
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RegisterModal({ onClose, dbWarehouses }: { onClose: () => void, dbWarehouses: any[] }) {
  const [fullName, setFullName] = useState("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accept, setAccept] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [role, setRole] = useState("Staff");
  const [warehouseId, setWarehouseId] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !userName || !email || !password) return setError("Please fill in all required fields.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    if (!accept) return setError("You must accept the terms to continue.");
    setError(null);
    try {
      const res = await api.post("/auth/register", {
        username: userName,
        email: email,
        password: password,
        confirmPassword: confirm,
        fullName: fullName,
        phone: phone,
        department: department,
        role: role === "Warehouse_Manager" ? "WAREHOUSE_MANAGER" : role.toUpperCase(),
        warehouseId: (role !== "Admin" && role !== "Manager") && warehouseId ? parseInt(warehouseId) : null
      });
      if (res.data.success) {
        setSuccess(true);
        setTimeout(onClose, 1200);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl surface-card overflow-hidden animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border" style={{ background: "var(--gradient-primary)" }}>
          <div className="flex items-center gap-3 text-primary-foreground">
            <div className="size-9 rounded-lg grid place-items-center bg-white/15">
              <UserPlus className="size-5" />
            </div>
            <div>
              <div className="font-semibold">Register new team member</div>
              <div className="text-xs opacity-80">Create a TechStock account for a new staff or manager</div>
            </div>
          </div>
          <button onClick={onClose} className="size-8 grid place-items-center rounded-md text-primary-foreground hover:bg-white/15">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Full name *" value={fullName} onChange={setFullName} placeholder="Nguyen Van A" />
            <Input label="Username *" value={userName} onChange={setUserName} placeholder="nguyenvana" />
            <Input label="Work email *" type="email" value={email} onChange={setEmail} placeholder="you@techstock.vn" />
            <Input label="Phone" value={phone} onChange={setPhone} placeholder="0987654321" />
            <div className="sm:col-span-2">
              <Input label="Department" value={department} onChange={setDepartment} placeholder="IT, HR, etc." />
            </div>

            <label className="block">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Role</div>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Warehouse_Manager">Warehouse Manager</option>
                <option value="Staff">Staff</option>
              </select>
            </label>

            {(role !== "Admin" && role !== "Manager") ? (
              <label className="block">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Warehouse</div>
                <select 
                  value={warehouseId} 
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                  required
                >
                  <option value="" disabled>Select a warehouse</option>
                  {dbWarehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </label>
            ) : (
              <div />
            )}

            <div className="relative">
              <Input
                label="Password *"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={setPassword}
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-2 top-8 size-7 grid place-items-center rounded-md hover:bg-secondary text-muted-foreground"
              >
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <Input
              label="Confirm password *"
              type={showPw ? "text" : "password"}
              value={confirm}
              onChange={setConfirm}
              placeholder="Repeat password"
            />
          </div>

          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={accept}
              onChange={(e) => setAccept(e.target.checked)}
              className="mt-0.5 size-4 rounded border-border"
            />
            I confirm this person has been authorized to access TechStock and agrees to the internal policies.
          </label>

          {error && (
            <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          {success && (
            <div className="text-xs text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 rounded-md px-3 py-2">
              Account created successfully.
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg text-sm font-medium bg-secondary hover:bg-muted border border-border"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-lg text-sm font-semibold text-primary-foreground glow-ring inline-flex items-center gap-2"
              style={{ background: "var(--gradient-primary)" }}
            >
              <UserPlus className="size-4" /> Create account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 px-3 rounded-lg bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
      />
    </label>
  );
}

function ActivityTimeline({ userId }: { userId: number }) {
  const [activityPage, setActivityPage] = useState(0);
  const pageSize = 10;

  const { data, isLoading } = useQuery({
    queryKey: ["user-activity", userId, activityPage],
    queryFn: async () => {
      const res = await api.get(`/logs/user/${userId}`, {
        params: { page: activityPage, size: pageSize },
      });
      return res.data;
    },
  });

  const logs = data?.content ?? [];
  const totalPages = Math.max(1, data?.totalPages ?? 1);

  const actionIcons: Record<string, React.ElementType> = {
    LOGIN: LogIn,
    PAGE_VIEW: Eye,
    CREATE_PRODUCT: Users,
    CREATE_INBOUND: Users,
    CREATE_OUTBOUND: Users,
    UPDATE_RECEIPT: Edit,
    DELETE_RECEIPT: Trash2,
    CREATE_USER: UserPlus,
    UPDATE_USER: Edit,
    DEACTIVATE_USER: UserMinus,
    ACTIVATE_USER: RefreshCcw,
    DELETE_USER: Trash2,
  };

  const actionColors: Record<string, string> = {
    LOGIN: "text-emerald-400 bg-emerald-500/15",
    PAGE_VIEW: "text-blue-400 bg-blue-500/15",
    CREATE_PRODUCT: "text-purple-400 bg-purple-500/15",
    CREATE_INBOUND: "text-cyan-400 bg-cyan-500/15",
    CREATE_OUTBOUND: "text-orange-400 bg-orange-500/15",
    UPDATE_RECEIPT: "text-yellow-400 bg-yellow-500/15",
    DELETE_RECEIPT: "text-red-400 bg-red-500/15",
    CREATE_USER: "text-green-400 bg-green-500/15",
    UPDATE_USER: "text-indigo-400 bg-indigo-500/15",
    DEACTIVATE_USER: "text-rose-400 bg-rose-500/15",
    ACTIVATE_USER: "text-teal-400 bg-teal-500/15",
    DELETE_USER: "text-red-400 bg-red-500/15",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
        <Activity className="size-5 animate-spin" />
        <span className="text-sm">Loading activity history…</span>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
        <Activity className="size-8 opacity-30" />
        <span className="text-sm">No activity history found for this user.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        {logs.map((log: any, idx: number) => {
          const Icon = actionIcons[log.actionType] || Activity;
          const color = actionColors[log.actionType] || "text-muted-foreground bg-secondary";
          return (
            <div key={log.id} className="flex gap-3 items-start group">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <div className={`size-8 rounded-full grid place-items-center shrink-0 ${color}`}>
                  <Icon className="size-3.5" />
                </div>
                {idx < logs.length - 1 && <div className="w-px flex-1 min-h-[24px] bg-border" />}
              </div>
              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border border-border/60 bg-secondary/40">
                      {log.actionType.replace(/_/g, " ")}
                    </span>
                    {log.details && (
                      <p className="mt-1.5 text-sm text-foreground">{log.details}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                    <Clock className="size-3" />
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
                {log.ipAddress && (
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Globe className="size-3" />
                    {log.ipAddress}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-2">
          <button
            onClick={() => setActivityPage((p) => Math.max(0, p - 1))}
            disabled={activityPage === 0}
            className="size-8 grid place-items-center rounded-md border border-border bg-secondary hover:bg-muted disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setActivityPage(n - 1)}
              className={`size-8 rounded-md text-xs font-medium ${
                n === activityPage + 1
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary border border-border hover:bg-muted"
              }`}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => setActivityPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={activityPage >= totalPages - 1}
            className="size-8 grid place-items-center rounded-md border border-border bg-secondary hover:bg-muted disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}
    </div>
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
