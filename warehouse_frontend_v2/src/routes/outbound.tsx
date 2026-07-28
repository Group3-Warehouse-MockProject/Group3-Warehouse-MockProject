import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { AppShell } from "@/components/app-shell";
import { ReceiptModal } from "@/components/receipt-modal";
import { OutboundDetailModal } from "@/components/outbound-detail-modal";
import { useApp } from "@/lib/app-context";
import { api } from "@/lib/api";
import { formatVND } from "@/lib/warehouse-data";
import { ReceiptMovement } from "@/types";
import {
  ClipboardList,
  TrendingUp,
  Clock,
  Truck,
  Plus,
  Eye,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Ban,
} from "lucide-react";

export const Route = createFileRoute("/outbound")({
  head: () => ({ meta: [{ title: "Outbound Orders — TechStock" }] }),
  component: OutboundPage,
});

interface WarehouseInfo {
  id: string;
  code: string;
}

interface ProductInfo {
  sku: string;
  name: string;
  price: number;
  stock: number;
  warehouseId: string;
}

const PAYMENT_STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  PAID: {
    label: "Paid",
    className:
      "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  PARTIAL: {
    label: "Partial",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  UNPAID: {
    label: "Unpaid",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
};

function PaymentStatusBadge({ status }: { status?: string }) {
  const cfg =
    PAYMENT_STATUS_CONFIG[status ?? "UNPAID"] ??
    PAYMENT_STATUS_CONFIG.UNPAID;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

function parseRemark(remark?: string) {
  if (!remark) {
    return {
      reference: "",
      assignee: "",
      note: "",
    };
  }

  const parts = remark.split(" | ");
  let reference = "";
  let assignee = "";
  let note = "";

  parts.forEach((part) => {
    if (part.startsWith("Ref: ")) {
      reference = part.replace("Ref: ", "");
    } else if (part.startsWith("Assignee: ")) {
      assignee = part.replace("Assignee: ", "");
    } else {
      note = part;
    }
  });

  return {
    reference,
    assignee,
    note,
  };
}

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    icon: React.ElementType;
    className: string;
  }
> = {
  PENDING: {
    label: "Pending",
    icon: Clock,
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  APPROVED: {
    label: "Approved",
    icon: CheckCircle2,
    className:
      "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  COMPLETED: {
    label: "Completed",
    icon: Truck,
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: Ban,
    className: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  },
};

function StatusBadge({ status }: { status?: string }) {
  const cfg =
    STATUS_CONFIG[status ?? ""] ??
    STATUS_CONFIG.PENDING;

  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.className}`}
    >
      <Icon className="size-3" />
      {cfg.label}
    </span>
  );
}

interface Filters {
  warehouse: string;
  status: string;
  paymentStatus: string;
  staff: string;
  dateFrom: string;
  dateTo: string;
}

const DEFAULT_FILTERS: Filters = {
  warehouse: "",
  status: "",
  paymentStatus: "",
  staff: "",
  dateFrom: "",
  dateTo: "",
};

function OutboundPage() {
  const { activeWarehouseId, refreshTick } = useApp();

  const [movements, setMovements] = useState<ReceiptMovement[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseInfo[]>([]);
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);

  const limit = 15;

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);

  const filterRef = useRef<HTMLDivElement>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] =
    useState<ReceiptMovement | null>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setFilterOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, []);

  useEffect(() => {
    Promise.all([
      api.get<WarehouseInfo[]>("/warehouses"),
      api.get<{ content: ProductInfo[] }>("/products", {
        params: {
          page: 0,
          size: 15,
        },
      }),
    ])
      .then(([warehouseResponse, productResponse]) => {
        setWarehouses(warehouseResponse.data);
        setProducts(
          productResponse.data?.content ??
            (productResponse.data as unknown as ProductInfo[])
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchReceipts(page);
  }, [page, activeWarehouseId, refreshTick]);

  function fetchReceipts(currentPage: number = page) {
    setLoading(true);
    setError(null);

    const params: Record<string, string | number> = {
      type: "OUTBOUND",
      page: currentPage,
      size: limit,
    };

    if (activeWarehouseId) {
      params.warehouseIdParam = activeWarehouseId;
    }

    api
      .get<{
        content: ReceiptMovement[];
        totalPages: number;
        totalElements: number;
      }>("/receipts", { params })
      .then((response) => {
        setMovements(
          response.data?.content ??
            (response.data as unknown as ReceiptMovement[])
        );
        setTotalPages(response.data?.totalPages ?? 1);
        setTotalElements(response.data?.totalElements ?? 0);
      })
      .catch(() => {
        setError("Failed to load outbound requests. Please try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function handleUpdated(updated: ReceiptMovement[]) {
    if (!updated.length) return;

    const receiptId = updated[0].receiptId;

    setMovements((previous) =>
      [...previous.filter((item) => item.receiptId !== receiptId), ...updated]
        .sort((a, b) => {
          const timeA = a.createdAt || "";
          const timeB = b.createdAt || "";

          const timeComparison = timeB.localeCompare(timeA);

          if (timeComparison !== 0) {
            return timeComparison;
          }

          return b.id.localeCompare(a.id);
        })
    );

    setSelectedMovement((previous) =>
      previous?.receiptId === receiptId ? updated[0] : previous
    );
  }

  function handleDeleted(receiptId: number) {
    setMovements((previous) =>
      previous.filter((item) => item.receiptId !== receiptId)
    );
  }

  const warehouseCode = (id: string) =>
    warehouses.find((warehouse) => warehouse.id === id)?.code ?? id;

  const staffOptions = useMemo(
    () => [...new Set(movements.map((movement) => movement.staff))].sort(),
    [movements]
  );

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const dateRangeError =
    filters.dateFrom !== "" &&
    filters.dateTo !== "" &&
    filters.dateFrom > filters.dateTo
      ? '"From" date must be on or before "To" date'
      : null;

  const filteredMovements = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return movements.filter((movement) => {
      if (query) {
        const { reference, assignee } = parseRemark(movement.remark);
        const receiptNumber = `r-${movement.receiptId}`;
        const finalAssignee =
          movement.assignedUserName || assignee || "";

        if (
          !receiptNumber.includes(query) &&
          !movement.product.toLowerCase().includes(query) &&
          !movement.sku.toLowerCase().includes(query) &&
          !movement.partner.toLowerCase().includes(query) &&
          !reference.toLowerCase().includes(query) &&
          !finalAssignee.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      if (
        filters.warehouse &&
        movement.warehouseId !== filters.warehouse
      ) {
        return false;
      }

      if (filters.status && movement.status !== filters.status) {
        return false;
      }

      if (
        filters.paymentStatus &&
        movement.paymentStatus !== filters.paymentStatus
      ) {
        return false;
      }

      if (filters.staff && movement.staff !== filters.staff) {
        return false;
      }

      if (filters.dateFrom && movement.date < filters.dateFrom) {
        return false;
      }

      if (filters.dateTo && movement.date > filters.dateTo) {
        return false;
      }

      return true;
    });
  }, [movements, searchQuery, filters]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, filters]);

  const uniqueReceiptIds = useMemo(
    () => new Set(filteredMovements.map((movement) => movement.receiptId)),
    [filteredMovements]
  );

  const totalRevenue = useMemo(() => {
    return filteredMovements
      .filter((movement) => movement.status === "COMPLETED")
      .reduce((sum, movement) => {
        const product = products.find(
          (item) =>
            item.sku === movement.sku &&
            item.warehouseId === movement.warehouseId
        );

        return sum + (product ? product.price * movement.qty : 0);
      }, 0);
  }, [filteredMovements, products]);

  const pendingCount = useMemo(() => {
    const pendingReceipts = new Set(
      filteredMovements
        .filter((movement) => movement.status === "PENDING")
        .map((movement) => movement.receiptId)
    );

    return pendingReceipts.size;
  }, [filteredMovements]);

  const approvedCount = useMemo(() => {
    const approvedReceipts = new Set(
      filteredMovements
        .filter((movement) => movement.status === "APPROVED")
        .map((movement) => movement.receiptId)
    );

    return approvedReceipts.size;
  }, [filteredMovements]);

  function setFilter<K extends keyof Filters>(
    key: K,
    value: Filters[K]
  ) {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery("");
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Outbound Orders</h1>
            <p className="text-sm text-muted-foreground mt-1">
              B2B & retail orders fulfillment
            </p>
          </div>

          <button
            onClick={() => setCreateOpen(true)}
            className="h-10 px-4 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Plus className="size-4" />
            New order
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi
            icon={ClipboardList}
            label="Total orders"
            value={loading ? "—" : uniqueReceiptIds.size}
            tone="primary"
          />

          <Kpi
            icon={TrendingUp}
            label="Revenue"
            value={loading ? "—" : formatVND(totalRevenue)}
            tone="accent"
          />

          <Kpi
            icon={Clock}
            label="Pending Requests"
            value={loading ? "—" : pendingCount}
            tone="warning"
          />

          <Kpi
            icon={Truck}
            label="Approved Requests"
            value={loading ? "—" : approvedCount}
            tone="primary"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />

            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search order #, product, customer…"
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            />

            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="relative ml-auto" ref={filterRef}>
            <button
              onClick={() => setFilterOpen((open) => !open)}
              className={`h-10 px-4 rounded-lg text-sm font-medium flex items-center gap-2 border transition-colors ${
                filterOpen || activeFilterCount > 0
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary border-border hover:bg-muted"
              }`}
            >
              <Filter className="size-4" />
              Filter

              {activeFilterCount > 0 && (
                <span className="ml-0.5 size-5 rounded-full bg-white/20 text-xs grid place-items-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {filterOpen && (
              <div className="absolute right-0 top-12 z-30 w-72 surface-card rounded-xl shadow-xl border border-border p-4 space-y-4">
                <FilterField label="Warehouse">
                  <select
                    value={filters.warehouse}
                    onChange={(event) =>
                      setFilter("warehouse", event.target.value)
                    }
                    className="filter-select"
                  >
                    <option value="">All Warehouses</option>
                    {warehouses.map((warehouse) => (
                      <option key={warehouse.id} value={warehouse.id}>
                        {warehouse.code}
                      </option>
                    ))}
                  </select>
                </FilterField>

                <FilterField label="Status">
                  <select
                    value={filters.status}
                    onChange={(event) =>
                      setFilter("status", event.target.value)
                    }
                    className="filter-select"
                  >
                    <option value="">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </FilterField>

                <FilterField label="Payment">
                  <select
                    value={filters.paymentStatus}
                    onChange={(event) =>
                      setFilter("paymentStatus", event.target.value)
                    }
                    className="filter-select"
                  >
                    <option value="">All Payments</option>
                    <option value="UNPAID">Unpaid</option>
                    <option value="PARTIAL">Partial</option>
                    <option value="PAID">Paid</option>
                  </select>
                </FilterField>

                <FilterField label="Created by">
                  <select
                    value={filters.staff}
                    onChange={(event) =>
                      setFilter("staff", event.target.value)
                    }
                    className="filter-select"
                  >
                    <option value="">All Staff</option>
                    {staffOptions.map((staff) => (
                      <option key={staff} value={staff}>
                        {staff}
                      </option>
                    ))}
                  </select>
                </FilterField>

                <FilterField label="Date range">
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(event) =>
                        setFilter("dateFrom", event.target.value)
                      }
                      className={`filter-input ${
                        dateRangeError ? "border-destructive" : ""
                      }`}
                    />

                    <span className="text-muted-foreground text-sm">—</span>

                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(event) =>
                        setFilter("dateTo", event.target.value)
                      }
                      className={`filter-input ${
                        dateRangeError ? "border-destructive" : ""
                      }`}
                    />
                  </div>

                  {dateRangeError && (
                    <p className="text-xs text-destructive mt-1">
                      {dateRangeError}
                    </p>
                  )}
                </FilterField>

                {activeFilterCount > 0 && (
                  <button
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                    className="w-full h-8 rounded-lg text-xs border border-border hover:bg-secondary text-muted-foreground"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="surface-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-20 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-sm">Loading outbound orders…</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center gap-3 py-20 text-destructive">
              <AlertCircle className="size-5" />
              <span className="text-sm">{error}</span>
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
              <Search className="size-8 opacity-30" />

              <span className="text-sm">
                {dateRangeError
                  ? "Fix the filter errors above to see results."
                  : "No orders match your search or filters."}
              </span>

              {(searchQuery || activeFilterCount > 0) &&
                !dateRangeError && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-primary underline underline-offset-2 mt-1"
                  >
                    Clear filters
                  </button>
                )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40">
                    <tr>
                      <th className="text-left p-4">Order #</th>
                      <th className="text-left p-4">Product</th>
                      <th className="text-left p-4">Customer</th>
                      <th className="text-left p-4">Warehouse</th>
                      <th className="text-right p-4">System Stock</th>
                      <th className="text-right p-4">Qty</th>
                      <th className="text-right p-4">Item Total</th>
                      <th className="text-left p-4">Date</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Payment</th>
                      <th className="text-left p-4">Created by</th>
                      <th className="text-left p-4">Assigned to</th>
                      <th className="w-12" />
                    </tr>
                  </thead>

                  <tbody>
                    {filteredMovements.map((movement) => {
                      const product = products.find(
                        (item) =>
                          item.sku === movement.sku &&
                          item.warehouseId === movement.warehouseId
                      );

                      const itemTotal = product
                        ? product.price * movement.qty
                        : 0;

                      const { reference, assignee } = parseRemark(
                        movement.remark
                      );

                      const displayId =
                        reference || `R-${movement.receiptId}`;

                      return (
                        <tr
                          key={movement.id}
                          className="border-t border-border/60 hover:bg-secondary/30 transition-colors"
                        >
                          <td className="p-4 font-mono text-xs">
                            {displayId}
                          </td>

                          <td className="p-4">
                            <div className="font-medium">
                              {movement.product}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {movement.sku}
                            </div>
                          </td>

                          <td className="p-4">{movement.partner}</td>

                          <td className="p-4 font-mono text-xs">
                            {warehouseCode(movement.warehouseId)}
                          </td>

                          <td className="p-4 text-right font-semibold text-muted-foreground">
                            {product ? product.stock : 0}
                          </td>

                          <td className="p-4 text-right font-semibold text-accent">
                            -{movement.qty}
                          </td>

                          <td className="p-4 text-right font-semibold">
                            {product ? formatVND(itemTotal) : "—"}
                          </td>

                          <td className="p-4 text-muted-foreground">
                            {movement.date}
                          </td>

                          <td className="p-4">
                            <StatusBadge status={movement.status} />
                          </td>

                          <td className="p-4">
                            <PaymentStatusBadge
                              status={movement.paymentStatus}
                            />
                          </td>

                          <td className="p-4 text-muted-foreground">
                            {movement.staff}
                          </td>

                          <td className="p-4 text-muted-foreground">
                            {movement.assignedUserName ||
                              assignee ||
                              "—"}
                          </td>

                          <td className="p-2 text-center">
                            <button
                              onClick={() =>
                                setSelectedMovement(movement)
                              }
                              title="View detail"
                              className="size-8 rounded-md grid place-items-center text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                            >
                              <Eye className="size-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-border/60 text-sm">
                  <div className="text-muted-foreground text-xs">
                    Showing {page * limit + 1}–
                    {Math.min(
                      (page + 1) * limit,
                      totalElements
                    )}{" "}
                    of {totalElements} entries
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setPage((currentPage) =>
                          Math.max(0, currentPage - 1)
                        )
                      }
                      disabled={page === 0}
                      className="size-8 grid place-items-center rounded-md border border-border bg-secondary hover:bg-muted disabled:opacity-40"
                    >
                      <ChevronLeft className="size-4" />
                    </button>

                    {Array.from(
                      { length: totalPages },
                      (_, index) => index
                    ).map((pageNumber) => (
                      <button
                        key={pageNumber}
                        onClick={() => setPage(pageNumber)}
                        className={`size-8 rounded-md text-xs font-medium ${
                          pageNumber === page
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary border border-border hover:bg-muted"
                        }`}
                      >
                        {pageNumber + 1}
                      </button>
                    ))}

                    <button
                      onClick={() =>
                        setPage((currentPage) =>
                          Math.min(
                            totalPages - 1,
                            currentPage + 1
                          )
                        )
                      }
                      disabled={page >= totalPages - 1}
                      className="size-8 grid place-items-center rounded-md border border-border bg-secondary hover:bg-muted disabled:opacity-40"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ReceiptModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        type="Outbound"
        onSaved={() => fetchReceipts()}
      />

      {selectedMovement && (
        <OutboundDetailModal
          allMovements={movements}
          movement={selectedMovement}
          warehouseCode={warehouseCode}
          onClose={() => setSelectedMovement(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}

      <style>{`
        .filter-select {
          width: 100%;
          height: 2.25rem;
          padding: 0 0.75rem;
          border-radius: 0.5rem;
          background: var(--input);
          border: 1px solid var(--border);
          font-size: 0.8125rem;
          color: var(--foreground);
        }

        .filter-select:focus {
          outline: none;
          box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent);
        }

        .filter-input {
          flex: 1;
          height: 2.25rem;
          padding: 0 0.5rem;
          border-radius: 0.5rem;
          background: var(--input);
          border: 1px solid var(--border);
          font-size: 0.8125rem;
          color: var(--foreground);
          min-width: 0;
        }

        .filter-input:focus {
          outline: none;
          box-shadow: 0 0 0 2px color-mix(in oklab, var(--ring) 40%, transparent);
        }
      `}</style>
    </AppShell>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  tone: "primary" | "accent" | "warning";
}) {
  const color =
    tone === "warning"
      ? "var(--warning)"
      : tone === "accent"
        ? "var(--accent)"
        : "var(--primary)";

  return (
    <div className="surface-card p-5">
      <div className="flex items-start justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </div>

        <div
          className="size-9 rounded-lg grid place-items-center"
          style={{
            background: `color-mix(in oklab, ${color} 18%, transparent)`,
            color,
          }}
        >
          <Icon className="size-4" />
        </div>
      </div>

      <div className="mt-3 text-2xl font-bold">{value}</div>
    </div>
  );
}