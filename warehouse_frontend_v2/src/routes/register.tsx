import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Cpu, Eye, EyeOff, Lock, Mail, User, ShieldCheck , CircleUser} from "lucide-react";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create account — TechStock" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accept, setAccept] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) return setError("Please fill in all required fields.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");
    if (!accept) return setError("You must accept the terms to continue.");
    setError(null);
    // UI-only demo
    navigate({ to: "/login" });
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

      {/* Brand panel */}
      <div className="hidden lg:flex relative overflow-hidden p-12 flex-col justify-between order-1 lg:order-2" style={{ background: "var(--gradient-primary)" }}>
        <div className="flex items-center gap-3 text-primary-foreground">
          <div className="size-11 rounded-xl grid place-items-center bg-white/15 backdrop-blur">
            <Cpu className="size-6" />
          </div>
          <div>
            <div className="text-lg font-semibold leading-tight">TechStock</div>
            <div className="text-xs opacity-80">Smart Computer Warehouse</div>
          </div>
        </div>
        <div className="relative text-primary-foreground max-w-md">
          <h1 className="text-4xl font-bold leading-tight">Join the operations team.</h1>
          <p className="mt-4 text-sm opacity-90">
            Get scoped access to the warehouses you operate. Managers see everything;
            staff see only their own site. Zero guesswork.
          </p>
          <div className="mt-8 flex items-center gap-2 text-sm opacity-90">
            <ShieldCheck className="size-4" /> Role approvals handled by your Admin
          </div>
        </div>
        <div className="text-xs text-primary-foreground/70">
          © {new Date().getFullYear()} TechStock
        </div>
        <div className="pointer-events-none absolute -bottom-40 -left-40 size-[520px] rounded-full bg-white/10 blur-3xl" />
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
