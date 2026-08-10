import { createFileRoute, Link } from "@tanstack/react-router";
import { Cpu, ArrowLeft, Shield } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — TechStock" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  useEffect(() => {
    const saved = localStorage.getItem("ts-theme") || "dark";
    document.documentElement.classList.toggle("light", saved === "light");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg grid place-items-center glow-ring" style={{ background: "var(--gradient-primary)" }}>
              <Cpu className="size-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">TechStock</span>
          </div>
          <button onClick={() => window.history.length > 1 ? window.history.back() : window.close()} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
            <ArrowLeft className="size-4" />
            Back
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-6 border border-primary/20">
          <Shield className="size-3.5" />
          Data Security
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8 pb-8 border-b border-border">
          Last updated: August 2026
        </p>

        <article className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-muted-foreground leading-relaxed space-y-6">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. What information we collect</h2>
            <p>
              We collect information to provide better services to all our users. The types of information we collect include:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Account Information:</strong> Your name, email address, phone number, role, and department.</li>
              <li><strong>Activity Logs:</strong> Information about your actions within the system (e.g., transfers created, inventory checked).</li>
              <li><strong>Device Information:</strong> We may collect device-specific information such as your hardware model, operating system version, and unique device identifiers.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. How we use your information</h2>
            <p>
              We use the information we collect to operate, maintain, and improve our warehouse management services. Specifically, we use it to:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Authenticate your access to the system.</li>
              <li>Track inventory movements and maintain an audit trail for compliance purposes.</li>
              <li>Communicate with you regarding system updates, security alerts, and administrative messages.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. Information Security</h2>
            <p>
              We work hard to protect TechStock and our users from unauthorized access to or unauthorized alteration, disclosure, or destruction of information we hold. In particular:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>We encrypt many of our services using SSL/TLS.</li>
              <li>We review our information collection, storage, and processing practices to prevent unauthorized access to our systems.</li>
              <li>We restrict access to personal information to TechStock employees who need to know that information in order to process it for us.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. System Monitoring</h2>
            <p>
              As an enterprise application, be aware that all activities performed while logged into TechStock may be monitored and recorded by system administrators for security and auditing purposes.
            </p>
          </section>
        </article>

        <div className="mt-16 pt-8 border-t border-border flex justify-center">
          <button onClick={() => window.history.length > 1 ? window.history.back() : window.close()} className="inline-flex items-center gap-2 h-10 px-6 rounded-lg bg-primary text-primary-foreground font-medium text-sm transition-transform hover:scale-[1.02] active:scale-[0.98]">
            Acknowledge & Return
          </button>
        </div>
      </main>
    </div>
  );
}
