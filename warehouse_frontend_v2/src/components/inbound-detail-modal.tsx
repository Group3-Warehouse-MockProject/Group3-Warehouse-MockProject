import { useState } from "react";
import {
  X, Calendar, User, Warehouse, FileText, Package,
  CheckCircle2, Clock, XCircle, Pencil, Trash2, Loader2, Save,
} from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "@/lib/app-context";

export interface ReceiptMovement {
  id: string;
  receiptId: number;
  type: string;
  sku: string;
  product: string;
  partner: string;
  staff: string;
  warehouseId: string;
  qty: number;
  date: string;
  status: string;
  remark?: string;
  createdAt: string;
  updatedAt?: string;
}

interface Props {
  /** All movements — modal will filter by receiptId to show sibling lines */
  allMovements: ReceiptMovement[];
  /** The row the user clicked */
  movement: ReceiptMovement;
  warehouseCode: (id: string) => string;
  onClose: () => void;
  onUpdated: (updated: ReceiptMovement[]) => void;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  PENDING:  { label: "Pending",  icon: Clock,         className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  APPROVED: { label: "Approved", icon: CheckCircle2,  className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  REJECTED: { label: "Rejected", icon: XCircle,       className: "bg-red-500/15 text-red-400 border-red-500/30" },
};

export function InboundDetailModal({
  allMovements,
  movement,
  warehouseCode,
  onClose,
  onUpdated,
}: Props) {
  const { currentUser } = useApp();
  const canEdit   = currentUser?.role === "Admin" || currentUser?.role === "Manager" || currentUser?.role === "Warehouse_Manager";

  // All lines belonging to this receipt
  const lines = allMovements.filter((m) => m.receiptId === movement.receiptId);

  const [editing, setEditing]         = useState(false);
  const [editRemark, setEditRemark]   = useState(movement.remark ?? "");
  const [saving, setSaving]           = useState(false);
  const [confirmAction, setConfirmAction] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);

  const statusCfg = STATUS_CONFIG[movement.status] ?? STATUS_CONFIG["PENDING"];
  const StatusIcon = statusCfg.icon;

  async function handleQuickAction(status: "APPROVED" | "REJECTED") {
    setSaving(true);
    setError(null);
    try {
      const res = await api.patch<ReceiptMovement[]>(`/receipts/${movement.receiptId}`, {
        status,
        remark: movement.remark || null,
      });
      onUpdated(res.data);
      setConfirmAction(null);
    } catch (err: any) {
      const data = err.response?.data;
      const msg = typeof data === "string" ? data : (data?.message || "Failed to update status. Please try again.");
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    // Check no changes
    const remarkUnchanged = editRemark.trim() === (movement.remark ?? "").trim();
    if (remarkUnchanged) {
      setSaveWarning("No changes detected. Please modify the remark before saving.");
      return;
    }
    setSaveWarning(null);
    setSaving(true);
    setError(null);
    try {
      const res = await api.patch<ReceiptMovement[]>(`/receipts/${movement.receiptId}`, {
        status: movement.status,
        remark: editRemark || null,
      });
      onUpdated(res.data);
      setEditing(false);
    } catch (err: any) {
      const data = err.response?.data;
      const msg =
        typeof data === "string"
          ? data
          : typeof data === "object" && data !== null && "message" in data
          ? String((data as { message: string }).message)
          : "Failed to update receipt. Please try again.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl surface-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div
              className="size-10 rounded-lg grid place-items-center"
              style={{ background: "color-mix(in oklab, var(--primary) 15%, transparent)", color: "var(--primary)" }}
            >
              <Package className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold font-mono">R-{movement.receiptId}</h2>
              <p className="text-xs text-muted-foreground">Inbound Receipt Detail</p>
            </div>
          </div>
          <button onClick={onClose} className="size-9 rounded-lg hover:bg-secondary grid place-items-center">
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Meta info grid */}
          <div className="px-6 pt-5 pb-4 grid grid-cols-2 gap-x-6 gap-y-4">
            <MetaRow icon={Calendar} label="Created at" value={movement.createdAt} />
            <MetaRow icon={Calendar} label="Updated at"  value={movement.updatedAt ?? "—"} />
            <MetaRow icon={User}     label="Created by"  value={movement.staff} />
            <MetaRow icon={Warehouse} label="Warehouse"  value={warehouseCode(movement.warehouseId)} />

            {/* Status */}
            <div className="col-span-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Status</div>
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${statusCfg.className}`}>
                <StatusIcon className="size-3.5" />
                {statusCfg.label}
              </span>
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <FileText className="size-3.5" /> Notes
              </div>
              {editing ? (
                <textarea
                  value={editRemark}
                  onChange={(e) => { setEditRemark(e.target.value); setSaveWarning(null); }}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground min-h-[60px] resize-none"
                  placeholder="Optional notes…"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {movement.remark || <span className="italic">No notes</span>}
                </p>
              )}
            </div>

          </div>

          {/* Items table */}
          <div className="px-6 pb-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Items in this receipt</div>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40">
                  <tr>
                    <th className="text-left px-3 py-2">Product</th>
                    <th className="text-left px-3 py-2">SKU</th>
                    <th className="text-left px-3 py-2">Supplier</th>
                    <th className="text-right px-3 py-2">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.id} className="border-t border-border/60">
                      <td className="px-3 py-2 font-medium">{line.product}</td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{line.sku}</td>
                      <td className="px-3 py-2 text-muted-foreground">{line.partner}</td>
                      <td className="px-3 py-2 text-right font-semibold text-primary">+{line.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {(error || saveWarning) && (
            <div className={`mx-6 mb-4 text-sm rounded-lg px-3 py-2 ${
              saveWarning
                ? "text-amber-400 bg-amber-500/10 border border-amber-500/20"
                : "text-destructive bg-destructive/10"
            }`}>
              {saveWarning || error}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-border bg-secondary/20">
          <div /> {/* Empty div to keep the edit/save block on the right */}

          {/* Edit / Save */}
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  onClick={() => { setEditing(false); setEditRemark(movement.remark ?? ""); setError(null); setSaveWarning(null); }}
                  className="h-9 px-4 rounded-lg text-sm border border-border hover:bg-secondary"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="h-9 px-4 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Save changes
                </button>
              </>
            ) : confirmAction ? (
              <div className="flex items-center gap-2 bg-secondary/40 rounded-lg p-1 pl-3 border border-border">
                <span className="text-xs text-muted-foreground mr-1">
                  Confirm {confirmAction === "APPROVED" ? "Approve" : "Reject"}?
                </span>
                <button
                  onClick={() => handleQuickAction(confirmAction)}
                  disabled={saving}
                  className={`h-7 px-3 rounded-md text-xs font-medium text-white flex items-center gap-1.5 disabled:opacity-60 ${
                    confirmAction === "APPROVED" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"
                  }`}
                >
                  {saving && <Loader2 className="size-3.5 animate-spin" />} Yes
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
                  disabled={saving}
                  className="h-7 px-3 rounded-md text-xs border border-border bg-background hover:bg-secondary disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <button onClick={onClose} className="h-9 px-4 rounded-lg text-sm border border-border hover:bg-secondary">
                  Close
                </button>
                {canEdit && movement.status === "PENDING" && (
                  <>
                    <button
                      onClick={() => setConfirmAction("REJECTED")}
                      className="h-9 px-4 rounded-lg text-sm font-medium border border-red-500/30 text-red-500 bg-red-500/10 hover:bg-red-500/20 flex items-center gap-1.5"
                    >
                      <XCircle className="size-4" /> Reject
                    </button>
                    <button
                      onClick={() => setConfirmAction("APPROVED")}
                      className="h-9 px-4 rounded-lg text-sm font-medium border border-emerald-500/30 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="size-4" /> Approve
                    </button>
                  </>
                )}
                {canEdit && (
                  <button
                    onClick={() => setEditing(true)}
                    className="h-9 px-4 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    <Pencil className="size-4" /> Edit
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
        <Icon className="size-3.5" /> {label}
      </div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
