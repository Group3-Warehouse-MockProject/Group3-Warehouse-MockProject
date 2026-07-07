import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { users, warehouseName, warehouseCode } from "@/lib/warehouse-data";
import { useApp, roleLabels } from "@/lib/app-context";
import { Info, Users, Shield, Building2, UserCheck, UserPlus, X, Eye, EyeOff } from "lucide-react";

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
                <UserPlus className="size-4" /> Register
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
      {registerOpen && <RegisterModal onClose={() => setRegisterOpen(false)} />}
    </AppShell>
  );
}

function RegisterModal({ onClose }: { onClose: () => void }) {
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
  const [dbWarehouses, setDbWarehouses] = useState<any[]>([]);

  useEffect(() => {
    import("@/lib/api").then(({ api }) => {
      api.get("/warehouses")
        .then(res => setDbWarehouses(res.data))
        .catch(err => console.error("Failed to fetch warehouses", err));
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !userName || !email || !password) return setError("Please fill in all required fields.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    if (!accept) return setError("You must accept the terms to continue.");
    setError(null);
    try {
      const { api } = await import("@/lib/api");
      const res = await api.post("/auth/register", {
        username: userName,
        email: email,
        password: password,
        confirmPassword: confirm,
        fullName: fullName,
        phone: phone,
        department: department,
        role: role,
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
