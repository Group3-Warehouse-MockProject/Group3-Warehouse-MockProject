import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CreditCard,
  FileText,
  Loader2,
  Package,
  QrCode,
  Receipt,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/lib/app-context";
import { api } from "@/lib/api";
import { buildBankTransferQrUrl, BANK_ACCOUNT_NUMBER } from "@/lib/payment";
import { formatVND } from "@/lib/warehouse-data";
import { type ReceiptMovement } from "@/types";
import type { PaymentRecord } from "@/components/outbound-detail-modal";

export const Route = createFileRoute("/outbound-payment/$receiptId")({
  head: () => ({ meta: [{ title: "Record Payment — TechStock" }] }),
  component: RecordPaymentPage,
});

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  CARD: "Card",
  OTHER: "Other",
};

function parseRemark(remark?: string) {
  if (!remark) return { reference: "", note: "" };
  const parts = remark.split(" | ");
  let reference = "";
  let note = "";
  for (const part of parts) {
    if (part.startsWith("Ref: ")) reference = part.replace("Ref: ", "");
    else if (!part.startsWith("Assignee: ")) note = part;
  }
  return { reference, note };
}

function RecordPaymentPage() {
  const { receiptId } = Route.useParams();
  const { currentUser } = useApp();
  const [movements, setMovements] = useState<ReceiptMovement[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [receiptResponse, paymentResponse] = await Promise.all([
        api.get<ReceiptMovement[]>(`/receipts/${receiptId}`),
        api.get<PaymentRecord[]>(`/receipts/${receiptId}/payments`),
      ]);
      const nextMovements = receiptResponse.data ?? [];
      if (!nextMovements.length) {
        setError("This outbound receipt could not be found.");
        return;
      }
      setMovements(nextMovements);
      setPayments(paymentResponse.data ?? []);
      const nextMovement = nextMovements[0];
      setAmount(String(Math.max(0, (nextMovement.totalAmount ?? 0) - (nextMovement.paidAmount ?? 0))));
    } catch (err: any) {
      setError(err.response?.status === 403 ? "You do not have permission to record this payment." : "Failed to load payment details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [receiptId]);

  const movement = movements[0] ?? null;
  const parsed = parseRemark(movement?.remark);
  const displayId = parsed.reference || `R-${receiptId}`;
  const totalAmount = movement?.totalAmount ?? 0;
  const paidAmount = movement?.paidAmount ?? 0;
  const remainingAmount = Math.max(0, totalAmount - paidAmount);
  const amountNumber = Number(amount);
  const isAmountValid = Number.isInteger(amountNumber) && amountNumber > 0 && amountNumber <= remainingAmount;
  const transferContent = `Thanh toan ${displayId}`;
  const qrUrl = isAmountValid ? buildBankTransferQrUrl(amountNumber, transferContent) : null;
  const canRecordPayment = ["Admin", "Manager", "Warehouse_Manager"].includes(currentUser?.role ?? "");
  const canPay = movement?.type === "Outbound"
    && (movement.status === "APPROVED" || movement.status === "COMPLETED")
    && canRecordPayment;

  const sortedPayments = useMemo(
    () => [...payments].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
    [payments],
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!isAmountValid) {
      setError(`Enter a whole VND amount between 1 and ${formatVND(remainingAmount)}.`);
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/receipts/${receiptId}/payments`, {
        amount: amountNumber,
        paymentMethod: method,
        note: note || null,
      });
      setSuccess(true);
      setNote("");
      await loadData();
    } catch (err: any) {
      setError(typeof err.response?.data === "string" ? err.response.data : "Failed to record payment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <AppShell><LoadingState /></AppShell>;
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/outbound"
              className="size-10 rounded-xl border border-border bg-secondary grid place-items-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Back to outbound"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Outbound</span><ChevronRight className="size-3" /><span>Payment workspace</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mt-1">Record payment</h1>
              <p className="text-sm text-muted-foreground mt-1">Review the order and confirm the customer payment securely.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary">
            <ShieldCheck className="size-4" /> Secure payment record
          </div>
        </div>

        {success && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            <div className="flex items-center gap-2"><CheckCircle2 className="size-4" /> Payment recorded successfully.</div>
            <Link to="/outbound" className="font-medium underline underline-offset-2">Back to outbound</Link>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <CircleAlert className="size-4 mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}

        {!movement ? (
          <div className="surface-card p-10 text-center">
            <Receipt className="mx-auto size-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">No payment details are available for this receipt.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_390px] gap-5 items-start">
            <div className="space-y-5">
              <section className="surface-card p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground"><Receipt className="size-3.5" /> Payment for</div>
                    <h2 className="mt-2 text-xl font-semibold font-mono">{displayId}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{movement.partner} · {movement.createdAt}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${canPay ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-amber-500/30 bg-amber-500/10 text-amber-400"}`}>
                    {movement.status}
                  </span>
                </div>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <SummaryCard label="Order total" value={formatVND(totalAmount)} icon={<Banknote className="size-4" />} />
                  <SummaryCard label="Already paid" value={formatVND(paidAmount)} icon={<CheckCircle2 className="size-4" />} tone="success" />
                  <SummaryCard label="Remaining" value={formatVND(remainingAmount)} icon={<Receipt className="size-4" />} tone="warning" />
                </div>
              </section>

              <section className="surface-card p-5 md:p-6">
                <div className="flex items-center gap-2"><Package className="size-4 text-primary" /><h2 className="font-semibold">Order items</h2></div>
                <div className="mt-4 overflow-x-auto rounded-xl border border-border/70">
                  <div className="min-w-[420px]">
                  <div className="grid grid-cols-[minmax(120px,1fr)_minmax(180px,2fr)_90px] gap-3 bg-secondary/40 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <div>Product code</div>
                    <div>Product name</div>
                    <div className="text-right">Quantity</div>
                  </div>
                  <div className="divide-y divide-border/60">
                    {movements.map((line) => (
                      <div key={line.id} className="grid grid-cols-[minmax(120px,1fr)_minmax(180px,2fr)_90px] items-center gap-3 bg-secondary/20 px-4 py-3">
                        <div className="truncate font-mono text-xs text-muted-foreground">{line.sku}</div>
                        <div className="truncate font-medium">{line.product}</div>
                        <div className="text-right font-semibold text-primary">{line.qty}</div>
                      </div>
                    ))}
                  </div>
                  </div>
                </div>
                {parsed.note && <div className="mt-4 rounded-lg bg-secondary/40 px-3 py-2 text-xs text-muted-foreground"><FileText className="inline size-3.5 mr-1" />{parsed.note}</div>}
              </section>

              <section className="surface-card p-5 md:p-6">
                <div className="flex items-center gap-2"><Receipt className="size-4 text-primary" /><h2 className="font-semibold">Payment history</h2></div>
                {sortedPayments.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">No payments recorded yet.</p>
                ) : (
                  <div className="mt-4 space-y-2">
                    {sortedPayments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-secondary/20 px-3 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0"><PaymentIcon method={payment.paymentMethod} /></div>
                          <div className="min-w-0"><div className="font-medium">{formatVND(payment.amount)}</div><div className="text-xs text-muted-foreground truncate">{PAYMENT_METHOD_LABEL[payment.paymentMethod] ?? payment.paymentMethod} · {payment.createdBy}</div></div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground shrink-0">{payment.createdAt}</div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <aside className="space-y-5 xl:sticky xl:top-24">
              <section className="surface-card overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                  <div className="flex items-center gap-2"><QrCode className="size-4 text-primary" /><h2 className="font-semibold">Payment details</h2></div>
                  <p className="text-xs text-muted-foreground mt-1">Choose a method and confirm the amount.</p>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground">Amount to record</label>
                    <div className="relative mt-1.5"><input type="number" min={1} max={remainingAmount} step={1} value={amount} onChange={(event) => { setAmount(event.target.value); setSuccess(false); }} className="w-full h-12 rounded-xl border border-border bg-input px-4 pr-12 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-ring/40" required /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">VND</span></div>
                    <p className="text-xs text-muted-foreground mt-1.5">Up to {formatVND(remainingAmount)} remaining</p>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground">Payment method</label>
                    <select value={method} onChange={(event) => setMethod(event.target.value)} className="mt-1.5 w-full h-11 rounded-xl border border-border bg-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40">
                      <option value="BANK_TRANSFER">Bank transfer</option><option value="CASH">Cash</option><option value="CARD">Card</option><option value="OTHER">Other</option>
                    </select>
                  </div>

                  {method === "BANK_TRANSFER" && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                      <div className="flex items-center justify-between gap-2 text-xs"><span className="font-medium text-primary">Scan VietQR</span><span className="text-muted-foreground">MB</span></div>
                      {qrUrl ? <img src={qrUrl} alt={`VietQR payment for ${formatVND(amountNumber)}`} className="mx-auto mt-3 aspect-square w-full max-w-[250px] rounded-xl bg-white p-2 object-contain" /> : <div className="mt-3 flex aspect-square w-full max-w-[250px] mx-auto items-center justify-center rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-5 text-center text-xs text-amber-400">Enter a valid amount up to {formatVND(remainingAmount)} to generate the QR.</div>}
                      <div className="mt-3 space-y-1.5 text-xs"><InfoRow label="Account" value={BANK_ACCOUNT_NUMBER} /><InfoRow label="Amount" value={isAmountValid ? formatVND(amountNumber) : "—"} /><InfoRow label="Content" value={transferContent} /></div>
                      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">Your banking app will verify the recipient name from the MB account when scanned.</p>
                    </div>
                  )}

                  <div><label className="text-xs uppercase tracking-wider text-muted-foreground">Internal note <span className="normal-case">(optional)</span></label><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-border bg-input px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring/40" placeholder="Add a note about this payment…" /></div>
                  <button type="submit" disabled={submitting || remainingAmount === 0 || !canPay} className="w-full h-11 rounded-xl text-sm font-semibold text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed glow-ring" style={{ background: "var(--gradient-primary)" }}>{submitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}{remainingAmount === 0 ? "Fully paid" : !canPay ? "Payment unavailable" : "Confirm payment"}</button>
                </form>
              </section>

              <div className="flex items-start gap-2 rounded-xl border border-border/70 bg-secondary/30 px-3 py-3 text-xs text-muted-foreground"><Building2 className="size-4 text-primary shrink-0" /><span>Payment records are linked to {displayId} and are visible to authorized warehouse users.</span></div>
            </aside>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function LoadingState() {
  return <div className="flex min-h-[50vh] items-center justify-center gap-3 text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin" />Loading payment workspace…</div>;
}

function SummaryCard({ label, value, icon, tone = "primary" }: { label: string; value: string; icon: React.ReactNode; tone?: "primary" | "success" | "warning" }) {
  const toneClass = tone === "success" ? "text-emerald-400 bg-emerald-500/10" : tone === "warning" ? "text-amber-400 bg-amber-500/10" : "text-primary bg-primary/10";
  return <div className="rounded-xl border border-border/70 bg-secondary/20 p-3"><div className={`size-8 rounded-lg grid place-items-center ${toneClass}`}>{icon}</div><div className="mt-3 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div><div className="mt-1 text-sm font-semibold">{value}</div></div>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">{label}</span><span className="font-medium text-right break-all">{value}</span></div>;
}

function PaymentIcon({ method }: { method: string }) {
  if (method === "BANK_TRANSFER") return <QrCode className="size-4" />;
  if (method === "CARD") return <CreditCard className="size-4" />;
  if (method === "CASH") return <Wallet className="size-4" />;
  return <Banknote className="size-4" />;
}
