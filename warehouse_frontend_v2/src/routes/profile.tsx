import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { AppShell } from "@/components/app-shell";
import { useApp, roleLabels } from "@/lib/app-context";
import { warehouseName } from "@/lib/warehouse-data";
import { User, Mail, Phone, MapPin, KeyRound, ShieldCheck, Save, Camera, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — TechStock" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { currentUser, updateCurrentUser } = useApp();
  
  // States for Personal Details
  const [name, setName] = useState(currentUser?.name || "");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || "");

  // States for Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState<{type: "error" | "success", text: string} | null>(null);
  const [pwdMessage, setPwdMessage] = useState<{type: "error" | "success", text: string} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Fetch full profile from backend
  const { data: userProfile, isLoading } = useQuery({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      const res = await api.get("/users/me");
      return res.data;
    }
  });

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.fullName || "");
      setEmail(userProfile.email || "");
      setPhone(userProfile.phone || "");
      if (userProfile.avatarUrl) {
        setAvatarUrl(userProfile.avatarUrl);
        updateCurrentUser({ avatarUrl: userProfile.avatarUrl });
      }
    }
  }, [userProfile]);

  // Mutations
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put("/users/profile", {
        fullName: name,
        email,
        phone,
        avatarUrl
      });
      return res.data;
    },
    onSuccess: (data) => {
      setMessage({ type: "success", text: "Profile updated successfully!" });
      updateCurrentUser({ name: data.fullName, avatarUrl: data.avatarUrl });
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (err: any) => {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to update profile." });
    }
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put("/users/profile/password", { currentPassword, newPassword });
      return res.data;
    },
    onSuccess: () => {
      setPwdMessage({ type: "success", text: "Password changed successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwdMessage(null), 3000);
    },
    onError: (err: any) => {
      setPwdMessage({ type: "error", text: err.response?.data?.message || "Failed to change password." });
    }
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "TechStock");
    
    const cloudName = "tfropvj1";
    
    try {
      // Cloudinary unsigned upload
      const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      if (data.secure_url) {
        setAvatarUrl(data.secure_url);
        updateCurrentUser({ avatarUrl: data.secure_url });
        setMessage({ type: "success", text: "Avatar uploaded. Click Save changes to apply." });
      } else {
        throw new Error(data.error?.message || "Upload failed");
      }
    } catch (err: any) {
      setMessage({ type: "error", text: "Avatar upload failed: " + err.message + ". Are you sure your Cloud Name doesn't have spaces?" });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveProfile = () => {
    setMessage(null);
    updateProfileMutation.mutate();
  };

  const handleChangePassword = () => {
    setPwdMessage(null);
    if (newPassword !== confirmPassword) {
      setPwdMessage({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 8) {
      setPwdMessage({ type: "error", text: "Password must be at least 8 characters long." });
      return;
    }
    changePasswordMutation.mutate();
  };

  if (!currentUser) return null;

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-3xl font-bold">My profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Personal information and account security</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="surface-card p-6 flex flex-col items-center text-center">
            
            <div className="relative group cursor-pointer" onClick={() => !uploadingAvatar && fileInputRef.current?.click()}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="size-24 rounded-full object-cover shadow-sm ring-2 ring-border" />
              ) : (
                <div className="size-24 rounded-full grid place-items-center text-2xl font-bold" style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}>
                  {currentUser.initials}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {uploadingAvatar ? <Loader2 className="size-6 text-white animate-spin" /> : <Camera className="size-6 text-white" />}
              </div>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAvatarChange} />
            </div>

            <div className="mt-4 font-semibold text-lg">{name || currentUser.name}</div>
            <div className="text-xs text-muted-foreground">{currentUser.title}</div>
            <div className="mt-3 flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-primary/15 text-primary">
              <ShieldCheck className="size-3" /> {roleLabels[currentUser.role]}
            </div>
            <div className="mt-4 w-full pt-4 border-t border-border/60 text-left text-sm space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="size-4 text-primary" />{currentUser.warehouseId ? warehouseName(currentUser.warehouseId) : "All warehouses"}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Mail className="size-4 text-primary" />{email || "..."}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Phone className="size-4 text-primary" />{phone || "..."}</div>
            </div>
          </div>

          <div className="surface-card p-6 lg:col-span-2 flex flex-col">
            <h2 className="font-semibold mb-4">Personal details</h2>
            
            {message && (
              <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${message.type === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-600'}`}>
                {message.type === 'error' ? <AlertCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
                {message.text}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
              <Field label="Full name" icon={<User className="size-4" />}>
                <input value={name} onChange={(e) => setName(e.target.value)} disabled={isLoading} className="w-full h-10 pl-9 pr-3 rounded-lg bg-input border border-border text-sm" />
              </Field>
              <Field label="Email" icon={<Mail className="size-4" />}>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} className="w-full h-10 pl-9 pr-3 rounded-lg bg-input border border-border text-sm" />
              </Field>
              <Field label="Phone" icon={<Phone className="size-4" />}>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={isLoading} className="w-full h-10 pl-9 pr-3 rounded-lg bg-input border border-border text-sm" />
              </Field>
              <Field label="Warehouse" icon={<MapPin className="size-4" />}>
                <input readOnly value={currentUser.warehouseId ? warehouseName(currentUser.warehouseId) : "All warehouses"} className="w-full h-10 pl-9 pr-3 rounded-lg bg-input border border-border text-sm opacity-80" />
              </Field>
            </div>
            
            <div className="flex justify-end mt-4">
              <button 
                onClick={handleSaveProfile}
                disabled={updateProfileMutation.isPending || isLoading}
                className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring disabled:opacity-50" 
                style={{ background: "var(--gradient-primary)" }}
              >
                {updateProfileMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save changes
              </button>
            </div>
          </div>
        </div>

        <div className="surface-card p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><KeyRound className="size-4 text-primary" /> Password</h2>
          
          {pwdMessage && (
            <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${pwdMessage.type === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-600'}`}>
              {pwdMessage.type === 'error' ? <AlertCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
              {pwdMessage.text}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Current password</label>
              <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-input border border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">New password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-input border border-border text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Confirm new password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-1 w-full h-10 px-3 rounded-lg bg-input border border-border text-sm" />
            </div>
          </div>
          <div className="flex justify-end">
            <button 
              onClick={handleChangePassword}
              disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
              className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm font-medium hover:bg-secondary/80 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {changePasswordMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Update password
            </button>
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
