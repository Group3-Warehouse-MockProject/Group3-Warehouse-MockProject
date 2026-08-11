import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { formatVND } from "@/lib/warehouse-data";
import { useApp } from "@/lib/app-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, getErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import { Filter, Plus, Download, Upload, Package, Boxes, AlertTriangle, TrendingUp, ChevronLeft, ChevronRight, Search, LayoutGrid, List, Pencil, Trash2, AlertCircle, RefreshCw } from "lucide-react";
import { ModalShell, Field, inputCls, selectCls } from "@/components/modal-shell";
import { PageLoadingState } from "@/components/loading-state";
import { useState, useEffect, useRef } from "react";


export const Route = createFileRoute("/products")({
  head: () => ({ meta: [{ title: "Products — TechStock" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  const { activeWarehouseId, currentUser } = useApp();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [deleteProduct, setDeleteProduct] = useState<any>(null);
  const [reactivateProduct, setReactivateProduct] = useState<any>(null);
  const [hardDeleteProduct, setHardDeleteProduct] = useState<any>(null);

  const isAdmin = currentUser?.role === "Admin";
  const canEdit = currentUser?.role === "Admin" || currentUser?.role === "Manager" || currentUser?.role === "Warehouse_Manager";
  const canDelete = currentUser?.role === "Admin" || currentUser?.role === "Manager";

  // Server-side pagination state
  const [page, setPage] = useState(0); // 0-indexed for backend
  const limit = 15;

  const [q, setQ] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [lifecycleFilter, setLifecycleFilter] = useState("ACTIVE");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCostMin, setFilterCostMin] = useState("");
  const [filterCostMax, setFilterCostMax] = useState("");
  const [filterPriceMin, setFilterPriceMin] = useState("");
  const [filterPriceMax, setFilterPriceMax] = useState("");

  // Reset page whenever filters change
  useEffect(() => { setPage(0); }, [q, filterCategory, lifecycleFilter, filterStatus, filterCostMin, filterCostMax, filterPriceMin, filterPriceMax, activeWarehouseId]);

  const { data: pageData, isLoading, error } = useQuery({
    queryKey: ["products", activeWarehouseId, page, q, filterCategory, lifecycleFilter],
    queryFn: async () => {
      const res = await api.get("/products", {
        params: {
          ...(activeWarehouseId ? { warehouseIdParam: activeWarehouseId } : {}),
          ...(q ? { search: q } : {}),
          ...(filterCategory ? { category: filterCategory } : {}),
          lifecycleStatus: lifecycleFilter,
          page,
          size: limit,
        }
      });
      return res.data as {
        content: any[];
        totalPages: number;
        totalElements: number;
      };
    }
  });

  const productData = pageData?.content ?? [];
  const totalPages = pageData?.totalPages ?? 1;
  const totalElements = pageData?.totalElements ?? 0;

  const { data: productStats } = useQuery({
    queryKey: ["product-stats", activeWarehouseId],
    queryFn: async () => {
      const res = await api.get("/products/stats", {
        params: activeWarehouseId ? { warehouseIdParam: activeWarehouseId } : {}
      });
      return res.data as { totalSKUs: number; totalUnits: number; lowStockCount: number; inventoryValue: number };
    }
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get("/warehouses");
      return res.data;
    }
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get("/categories", { params: { page: 0, size: 1000, status: "Active" } });
      return res.data?.content ?? [];
    }
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", "reference"],
    queryFn: async () => {
      const res = await api.get("/suppliers", { params: { page: 0, size: 100 } });
      return res.data?.content ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const { data: locations } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await api.get("/locations");
      return res.data;
    }
  });

  const getWarehouseCode = (id: string | null | undefined) => {
    if (!id) return "—";
    if (id.includes(",")) {
      return id.split(",")
        .map(i => warehouses?.find((w: any) => w.id.toString() === i.trim())?.code ?? i.trim())
        .filter(Boolean)
        .join(", ");
    }
    return warehouses?.find((w: any) => w.id.toString() === id.toString())?.code ?? id;
  };

  const list = (productData || []).filter((p: any) => {
    const matchesQ =
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.sku.toLowerCase().includes(q.toLowerCase()) ||
      p.category.toLowerCase().includes(q.toLowerCase()) ||
      p.brand.toLowerCase().includes(q.toLowerCase());

    const matchesCategory = filterCategory ? p.category === filterCategory : true;

    let matchesStatus = true;
    if (filterStatus === "Out") matchesStatus = p.stock === 0;
    else if (filterStatus === "Low") matchesStatus = p.stock > 0 && p.stock < p.reorder;
    else if (filterStatus === "In stock") matchesStatus = p.stock > 0 && p.stock >= p.reorder;

    let matchesCost = true;
    if (filterCostMin) matchesCost = matchesCost && p.cost >= Number(filterCostMin);
    if (filterCostMax) matchesCost = matchesCost && p.cost <= Number(filterCostMax);

    let matchesPrice = true;
    if (filterPriceMin) matchesPrice = matchesPrice && p.price >= Number(filterPriceMin);
    if (filterPriceMax) matchesPrice = matchesPrice && p.price <= Number(filterPriceMax);

    return matchesQ && matchesCategory && matchesStatus && matchesCost && matchesPrice;
  });

  const units = productStats?.totalUnits ?? list.reduce((s: number, p: any) => s + p.stock, 0);
  const low = productStats?.lowStockCount ?? list.filter((p: any) => p.stock < p.reorder).length;
  const value = productStats?.inventoryValue ?? list.reduce((s: number, p: any) => s + p.stock * p.cost, 0);

  if (isLoading) return <AppShell><PageLoadingState label="Loading products" /></AppShell>;
  if (error) return <AppShell><div className="p-8 text-destructive">Error loading data</div></AppShell>;

  const handleExport = async () => {
    try {
      // Fetch all products for export (not just current page)
      const res = await api.get("/products", {
        params: {
          ...(activeWarehouseId ? { warehouseIdParam: activeWarehouseId } : {}),
          ...(q ? { search: q } : {}),
          ...(filterCategory ? { category: filterCategory } : {}),
          lifecycleStatus: lifecycleFilter,
          page: 0,
          size: totalElements || 10000,
        }
      });
      const allProducts = res.data?.content ?? [];
      if (allProducts.length === 0) return;

      const headers = ["SKU", "Product Name", "Brand", "Category", "Warehouse", "Location", "Stock", "Cost", "Price"];
      const csvContent = [
        headers.join(","),
        ...allProducts.map((p: any) =>
          [
            p.sku,
            `"${p.name.replace(/"/g, '""')}"`,
            p.brand,
            p.category,
            getWarehouseCode(p.warehouseId),
            p.location,
            p.stock,
            p.cost,
            p.price
          ].join(",")
        )
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `products_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.error("Failed to export products");
    }
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Products</h1>
            <p className="text-sm text-muted-foreground mt-1">{totalElements} SKUs in scope</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setOpenImport(true)} className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm flex items-center gap-2 hover:bg-muted"><Download className="size-4" />Import</button>
            <button onClick={handleExport} className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm flex items-center gap-2 hover:bg-muted"><Upload className="size-4" />Export</button>
            <button onClick={() => setOpen(true)} className="h-10 px-4 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring" style={{ background: "var(--gradient-primary)" }}>
              <Plus className="size-4" />Add SKU
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={Package} label="Total SKUs" value={totalElements} tone="primary" />
          <Kpi icon={Boxes} label="Units in stock" value={units.toLocaleString()} tone="accent" />
          <Kpi icon={TrendingUp} label="Inventory value" value={formatVND(value)} tone="primary" />
          <Kpi icon={AlertTriangle} label="Low stock" value={low} tone="warning" />
        </div>

        <div className="flex flex-col gap-4 relative">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative max-w-md w-full sm:w-96">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(0);
                }}
                placeholder="Search SKU, product name, brand..."
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-input border border-border text-sm"
              />
            </div>
            <div className="relative flex items-center gap-2">
              <div className="hidden sm:flex bg-secondary p-1 rounded-lg border border-border">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  title="Grid View"
                >
                  <LayoutGrid className="size-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  title="List View"
                >
                  <List className="size-4" />
                </button>
              </div>
              <button onClick={() => setShowFilter(!showFilter)} className={`h-10 px-4 rounded-lg border text-sm flex items-center gap-2 transition-colors shrink-0 ${showFilter ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border hover:bg-muted"}`}>
                <Filter className="size-4" />Filter
              </button>

              {showFilter && (
                <div className="absolute top-full right-0 mt-2 z-20 flex flex-col gap-5 p-5 surface-card rounded-xl border border-border/60 shadow-xl w-72">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Category</div>
                    <select
                      value={filterCategory}
                      onChange={(e) => {
                        setFilterCategory(e.target.value);
                        setPage(0);
                      }}
                      className="w-full h-9 px-3 rounded-md bg-input border border-border text-sm"
                    >
                      <option value="">All Categories</option>
                      {categories?.map((c: any) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Product Status</div>
                    <select
                      value={lifecycleFilter}
                      onChange={(e) => {
                        setLifecycleFilter(e.target.value);
                        setPage(0);
                      }}
                      className="w-full h-9 px-3 rounded-md bg-input border border-border text-sm"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="ALL">All</option>
                      <option value="DEACTIVE">Deactive</option>
                    </select>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Stock Status</div>
                    <select
                      value={filterStatus}
                      onChange={(e) => {
                        setFilterStatus(e.target.value);
                        setPage(0);
                      }}
                      className="w-full h-9 px-3 rounded-md bg-input border border-border text-sm"
                    >
                      <option value="">All Statuses</option>
                      <option value="In stock">In stock</option>
                      <option value="Low">Low stock</option>
                      <option value="Out">Out of stock</option>
                    </select>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Cost Range (₫)</div>
                    <div className="flex items-center gap-2">
                      <input type="number" placeholder="Min" value={filterCostMin} onChange={(e) => { setFilterCostMin(e.target.value); setPage(0); }} className="w-full h-9 px-3 rounded-md bg-input border border-border text-sm" />
                      <span className="text-muted-foreground">-</span>
                      <input type="number" placeholder="Max" value={filterCostMax} onChange={(e) => { setFilterCostMax(e.target.value); setPage(0); }} className="w-full h-9 px-3 rounded-md bg-input border border-border text-sm" />
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">Price Range (₫)</div>
                    <div className="flex items-center gap-2">
                      <input type="number" placeholder="Min" value={filterPriceMin} onChange={(e) => { setFilterPriceMin(e.target.value); setPage(0); }} className="w-full h-9 px-3 rounded-md bg-input border border-border text-sm" />
                      <span className="text-muted-foreground">-</span>
                      <input type="number" placeholder="Max" value={filterPriceMax} onChange={(e) => { setFilterPriceMax(e.target.value); setPage(0); }} className="w-full h-9 px-3 rounded-md bg-input border border-border text-sm" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="surface-card overflow-hidden flex flex-col">
          {viewMode === "grid" ? (
            <div className="flex-1 overflow-y-auto p-4 bg-secondary/5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {list.map((p: any) => {
                  const low = p.stock < p.reorder;
                  const out = p.stock === 0;
                  return (
                    <div
                      key={`${p.sku}-${p.warehouseId}`}
                      onClick={() => setSelectedProduct(p)}
                      className="flex flex-col border border-border/60 rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all duration-300 bg-background group cursor-pointer"
                    >
                      <div className="h-40 bg-secondary/40 relative overflow-hidden shrink-0">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="size-12 text-muted-foreground/30 group-hover:scale-110 transition-transform duration-500" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end">
                          {out ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-destructive text-destructive-foreground shadow-sm">Out of Stock</span>
                          ) : low ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-warning text-warning-foreground shadow-sm">Low Stock</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-success/90 text-success-foreground shadow-sm backdrop-blur-md">In stock</span>
                          )}
                        </div>
                      </div>
                      <div className="p-3.5 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-1">
                          <div className="text-xs text-muted-foreground font-mono bg-secondary/50 px-1.5 py-0.5 rounded-sm">{p.sku}</div>
                        </div>
                        <div className="font-semibold text-[15px] leading-tight mb-1 line-clamp-2 mt-1" title={p.name}>{p.name}</div>
                        <div className="text-xs text-muted-foreground mb-3 line-clamp-1">{p.brand} &bull; {p.category}</div>

                        <div className="mt-auto space-y-2.5 bg-secondary/20 rounded-lg p-3 border border-border/40">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Price</span>
                            <span className="font-semibold text-primary">{formatVND(p.price)}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Stock</span>
                            <span className="font-semibold">{p.stock}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Loc</span>
                            <span className="font-mono text-[11px] text-right max-w-30 truncate" title={`${getWarehouseCode(p.warehouseId)} / ${p.location}`}>{getWarehouseCode(p.warehouseId)} / {p.location}</span>
                          </div>
                        </div>

                        {/* Inline action buttons */}
                        {(canEdit || canDelete) && (
                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/40">
                            {canEdit && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditProduct(p); }}
                                className="h-7 px-2.5 rounded-md text-[11px] font-medium bg-secondary/80 border border-border/60 hover:bg-muted hover:border-border flex items-center gap-1 transition-all duration-200"
                              >
                                <Pencil className="size-3" />Edit
                              </button>
                            )}
                            {canDelete && !p.isDeleted && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteProduct(p); }}
                                className="h-7 px-2.5 rounded-md text-[11px] font-medium border border-destructive/25 bg-destructive/8 text-destructive hover:bg-destructive/15 flex items-center gap-1 transition-all duration-200"
                              >
                                <Trash2 className="size-3" />Deactivate
                              </button>
                            )}
                            {canDelete && p.isDeleted && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setReactivateProduct(p); }}
                                className="h-7 px-2.5 rounded-md text-[11px] font-medium border border-success/30 bg-success/10 text-success hover:bg-success/20 flex items-center gap-1 transition-all duration-200"
                              >
                                <RefreshCw className="size-3" />Reactivate
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setHardDeleteProduct(p); }}
                                className="h-7 px-2.5 rounded-md text-[11px] font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center gap-1 transition-all duration-200 ml-auto"
                                title="Permanently delete"
                              >
                                <Trash2 className="size-3" />Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {list.length === 0 && (
                <div className="py-16 text-center">
                  <Package className="size-12 text-muted-foreground/30 mx-auto mb-3" />
                  <div className="text-muted-foreground font-medium">No products match your filters.</div>
                  <div className="text-sm text-muted-foreground/60 mt-1">Try adjusting your search criteria.</div>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-250 text-sm">
                <div className="grid grid-cols-[130px_minmax(180px,2fr)_110px_90px_90px_60px_70px_100px_100px_90px_100px] items-center gap-3 px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40 font-medium border-b border-border/60">
                  <div>SKU</div>
                  <div>Product</div>
                  <div>Category</div>
                  <div>Warehouse</div>
                  <div>Location</div>
                  <div className="text-right">Stock</div>
                  <div className="text-right">Reorder</div>
                  <div className="text-right">Cost</div>
                  <div className="text-right">Price</div>
                  <div className="text-center">Status</div>
                  <div className="text-center">Actions</div>
                </div>
                <div className="divide-y divide-border/60">
                  {list.map((p: any) => {
                    const low = p.stock < p.reorder;
                    const out = p.stock === 0;
                    return (
                      <div
                        key={`${p.sku}-${p.warehouseId}`}
                        onClick={() => setSelectedProduct(p)}
                        className="grid grid-cols-[130px_minmax(180px,2fr)_110px_90px_90px_60px_70px_100px_100px_90px_100px] items-center gap-3 px-4 py-3.5 hover:bg-secondary/30 transition-colors cursor-pointer"
                      >
                        <div className="font-mono text-xs text-muted-foreground truncate">{p.sku}</div>
                        <div>
                          <div className="flex items-center gap-3">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} className="size-10 rounded-md object-cover border border-border shrink-0" />
                            ) : (
                              <div className="size-10 rounded-md bg-secondary/80 flex items-center justify-center border border-border shrink-0">
                                <Package className="size-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-medium truncate">{p.name}</div>
                              <div className="text-xs text-muted-foreground truncate">{p.brand}</div>
                            </div>
                          </div>
                        </div>
                        <div>
                          <span className="px-2 py-1 rounded-md text-xs bg-secondary border border-border inline-block truncate max-w-full">{p.category}</span>
                        </div>
                        <div className="font-mono text-xs truncate">{getWarehouseCode(p.warehouseId)}</div>
                        <div className="font-mono text-xs truncate">{p.location}</div>
                        <div className="text-right font-semibold">{p.stock}</div>
                        <div className="text-right flex justify-end">
                          <InlineReorderEdit product={p} />
                        </div>
                        <div className="text-right">{formatVND(p.cost)}</div>
                        <div className="text-right">{formatVND(p.price)}</div>
                        <div className="text-center">
                          {out ? (
                            <span className="px-2 py-1 rounded-md text-xs bg-destructive/15 text-destructive">Out</span>
                          ) : low ? (
                            <span className="px-2 py-1 rounded-md text-xs bg-warning/15 text-warning">Low</span>
                          ) : (
                            <span className="px-2 py-1 rounded-md text-xs bg-success/15 text-success">In stock</span>
                          )}
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          {canEdit && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditProduct(p); }}
                              className="size-7 grid place-items-center rounded-md hover:bg-secondary border border-transparent hover:border-border transition-all duration-150"
                              title="Edit"
                            >
                              <Pencil className="size-3.5 text-muted-foreground" />
                            </button>
                          )}
                          {canDelete && !p.isDeleted && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteProduct(p); }}
                              className="size-7 grid place-items-center rounded-md hover:bg-destructive/15 border border-transparent hover:border-destructive/30 transition-all duration-150"
                              title="Deactivate"
                            >
                              <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                            </button>
                          )}
                          {canDelete && p.isDeleted && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setReactivateProduct(p); }}
                              className="size-7 grid place-items-center rounded-md hover:bg-success/15 border border-transparent hover:border-success/30 transition-all duration-150"
                              title="Reactivate"
                            >
                              <RefreshCw className="size-3.5 text-success" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {list.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      No products match your filters.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border/60 text-sm bg-secondary/10">
              <div className="text-muted-foreground text-xs">
                Showing {page * limit + 1}–{Math.min((page + 1) * limit, totalElements)} of {totalElements} entries
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="size-8 grid place-items-center rounded-md border border-border bg-background hover:bg-secondary disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="size-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`size-8 rounded-md text-xs font-medium transition-colors ${n === page
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-background border border-border hover:bg-secondary"
                      }`}
                  >
                    {n + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="size-8 grid place-items-center rounded-md border border-border bg-background hover:bg-secondary disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <AddSkuModal open={open} onClose={() => setOpen(false)} warehouses={warehouses || []} categories={categories || []} suppliers={suppliers || []} locations={locations || []} />
      <ImportModal open={openImport} onClose={() => setOpenImport(false)} />
      <ProductDetailModal product={selectedProduct} warehouses={warehouses || []} onClose={() => setSelectedProduct(null)} />

      {/* Inline Edit Product Modal (from grid/list action buttons) */}
      {editProduct && (
        <InlineEditProductModal
          product={editProduct}
          onClose={() => setEditProduct(null)}
          queryClient={queryClient}
        />
      )}

      {/* Inline Soft Delete Confirmation */}
      <ModalShell
        open={!!deleteProduct}
        onClose={() => setDeleteProduct(null)}
        title="Deactivate Product"
        subtitle="This will hide the product from listings"
        icon={<AlertCircle className="size-5" />}
        maxWidth="28rem"
        footer={
          <>
            <button onClick={() => setDeleteProduct(null)} className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm hover:bg-muted">Cancel</button>
            <InlineDeleteButton product={deleteProduct} onDone={() => setDeleteProduct(null)} queryClient={queryClient} mode="soft" />
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Are you sure you want to deactivate <strong>{deleteProduct?.name}</strong> ({deleteProduct?.sku})? The product will be hidden but can be restored later.</p>
      </ModalShell>

      <ModalShell
        open={!!reactivateProduct}
        onClose={() => setReactivateProduct(null)}
        title="Reactivate Product"
        subtitle="This will make the product available again"
        icon={<RefreshCw className="size-5" />}
        maxWidth="28rem"
        footer={
          <>
            <button onClick={() => setReactivateProduct(null)} className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm hover:bg-muted">Cancel</button>
            <InlineReactivateButton product={reactivateProduct} onDone={() => setReactivateProduct(null)} queryClient={queryClient} />
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Reactivate <strong>{reactivateProduct?.name}</strong> ({reactivateProduct?.sku})? The product will return to the active product list.</p>
      </ModalShell>

      {/* Inline Hard Delete Confirmation */}
      <ModalShell
        open={!!hardDeleteProduct}
        onClose={() => setHardDeleteProduct(null)}
        title="Permanently Delete Product"
        subtitle="This action cannot be undone"
        icon={<AlertCircle className="size-5" />}
        maxWidth="28rem"
        footer={
          <>
            <button onClick={() => setHardDeleteProduct(null)} className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm hover:bg-muted">Cancel</button>
            <InlineDeleteButton product={hardDeleteProduct} onDone={() => setHardDeleteProduct(null)} queryClient={queryClient} mode="hard" />
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Are you sure you want to <strong className="text-destructive">permanently delete</strong> <strong>{hardDeleteProduct?.name}</strong> ({hardDeleteProduct?.sku})?</p>
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
            ⚠️ Permanent deletion is available only for products without receipt, transfer, or stock-check history. Otherwise, deactivate the product instead.
          </div>
        </div>
      </ModalShell>
    </AppShell>
  );
}

function ProductDetailModal({ product, warehouses, onClose }: { product: any; warehouses: any[]; onClose: () => void }) {
  if (!product) return null;

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmHardDelete, setConfirmHardDelete] = useState(false);
  const queryClient = useQueryClient();
  const { currentUser } = useApp();
  const isAdmin = currentUser?.role === "Admin";
  const canEdit = currentUser?.role === "Admin" || currentUser?.role === "Manager" || currentUser?.role === "Warehouse_Manager";
  const canDelete = currentUser?.role === "Admin" || currentUser?.role === "Manager";

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/products/${product.id || product.sku}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-stats"] });
      toast.success("Product updated successfully");
      setEditing(false);
      onClose();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, "Failed to update product")),
  });

  const softDeleteMutation = useMutation({
    mutationFn: () => api.delete(`/products/${product.id || product.sku}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-stats"] });
      toast.success("Product deactivated");
      onClose();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, "Failed to delete product")),
  });

  const hardDeleteMutation = useMutation({
    mutationFn: () => api.delete(`/products/${product.id || product.sku}/hard`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-stats"] });
      toast.success("Product permanently deleted");
      setConfirmHardDelete(false);
      onClose();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, "Failed to permanently delete product")),
  });

  const out = product.stock === 0;
  const low = product.stock > 0 && product.stock < product.reorder;

  const getWarehouseCode = (id: string | null | undefined) => {
    if (!id) return "—";
    if (id.includes(",")) {
      return id.split(",")
        .map(i => warehouses?.find((w: any) => w.id.toString() === i.trim())?.code ?? i.trim())
        .filter(Boolean)
        .join(", ");
    }
    return warehouses?.find((w: any) => w.id.toString() === id.toString())?.code ?? id;
  };

  return (
    <>
      <ModalShell
      open={!!product}
      onClose={onClose}
      title="Product Details"
      subtitle={product.name}
      icon={<Package className="size-5" />}
      footer={
        <div className="flex items-center gap-2 w-full">
          {canDelete && (
            <>
              <button
                onClick={() => setDeleting(true)}
                className="h-10 px-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm hover:bg-destructive/20 flex items-center gap-2"
              >
                <Trash2 className="size-3.5" />Deactivate
              </button>
              {isAdmin && (
                <button
                  onClick={() => setConfirmHardDelete(true)}
                  className="h-10 px-4 rounded-lg border border-destructive bg-destructive text-destructive-foreground text-sm hover:bg-destructive/90 flex items-center gap-2"
                >
                  <Trash2 className="size-3.5" />Delete
                </button>
              )}
            </>
          )}
          <div className="flex-1" />
          {canEdit && (
            <button
              onClick={() => setEditing(true)}
              className="h-10 px-4 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Pencil className="size-3.5" />Edit
            </button>
          )}
          <button onClick={onClose} className="h-10 px-6 rounded-lg bg-secondary border border-border text-sm hover:bg-muted font-medium">Close</button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="w-full h-48 md:h-64 rounded-xl border border-border/60 bg-secondary/30 flex items-center justify-center overflow-hidden relative shrink-0">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <Package className="size-20 text-muted-foreground/30" />
          )}
          <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
            {out ? (
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-destructive/90 text-destructive-foreground shadow-sm backdrop-blur-md">Out of Stock</span>
            ) : low ? (
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-warning/90 text-warning-foreground shadow-sm backdrop-blur-md">Low Stock</span>
            ) : (
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-success/90 text-success-foreground shadow-sm backdrop-blur-md">In stock</span>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">SKU Code</div>
            <div className="font-mono text-base bg-secondary/50 px-2 py-1 rounded border border-border/40 inline-block">{product.sku}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="surface-card p-3 rounded-lg border border-border/40">
              <div className="text-xs text-muted-foreground mb-1">Category</div>
              <div className="font-medium">{product.category || "—"}</div>
            </div>
            <div className="surface-card p-3 rounded-lg border border-border/40">
              <div className="text-xs text-muted-foreground mb-1">Brand / Supplier</div>
              <div className="font-medium">{product.brand || "—"}</div>
            </div>
            <div className="surface-card p-3 rounded-lg border border-border/40">
              <div className="text-xs text-muted-foreground mb-1">Cost Price</div>
              <div className="font-medium text-destructive">{formatVND(product.cost)}</div>
            </div>
            <div className="surface-card p-3 rounded-lg border border-border/40">
              <div className="text-xs text-muted-foreground mb-1">Selling Price</div>
              <div className="font-medium text-success text-lg">{formatVND(product.price)}</div>
            </div>
          </div>

          <div className="flex flex-col gap-4 bg-secondary/10 p-4 rounded-lg border border-border/40">
            <div className="grid grid-cols-2 gap-4 border-b border-border/40 pb-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Stock</div>
                <div className="font-bold text-lg">{product.stock}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Reorder Point</div>
                <div className="font-medium text-lg">{product.reorder}</div>
              </div>
            </div>
            <div className="grid grid-cols-[3fr_2fr] gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Warehouse</div>
                <div className="font-mono text-sm space-y-1">
                  {(!product.warehouseId || !product.warehouseId.includes(",")) ? (
                    <div>{getWarehouseCode(product.warehouseId)}</div>
                  ) : (
                    product.warehouseId.split(",").map((id: string, idx: number) => (
                      <div key={idx}>{getWarehouseCode(id.trim())}</div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Location</div>
                <div className="font-mono text-sm space-y-1">
                  {(!product.location || !product.location.includes(",")) ? (
                    <div>{product.location || "—"}</div>
                  ) : (
                    product.location.split(",").map((loc: string, idx: number) => (
                      <div key={idx}>{loc.trim() || "—"}</div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalShell>

      {/* Soft Delete Confirmation */}
      <ModalShell
        open={deleting}
        onClose={() => setDeleting(false)}
        title="Deactivate Product"
        subtitle="This will hide the product from listings"
        icon={<AlertCircle className="size-5" />}
        maxWidth="28rem"
        footer={
          <>
            <button onClick={() => setDeleting(false)} className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm hover:bg-muted">Cancel</button>
            <button
              onClick={() => softDeleteMutation.mutate()}
              disabled={softDeleteMutation.isPending}
              className="h-10 px-5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90"
            >
              {softDeleteMutation.isPending ? "Deactivating..." : "Confirm Deactivate"}
            </button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">Are you sure you want to deactivate <strong>{product.name}</strong> ({product.sku})? The product will be hidden but can be restored later.</p>
      </ModalShell>

      {/* Hard Delete Confirmation */}
      <ModalShell
        open={confirmHardDelete}
        onClose={() => setConfirmHardDelete(false)}
        title="Permanently Delete Product"
        subtitle="This action cannot be undone"
        icon={<AlertCircle className="size-5" />}
        maxWidth="28rem"
        footer={
          <>
            <button onClick={() => setConfirmHardDelete(false)} className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm hover:bg-muted">Cancel</button>
            <button
              onClick={() => hardDeleteMutation.mutate()}
              disabled={hardDeleteMutation.isPending}
              className="h-10 px-5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90"
            >
              {hardDeleteMutation.isPending ? "Deleting..." : "Permanently Delete"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Are you sure you want to <strong className="text-destructive">permanently delete</strong> <strong>{product.name}</strong> ({product.sku})?</p>
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
            ⚠️ Permanent deletion is available only for products without receipt, transfer, or stock-check history. Otherwise, deactivate the product instead.
          </div>
        </div>
      </ModalShell>

      {/* Edit Product Modal */}
      {editing && (
        <EditProductModal
          product={product}
          onClose={() => setEditing(false)}
          onSave={(data: any) => updateMutation.mutate(data)}
          saving={updateMutation.isPending}
        />
      )}
    </>
  );
}

function EditProductModal({ product, onClose, onSave, saving }: {
  product: any;
  onClose: () => void;
  onSave: (data: any) => void;
  saving: boolean;
}) {
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => { const res = await api.get("/categories", { params: { page: 0, size: 1000, status: "Active" } }); return res.data?.content ?? []; }
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", "reference"],
    queryFn: async () => { const res = await api.get("/suppliers", { params: { page: 0, size: 100 } }); return res.data?.content ?? []; },
    staleTime: 5 * 60_000,
  });
  const [selectedCategoryId, setSelectedCategoryId] = useState(String(product.categoryId ?? ""));
  const [selectedSupplierId, setSelectedSupplierId] = useState(String(product.supplierId ?? ""));
  const categoryIsMissing = Boolean(selectedCategoryId) && !categories.some((category: any) => String(category.id) === selectedCategoryId);
  const supplierIsMissing = Boolean(selectedSupplierId) && !suppliers.some((supplier: any) => String(supplier.id) === selectedSupplierId);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSave({
      name: fd.get("name"),
      code: fd.get("code"),
      specification: fd.get("specification"),
      cost: Number(fd.get("cost")),
      price: Number(fd.get("price")),
      imageUrl: fd.get("imageUrl") || null,
      categoryId: Number(fd.get("categoryId")),
      supplierId: Number(fd.get("supplierId")),
    });
  };

  return (
    <ModalShell
      open={true}
      onClose={onClose}
      title="Edit Product"
      subtitle={product.name}
      icon={<Pencil className="size-5" />}
      footer={
        <>
          <button onClick={onClose} disabled={saving} className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm hover:bg-muted">Cancel</button>
          <button type="submit" form="edit-product-form" disabled={saving} className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground glow-ring" style={{ background: "var(--gradient-primary)" }}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </>
      }
    >
      <form id="edit-product-form" onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="SKU Code" required><input name="code" className={inputCls} defaultValue={product.sku} required /></Field>
        <Field label="Supplier" required>
          <select name="supplierId" className={selectCls} value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)} required>
            <option value="" disabled>Select supplier</option>
            {supplierIsMissing && <option value={selectedSupplierId}>{product.brand || "Current supplier"}</option>}
            {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Product Name" required className="sm:col-span-2"><input name="name" className={inputCls} defaultValue={product.name} required /></Field>
        <Field label="Image URL" className="sm:col-span-2"><input name="imageUrl" className={inputCls} defaultValue={product.imageUrl || ""} /></Field>
        <Field label="Specification" required className="sm:col-span-2"><textarea name="specification" className={`${inputCls} min-h-20 resize-y py-2`} defaultValue={product.specification || ""} required /></Field>
        <Field label="Category" required>
          <select name="categoryId" className={selectCls} value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)} required>
            <option value="" disabled>Select category</option>
            {categoryIsMissing && <option value={selectedCategoryId}>{product.category || "Current category"}</option>}
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Cost (₫)"><input name="cost" type="number" className={inputCls} defaultValue={product.cost} min={0} /></Field>
        <Field label="Sell Price (₫)" className="sm:col-span-2"><input name="price" type="number" className={inputCls} defaultValue={product.price} min={0} /></Field>
      </form>
    </ModalShell>
  );
}

function AddSkuModal({ open, onClose, warehouses, categories, suppliers, locations }: { open: boolean; onClose: () => void; warehouses: any[]; categories: any[]; suppliers: any[]; locations: any[] }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const activeSuppliers = suppliers.filter(
    (supplier: any) => String(supplier.status || "").toUpperCase() === "ACTIVE",
  );
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [initialStock, setInitialStock] = useState("0");

  useEffect(() => {
    if (!open) {
      setSelectedWarehouse("");
      setSelectedLocationId("");
      setInitialStock("0");
    }
  }, [open]);

  const { data: occupiedLocationsData = [] } = useQuery<string[]>({
    queryKey: ["occupied-locations", selectedWarehouse],
    queryFn: async () => {
      const res = await api.get("/products/occupied-locations", {
        params: { warehouseId: selectedWarehouse },
      });
      return res.data;
    },
    enabled: open && Boolean(selectedWarehouse),
  });

  const occupiedLocations = new Set(occupiedLocationsData);

  const availableLocations = (locations || []).filter((loc: any) => {
    if (!selectedWarehouse) return true;
    if (String(loc.warehouseId) !== String(selectedWarehouse)) return false;

    const isInactive = (loc.effectiveStatus || loc.status || "ACTIVE").toUpperCase() === "INACTIVE";
    if (isInactive) return false;

    const currentQty = loc.currentQuantity || 0;
    const maxCap = loc.maxCapacity != null ? loc.maxCapacity : null;
    const isFull = maxCap != null && currentQty >= maxCap;
    if (isFull) return false;

    return true;
  });

  const selectedLocation = (locations || []).find((location: any) => String(location.id) === selectedLocationId);
  const initialStockQuantity = Number(initialStock) || 0;
  const remainingCapacity = selectedLocation?.maxCapacity != null
    ? Math.max(0, Number(selectedLocation.maxCapacity) - (Number(selectedLocation.currentQuantity) || 0))
    : null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (remainingCapacity != null && initialStockQuantity > remainingCapacity) {
      toast.error(`The selected bin has room for only ${remainingCapacity} more units.`);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const payload = {
      code: formData.get("code"),
      name: formData.get("name"),
      specification: formData.get("specification") || "N/A",
      supplierId: Number(formData.get("supplierId")),
      imageUrl: formData.get("imageUrl") || null,
      categoryId: Number(formData.get("categoryId")),
      warehouseId: Number(formData.get("warehouseId")),
      locationId: formData.get("locationId") ? Number(formData.get("locationId")) : null,
      initialStock: initialStockQuantity,
      reorderPoint: Number(formData.get("reorderPoint")),
      cost: Number(formData.get("cost")),
      price: Number(formData.get("price")),
    };
    try {
      setLoading(true);
      await api.post("/products", payload);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onClose();
    } catch (err: unknown) {
      console.error(err);
      toast.error(getErrorMessage(err, "We couldn't save the product. Please try again."));
    } finally {
      setLoading(false);
    }
  };
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Add new SKU"
      subtitle="Register a new product into the catalog"
      icon={<Package className="size-5" />}
      footer={
        <>
          <button onClick={onClose} disabled={loading} className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm hover:bg-muted">Cancel</button>
          <button type="submit" form="add-sku-form" disabled={loading} className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground glow-ring" style={{ background: "var(--gradient-primary)" }}>{loading ? "Creating..." : "Create SKU"}</button>
        </>
      }
    >
      <form id="add-sku-form" onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="SKU code" required><input name="code" className={inputCls} placeholder="e.g. CPU-INT-14700K" required /></Field>
        <Field label="Supplier" required>
          <select name="supplierId" className={selectCls} defaultValue="" required>
            <option value="" disabled>Select supplier</option>
            {activeSuppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Product name" required className="sm:col-span-2"><input name="name" className={inputCls} placeholder="Intel Core i7-14700K" required /></Field>
        <Field label="Image URL" className="sm:col-span-2"><input name="imageUrl" className={inputCls} placeholder="https://example.com/image.png" /></Field>
        <Field label="Specification" required className="sm:col-span-2"><textarea name="specification" className={`${inputCls} min-h-20 resize-y py-2`} placeholder="e.g., 6 Cores, 12 Threads, 4.3 GHz Max Boost" required /></Field>
        <Field label="Category" required>
          <select name="categoryId" className={selectCls} defaultValue="" required>
            <option value="" disabled>Select category</option>
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Warehouse" required>
          <select name="warehouseId" className={selectCls} value={selectedWarehouse} onChange={(e) => { setSelectedWarehouse(e.target.value); setSelectedLocationId(""); }} required>
            <option value="" disabled>Select warehouse</option>
            {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.code} — {w.city}</option>)}
          </select>
        </Field>
        <Field label="Bin location">
          <select name="locationId" className={selectCls} value={selectedLocationId} onChange={(e) => setSelectedLocationId(e.target.value)}>
            <option value="">No location assigned</option>
            {availableLocations.map((loc: any) => {
              const currentQty = loc.currentQuantity || 0;
              const maxCap = loc.maxCapacity != null ? loc.maxCapacity : null;
              let capacityLabel = "";
              if (maxCap != null) {
                capacityLabel = ` (${currentQty}/${maxCap})`;
              } else if (currentQty > 0) {
                capacityLabel = ` (${currentQty} items)`;
              }

              return (
                <option key={loc.id} value={loc.id}>
                  Rack {loc.rackCode} - Bin {loc.binCode}{capacityLabel}
                </option>
              );
            })}
          </select>
        </Field>
        <Field label="Initial stock">
          <input name="initialStock" type="number" className={inputCls} value={initialStock} onChange={(e) => setInitialStock(e.target.value)} min={0} max={remainingCapacity ?? undefined} />
          {remainingCapacity != null && (
            <p className={`mt-1 text-xs ${initialStockQuantity > remainingCapacity ? "text-destructive" : "text-muted-foreground"}`}>
              Remaining capacity: {remainingCapacity} units
            </p>
          )}
        </Field>
        <Field label="Reorder point"><input name="reorderPoint" type="number" className={inputCls} defaultValue={20} min={0} /></Field>
        <Field label="Cost (₫)"><input name="cost" type="number" className={inputCls} defaultValue={0} min={0} /></Field>
        <Field label="Sell price (₫)" className="sm:col-span-2"><input name="price" type="number" className={inputCls} defaultValue={0} min={0} /></Field>
      </form>
    </ModalShell>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: number | string; tone: "primary" | "accent" | "warning" }) {
  const color = tone === "warning" ? "var(--warning)" : tone === "accent" ? "var(--accent)" : "var(--primary)";
  return (
    <div className="surface-card p-5">
      <div className="flex items-start justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="size-9 rounded-lg grid place-items-center" style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}>
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
    </div>
  );
}

function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = async () => {
    const XLSX = await import("xlsx");
    const templateData = [
      {
        Code: "SKU-001",
        Name: "Sample Product",
        Specification: "Core i7, 16GB RAM",
        SupplierID: 1,
        CategoryID: 1,
        WarehouseID: 1,
        LocationID: "",
        InitialStock: 50,
        ReorderPoint: 10,
        Cost: 1000000,
        Price: 1500000
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "TechStock_Import_Template.xlsx");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const data = await file.arrayBuffer();
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const payload = jsonData.map((row: any) => ({
        code: String(row.Code),
        name: String(row.Name),
        specification: String(row.Specification || "N/A"),
        supplierId: Number(row.SupplierID),
        categoryId: Number(row.CategoryID),
        warehouseId: Number(row.WarehouseID),
        locationId: row.LocationID ? Number(row.LocationID) : null,
        initialStock: Number(row.InitialStock || 0),
        reorderPoint: Number(row.ReorderPoint || 0),
        cost: Number(row.Cost || 0),
        price: Number(row.Price || 0),
        imageUrl: null
      }));

      await api.post("/products/bulk", payload);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Products imported successfully!");
      onClose();
    } catch (err: unknown) {
      console.error(err);
      toast.error(getErrorMessage(err, "We couldn't import the products. Please review the file and try again."));
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Import from Excel"
      subtitle="Upload a .xlsx file to create products in bulk"
      icon={<Upload className="size-5" />}
      footer={
        <>
          <button onClick={onClose} disabled={loading} className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm hover:bg-muted">Cancel</button>
          <button onClick={() => fileInputRef.current?.click()} disabled={loading} className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground glow-ring" style={{ background: "var(--gradient-primary)" }}>
            {loading ? "Importing..." : "Upload File"}
          </button>
        </>
      }
    >
      <div className="space-y-6 text-sm">
        <div className="p-4 surface-card border border-border/60 rounded-lg">
          <h3 className="font-medium mb-2">Step 1: Download Template</h3>
          <p className="text-muted-foreground mb-4">Start by downloading the standard Excel template. Ensure you use valid IDs for Suppliers, Categories, and Warehouses.</p>
          <button onClick={downloadTemplate} className="h-9 px-4 rounded-md border border-border bg-secondary hover:bg-muted font-medium inline-flex items-center gap-2 transition-colors">
            <Download className="size-4" /> Download Template
          </button>
        </div>

        <div className="p-4 surface-card border border-border/60 rounded-lg">
          <h3 className="font-medium mb-2">Step 2: Upload Data</h3>
          <p className="text-muted-foreground mb-4">Fill out the template and upload it back. The system will process all rows simultaneously.</p>

          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />

          <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-secondary/30 transition-colors">
            <Upload className="size-8 text-muted-foreground mx-auto mb-3" />
            <div className="font-medium">Click to browse or drag and drop</div>
            <div className="text-xs text-muted-foreground mt-1">Excel or CSV files up to 5MB</div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function InlineReorderEdit({ product }: { product: any }) {
  const [val, setVal] = useState(product.reorder?.toString() || "0");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (newVal: number) => api.patch(`/inventory/${product.inventoryId}/threshold`, { lowStockThreshold: newVal }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Reorder level updated");
    },
    onError: () => {
      toast.error("Failed to update reorder level");
      setVal(product.reorder?.toString() || "0");
    }
  });

  return (
    <input
      type="number"
      className="w-14 h-7 px-1 text-right text-xs rounded border border-transparent hover:border-border bg-transparent focus:bg-input focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        if (val !== product.reorder?.toString()) {
          mutation.mutate(Number(val));
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      }}
      disabled={mutation.isPending}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

function InlineEditProductModal({ product, onClose, queryClient }: {
  product: any;
  onClose: () => void;
  queryClient: any;
}) {
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => { const res = await api.get("/categories", { params: { page: 0, size: 1000, status: "Active" } }); return res.data?.content ?? []; }
  });
  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", "reference"],
    queryFn: async () => { const res = await api.get("/suppliers", { params: { page: 0, size: 100 } }); return res.data?.content ?? []; },
    staleTime: 5 * 60_000,
  });
  const [selectedCategoryId, setSelectedCategoryId] = useState(String(product.categoryId ?? ""));
  const [selectedSupplierId, setSelectedSupplierId] = useState(String(product.supplierId ?? ""));
  const categoryIsMissing = Boolean(selectedCategoryId) && !categories.some((category: any) => String(category.id) === selectedCategoryId);
  const supplierIsMissing = Boolean(selectedSupplierId) && !suppliers.some((supplier: any) => String(supplier.id) === selectedSupplierId);

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.put(`/products/${product.id || product.sku}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-stats"] });
      toast.success("Product updated successfully");
      onClose();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, "Failed to update product")),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    updateMutation.mutate({
      name: fd.get("name"),
      code: fd.get("code"),
      specification: fd.get("specification"),
      cost: Number(fd.get("cost")),
      price: Number(fd.get("price")),
      imageUrl: fd.get("imageUrl") || null,
      categoryId: Number(fd.get("categoryId")),
      supplierId: Number(fd.get("supplierId")),
    });
  };

  return (
    <ModalShell
      open={true}
      onClose={onClose}
      title="Edit Product"
      subtitle={product.name}
      icon={<Pencil className="size-5" />}
      footer={
        <>
          <button onClick={onClose} disabled={updateMutation.isPending} className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm hover:bg-muted">Cancel</button>
          <button type="submit" form="inline-edit-product-form" disabled={updateMutation.isPending} className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground glow-ring" style={{ background: "var(--gradient-primary)" }}>
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </>
      }
    >
      <form id="inline-edit-product-form" onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="SKU Code" required><input name="code" className={inputCls} defaultValue={product.sku} required /></Field>
        <Field label="Supplier" required>
          <select name="supplierId" className={selectCls} value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)} required>
            <option value="" disabled>Select supplier</option>
            {supplierIsMissing && <option value={selectedSupplierId}>{product.brand || "Current supplier"}</option>}
            {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Product Name" required className="sm:col-span-2"><input name="name" className={inputCls} defaultValue={product.name} required /></Field>
        <Field label="Image URL" className="sm:col-span-2"><input name="imageUrl" className={inputCls} defaultValue={product.imageUrl || ""} /></Field>
        <Field label="Specification" required className="sm:col-span-2"><textarea name="specification" className={`${inputCls} min-h-20 resize-y py-2`} defaultValue={product.specification || ""} required /></Field>
        <Field label="Category" required>
          <select name="categoryId" className={selectCls} value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)} required>
            <option value="" disabled>Select category</option>
            {categoryIsMissing && <option value={selectedCategoryId}>{product.category || "Current category"}</option>}
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Cost (₫)"><input name="cost" type="number" className={inputCls} defaultValue={product.cost} min={0} /></Field>
        <Field label="Sell Price (₫)" className="sm:col-span-2"><input name="price" type="number" className={inputCls} defaultValue={product.price} min={0} /></Field>
      </form>
    </ModalShell>
  );
}

function InlineReactivateButton({ product, onDone, queryClient }: {
  product: any;
  onDone: () => void;
  queryClient: any;
}) {
  const mutation = useMutation({
    mutationFn: () => api.put(`/products/${product?.id || product?.sku}/reactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-stats"] });
      toast.success("Product reactivated");
      onDone();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, "Failed to reactivate product")),
  });

  return (
    <button
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className="h-10 px-5 rounded-lg bg-success text-success-foreground text-sm font-medium hover:bg-success/90"
    >
      {mutation.isPending ? "Reactivating..." : "Reactivate"}
    </button>
  );
}

function InlineDeleteButton({ product, onDone, queryClient, mode }: {
  product: any;
  onDone: () => void;
  queryClient: any;
  mode: "soft" | "hard";
}) {
  const mutation = useMutation({
    mutationFn: () => mode === "hard"
      ? api.delete(`/products/${product?.id || product?.sku}/hard`)
      : api.delete(`/products/${product?.id || product?.sku}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-stats"] });
      toast.success(mode === "hard" ? "Product permanently deleted" : "Product deactivated");
      onDone();
    },
    onError: (err: unknown) => toast.error(getErrorMessage(err, "Failed to delete product")),
  });

  return (
    <button
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      className="h-10 px-5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90"
    >
      {mutation.isPending
        ? (mode === "hard" ? "Deleting..." : "Deactivating...")
        : (mode === "hard" ? "Permanently Delete" : "Confirm Deactivate")}
    </button>
  );
}
