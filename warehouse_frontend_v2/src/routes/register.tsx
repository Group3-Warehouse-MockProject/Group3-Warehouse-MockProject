import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Cpu, Eye, EyeOff, Lock, Mail, User, ShieldCheck , CircleUser} from "lucide-react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create account — TechStock" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("Staff");
  const [warehouseId, setWarehouseId] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accept, setAccept] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbWarehouses, setDbWarehouses] = useState<any[]>([]);

  useEffect(() => {
    api.get("/warehouses")
      .then(res => setDbWarehouses(res.data))
      .catch(err => console.error("Failed to fetch warehouses", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) return setError("Please fill in all required fields.");
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
        role: role,
        warehouseId: (role !== "Admin" && role !== "Manager") && warehouseId ? parseInt(warehouseId) : null
      });
      if (res.data.success) {
        navigate({ to: "/login" });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="flex items-center justify-center p-6 sm:p-10 order-2 lg:order-1">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="size-10 rounded-xl grid place-items-center glow-ring" style={{ background: "var(--gradient-primary)" }}>
              <Cpu className="size-5 text-primary-foreground" />
            </div>
            <div>
              <div className="text-sm font-semibold">TechStock</div>
              <div className="text-[11px] text-muted-foreground">Computer Warehouse</div>
            </div>
          </div>

          <h2 className="text-3xl font-bold">Create your account</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Request access to TechStock. An admin will confirm your role.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <Field label="Full name" icon={<User className="size-4" />}>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input pl-9"
                placeholder="Nguyen Van A"
                required
              />
            </Field>

            <Field label="Username" icon={<CircleUser className="size-4" />}>
              <input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="input pl-9"
                placeholder="techstock"
                required
              />
            </Field>

            <Field label="Work email" icon={<Mail className="size-4" />}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input pl-9"
                placeholder="you@techstock.vn"
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone number">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input px-3"
                  placeholder="0987654321"
                  required
                />
              </Field>
              <Field label="Department">
                <input
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="input px-3"
                  placeholder="IT, HR, etc."
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block relative">
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
                <label className="block relative">
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
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Password" icon={<Lock className="size-4" />}>
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-9 pr-10"
                  placeholder="At least 8 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-7 grid place-items-center rounded-md hover:bg-secondary text-muted-foreground"
                  aria-label="Toggle password visibility"
                >
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </Field>
              <Field label="Confirm password" icon={<Lock className="size-4" />}>
                <input
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="input pl-9"
                  placeholder="Repeat password"
                  required
                />
              </Field>
            </div>

            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={accept}
                onChange={(e) => setAccept(e.target.checked)}
                className="mt-0.5 size-4 rounded border-border"
              />
              I agree to the TechStock <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
            </label>

            {error && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full h-11 rounded-lg text-sm font-semibold text-primary-foreground glow-ring"
              style={{ background: "var(--gradient-primary)" }}
            >
              Create account
            </button>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Brand panel — bootstrap-style */}
      <div className="hidden lg:flex bs-panel flex-col justify-between p-12 order-1 lg:order-2">
        <div style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, display: "grid", placeItems: "center", background: "#0d6efd", color: "#fff" }}>
            <Cpu className="size-6" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#212529" }}>TechStock</div>
            <div style={{ fontSize: ".75rem", color: "#6c757d" }}>Smart Computer Warehouse</div>
          </div>
        </div>

        <div className="bs-card" style={{ padding: "2rem", backgroundColor: "#fff", borderRadius: "0.75rem", border: "1px solid rgba(0,0,0,.125)", boxShadow: "0 0.5rem 1rem rgba(0,0,0,.05)" }}>
          <span className="bs-badge bs-badge-success" style={{ fontSize: ".7rem", backgroundColor: "#198754", color: "white", padding: "0.25rem 0.5rem", borderRadius: "0.25rem", fontWeight: 700 }}>NEW ACCOUNT</span>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 700, lineHeight: 1.15, margin: "1rem 0 .75rem", color: "#212529" }}>
            Join the operations team.
          </h1>
          <p style={{ color: "#495057", fontSize: ".95rem", marginBottom: "1.25rem" }}>
            Get scoped access to the warehouses you operate. Managers see everything;
            staff see only their own site. Zero guesswork.
          </p>
          <ul className="bs-list-check" style={{ listStyle: "none", paddingLeft: 0, margin: 0 }}>
            <li style={{ paddingLeft: "1.5rem", position: "relative", marginBottom: "0.5rem", color: "#495057" }}>
              <span style={{ position: "absolute", left: 0, color: "#198754" }}>✓</span>
              Instant onboarding — approved by your Admin
            </li>
            <li style={{ paddingLeft: "1.5rem", position: "relative", marginBottom: "0.5rem", color: "#495057" }}>
              <span style={{ position: "absolute", left: 0, color: "#198754" }}>✓</span>
              Auto-scoped warehouse visibility
            </li>
            <li style={{ paddingLeft: "1.5rem", position: "relative", marginBottom: "0.5rem", color: "#495057" }}>
              <span style={{ position: "absolute", left: 0, color: "#198754" }}>✓</span>
              Personal audit log for every action
            </li>
            <li style={{ paddingLeft: "1.5rem", position: "relative", marginBottom: "0.5rem", color: "#495057" }}>
              <span style={{ position: "absolute", left: 0, color: "#198754" }}>✓</span>
              Access from web & mobile
            </li>
          </ul>
          <div className="bs-alert" style={{ marginTop: "1.25rem", fontSize: ".85rem", backgroundColor: "#cff4fc", color: "#055160", padding: "1rem", borderRadius: "0.375rem", border: "1px solid #b6effb" }}>
            Role approvals handled by your Admin.
          </div>
        </div>

        <div style={{ fontSize: ".78rem", color: "#6c757d" }}>
          © {new Date().getFullYear()} TechStock
        </div>
      </div>

      <style>{`
        .input {
          width: 100%;
          height: 2.75rem;
          padding-top: 0;
          padding-bottom: 0;
          padding-right: 0.75rem;
          border-radius: 0.5rem;
          background: var(--input);
          border: 1px solid var(--border);
          font-size: 0.875rem;
          color: var(--foreground);
        }
        .input:focus { outline: none; box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent); }
      `}</style>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block relative">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        )}
        {children}
      </div>
    </label>
  );
}
