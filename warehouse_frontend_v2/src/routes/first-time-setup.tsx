import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Cpu, Eye, EyeOff, Lock, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";

export const Route = createFileRoute("/first-time-setup")({
  head: () => ({ meta: [{ title: "Account Setup — TechStock" }] }),
  component: FirstTimeSetupPage,
});

function FirstTimeSetupPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [acceptPolicy, setAcceptPolicy] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [needsPolicyAcceptance, setNeedsPolicyAcceptance] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ts-theme") || "dark";
    document.documentElement.classList.toggle("light", saved === "light");

    const setupToken = sessionStorage.getItem("setup_token");
    if (!setupToken) {
      window.location.href = "/login";
      return;
    }

    setIsFirstLogin(sessionStorage.getItem("setup_isFirstLogin") === "true");
    setNeedsPolicyAcceptance(sessionStorage.getItem("setup_needsPolicyAcceptance") === "true");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFirstLogin && (!currentPassword || !newPassword || !confirmNewPassword)) {
      return setError("Please fill in all password fields.");
    }
    if (isFirstLogin && newPassword !== confirmNewPassword) {
      return setError("New passwords do not match.");
    }
    if (isFirstLogin && newPassword.length < 8) {
      return setError("New password must be at least 8 characters.");
    }
    if (needsPolicyAcceptance && !acceptPolicy) {
      return setError("You must accept the terms and privacy policy to continue.");
    }

    setError(null);
    try {
      const token = sessionStorage.getItem("setup_token");
      const res = await api.post(
        "/auth/first-time-setup",
        {
          currentPassword,
          newPassword,
          confirmNewPassword,
          acceptPolicy,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data.success) {
        const remember = sessionStorage.getItem("setup_remember") === "true";
        if (remember) {
          localStorage.setItem("token", res.data.token);
          sessionStorage.removeItem("token");
        } else {
          sessionStorage.setItem("token", res.data.token);
          localStorage.removeItem("token");
        }
        
        sessionStorage.removeItem("setup_token");
        sessionStorage.removeItem("setup_isFirstLogin");
        sessionStorage.removeItem("setup_needsPolicyAcceptance");
        sessionStorage.removeItem("setup_remember");

        window.location.href = "/";
      } else {
        setError(res.data.message || "Setup failed.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "An error occurred during setup.");
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
        <div className="relative text-primary-foreground max-w-md animate-in fade-in slide-in-from-left-4 duration-700">
          <h1 className="text-4xl font-bold leading-tight">
            Welcome to the team.
          </h1>
          <p className="mt-4 text-sm opacity-90 leading-relaxed">
            Please complete your account setup to access the TechStock warehouse management system. Your security and data privacy are our top priorities.
          </p>
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3 text-sm bg-white/10 p-3 rounded-xl backdrop-blur border border-white/10">
              <div className="size-8 rounded-lg bg-white/20 grid place-items-center shrink-0">
                <Lock className="size-4" />
              </div>
              <span className="opacity-90">Set a strong password for your account</span>
            </div>
            <div className="flex items-center gap-3 text-sm bg-white/10 p-3 rounded-xl backdrop-blur border border-white/10">
              <div className="size-8 rounded-lg bg-white/20 grid place-items-center shrink-0">
                <CheckCircle2 className="size-4" />
              </div>
              <span className="opacity-90">Review and accept internal policies</span>
            </div>
          </div>
        </div>
        <div className="text-xs text-primary-foreground/70">
          © {new Date().getFullYear()} TechStock — Security & Compliance
        </div>
        <div className="pointer-events-none absolute -bottom-40 -right-40 size-130 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -top-40 -left-40 size-96 rounded-full bg-white/5 blur-3xl" />
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-12 relative overflow-y-auto">
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
          <div className="lg:hidden mb-10 flex items-center gap-3">
            <div className="size-10 rounded-xl grid place-items-center glow-ring" style={{ background: "var(--gradient-primary)" }}>
              <Cpu className="size-5 text-primary-foreground" />
            </div>
            <div>
              <div className="text-sm font-semibold">TechStock</div>
              <div className="text-[11px] text-muted-foreground">Computer Warehouse</div>
            </div>
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 border border-primary/20">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-primary"></span>
              </span>
              Account Setup
            </span>
            <h2 className="text-3xl font-bold tracking-tight">Action Required</h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {isFirstLogin 
                ? "Please change your temporary password and accept our policy to secure your account."
                : "Our policy has been updated. Please review and accept to continue using the system."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {isFirstLogin && (
              <div className="space-y-4 p-5 rounded-xl border border-border bg-card shadow-sm">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Lock className="size-4 text-primary" />
                  Security Credentials
                </h3>
                <label className="block">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Temporary Password</div>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full h-11 pl-4 pr-10 rounded-lg bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                      placeholder="Enter temporary password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPw((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 size-7 grid place-items-center rounded-md hover:bg-secondary text-muted-foreground transition-colors"
                    >
                      {showCurrentPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </label>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                  <label className="block">
                    <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">New Password</div>
                    <div className="relative">
                      <input
                        type={showNewPw ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full h-11 pl-4 pr-10 rounded-lg bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                        placeholder="Min 8 chars"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw((v) => !v)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 size-8 grid place-items-center rounded-md hover:bg-secondary text-muted-foreground transition-colors"
                      >
                        {showNewPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </label>
                  
                  <label className="block">
                    <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">Confirm New</div>
                    <div className="relative">
                      <input
                        type={showNewPw ? "text" : "password"}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        className="w-full h-11 pl-4 rounded-lg bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                        placeholder="Repeat password"
                        required
                      />
                    </div>
                  </label>
                </div>
              </div>
            )}

            {needsPolicyAcceptance && (
              <label className="flex items-start gap-3 text-sm text-muted-foreground p-5 bg-primary/5 rounded-xl border border-primary/20 hover:bg-primary/10 transition-colors cursor-pointer group">
                <div className="relative flex items-center justify-center mt-0.5">
                  <input
                    type="checkbox"
                    checked={acceptPolicy}
                    onChange={(e) => setAcceptPolicy(e.target.checked)}
                    className="peer size-5 cursor-pointer appearance-none rounded border-2 border-primary/50 checked:border-primary checked:bg-primary transition-all"
                  />
                  <CheckCircle2 className="absolute size-3.5 text-primary-foreground opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                </div>
                <span className="leading-relaxed pt-0.5 group-hover:text-foreground transition-colors">
                  I have read and agree to the TechStock{" "}
                  <Link to="/terms" target="_blank" className="font-medium text-primary hover:underline" onClick={(e: any) => e.stopPropagation()}>Terms of Service</Link>{" "}
                  and <Link to="/privacy" target="_blank" className="font-medium text-primary hover:underline" onClick={(e: any) => e.stopPropagation()}>Privacy Policy</Link>.
                  I understand that my access to this system is monitored.
                </span>
              </label>
            )}

            {error && (
              <div className="text-sm font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <div className="size-1.5 rounded-full bg-destructive shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full h-12 rounded-xl text-sm font-bold text-primary-foreground glow-ring mt-6 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform active:scale-[0.98]"
              style={{ background: "var(--gradient-primary)" }}
            >
              Complete Setup
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-4"><path d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
