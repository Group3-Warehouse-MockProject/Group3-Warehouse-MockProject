import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { formatVND } from "@/lib/warehouse-data";
import { useApp } from "@/lib/app-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Filter, Plus, Download, Package, Boxes, AlertTriangle, TrendingUp, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { ModalShell, Field, inputCls, selectCls } from "@/components/modal-shell";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/products")({
  head: () => ({ meta: [{ title: "Products — TechStock" }] }),
  component: ProductsPage,
});

function ProductsPage() {
  const { activeWarehouseId } = useApp();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [q, setQ] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  
  const { data: productData, isLoading, error } = useQuery({
    queryKey: ["products", activeWarehouseId],
    queryFn: async () => {
      const res = await api.get("/products", {
        params: activeWarehouseId ? { warehouseIdParam: activeWarehouseId } : {}
      });
      return res.data;
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
      const res = await api.get("/categories");
      return res.data;
    }
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const res = await api.get("/suppliers");
      return res.data;
    }
  });

  const { data: locations } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const res = await api.get("/locations");
      return res.data;
    }
  });

  const getWarehouseCode = (id: string) => warehouses?.find((w: any) => w.id.toString() === id.toString())?.code ?? id;

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

    return matchesQ && matchesCategory && matchesStatus;
  });
  
  const totalPages = Math.max(1, Math.ceil(list.length / limit));
  const safePage = Math.min(page, totalPages);
  const paginatedList = list.slice((safePage - 1) * limit, safePage * limit);
  
  const units = list.reduce((s: number, p: any) => s + p.stock, 0);
  const low = list.filter((p: any) => p.stock < p.reorder).length;
  const value = list.reduce((s: number, p: any) => s + p.stock * p.cost, 0);

  if (isLoading) return <AppShell><div className="p-8">Loading data...</div></AppShell>;
  if (error) return <AppShell><div className="p-8 text-destructive">Error loading data</div></AppShell>;

  const handleExport = () => {
    if (list.length === 0) return;
    const headers = ["SKU", "Product Name", "Brand", "Category", "Warehouse", "Location", "Stock", "Cost", "Price"];
    const csvContent = [
      headers.join(","),
      ...list.map((p: any) => 
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
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Products</h1>
            <p className="text-sm text-muted-foreground mt-1">{list.length} SKUs in scope</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowFilter(!showFilter)} className={`h-10 px-4 rounded-lg border text-sm flex items-center gap-2 transition-colors ${showFilter ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border hover:bg-muted"}`}><Filter className="size-4" />Filter</button>
            <button onClick={handleExport} className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm flex items-center gap-2 hover:bg-muted"><Download className="size-4" />Export</button>
            <button onClick={() => setOpen(true)} className="h-10 px-4 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring" style={{ background: "var(--gradient-primary)" }}>
              <Plus className="size-4" />Add SKU
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={Package} label="Total SKUs" value={list.length} tone="primary" />
          <Kpi icon={Boxes} label="Units in stock" value={units.toLocaleString()} tone="accent" />
          <Kpi icon={TrendingUp} label="Inventory value" value={formatVND(value)} tone="primary" />
          <Kpi icon={AlertTriangle} label="Low stock" value={low} tone="warning" />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="relative max-w-md w-full sm:w-96">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search SKU, product name, brand..."
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-input border border-border text-sm"
            />
          </div>
          
          {showFilter && (
            <div className="flex items-center gap-3 w-full sm:w-auto p-3 surface-card rounded-lg border border-border/60">
              <select
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setPage(1);
                }}
                className="h-9 px-3 rounded-md bg-input border border-border text-sm min-w-[140px]"
              >
                <option value="">All Categories</option>
                {categories?.map((c: any) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
              
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className="h-9 px-3 rounded-md bg-input border border-border text-sm min-w-[140px]"
              >
                <option value="">All Statuses</option>
                <option value="In stock">In stock</option>
                <option value="Low">Low stock</option>
                <option value="Out">Out of stock</option>
              </select>
            </div>
          )}
        </div>

        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40">
                <tr>
                  <th className="text-left p-4">SKU</th>
                  <th className="text-left p-4">Product</th>
                  <th className="text-left p-4">Category</th>
                  <th className="text-left p-4">Warehouse</th>
                  <th className="text-left p-4">Location</th>
                  <th className="text-right p-4">Stock</th>
                  <th className="text-right p-4">Cost</th>
                  <th className="text-right p-4">Price</th>
                  <th className="text-center p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.map((p: any) => {
                  const low = p.stock < p.reorder;
                  const out = p.stock === 0;
                  return (
                    <tr key={`${p.sku}-${p.warehouseId}`} className="border-t border-border/60 hover:bg-secondary/30 transition-colors">
                      <td className="p-4 font-mono text-xs text-muted-foreground">{p.sku}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="size-10 rounded-md object-cover border border-border" />
                          ) : (
                            <div className="size-10 rounded-md bg-secondary/80 flex items-center justify-center border border-border">
                              <Package className="size-5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs text-muted-foreground">{p.brand}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 rounded-md text-xs bg-secondary border border-border">{p.category}</span>
                      </td>
                      <td className="p-4 font-mono text-xs">{getWarehouseCode(p.warehouseId)}</td>
                      <td className="p-4 font-mono text-xs">{p.location}</td>
                      <td className="p-4 text-right font-semibold">{p.stock}</td>
                      <td className="p-4 text-right">{formatVND(p.cost)}</td>
                      <td className="p-4 text-right">{formatVND(p.price)}</td>
                      <td className="p-4 text-center">
                        {out ? (
                          <span className="px-2 py-1 rounded-md text-xs bg-destructive/15 text-destructive">Out</span>
                        ) : low ? (
                          <span className="px-2 py-1 rounded-md text-xs bg-warning/15 text-warning">Low</span>
                        ) : (
                          <span className="px-2 py-1 rounded-md text-xs bg-success/15 text-success">In stock</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {paginatedList.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground text-sm">
                      No products match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && <div className="flex items-center justify-between p-4 border-t border-border/60 text-sm">
              <div className="text-muted-foreground text-xs">
                Showing {(safePage - 1) * limit + 1}–{Math.min(safePage * limit, list.length)} of {list.length} entries
              </div>
            <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="size-8 grid place-items-center rounded-md border border-border bg-secondary hover:bg-muted disabled:opacity-40"
                >
                <ChevronLeft className="size-4" />
              </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`size-8 rounded-md text-xs font-medium ${
                      n === safePage
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary border border-border hover:bg-muted"
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="size-8 grid place-items-center rounded-md border border-border bg-secondary hover:bg-muted disabled:opacity-40"
                >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
          }
        </div>
      </div>
      <AddSkuModal open={open} onClose={() => setOpen(false)} warehouses={warehouses || []} categories={categories || []} suppliers={suppliers || []} locations={locations || []} />
    </AppShell>
  );
}

function AddSkuModal({ open, onClose, warehouses, categories, suppliers, locations }: { open: boolean; onClose: () => void; warehouses: any[]; categories: any[]; suppliers: any[]; locations: any[] }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");

  useEffect(() => {
    if (!open) {
      setSelectedWarehouse("");
    }
  }, [open]);

  const { data: allProducts } = useQuery({
    queryKey: ["all-products-for-locations"],
    queryFn: async () => {
      const res = await api.get("/products");
      return res.data;
    },
    enabled: open
  });

  const occupiedLocations = new Set(
    (allProducts || [])
      .filter((p: any) => p.warehouseId === selectedWarehouse)
      .map((p: any) => p.location)
  );

  const availableLocations = locations.filter((loc: any) => {
    const locStr = `${loc.zoneCode}-${loc.rackCode}-${loc.binCode}`;
    return !occupiedLocations.has(locStr);
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
      initialStock: Number(formData.get("initialStock")),
      reorderPoint: Number(formData.get("reorderPoint")),
      cost: Number(formData.get("cost")),
      price: Number(formData.get("price")),
    };
    try {
      setLoading(true);
      await api.post("/products", payload);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onClose();
    } catch (err: any) {
      console.error(err);
      alert("Error saving product: " + (err.response?.data?.message || err.response?.data?.error || err.message || JSON.stringify(err)));
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
            {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Product name" required className="sm:col-span-2"><input name="name" className={inputCls} placeholder="Intel Core i7-14700K" required /></Field>
        <Field label="Image URL" className="sm:col-span-2"><input name="imageUrl" className={inputCls} placeholder="https://example.com/image.png" /></Field>
        <Field label="Specification" required className="sm:col-span-2"><textarea name="specification" className={`${inputCls} min-h-[80px] resize-y py-2`} placeholder="e.g., 6 Cores, 12 Threads, 4.3 GHz Max Boost" required /></Field>
        <Field label="Category" required>
          <select name="categoryId" className={selectCls} defaultValue="" required>
            <option value="" disabled>Select category</option>
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Warehouse" required>
          <select name="warehouseId" className={selectCls} value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)} required>
            <option value="" disabled>Select warehouse</option>
            {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.code} — {w.city}</option>)}
          </select>
        </Field>
        <Field label="Bin location">
          <select name="locationId" className={selectCls} defaultValue="">
            <option value="">No location assigned</option>
            {availableLocations.map((loc: any) => (
              <option key={loc.id} value={loc.id}>
                Zone {loc.zoneCode} - Rack {loc.rackCode} - Bin {loc.binCode}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Initial stock"><input name="initialStock" type="number" className={inputCls} defaultValue={0} min={0} /></Field>
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
