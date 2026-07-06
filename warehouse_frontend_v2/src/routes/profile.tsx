import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useApp, roleLabels } from "@/lib/app-context";
import { warehouseName } from "@/lib/warehouse-data";
import { User, Mail, Phone, MapPin, KeyRound, ShieldCheck, Save } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — TechStock" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { currentUser } = useApp();
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(`${currentUser.name.toLowerCase().replace(/\s+/g, ".")}@techstock.vn`);
  const [phone, setPhone] = useState("+84 90 123 4567");
  const [bio, setBio] = useState("Warehouse operations at TechStock.");

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-3xl font-bold">My profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Personal information and account security</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="surface-card p-6 flex flex-col items-center text-center">
            <div className="size-24 rounded-full grid place-items-center text-2xl font-bold" style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}>
              {currentUser.initials}
            </div>
            <div className="mt-4 font-semibold text-lg">{currentUser.name}</div>
            <div className="text-xs text-muted-foreground">{currentUser.title}</div>
            <div className="mt-3 flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-primary/15 text-primary">
              <ShieldCheck className="size-3" /> {roleLabels[currentUser.role]}
            </div>
            <div className="mt-4 w-full pt-4 border-t border-border/60 text-left text-sm space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="size-4 text-primary" />{currentUser.warehouseId ? warehouseName(currentUser.warehouseId) : "All warehouses"}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Mail className="size-4 text-primary" />{email}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Phone className="size-4 text-primary" />{phone}</div>
            </div>
          </div>

          <div className="surface-card p-6 lg:col-span-2 space-y-4">
            <h2 className="font-semibold">Personal details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full name" icon={<User className="size-4" />}>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 pl-9 pr-3 rounded-lg bg-input border border-border text-sm" />
              </Field>
              <Field label="Email" icon={<Mail className="size-4" />}>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-10 pl-9 pr-3 rounded-lg bg-input border border-border text-sm" />
              </Field>
              <Field label="Phone" icon={<Phone className="size-4" />}>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full h-10 pl-9 pr-3 rounded-lg bg-input border border-border text-sm" />
              </Field>
              <Field label="Warehouse" icon={<MapPin className="size-4" />}>
                <input readOnly value={currentUser.warehouseId ? warehouseName(currentUser.warehouseId) : "All warehouses"} className="w-full h-10 pl-9 pr-3 rounded-lg bg-input border border-border text-sm opacity-80" />
              </Field>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Bio</label>
              <textarea rows={3} value={bio} onChange={(e) => setBio(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg bg-input border border-border text-sm" />
            </div>
            <div className="flex justify-end">
              <button className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring" style={{ background: "var(--gradient-primary)" }}>
                <Save className="size-4" /> Save changes
              </button>
            </div>
          </div>
        </div>

        <div className="surface-card p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><KeyRound className="size-4 text-primary" /> Password</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Current password</label>
              <input type="password" className="mt-1 w-full h-10 px-3 rounded-lg bg-input border border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">New password</label>
              <input type="password" className="mt-1 w-full h-10 px-3 rounded-lg bg-input border border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Confirm new password</label>
              <input type="password" className="mt-1 w-full h-10 px-3 rounded-lg bg-input border border-border text-sm" />
            </div>
          </div>
          <div className="flex justify-end">
            <button className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm">Update password</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        {children}
      </div>
    </label>
  );
}
