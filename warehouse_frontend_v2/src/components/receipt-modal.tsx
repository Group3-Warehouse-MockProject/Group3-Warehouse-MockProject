import { useEffect, useMemo, useState } from "react";
import { X, Plus, Trash2, PackagePlus, PackageMinus, Loader2 } from "lucide-react";
import { formatVND } from "@/lib/warehouse-data";
import { useApp } from "@/lib/app-context";
import { api } from "@/lib/api";
import { BarcodeScanner } from "./barcode-scanner";

export type ReceiptType = "Inbound" | "Outbound";

interface LineItem {
  id: string;
  sku: string;
  qty: number;
}

interface ProductOption {
  sku: string;
  name: string;
  cost: number;
  price: number;
  warehouseId: string;
  stock?: number;
}

interface WarehouseOption {
  id: string;
  code: string;
  city: string;
}

interface SupplierOption {
  id: string;
  name: string;
}

interface UserOption {
  id: number;
  fullName: string;
  role: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  type: ReceiptType;
  onSaved?: () => void; // callback to refresh parent list
}

export function ReceiptModal({ open, onClose, type, onSaved }: Props) {
  const { currentUser, activeWarehouseId } = useApp();
  const isInbound = type === "Inbound";

  // Remote data
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Form state
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [partner, setPartner] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [assignedStaff, setAssignedStaff] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [lines, setLines] = useState<LineItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lineErrors, setLineErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch reference data when modal opens
  useEffect(() => {
    if (!open) return;
    setDataLoading(true);
    setSubmitError(null);

    Promise.all([
      api.get<WarehouseOption[]>("/warehouses"),
      api.get<ProductOption[]>("/products"),
      api.get<SupplierOption[]>("/suppliers"),
      api.get<UserOption[]>("/users"),
    ])
      .then(([wRes, pRes, sRes, uRes]) => {
        setWarehouses(wRes.data);
        setProducts(pRes.data);
        setSuppliers(sRes.data);
        setUsers(uRes.data);
        // Default warehouse
        const defaultWh = activeWarehouseId ?? wRes.data[0]?.id ?? "";
        setWarehouseId(defaultWh);

        if (!isInbound) {
          setReference("ORD-" + Math.floor(100000 + Math.random() * 900000));
        }
      })
      .catch(() => setSubmitError("Failed to load form data. Please try again."))
      .finally(() => setDataLoading(false));
  }, [open, activeWarehouseId]);

  // Filter products to selected warehouse
  const skuList = useMemo(
    () => products.filter((p) => p.warehouseId === warehouseId),
    [products, warehouseId],
  );

  const total = lines.reduce((s, l) => {
    const p = products.find((x) => x.sku === l.sku);
    if (!p) return s;
    const unit = isInbound ? p.cost : p.price;
    return s + unit * (l.qty || 0);
  }, 0);

  if (!open) return null;

  const handleScan = (barcode: string) => {
    const product = products.find((p) => p.sku.toLowerCase() === barcode.toLowerCase());
    if (!product) {
      alert(`Barcode ${barcode} not found in catalog.`);
      return;
    }
    if (product.warehouseId !== warehouseId) {
      alert(`Product ${barcode} does not belong to selected warehouse.`);
      return;
    }
    setLines((prevLines) => {
      const existingLine = prevLines.find((l) => l.sku === product.sku);
      if (existingLine) {
        return prevLines.map((l) =>
          l.sku === product.sku ? { ...l, qty: l.qty + 1 } : l,
        );
      }
      const emptyLineIndex = prevLines.findIndex((l) => !l.sku);
      if (emptyLineIndex >= 0) {
        const newLines = [...prevLines];
        newLines[emptyLineIndex] = { ...newLines[emptyLineIndex], sku: product.sku, qty: 1 };
        return newLines;
      }
      return [...prevLines, { id: crypto.randomUUID(), sku: product.sku, qty: 1 }];
    });
  };

  const addLine = () => setLines((l) => [...l, { id: crypto.randomUUID(), sku: "", qty: 1 }]);
  const removeLine = (id: string) => setLines((l) => l.filter((x) => x.id !== id));
  const updateLine = (id: string, patch: Partial<LineItem>) =>
    setLines((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const reset = () => {
    setLines([]);
    setPartner("");
    setReference("");
    setAssignedStaff("");
    setNote("");
    setSubmitError(null);
    setLineErrors({});
    setFormError(null);
  };

  /** Validate all lines, return true if valid */
  function validateLines(): boolean {
    const errors: Record<string, string> = {};
    const seenSkus: Record<string, string> = {}; // sku -> first lineId

    if (lines.length === 0) {
      setFormError("Please add at least one product line.");
      return false;
    }

    const allEmpty = lines.every((l) => !l.sku);
    if (allEmpty) {
      setFormError("Please select a product for at least one line.");
      return false;
    }

    lines.forEach((l) => {
      if (!l.sku) {
        errors[l.id] = "Product is required.";
        return;
      }
      if (l.qty <= 0) {
        errors[l.id] = "Quantity must be at least 1.";
        return;
      }
      if (!Number.isInteger(l.qty)) {
        errors[l.id] = "Quantity must be a whole number.";
        return;
      }
      if (seenSkus[l.sku]) {
        errors[l.id] = `Duplicate product — already added in another line.`;
        errors[seenSkus[l.sku]] = `Duplicate product — already added in another line.`;
      } else {
        seenSkus[l.sku] = l.id;
      }
    });

    setLineErrors(errors);
    setFormError(Object.keys(errors).length > 0 ? "Please fix the errors in the items table below." : null);
    return Object.keys(errors).length === 0;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setLineErrors({});

    if (!validateLines()) return;

    const validLines = lines.filter((l) => l.sku && l.qty > 0);

    setSubmitting(true);
    setSubmitError(null);

    try {
      await api.post("/receipts", {
        warehouseId: Number(warehouseId),
        type: isInbound ? "INBOUND" : "OUTBOUND",
        partner: partner || null,
        remark: [
          reference ? `Ref: ${reference}` : "",
          assignedStaff ? `Assignee: ${assignedStaff}` : "",
          note
        ].filter(Boolean).join(" | ") || null,
        items: validLines.map((l) => ({
          productCode: l.sku,
          quantity: l.qty,
        })),
      });

      reset();
      onClose();
      onSaved?.();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data;
      const msg =
        typeof data === "string"
          ? data
          : typeof data === "object" && data !== null && "message" in data
          ? String((data as { message: string }).message)
          : "Failed to save receipt. Please try again.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/70 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl surface-card shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div
              className="size-10 rounded-lg grid place-items-center"
              style={{
                background: isInbound
                  ? "color-mix(in oklab, var(--primary) 15%, transparent)"
                  : "color-mix(in oklab, var(--accent) 15%, transparent)",
                color: isInbound ? "var(--primary)" : "var(--accent)",
              }}
            >
              {isInbound ? <PackagePlus className="size-5" /> : <PackageMinus className="size-5" />}
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {isInbound ? "New inbound receipt" : "New outbound order"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {isInbound
                  ? "Record goods received from a supplier"
                  : "Prepare goods for shipment to a customer"}
              </p>
            </div>
          </div>
          <button
            onClick={() => { reset(); onClose(); }}
            className="size-9 rounded-lg hover:bg-secondary grid place-items-center"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {dataLoading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm">Loading form data…</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Warehouse">
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    className="input"
                    disabled={!!activeWarehouseId && currentUser?.role !== "Admin" && currentUser?.role !== "Manager"}
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.code} — {w.city}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Date">
                  <input
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="input"
                    readOnly
                  />
                </Field>
                <Field label={isInbound ? "Supplier" : "Customer"}>
                  {isInbound ? (
                    <select
                      value={partner}
                      onChange={(e) => setPartner(e.target.value)}
                      className="input"
                      required
                    >
                      <option value="">Select supplier…</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.name}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={partner}
                      onChange={(e) => setPartner(e.target.value)}
                      className="input"
                      placeholder="Customer / retailer name"
                      required
                    />
                  )}
                </Field>
                {!isInbound && (
                  <Field label="Order reference #">
                    <input
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="input"
                      placeholder="ORD-…"
                    />
                  </Field>
                )}
                {!isInbound && (
                  <Field label="Assign to Staff">
                    <select
                      value={assignedStaff}
                      onChange={(e) => setAssignedStaff(e.target.value)}
                      className="input"
                    >
                      <option value="">Select staff member…</option>
                      {users
                        .filter((u) => u.role === "STAFF" || u.role === "WAREHOUSE_MANAGER")
                        .map((u) => (
                          <option key={u.id} value={u.fullName}>
                            {u.fullName} — {u.role === "STAFF" ? "Staff" : "Warehouse Manager"}
                          </option>
                        ))}
                    </select>
                  </Field>
                )}
              </div>


              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <div className="text-sm font-medium">Items</div>
                  <BarcodeScanner onScan={handleScan} />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={addLine}
                    className="inline-flex items-center gap-1 text-xs px-2.5 h-8 rounded-md border border-border hover:bg-secondary"
                  >
                    <Plus className="size-3.5" /> Manual entry
                  </button>
                </div>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="text-left px-3 py-2">Product</th>
                        {!isInbound && <th className="text-right px-3 py-2 w-32">System Stock</th>}
                        <th className="text-right px-3 py-2 w-24">Qty</th>
                        <th className="text-right px-3 py-2 w-40">
                          {isInbound ? "Unit cost" : "Unit price"}
                        </th>
                        <th className="text-right px-3 py-2 w-40">Subtotal</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line) => {
                        const p = products.find((x) => x.sku === line.sku);
                        const unit = p ? (isInbound ? p.cost : p.price) : 0;
                        const subtotal = unit * (line.qty || 0);
                        const lineErr = lineErrors[line.id];
                        return (
                          <>
                            <tr key={line.id} className={`border-t border-border/60 ${lineErr ? "bg-destructive/5" : ""}`}>
                              <td className="px-3 py-2">
                                <select
                                  value={line.sku}
                                  onChange={(e) => { updateLine(line.id, { sku: e.target.value }); setLineErrors((prev) => { const n = { ...prev }; delete n[line.id]; return n; }); }}
                                  className={`input h-9 ${lineErr && !line.sku ? "border-destructive" : ""}`}
                                >
                                  <option value="">Select product…</option>
                                  {skuList.map((p) => (
                                    <option key={p.sku} value={p.sku}>
                                      {p.sku} — {p.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              {!isInbound && (
                                <td className="px-3 py-2 text-right font-medium text-muted-foreground">
                                  {p?.stock ?? 0}
                                </td>
                              )}
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min={1}
                                  value={line.qty}
                                  onChange={(e) => { updateLine(line.id, { qty: Number(e.target.value) }); setLineErrors((prev) => { const n = { ...prev }; delete n[line.id]; return n; }); }}
                                  className={`input h-9 text-right ${lineErr && line.sku && line.qty <= 0 ? "border-destructive" : ""}`}
                                />
                              </td>
                              <td className="px-3 py-2 text-right text-muted-foreground">
                                {p ? formatVND(unit) : "—"}
                              </td>
                              <td className="px-3 py-2 text-right font-medium">
                                {p ? formatVND(subtotal) : "—"}
                              </td>
                              <td className="px-2">
                                <button
                                  type="button"
                                  onClick={() => { removeLine(line.id); setLineErrors((prev) => { const n = { ...prev }; delete n[line.id]; return n; }); }}
                                  className="size-8 rounded-md hover:bg-destructive/10 hover:text-destructive grid place-items-center text-muted-foreground"
                                  aria-label="Remove line"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </td>
                            </tr>
                            {lineErr && (
                              <tr key={`${line.id}-err`} className="bg-destructive/5">
                                <td colSpan={isInbound ? 5 : 6} className="px-3 pb-2">
                                  <p className="text-xs text-destructive">{lineErr}</p>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border bg-secondary/30">
                        <td className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground" colSpan={isInbound ? 3 : 4}>
                          Total
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-gradient">
                          {formatVND(total)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <Field label="Notes">
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="input min-h-[64px] py-2"
                  placeholder="Optional remarks for warehouse staff…"
                />
              </Field>

              {(formError || submitError) && (
                <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 space-y-0.5">
                  {formError && <p>{formError}</p>}
                  {submitError && <p>{submitError}</p>}
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Created by <span className="text-foreground font-medium">{currentUser?.name}</span> ({currentUser?.title})
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-secondary/20">
              <button
                type="button"
                onClick={() => { reset(); onClose(); }}
                className="h-10 px-4 rounded-lg text-sm border border-border hover:bg-secondary"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground glow-ring flex items-center gap-2"
                style={{ background: "var(--gradient-primary)" }}
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {isInbound ? "Save receipt" : "Save order"}
              </button>
            </div>
          </form>
        )}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
      {children}
    </label>
  );
}
