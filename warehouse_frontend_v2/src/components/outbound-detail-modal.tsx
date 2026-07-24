import { useState, useEffect } from "react";
import {
  X, Calendar, User, Warehouse, FileText, Package,
  CheckCircle2, Clock, XCircle, Pencil, Trash2, Loader2, Save,
  Truck, Ban, Check, AlertTriangle, Banknote, Wallet, CreditCard,
  QrCode, ChevronDown, ChevronUp
} from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "@/lib/app-context";
import { formatVND } from "@/lib/warehouse-data";

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
  paymentTerm?: "PREPAID" | "COD" | "DEBT";
  paymentStatus?: "UNPAID" | "PARTIAL" | "PAID";
  totalAmount?: number;
  paidAmount?: number;
}

export interface PaymentRecord {
  id: number;
  amount: number;
  paymentMethod: string;
  referenceCode?: string;
  note?: string;
  createdAt: string;
  createdBy: string;
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

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PAID:     { label: "Paid",     className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  PARTIAL:  { label: "Partial",  className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  UNPAID:   { label: "Unpaid",   className: "bg-red-500/15 text-red-400 border-red-500/30" },
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CARD: "Card",
  OTHER: "Other",
};

// Replace this URL with your actual bank transfer QR image link
const BANK_TRANSFER_QR_URL = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRUeShVJgPUYZ8BLgnFQ1-3NT4kK7J4qTfci9k6kADXRMAek03SePMKQnKF&s=10";

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
  const canRecordPayment = canEditRemark;
  const canPayNow = (movement.status === "APPROVED" || movement.status === "COMPLETED") && canRecordPayment;
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

  // Payment state
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [fetchingPayments, setFetchingPayments] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [payAmount, setPayAmount] = useState<string>("");
  const [payMethod, setPayMethod] = useState("CASH");
  const [payNote, setPayNote] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const statusCfg = STATUS_CONFIG[movement.status] ?? STATUS_CONFIG["PENDING"];
  const StatusIcon = statusCfg.icon;
  const parsed = parseRemark(movement.remark);
  const displayId = parsed.reference || `R-${movement.receiptId}`;

  const totalAmount = movement.totalAmount ?? 0;
  const paidAmount = movement.paidAmount ?? 0;
  const remainingAmount = Math.max(0, totalAmount - paidAmount);

  useEffect(() => {
    async function fetchPayments() {
      setFetchingPayments(true);
      try {
        const res = await api.get<PaymentRecord[]>(`/receipts/${movement.receiptId}/payments`);
        setPayments(res.data);
      } catch (err: any) {
        console.error("Failed to fetch payments", err);
      } finally {
        setFetchingPayments(false);
      }
    }
    fetchPayments();
  }, [movement.receiptId]);

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

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amountNum = Number(payAmount.replace(/[^\d.]/g, ""));
    if (!amountNum || amountNum <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }
    if (amountNum > remainingAmount) {
      setError("Amount cannot exceed remaining balance.");
      return;
    }

    setSubmittingPayment(true);
    try {
      await api.post(`/receipts/${movement.receiptId}/payments`, {
        amount: amountNum,
        paymentMethod: payMethod,
        note: payNote || null,
      });

      const pRes = await api.get<PaymentRecord[]>(`/receipts/${movement.receiptId}/payments`);
      setPayments(pRes.data);

      // Refresh movement data so payment status updates in the parent list
      const mRes = await api.get<ReceiptMovement[]>("/receipts", { params: { type: "OUTBOUND" } });
      onUpdated(mRes.data);

      setShowPaymentForm(false);
      setPayAmount("");
      setPayMethod("CASH");
      setPayNote("");
    } catch (err: any) {
      const data = err.response?.data;
      setError(typeof data === "string" ? data : "Failed to record payment.");
    } finally {
      setSubmittingPayment(false);
    }
  }

  const paymentStatus = movement.paymentStatus ?? "UNPAID";
  const paymentStatusCfg = PAYMENT_STATUS_CONFIG[paymentStatus] ?? PAYMENT_STATUS_CONFIG["UNPAID"];

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

          {/* Payment summary */}
          <div className="mx-6 mb-5 p-4 rounded-xl border border-border bg-secondary/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Banknote className="size-4 text-primary" /> Payment
              </h3>
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${paymentStatusCfg.className}`}>
                {paymentStatusCfg.label}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="p-2.5 rounded-lg bg-secondary/40">
                <div className="text-xs text-muted-foreground mb-0.5">Term</div>
                <div className="text-sm font-medium">{movement.paymentTerm ?? "COD"}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-secondary/40">
                <div className="text-xs text-muted-foreground mb-0.5">Total</div>
                <div className="text-sm font-medium">{formatVND(totalAmount)}</div>
              </div>
              <div className="p-2.5 rounded-lg bg-secondary/40">
                <div className="text-xs text-muted-foreground mb-0.5">Remaining</div>
                <div className={`text-sm font-medium ${remainingAmount === 0 ? "text-emerald-400" : "text-amber-400"}`}>
                  {formatVND(remainingAmount)}
                </div>
              </div>
            </div>

            {/* Payment history */}
            <div className="mb-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Payment history</div>
              {fetchingPayments ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="size-3.5 animate-spin" /> Loading…
                </div>
              ) : payments.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No payments recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 text-sm">
                      <div className="flex items-center gap-2">
                        {p.paymentMethod === "CASH" && <Wallet className="size-3.5 text-muted-foreground" />}
                        {p.paymentMethod === "BANK_TRANSFER" && <QrCode className="size-3.5 text-muted-foreground" />}
                        {p.paymentMethod === "CARD" && <CreditCard className="size-3.5 text-muted-foreground" />}
                        {p.paymentMethod === "OTHER" && <Banknote className="size-3.5 text-muted-foreground" />}
                        <div>
                          <div className="font-medium">{formatVND(p.amount)}</div>
                          <div className="text-xs text-muted-foreground">{PAYMENT_METHOD_LABEL[p.paymentMethod] || p.paymentMethod}</div>
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <div>{p.createdBy}</div>
                        <div>{p.createdAt}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {(!canPayNow || remainingAmount === 0) && (
              <p className="text-xs text-muted-foreground italic">
                {remainingAmount === 0
                  ? "This order is fully paid."
                  : movement.status === "PENDING"
                  ? "Payment recording will be available after the request is approved."
                  : "Payment recording is not available for this order."}
              </p>
            )}

            {/* Record payment button / form */}
            {canPayNow && remainingAmount > 0 && (
              <div className="space-y-3">
                {!showPaymentForm ? (
                  <button
                    onClick={() => {
                      setShowPaymentForm(true);
                      setPayAmount(String(remainingAmount));
                      setPayMethod("CASH");
                      setPayNote("");
                      setError(null);
                    }}
                    className="h-9 px-4 rounded-lg text-sm font-medium border border-primary text-primary hover:bg-primary/10 flex items-center gap-2 transition-colors"
                  >
                    <Banknote className="size-4" /> Record payment
                  </button>
                ) : (
                  <form onSubmit={handleRecordPayment} className="p-3 rounded-lg border border-border bg-background/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Record payment</span>
                      <button
                        type="button"
                        onClick={() => setShowPaymentForm(false)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                      >
                        <ChevronUp className="size-3" /> Hide
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Amount (VND)</label>
                        <input
                          type="number"
                          min={1}
                          max={remainingAmount}
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          className="input h-9 w-full"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground block mb-1">Method</label>
                        <select
                          value={payMethod}
                          onChange={(e) => setPayMethod(e.target.value)}
                          className="input h-9 w-full"
                        >
                          <option value="CASH">Cash</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                          <option value="CARD">Card</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                    </div>
                    {payMethod === "BANK_TRANSFER" && (
                      <div className="p-3 rounded-lg border border-dashed border-border bg-secondary/20">
                        <div className="text-xs text-muted-foreground mb-2">Scan the QR code below to transfer</div>
                        <img
                          src={BANK_TRANSFER_QR_URL}
                          alt="Bank transfer QR"
                          className="w-40 h-40 rounded-lg border border-border object-contain bg-white"
                        />
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Note</label>
                      <textarea
                        value={payNote}
                        onChange={(e) => setPayNote(e.target.value)}
                        rows={2}
                        className="input w-full min-h-[60px] py-2"
                        placeholder="Optional note…"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPaymentForm(false)}
                        className="h-8 px-3 rounded-md text-xs border border-border hover:bg-secondary"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingPayment}
                        className="h-8 px-3 rounded-md text-xs bg-primary text-primary-foreground font-medium flex items-center gap-1"
                      >
                        {submittingPayment && <Loader2 className="size-3 animate-spin" />}
                        Save payment
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
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

      <style>{`
        .input {
          width: 100%;
          height: 2.5rem;
          padding: 0 0.75rem;
          border-radius: 0.5rem;
          background: var(--input);
          border: 1px solid var(--border);
          font-size: 0.875rem;
          color: var(--foreground);
        }
        .input:focus { outline: none; box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent); }
      `}</style>
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
