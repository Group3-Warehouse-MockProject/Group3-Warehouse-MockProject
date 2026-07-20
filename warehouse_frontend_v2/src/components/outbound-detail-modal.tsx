import { useState } from "react";
import {
  X, Calendar, User, Warehouse, FileText, Package,
  CheckCircle2, Clock, XCircle, Pencil, Trash2, Loader2, Save,
  Truck, Ban, Check, AlertTriangle
} from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "@/lib/app-context";

function parseRemark(remark?: string) {
  if (!remark) return { reference: "", assignee: "", note: "" };
  const parts = remark.split(" | ");
  let reference = "";
  let assignee = "";
  let note = "";
  parts.forEach(part => {
    if (part.startsWith("Ref: ")) {
      reference = part.replace("Ref: ", "");
    } else if (part.startsWith("Assignee: ")) {
      assignee = part.replace("Assignee: ", "");
    } else {
      note = part;
    }
  });
  return { reference, assignee, note };
}

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
  onDeleted: (receiptId: number) => void;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  PENDING:   { label: "Pending",   icon: Clock,        className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  APPROVED:  { label: "Approved",  icon: CheckCircle2, className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  REJECTED:  { label: "Rejected",  icon: XCircle,      className: "bg-red-500/15 text-red-400 border-red-500/30" },
  COMPLETED: { label: "Completed", icon: Truck,        className: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  CANCELLED: { label: "Cancelled", icon: Ban,          className: "bg-gray-500/15 text-gray-400 border-gray-500/30" },
};

export function OutboundDetailModal({
  allMovements,
  movement,
  warehouseCode,
  onClose,
  onUpdated,
  onDeleted,
}: Props) {
  const { currentUser } = useApp();
  
  // Role checks
  const isAdminOrManager = currentUser?.role === "Admin" || currentUser?.role === "Manager";
  const canEditRemark    = currentUser?.role === "Admin" || currentUser?.role === "Manager" || currentUser?.role === "Warehouse_Manager";
  const canDelete        = isAdminOrManager;

  // All lines belonging to this receipt
  const lines = allMovements.filter((m) => m.receiptId === movement.receiptId);

  const [editing, setEditing]         = useState(false);
  const [editRemark, setEditRemark]   = useState(movement.remark ?? "");
  const [saving, setSaving]           = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const statusCfg = STATUS_CONFIG[movement.status] ?? STATUS_CONFIG["PENDING"];
  const StatusIcon = statusCfg.icon;
  const parsed = parseRemark(movement.remark);
  const displayId = parsed.reference || `R-${movement.receiptId}`;

  async function handleStatusTransition(newStatus: string) {
    setActionLoading(true);
    setError(null);
    try {
      const res = await api.patch<ReceiptMovement[]>(`/receipts/${movement.receiptId}`, {
        status: newStatus,
      });
      onUpdated(res.data);
    } catch (err: any) {
      const data = err.response?.data;
      const msg =
        typeof data === "string"
          ? data
          : typeof data === "object" && data !== null && "message" in data
          ? String((data as { message: string }).message)
          : `Failed to update status to ${newStatus}. Please try again.`;
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSaveRemark() {
    setSaving(true);
    setError(null);
    try {
      const res = await api.patch<ReceiptMovement[]>(`/receipts/${movement.receiptId}`, {
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
          : "Failed to update notes. Please try again.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await api.delete(`/receipts/${movement.receiptId}`);
      onDeleted(movement.receiptId);
      onClose();
    } catch {
      setError("Failed to delete receipt. Please try again.");
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl surface-card shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div
              className="size-10 rounded-lg grid place-items-center bg-accent/15 text-accent"
            >
              <Package className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold font-mono">{displayId}</h2>
              <p className="text-xs text-muted-foreground">Outbound Request Detail</p>
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
            <MetaRow icon={User}     label="Assigned to" value={parsed.assignee || "Unassigned"} />
            <MetaRow icon={FileText} label="Reference #" value={parsed.reference || "—"} />

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
                <div className="space-y-2">
                  <textarea
                    value={editRemark}
                    onChange={(e) => setEditRemark(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground min-h-[60px] resize-none"
                    placeholder="Optional notes…"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => { setEditing(false); setEditRemark(movement.remark ?? ""); }}
                      className="h-8 px-3 rounded-md text-xs border border-border hover:bg-secondary"
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveRemark}
                      className="h-8 px-3 rounded-md text-xs bg-primary text-primary-foreground font-medium flex items-center gap-1"
                      disabled={saving}
                    >
                      {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                      Save Notes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    {parsed.note || <span className="italic">No notes</span>}
                  </p>
                  {canEditRemark && (
                    <button
                      onClick={() => setEditing(true)}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <Pencil className="size-3" /> Edit notes
                    </button>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Items table */}
          <div className="px-6 pb-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Items in this request</div>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40">
                  <tr>
                    <th className="text-left px-3 py-2">Product</th>
                    <th className="text-left px-3 py-2">SKU</th>
                    <th className="text-left px-3 py-2">Customer</th>
                    <th className="text-right px-3 py-2">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => (
                    <tr key={line.id} className="border-t border-border/60">
                      <td className="px-3 py-2 font-medium">{line.product}</td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{line.sku}</td>
                      <td className="px-3 py-2 text-muted-foreground">{line.partner}</td>
                      <td className="px-3 py-2 text-right font-semibold text-accent">-{line.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Workflow Action Panel */}
          {movement.status === "PENDING" && (
            <div className="mx-6 mb-5 p-4 rounded-xl border border-warning/20 bg-warning/5">
              <h3 className="text-sm font-semibold flex items-center gap-1.5 text-warning">
                <AlertTriangle className="size-4" /> Manager Review Required
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                This outbound request is waiting for approval from a Manager or Admin.
              </p>
              {isAdminOrManager ? (
                <div className="flex gap-2 mt-3.5">
                  <button
                    disabled={actionLoading}
                    onClick={() => handleStatusTransition("APPROVED")}
                    className="h-9 px-4 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 transition-colors"
                  >
                    {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    Approve Request
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleStatusTransition("REJECTED")}
                    className="h-9 px-4 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 transition-colors"
                  >
                    {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                    Reject Request
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-2 italic">
                  * Only users with Manager or Admin roles can approve/reject this request.
                </p>
              )}
            </div>
          )}

          {movement.status === "APPROVED" && (
            <div className="mx-6 mb-5 p-4 rounded-xl border border-primary/20 bg-primary/5">
              <h3 className="text-sm font-semibold flex items-center gap-1.5 text-primary">
                <Truck className="size-4" /> Goods Issue Confirmation
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                The request is approved. Warehouse staff can now pick the products, verify the quantities, and issue the goods.
              </p>
              <div className="flex gap-2 mt-3.5">
                <button
                  disabled={actionLoading}
                  onClick={() => handleStatusTransition("COMPLETED")}
                  className="h-10 px-5 rounded-lg text-sm font-medium text-white flex items-center gap-2 transition-colors glow-ring"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {actionLoading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  Confirm Goods Issue
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() => handleStatusTransition("CANCELLED")}
                  className="h-10 px-4 rounded-lg text-sm border border-border hover:bg-secondary text-muted-foreground flex items-center gap-1.5 transition-colors"
                >
                  Cancel Process
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mx-6 mb-4 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 border border-destructive/20 font-medium">
              {error}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-border bg-secondary/20">
          {/* Delete */}
          <div>
            {canDelete && !confirmDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="h-9 px-4 rounded-lg text-sm border border-destructive/40 text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors"
              >
                <Trash2 className="size-4" /> Delete
              </button>
            )}
            {canDelete && confirmDelete && (
              <div className="flex flex-col gap-2">
                {movement.status === "COMPLETED" && (
                  <p className="text-xs text-amber-400 font-medium">
                    ⚠ This outbound order is <strong>COMPLETED</strong>. Deleting it will reverse the inventory changes.
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-destructive">Are you sure?</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="h-8 px-3 rounded-md text-xs bg-destructive text-white flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {deleting && <Loader2 className="size-3.5 animate-spin" />}
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="h-8 px-3 rounded-md text-xs border border-border hover:bg-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Close */}
          <button onClick={onClose} className="h-9 px-4 rounded-lg text-sm border border-border hover:bg-secondary">
            Close
          </button>
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
