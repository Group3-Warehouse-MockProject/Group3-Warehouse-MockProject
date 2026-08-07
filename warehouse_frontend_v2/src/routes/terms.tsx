import { createFileRoute, Link } from "@tanstack/react-router";
import { Cpu, ArrowLeft, FileText } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms of Service — TechStock" }] }),
  component: TermsPage,
});

function TermsPage() {
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
          <FileText className="size-3.5" />
          Legal Document
        </div>
        
        <h1 className="text-4xl font-bold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8 pb-8 border-b border-border">
          Last updated: August 2026
        </p>

        <article className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-muted-foreground leading-relaxed space-y-6">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
            <p>
              Welcome to TechStock. These Terms of Service ("Terms") govern your use of the TechStock warehouse management system, including our website, APIs, and associated services (collectively, the "Service"). 
              By accessing or using the Service, you agree to be bound by these Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. Account Registration and Security</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>You must use a valid corporate email address to register an account.</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You agree to notify us immediately of any unauthorized access or security breach.</li>
              <li>TechStock reserves the right to suspend or terminate accounts that violate these security policies.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. Acceptable Use Policy</h2>
            <p>
              You agree not to misuse the TechStock services. For example, you must not, and must not attempt to:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Probe, scan, or test the vulnerability of any system or network.</li>
              <li>Breach or otherwise circumvent any security or authentication measures.</li>
              <li>Access, tamper with, or use non-public areas or parts of the Services.</li>
              <li>Interfere with or disrupt any user, host, or network.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. Data and Privacy</h2>
            <p>
              Our Privacy Policy explains how we collect, use, and share your personal information. By using our Services, you agree that TechStock can use such data in accordance with our Privacy Policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">5. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, TechStock shall not be liable for any indirect, incidental, special, consequential or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
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
