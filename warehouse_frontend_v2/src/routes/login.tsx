import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState,useEffect } from "react";
import { Cpu, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — TechStock" }] }),
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const saved = localStorage.getItem("ts-theme") || "dark";
    document.documentElement.classList.toggle("light", saved === "light");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError(null);
    try {
      const { api } = await import("@/lib/api");
      const res = await api.post("/auth/login", { emailOrUsername: email, password });
      if (res.data.success) {
        localStorage.setItem("token", res.data.token);
        // Force context to re-evaluate or reload window
        window.location.href = "/";
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Invalid credentials. Please try again.");
    }
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
        <div className="pointer-events-none absolute -bottom-40 -right-40 size-130 rounded-full bg-white/10 blur-3xl" />
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

          </form>


        </div>
      </div>
    </div>
  );
}
