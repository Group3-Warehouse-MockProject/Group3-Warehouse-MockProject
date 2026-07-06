import { useEffect, useMemo, useState } from "react";
import { X, Plus, Trash2, PackagePlus, PackageMinus } from "lucide-react";
import { products, suppliers, warehouses, formatVND } from "@/lib/warehouse-data";
import { useApp } from "@/lib/app-context";

export type ReceiptType = "Inbound" | "Outbound";

interface LineItem {
  id: string;
  sku: string;
  qty: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  type: ReceiptType;
}

export function ReceiptModal({ open, onClose, type }: Props) {
  const { currentUser, activeWarehouseId } = useApp();
  const isInbound = type === "Inbound";

  const [warehouseId, setWarehouseId] = useState<string>(activeWarehouseId ?? warehouses[0].id);
  const [partner, setPartner] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState<string>("");
  const [lines, setLines] = useState<LineItem[]>([
    { id: crypto.randomUUID(), sku: "", qty: 1 },
  ]);

  useEffect(() => {
    if (open) setWarehouseId(activeWarehouseId ?? warehouses[0].id);
  }, [open, activeWarehouseId]);

  const skuList = useMemo(
    () => products.filter((p) => p.warehouseId === warehouseId),
    [warehouseId],
  );

  const total = lines.reduce((s, l) => {
    const p = products.find((x) => x.sku === l.sku);
    if (!p) return s;
    const unit = isInbound ? p.cost : p.price;
    return s + unit * (l.qty || 0);
  }, 0);

  if (!open) return null;

  const addLine = () =>
    setLines((l) => [...l, { id: crypto.randomUUID(), sku: "", qty: 1 }]);
  const removeLine = (id: string) =>
    setLines((l) => (l.length === 1 ? l : l.filter((x) => x.id !== id)));
  const updateLine = (id: string, patch: Partial<LineItem>) =>
    setLines((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // UI-only mock — close and reset
    onClose();
    setLines([{ id: crypto.randomUUID(), sku: "", qty: 1 }]);
    setPartner("");
    setReference("");
    setNote("");
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
            onClick={onClose}
            className="size-9 rounded-lg hover:bg-secondary grid place-items-center"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Warehouse">
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="input"
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
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input"
                  required
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
              <Field label={isInbound ? "PO / Invoice #" : "Order reference #"}>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="input"
                  placeholder={isInbound ? "PO-2026-…" : "ORD-…"}
                />
              </Field>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">Items</div>
                <button
                  type="button"
                  onClick={addLine}
                  className="inline-flex items-center gap-1 text-xs px-2.5 h-8 rounded-md border border-border hover:bg-secondary"
                >
                  <Plus className="size-3.5" /> Add line
                </button>
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2">Product</th>
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
                      return (
                        <tr key={line.id} className="border-t border-border/60">
                          <td className="px-3 py-2">
                            <select
                              value={line.sku}
                              onChange={(e) => updateLine(line.id, { sku: e.target.value })}
                              className="input h-9"
                              required
                            >
                              <option value="">Select product…</option>
                              {skuList.map((p) => (
                                <option key={p.sku} value={p.sku}>
                                  {p.sku} — {p.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={1}
                              value={line.qty}
                              onChange={(e) =>
                                updateLine(line.id, { qty: Number(e.target.value) })
                              }
                              className="input h-9 text-right"
                              required
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
                              onClick={() => removeLine(line.id)}
                              className="size-8 rounded-md hover:bg-destructive/10 hover:text-destructive grid place-items-center text-muted-foreground"
                              aria-label="Remove line"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-secondary/30">
                      <td className="px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground" colSpan={3}>
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

            <div className="text-xs text-muted-foreground">
              Created by <span className="text-foreground font-medium">{currentUser.name}</span> ({currentUser.title})
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-secondary/20">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg text-sm border border-border hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground glow-ring"
              style={{ background: "var(--gradient-primary)" }}
            >
              {isInbound ? "Save receipt" : "Save order"}
            </button>
          </div>
        </form>
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
