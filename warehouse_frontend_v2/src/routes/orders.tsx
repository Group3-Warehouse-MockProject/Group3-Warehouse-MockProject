import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { orders, formatVND, warehouseCode } from "@/lib/warehouse-data";
import { useApp } from "@/lib/app-context";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "Orders — TechStock" }] }),
  component: OrdersPage,
});

const statusTone: Record<string, string> = {
  Pending: "bg-warning/15 text-warning",
  Shipping: "bg-primary/15 text-primary",
  Completed: "bg-success/15 text-success",
  Cancelled: "bg-destructive/15 text-destructive",
};

function OrdersPage() {
  const { activeWarehouseId } = useApp();
  const list = activeWarehouseId ? orders.filter((o) => o.warehouseId === activeWarehouseId) : orders;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">B2B & retail orders fulfillment</p>
        </div>

        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40">
                <tr>
                  <th className="text-left p-4">Order #</th>
                  <th className="text-left p-4">Customer</th>
                  <th className="text-left p-4">Warehouse</th>
                  <th className="text-left p-4">Date</th>
                  <th className="text-left p-4">Created by</th>
                  <th className="text-left p-4">Assigned to</th>
                  <th className="text-right p-4">Items</th>
                  <th className="text-right p-4">Total</th>
                  <th className="text-center p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((o) => (
                  <tr key={o.id} className="border-t border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="p-4 font-mono text-xs">{o.id}</td>
                    <td className="p-4 font-medium">{o.customer}</td>
                    <td className="p-4 font-mono text-xs">{warehouseCode(o.warehouseId)}</td>
                    <td className="p-4 text-muted-foreground">{o.date}</td>
                    <td className="p-4">{o.createdBy}</td>
                    <td className="p-4">{o.assignedTo}</td>
                    <td className="p-4 text-right">{o.items}</td>
                    <td className="p-4 text-right font-semibold">{formatVND(o.total)}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusTone[o.status]}`}>{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
