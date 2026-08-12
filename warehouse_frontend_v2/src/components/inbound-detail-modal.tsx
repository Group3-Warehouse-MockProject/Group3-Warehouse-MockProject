import { useState, useEffect } from "react";
import {
  X, Calendar, User, Warehouse, FileText, Package,
  CheckCircle2, Clock, XCircle, Pencil, Trash2, Loader2, Save, Plus, History,
  CreditCard, DollarSign
} from "lucide-react";
import { api, getErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import { useApp } from "@/lib/app-context";
import { ReceiptMovement } from "@/types";
import { useQuery } from "@tanstack/react-query";

interface Props {
  /** All movements — modal will filter by receiptId to show sibling lines */
  allMovements: ReceiptMovement[];
  /** The row the user clicked */
  movement: ReceiptMovement;
  warehouseCode: (id: string) => string;
  onClose: () => void;
  onUpdated: (updated: ReceiptMovement[]) => void;
}

interface ProductOption { sku: string; name: string; }
interface WarehouseOption { id: string; code: string; }
interface SupplierOption { id: string; name: string; }
interface EditLineItem { key: string; sku: string; qty: number; }

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  PENDING:  { label: "Pending",  icon: Clock,         className: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  APPROVED: { label: "Approved", icon: CheckCircle2,  className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  REJECTED: { label: "Rejected", icon: XCircle,       className: "bg-red-500/15 text-red-400 border-red-500/30" },
};

let lineKeyCounter = 0;
function nextLineKey() { return `line-${++lineKeyCounter}`; }

export function InboundDetailModal({
  allMovements,
  movement,
  warehouseCode,
  onClose,
  onUpdated,
}: Props) {
  const { currentUser } = useApp();
  const canEdit   = currentUser?.role === "Admin" || currentUser?.role === "Manager" || currentUser?.role === "Warehouse_Manager";
  const canSwitchWarehouse = currentUser?.role === "Admin" || currentUser?.role === "Manager";
  const isPending = movement.status === "PENDING";

  // All lines belonging to this receipt
  const lines = allMovements.filter((m) => m.receiptId === movement.receiptId);

  // Editing state
  const [editing, setEditing]         = useState(false);
  const [editRemark, setEditRemark]   = useState(movement.remark ?? "");
  const [editSupplierId, setEditSupplierId] = useState<string>("");
  const [partnerInitialized, setPartnerInitialized] = useState(false);
  const [editWarehouseId, setEditWarehouseId] = useState(movement.warehouseId);
  const [editAssignedUserId, setEditAssignedUserId] = useState<number | "">(movement.assignedUserId ?? "");
  const [editItems, setEditItems]     = useState<EditLineItem[]>([]);

  // Reference data for dropdowns
  const { data: refProducts = [], isLoading: refLoadingProducts } = useQuery({
    queryKey: ["products", "reference"],
    queryFn: async () => {
      const res = await api.get<any>("/products", { params: { page: 0, size: 100 } });
      const pList = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      return pList.map((p: any) => ({ sku: p.code || p.sku, name: p.name }));
    },
    staleTime: 5 * 60_000,
    enabled: editing,
  });

  const { data: refWarehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get<any>("/warehouses");
      const wList = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      return wList.map((w: any) => ({ id: String(w.id), code: w.code }));
    },
    staleTime: 10 * 60_000,
    enabled: editing,
  });

  const { data: refSuppliers = [] } = useQuery({
    queryKey: ["suppliers", "reference"],
    queryFn: async () => {
      const res = await api.get<any>("/suppliers", { params: { page: 0, size: 100 } });
      const sList = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      return sList.map((s: any) => ({ id: String(s.id), name: s.name }));
    },
    staleTime: 5 * 60_000,
    enabled: editing,
  });

  const { data: refUsers = [] } = useQuery({
    queryKey: ["users", "all"],
    queryFn: async () => {
      const res = await api.get<any>("/users");
      const uList = Array.isArray(res.data) ? res.data : (res.data?.content ?? []);
      return uList.map((u: any) => ({ id: Number(u.id), fullName: u.fullName, role: u.role, warehouseId: u.warehouseId ? String(u.warehouseId) : null }));
    },
    staleTime: 5 * 60_000,
    enabled: editing,
  });

  const refLoading = refLoadingProducts;
  const products: any[] = refProducts;
  const warehouses: any[] = refWarehouses;
  const suppliers: any[] = refSuppliers;
  const users: any[] = refUsers;

  // Action state
  const [saving, setSaving]           = useState(false);
  const [confirmAction, setConfirmAction] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);

  const statusCfg = STATUS_CONFIG[movement.status] ?? STATUS_CONFIG["PENDING"];
  const StatusIcon = statusCfg.icon;

  useEffect(() => {
    if (editing && suppliers.length > 0 && !partnerInitialized) {
      const matched = suppliers.find(s => s.name === movement.partner);
      if (matched) setEditSupplierId(matched.id);
      setPartnerInitialized(true);
    }
  }, [editing, suppliers, partnerInitialized, movement.partner]);

  function enterEditMode() {
    setEditing(true);
    setEditRemark(movement.remark ?? "");
    setEditSupplierId("");
    setPartnerInitialized(false);
    setEditWarehouseId(movement.warehouseId);
    setEditAssignedUserId(movement.assignedUserId ?? "");
    setEditItems(lines.map((l) => ({ key: nextLineKey(), sku: l.sku, qty: l.qty })));
    setError(null);
    setSaveWarning(null);
  }

  function cancelEdit() {
    setEditing(false);
    setError(null);
    setSaveWarning(null);
  }

  function addLine() {
    setEditItems((prev) => [...prev, { key: nextLineKey(), sku: "", qty: 1 }]);
    setSaveWarning(null);
  }

  function removeLine(key: string) {
    setEditItems((prev) => prev.filter((l) => l.key !== key));
    setSaveWarning(null);
  }

  function updateLine(key: string, field: "sku" | "qty", value: string | number) {
    setEditItems((prev) => prev.map((l) => l.key === key ? { ...l, [field]: value } : l));
    setSaveWarning(null);
  }

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
      toast.success(`Receipt ${status.toLowerCase()} successfully`);
    } catch (err: any) {
      const msg = getErrorMessage(err, "Failed to update status. Please try again.");
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    // Validate items
    if (editItems.length === 0) {
      setSaveWarning("At least one item is required.");
      return;
    }
    for (const item of editItems) {
      if (!item.sku) { setSaveWarning("Please select a product for all items."); return; }
      if (!item.qty || item.qty <= 0) { setSaveWarning(`Invalid quantity for product ${item.sku}.`); return; }
    }

    // Check if anything changed
    const remarkChanged = editRemark.trim() !== (movement.remark ?? "").trim();
    const originalSupplierId = suppliers.find(s => s.name === movement.partner)?.id || "";
    const partnerChanged = editSupplierId !== originalSupplierId;
    const warehouseChanged = editWarehouseId !== movement.warehouseId;
    const oldAssigned = movement.assignedUserId ? Number(movement.assignedUserId) : "";
    const newAssigned = editAssignedUserId !== "" ? Number(editAssignedUserId) : "";
    const assignedChanged = oldAssigned !== newAssigned;
    const itemsChanged = (() => {
      if (editItems.length !== lines.length) return true;
      return editItems.some((item, i) => item.sku !== lines[i].sku || item.qty !== lines[i].qty);
    })();

    if (!remarkChanged && !partnerChanged && !warehouseChanged && !assignedChanged && !itemsChanged) {
      setSaveWarning("No changes detected. Please modify at least one field before saving.");
      return;
    }

    setSaveWarning(null);
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, any> = {
        status: movement.status,
        remark: editRemark.trim() || null,
      };
      if (partnerChanged) payload.supplierId = editSupplierId ? Number(editSupplierId) : -1;
      if (warehouseChanged) payload.warehouseId = Number(editWarehouseId);
      if (assignedChanged) payload.assignedUserId = newAssigned === "" ? -1 : newAssigned;
      if (itemsChanged) {
        payload.items = editItems.map((item) => ({
          productCode: item.sku,
          quantity: item.qty,
        }));
      }

      const res = await api.patch<ReceiptMovement[]>(`/receipts/${movement.receiptId}`, payload);
      onUpdated(res.data);
      setEditing(false);
      toast.success("Receipt updated successfully");
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Failed to update receipt. Please try again.");
      setError(msg);
      toast.error(msg);
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

            {/* Assignee — editable when PENDING */}
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                <User className="size-3.5" /> Assignee
              </div>
              {editing ? (
                <select
                  value={editAssignedUserId}
                  onChange={(e) => { setEditAssignedUserId(e.target.value ? Number(e.target.value) : ""); setSaveWarning(null); }}
                  className="h-9 px-3 rounded-lg bg-input border border-border text-sm w-full text-foreground"
                  disabled={refLoading}
                >
                  <option value="">— Unassigned —</option>
                  {users
                    .filter((u) => {
                      const isStaff = u.role?.toUpperCase() === "STAFF" || u.role === "Staff";
                      if (!isStaff) return false;
                      if (editWarehouseId && u.warehouseId && String(u.warehouseId) !== String(editWarehouseId)) return false;
                      return true;
                    })
                    .map((u) => (
                      <option key={u.id} value={u.id}>{u.fullName} (Staff)</option>
                    ))}
                </select>
              ) : (
                <div className="text-sm font-medium">{movement.assignedUserName || <span className="text-muted-foreground italic">Unassigned</span>}</div>
              )}
            </div>

            {/* Warehouse — editable when PENDING */}
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                <Warehouse className="size-3.5" /> Warehouse
              </div>
              {editing ? (
                <select
                  value={editWarehouseId}
                  onChange={(e) => { setEditWarehouseId(e.target.value); setSaveWarning(null); }}
                  className={`h-9 px-3 rounded-lg bg-input border border-border text-sm w-full text-foreground ${!canSwitchWarehouse ? "opacity-60 bg-muted cursor-not-allowed" : ""}`}
                  disabled={refLoading || !canSwitchWarehouse}
                >
                  {warehouses.length === 0 && (
                    <option value={movement.warehouseId}>{warehouseCode(movement.warehouseId)}</option>
                  )}
                  {warehouses.length > 0 && editWarehouseId && !warehouses.some((w) => w.id === String(editWarehouseId)) && (
                    <option value={editWarehouseId}>{warehouseCode(String(editWarehouseId)) || editWarehouseId}</option>
                  )}
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.code}</option>
                  ))}
                </select>
              ) : (
                <div className="text-sm font-medium">{warehouseCode(movement.warehouseId)}</div>
              )}
            </div>


            <MetaRow icon={DollarSign} label="Total Amount" value={movement.totalAmount != null ? `$${movement.totalAmount.toLocaleString()}` : "—"} />

            {/* Status */}
            <div className="col-span-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Status</div>
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${statusCfg.className}`}>
                <StatusIcon className="size-3.5" />
                {statusCfg.label}
              </span>
            </div>

            {/* Partner — editable */}
            <div className="col-span-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <User className="size-3.5" /> Supplier
              </div>
              {editing ? (
                <select
                  value={editSupplierId}
                  onChange={(e) => { setEditSupplierId(e.target.value); setSaveWarning(null); }}
                  className="h-9 px-3 rounded-lg bg-input border border-border text-sm w-full text-foreground"
                  disabled={refLoading}
                >
                  <option value="">— Select supplier —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <div className="text-sm font-medium">{movement.partner || <span className="text-muted-foreground italic">Not set</span>}</div>
              )}
            </div>

            {/* Notes — editable */}
            <div className="col-span-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <FileText className="size-3.5" /> Notes
              </div>
              {editing ? (
                <textarea
                  value={editRemark}
                  onChange={(e) => { setEditRemark(e.target.value); setSaveWarning(null); }}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg bg-input border border-border text-sm text-foreground min-h-15 resize-none"
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
                    <th className="text-left px-3 py-2">{editing ? "" : "SKU"}</th>
                    {!editing && <th className="text-left px-3 py-2">Supplier</th>}
                    <th className="text-right px-3 py-2 w-20">Qty</th>
                    {editing && <th className="w-10" />}
                  </tr>
                </thead>
                <tbody>
                  {editing ? (
                    <>
                      {editItems.map((item) => {
                        const productMatch = products.find((p) => p.sku === item.sku);
                        return (
                          <tr key={item.key} className="border-t border-border/60">
                            <td className="px-3 py-2" colSpan={2}>
                              <select
                                value={item.sku}
                                onChange={(e) => updateLine(item.key, "sku", e.target.value)}
                                className="h-8 px-2 rounded-md bg-input border border-border text-sm w-full text-foreground"
                              >
                                <option value="">— Select product —</option>
                                {item.sku && !products.some((p) => p.sku === item.sku) && (
                                  <option value={item.sku}>{item.sku}</option>
                                )}
                                {products.map((p) => (
                                  <option key={p.sku} value={p.sku}>{p.name} ({p.sku})</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                min={1}
                                value={item.qty}
                                onChange={(e) => updateLine(item.key, "qty", Math.max(1, Number(e.target.value)))}
                                className="h-8 w-20 px-2 rounded-md bg-input border border-border text-sm text-right text-foreground"
                              />
                            </td>
                            <td className="px-1 py-2 text-center">
                              <button
                                onClick={() => removeLine(item.key)}
                                className="size-7 rounded-md grid place-items-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                disabled={editItems.length <= 1}
                                title="Remove item"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="border-t border-border/60">
                        <td colSpan={4} className="px-3 py-2">
                          <button
                            onClick={addLine}
                            className="h-8 px-3 rounded-md text-xs font-medium border border-dashed border-border hover:bg-secondary flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="size-3.5" /> Add item
                          </button>
                        </td>
                      </tr>
                    </>
                  ) : (
                    lines.map((line) => (
                      <tr key={line.id} className="border-t border-border/60">
                        <td className="px-3 py-2 font-medium">{line.product}</td>
                        <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{line.sku}</td>
                        <td className="px-3 py-2 text-muted-foreground">{line.partner}</td>
                        <td className="px-3 py-2 text-right font-semibold text-primary">+{line.qty}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Approval History Timeline */}
          <div className="px-6 pb-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-1.5">
              <History className="size-3.5" /> Approval History
            </div>
            
            <div className="relative border-l-2 border-border/60 ml-2 space-y-6">
              {[...(movement.history || [])]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((event, idx) => {
                  const isLatest = idx === 0;
                  
                  let ringColor = "bg-muted-foreground";
                  if (isLatest) {
                      if (event.newStatus === "COMPLETED" || event.newStatus === "APPROVED") ringColor = "bg-emerald-500";
                      else if (event.newStatus === "CANCELLED" || event.newStatus === "REJECTED") ringColor = "bg-red-500";
                      else if (event.newStatus === "IN_PROGRESS" || event.newStatus === "DELIVERING") ringColor = "bg-warning";
                      else ringColor = "bg-blue-500";
                  }

                  return (
                    <div key={event.id} className="relative pl-6">
                      <div className={`absolute -left-2.25 top-1 size-4 rounded-full border-[3px] border-background ${ringColor}`} />
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-foreground">
                            {event.newStatus === 'APPROVED' ? 'Approved' : 
                             event.newStatus === 'REJECTED' ? 'Rejected' : 
                             event.newStatus === 'COMPLETED' ? 'Completed' :
                             event.newStatus === 'PENDING' ? 'Created (Draft)' :
                             event.newStatus}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            By: <strong className="text-foreground">{event.approverName}</strong>
                          </div>
                          {event.note && (
                            <div className="text-xs mt-0.5 text-muted-foreground italic">
                              "{event.note}"
                            </div>
                          )}
                        </div>
                        <div className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 bg-secondary px-2 py-1 rounded-md">
                          <Clock className="size-3" /> {new Date(event.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              {(!movement.history || movement.history.length === 0) && (
                <div className="text-sm text-muted-foreground italic pl-4">No history recorded</div>
              )}
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
                  onClick={cancelEdit}
                  className="h-9 px-4 rounded-lg text-sm border border-border hover:bg-secondary"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || refLoading}
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
                {canEdit && isPending && (
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
                {canEdit && isPending && (
                  <button
                    onClick={enterEditMode}
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
