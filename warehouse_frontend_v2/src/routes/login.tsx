import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Cpu, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { users } from "@/lib/warehouse-data";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — TechStock" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { setUserId } = useApp();
  const [email, setEmail] = useState("alex.tran@techstock.vn");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError(null);
    // UI-only: sign in as first user
    setUserId(users[0].id);
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Brand panel */}
      <div className="hidden lg:flex relative overflow-hidden p-12 flex-col justify-between" style={{ background: "var(--gradient-primary)" }}>
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
          <h1 className="text-4xl font-bold leading-tight">
            Every SKU. Every warehouse. One console.
          </h1>
          <p className="mt-4 text-sm opacity-90">
            Real-time inbound, outbound, orders and stocktake across all TechStock locations —
            with role-based access for Admins, Managers, Warehouse Managers and Staff.
          </p>
          <div className="mt-8 flex items-center gap-2 text-sm opacity-90">
            <ShieldCheck className="size-4" /> Enterprise-grade role & warehouse isolation
          </div>
        </div>
        <div className="text-xs text-primary-foreground/70">
          © {new Date().getFullYear()} TechStock — Ho Chi Minh City · Hanoi · Da Nang
        </div>
        <div className="pointer-events-none absolute -bottom-40 -right-40 size-[520px] rounded-full bg-white/10 blur-3xl" />
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
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

          <h2 className="text-3xl font-bold">Welcome back</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to manage your warehouses.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Work email</div>
              <div className="relative">
                <Mail className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 pl-9 pr-3 rounded-lg bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                  placeholder="you@techstock.vn"
                  required
                />
              </div>
            </label>

            <label className="block">
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Password</div>
                <a href="#" className="text-xs text-primary hover:underline">Forgot?</a>
              </div>
              <div className="relative">
                <Lock className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-9 pr-10 rounded-lg bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                  placeholder="••••••••"
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
              </div>
            </label>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="size-4 rounded border-border"
              />
              Keep me signed in on this device
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
              Sign in
            </button>

            <div className="flex items-center gap-3 my-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">or continue with</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setUserId(users[0].id);
                  navigate({ to: "/" });
                }}
                className="h-11 rounded-lg border border-border bg-secondary hover:bg-muted text-sm font-medium flex items-center justify-center gap-2"
              >
                <GoogleIcon /> Google
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserId(users[0].id);
                  navigate({ to: "/" });
                }}
                className="h-11 rounded-lg text-sm font-medium flex items-center justify-center gap-2 text-white"
                style={{ background: "#1877F2" }}
              >
                <FacebookIcon /> Facebook
              </button>
            </div>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            New to TechStock?{" "}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.2 29.4 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.4 1.1 7.3 2.8l5.7-5.7C33.6 6.9 29 5 24 5 13.5 5 5 13.5 5 24s8.5 19 19 19 19-8.5 19-19c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.6 19 13 24 13c2.8 0 5.4 1.1 7.3 2.8l5.7-5.7C33.6 6.9 29 5 24 5 16.3 5 9.7 9.4 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43c5.1 0 9.7-1.9 13.2-5l-6.1-5c-2 1.4-4.5 2.2-7.1 2.2-5.3 0-9.8-2.7-11.3-6.9l-6.5 5C9.6 38.5 16.2 43 24 43z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.5l6.1 5c-.4.4 6.7-4.9 6.7-14.5 0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H8v-2.9h2.4V9.8c0-2.4 1.4-3.7 3.6-3.7 1 0 2.1.2 2.1.2v2.3h-1.2c-1.2 0-1.5.7-1.5 1.5v1.8h2.6l-.4 2.9h-2.2v7A10 10 0 0 0 22 12z"/>
    </svg>
  );
}
