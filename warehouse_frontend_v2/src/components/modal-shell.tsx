import { X } from "lucide-react";
import { useEffect } from "react";

interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export function ModalShell({ open, onClose, title, subtitle, icon, children, footer, maxWidth = "42rem" }: ModalShellProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.55)", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full surface-card overflow-hidden animate-in fade-in zoom-in-95"
        style={{ maxWidth, maxHeight: "92vh", display: "flex", flexDirection: "column" }}
      >
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: "var(--gradient-primary)", color: "var(--primary-foreground)" }}>
          <div className="flex items-center gap-3">
            {icon && <div className="size-10 rounded-lg grid place-items-center bg-white/15">{icon}</div>}
            <div>
              <h2 className="text-lg font-semibold leading-tight">{title}</h2>
              {subtitle && <p className="text-xs opacity-80 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="size-8 grid place-items-center rounded-md hover:bg-white/15 transition-colors">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-border/60 flex justify-end gap-2 bg-secondary/30">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children, required, hint, className = "" }: { label: string; children: React.ReactNode; required?: boolean; hint?: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <div className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
        {label} {required && <span className="text-destructive">*</span>}
      </div>
      {children}
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </label>
  );
}

export const inputCls = "w-full h-10 px-3 rounded-lg bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
export const selectCls = inputCls;
export const textareaCls = "w-full px-3 py-2 rounded-lg bg-input border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[80px]";
