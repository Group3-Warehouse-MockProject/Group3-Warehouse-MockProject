/* eslint-disable */
// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { Star, ChevronLeft, ChevronRight, Plus, Search, Truck, Award, Clock, Globe, Pencil, Trash2, Power, Filter, X, CheckCircle2, Phone, Mail, MapPin } from "lucide-react";
import { ModalShell, Field, inputCls, textareaCls } from "@/components/modal-shell";

export const Route = createFileRoute("/suppliers")({
  head: () => ({ meta: [{ title: "Suppliers — TechStock" }] }),
  component: SuppliersPage,
});

const PAGE_SIZE = 6;
const API_URL = "http://localhost:8080/api/suppliers";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
  };
};

const calculateRating = (onTime, quality) => {
  const scoreOnTime = (Number(onTime) / 100) * 5;
  const scoreQuality = (Number(quality) / 100) * 5;
  const final = (scoreQuality * 0.5) + (scoreOnTime * 0.5);
  return Math.min(5, Math.max(0, Number(final.toFixed(1))));
};

function SuppliersPage() {
  const [suppliersList, setSuppliersList] = useState([]);
  const [deletedIds, setDeletedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [openView, setOpenView] = useState(false);
  const [viewingSupplier, setViewingSupplier] = useState(null);

  const [selectedCountry, setSelectedCountry] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  const defaultCountries = ["Vietnam", "Singapore", "Taiwan"];
  const allAvailableCountries = Array.from(
    new Set([...defaultCountries, ...suppliersList.map((s) => s.country).filter(Boolean)])
  );

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(API_URL, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setSuppliersList(data);
      }
    } catch (err) {
      console.error("Lỗi kết nối API lấy danh sách:", err);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this supplier?")) {
      try {
        const res = await fetch(`${API_URL}/${id}`, { 
          method: "DELETE",
          headers: getAuthHeaders(),
        });
        if (res.ok || res.status === 204) {
          alert("Delete successful!");
          fetchSuppliers();
        } else {
          setDeletedIds((prev) => [...prev, id]);
        }
      } catch (err) {
        setDeletedIds((prev) => [...prev, id]);
      }
    }
  };

  const handleToggleStatus = async (supplier) => {
    const currentStatus = String(supplier.status || "ACTIVE").toUpperCase();
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch(`${API_URL}/${supplier.id}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchSuppliers();
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const searchLower = q.toLowerCase().trim();
  const filtered = suppliersList.filter((s) => {
    if (deletedIds.includes(s.id)) return false;
    
    const matchesSearch = searchLower === "" || 
      Object.values(s).some(val => val !== null && val !== undefined && String(val).toLowerCase().includes(searchLower));
    
    const supplierStatus = String(s.status || "ACTIVE").toUpperCase();
    const matchesStatus = selectedStatus === "ALL" || supplierStatus === selectedStatus;
    
    const supplierCountry = String(s.country || "").trim();
    const matchesCountry = selectedCountry === "ALL" || supplierCountry.toLowerCase() === selectedCountry.toLowerCase();
    
    return matchesSearch && matchesStatus && matchesCountry;
  });

  const avgRating = filtered.length > 0 
    ? (filtered.reduce((acc, s) => acc + (Number(s.rating) || 0), 0) / filtered.length).toFixed(2)
    : "0.00";

  const avgOnTime = filtered.length > 0
    ? Math.round(filtered.reduce((acc, s) => acc + (Number(s.onTimeDelivery) || 0), 0) / filtered.length) + "%"
    : "0%";
  
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const isFilterActive = selectedCountry !== "ALL" || selectedStatus !== "ALL";

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Suppliers</h1>
            <p className="text-sm text-muted-foreground mt-1">Partners distributing components (Auto-Rating Mode)</p>
          </div>
          <button onClick={() => setOpenAdd(true)} className="h-10 px-4 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring" style={{ background: "var(--gradient-primary)" }}>
            <Plus className="size-4" />Add supplier
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={Truck} label="Suppliers" value={filtered.length} tone="primary" />
          <Kpi icon={Award} label="Avg rating" value={avgRating} tone="accent" />
          <Kpi icon={Clock} label="Avg on-time" value={avgOnTime} tone="primary" />
          <Kpi icon={Globe} label="Countries" value={new Set(filtered.map((s) => s.country).filter(Boolean)).size} tone="warning" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                value={q} 
                onChange={(e) => { setQ(e.target.value); setPage(1); }} 
                placeholder="Search across all fields..." 
                className={`w-full h-10 pl-9 pr-8 rounded-lg bg-input border text-sm transition-colors ${q ? 'border-emerald-500 ring-1 ring-emerald-500/20' : 'border-border'}`} 
              />
              {q && <button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"><X className="size-4" /></button>}
            </div>
            {q && (
              <button onClick={() => setQ("")} className="text-xs text-muted-foreground hover:text-foreground underline">
                Clear search
              </button>
            )}
          </div>

          <div className="relative">
            <button 
              onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
              className={`h-10 px-4 rounded-lg border text-sm flex items-center gap-2.5 transition-all ${
                isFilterActive 
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-medium' 
                  : 'bg-secondary/50 border-border text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Filter className="size-3.5" /> 
                <span>Filter</span>
              </div>
              {isFilterActive && <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />}
            </button>

            {filterDropdownOpen && (
              <div className="absolute right-0 top-12 mt-1 w-72 rounded-xl bg-card border border-border p-4 shadow-2xl z-20 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-xs font-bold uppercase tracking-wider">Filter Options</span>
                  {isFilterActive && (
                    <button 
                      onClick={() => { setSelectedCountry("ALL"); setSelectedStatus("ALL"); }}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Clear all
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Country</label>
                  <select value={selectedCountry} onChange={(e) => { setSelectedCountry(e.target.value); setPage(1); }} className={inputCls}>
                    <option value="ALL">All Countries</option>
                    {allAvailableCountries.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase">Status</label>
                  <select value={selectedStatus} onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }} className={inputCls}>
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[950px]">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40">
                <tr>
                  <th className="text-left p-4 w-[22%]">
                    <div className="flex items-center gap-1.5">
                      <span>Supplier</span>
                      {q && <span className="size-2 rounded-full bg-emerald-500 animate-pulse" title="Searched" />}
                    </div>
                  </th>
                  <th className="text-left p-4 w-[13%]">
                    <div className="flex items-center gap-1.5">
                      <span>Phone</span>
                      {q && <span className="size-2 rounded-full bg-emerald-500 animate-pulse" title="Searched" />}
                    </div>
                  </th>
                  <th className="text-left p-4 w-[16%]">
                    <div className="flex items-center gap-1.5">
                      <span>Email</span>
                      {q && <span className="size-2 rounded-full bg-emerald-500 animate-pulse" title="Searched" />}
                    </div>
                  </th>
                  <th className="text-left p-4 w-[14%]">
                    <div className="flex items-center gap-1.5">
                      <span>Country</span>
                      {(selectedCountry !== "ALL" || q) && (
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" title="Filtered/Searched by country" />
                      )}
                    </div>
                  </th>
                  <th className="text-left p-4 w-[15%]">
                    <div className="flex items-center gap-1.5">
                      <span>Performance</span>
                      {q && <span className="size-2 rounded-full bg-emerald-500 animate-pulse" title="Searched" />}
                    </div>
                  </th>
                  <th className="text-left p-4 w-[10%]">
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      {(selectedStatus !== "ALL" || q) && (
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" title="Filtered/Searched by status" />
                      )}
                    </div>
                  </th>
                  <th className="text-center p-4 w-[10%]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((s) => {
                  const statusStr = String(s.status || "ACTIVE").toUpperCase();
                  const isActive = statusStr === "ACTIVE";
                  return (
                    <tr key={s.id} className="border-t border-border/60 hover:bg-secondary/30 transition-colors">
                      <td className="p-4">
                        <button onClick={() => { setViewingSupplier(s); setOpenView(true); }} className="font-medium text-left hover:text-primary hover:underline transition-colors block truncate max-w-[200px]" title={s.name}>
                          {s.name}
                        </button>
                        <div className="text-xs text-muted-foreground font-mono">ID: {s.id}</div>
                      </td>
                      <td className="p-4 font-mono text-xs">{s.phoneNumber || "N/A"}</td>
                      <td className="p-4 text-muted-foreground truncate max-w-[160px]" title={s.email}>{s.email || "N/A"}</td>
                      <td className="p-4 font-medium">{s.country || "N/A"}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="flex items-center gap-1 font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                            <Star className="size-3.5 fill-current" /> {s.rating ?? 4.5}
                          </span>
                          <span className="text-muted-foreground">{s.onTimeDelivery ?? 90}%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isActive ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-muted text-muted-foreground border border-border'}`}>
                          <span className={`size-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
                          {statusStr}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleToggleStatus(s)} title="Toggle Status" className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"><Power className="size-4" /></button>
                          <button onClick={() => { setEditingSupplier(s); setOpenEdit(true); }} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"><Pencil className="size-4" /></button>
                          <button onClick={() => handleDelete(s.id)} title="Delete" className="p-1.5 rounded hover:bg-secondary text-destructive"><Trash2 className="size-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between p-4 border-t border-border text-sm text-muted-foreground">
            <div>Showing {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1} to {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} entries</div>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                disabled={safePage === 1}
                className="size-9 rounded-xl border border-border bg-card flex items-center justify-center hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-foreground"
              >
                <ChevronLeft className="size-4" />
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => {
                const isCurrent = pNum === safePage;
                return (
                  <button
                    key={pNum}
                    onClick={() => setPage(pNum)}
                    className={`size-9 rounded-xl font-medium text-xs flex items-center justify-center transition-all ${
                      isCurrent 
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                        : "border border-border bg-card text-foreground hover:bg-secondary"
                    }`}
                  >
                    {pNum}
                  </button>
                );
              })}

              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                disabled={safePage === totalPages}
                className="size-9 rounded-xl border border-border bg-card flex items-center justify-center hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-foreground"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {openAdd && <AddSupplierModal open={openAdd} onClose={() => setOpenAdd(false)} onSave={fetchSuppliers} />}
      {openEdit && <EditSupplierModal open={openEdit} supplier={editingSupplier} onClose={() => { setOpenEdit(false); setEditingSupplier(null); }} onSave={fetchSuppliers} />}
      {openView && <ViewSupplierModal open={openView} supplier={viewingSupplier} onClose={() => { setOpenView(false); setViewingSupplier(null); }} />}
    </AppShell>
  );
}

function ViewSupplierModal({ open, supplier, onClose }: { open: boolean; supplier: any; onClose: () => void }) {
  if (!supplier) return null;
  const statusStr = String(supplier.status || "ACTIVE").toUpperCase();
  const isActive = statusStr === "ACTIVE";

  return (
    <ModalShell 
      open={open} 
      onClose={onClose} 
      title="Supplier Details" 
      icon={<Truck className="size-5" />} 
      footer={<button onClick={onClose} className="h-10 px-5 rounded-lg bg-primary text-white font-medium">Close</button>}
    >
      <div className="space-y-4 text-sm">
        <div className="bg-secondary/30 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase font-semibold">Supplier Name</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-muted text-muted-foreground border border-border'}`}>
              <span className={`size-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
              {statusStr}
            </span>
          </div>
          <div className="text-xl font-bold">{supplier.name}</div>
          <div className="text-xs font-mono text-muted-foreground">ID: {supplier.id}</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 border rounded-xl flex items-center gap-3 bg-card">
            <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center"><Phone className="size-4" /></div>
            <div>
              <span className="text-[11px] text-muted-foreground block uppercase font-semibold">Phone Number</span>
              <span className="font-mono font-medium">{supplier.phoneNumber || "N/A"}</span>
            </div>
          </div>
          <div className="p-3 border rounded-xl flex items-center gap-3 bg-card">
            <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center"><Mail className="size-4" /></div>
            <div>
              <span className="text-[11px] text-muted-foreground block uppercase font-semibold">Email Address</span>
              <span className="font-medium text-xs break-all">{supplier.email || "N/A"}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 border rounded-xl flex items-center gap-3 bg-card">
            <div className="size-9 rounded-lg bg-warning/10 text-warning grid place-items-center"><Globe className="size-4" /></div>
            <div>
              <span className="text-[11px] text-muted-foreground block uppercase font-semibold">Country</span>
              <span className="font-medium">{supplier.country || "N/A"}</span>
            </div>
          </div>
          <div className="p-3 border rounded-xl flex items-center gap-3 bg-card">
            <div className="size-9 rounded-lg bg-accent/10 text-accent grid place-items-center"><MapPin className="size-4" /></div>
            <div>
              <span className="text-[11px] text-muted-foreground block uppercase font-semibold">Address</span>
              <span className="font-medium text-xs truncate max-w-[200px]" title={supplier.address}>{supplier.address || "N/A"}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 border rounded-xl bg-card">
            <span className="text-[11px] text-muted-foreground uppercase font-semibold block">Auto-Calculated Rating</span>
            <span className="text-amber-500 font-bold flex items-center gap-1.5 text-lg mt-1">
              <Star className="size-5 fill-current" /> {supplier.rating ?? 4.5} <span className="text-xs text-muted-foreground font-normal">/ 5.0</span>
            </span>
          </div>
          <div className="p-3 border rounded-xl bg-card">
            <span className="text-[11px] text-muted-foreground uppercase font-semibold block">On-Time Delivery</span>
            <span className="font-bold text-lg mt-1 block text-foreground">{supplier.onTimeDelivery ?? 95}%</span>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function AddSupplierModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({ 
    name: "", country: "", phone: "", email: "", address: "", status: "ACTIVE",
    onTimeDelivery: "95", qualityPassRate: "98" 
  });

  const computedRating = calculateRating(form.onTimeDelivery, form.qualityPassRate);

  const handleCreate = async () => {
    if (!form.name || !form.country || !form.phone || !form.email || !form.address) {
      alert("Please fill in all required fields (*)");
      return;
    }
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: form.name, email: form.email, phoneNumber: form.phone,
          address: form.address, status: form.status, country: form.country,
          rating: computedRating, 
          onTimeDelivery: parseInt(form.onTimeDelivery) || 95 
        }),
      });
      if (res.ok) { onSave(); onClose(); }
    } catch (err) { console.error(err); }
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Add Supplier (Auto-Rating)" icon={<Truck className="size-5" />} footer={
      <>
        <button onClick={onClose} className="h-10 px-4 bg-secondary border rounded-lg">Cancel</button>
        <button onClick={handleCreate} className="h-10 px-5 bg-primary text-white rounded-lg font-medium">Save</button>
      </>
    }>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Supplier Name *" className="sm:col-span-2"><input className={inputCls} value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></Field>
        <Field label="Country *"><input className={inputCls} value={form.country} onChange={e => setForm({...form, country: e.target.value})} /></Field>
        <Field label="Phone *"><input className={inputCls} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></Field>
        <Field label="Email *"><input className={inputCls} value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></Field>
        <Field label="On-Time Delivery (%)"><input type="number" min="0" max="100" className={inputCls} value={form.onTimeDelivery} onChange={e => setForm({...form, onTimeDelivery: e.target.value})} /></Field>
        <Field label="Quality Pass Rate (%)"><input type="number" min="0" max="100" className={inputCls} value={form.qualityPassRate} onChange={e => setForm({...form, qualityPassRate: e.target.value})} /></Field>
        
        <div className="sm:col-span-2 p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-primary" />
            <span className="text-sm font-medium">System Auto-Calculated Rating:</span>
          </div>
          <span className="text-lg font-bold text-amber-500 flex items-center gap-1">
            <Star className="size-5 fill-current" /> {computedRating} / 5.0
          </span>
        </div>

        <Field label="Address *" className="sm:col-span-2"><textarea className={textareaCls} value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></Field>
      </div>
    </ModalShell>
  );
}

function EditSupplierModal({ open, supplier, onClose, onSave }: { open: boolean; supplier: any; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({ name: "", country: "", phone: "", email: "", address: "", status: "ACTIVE", onTimeDelivery: "95", qualityPassRate: "95" });

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name || "",
        country: supplier.country || "",
        phone: supplier.phoneNumber || "",
        email: supplier.email || "",
        address: supplier.address || "",
        status: supplier.status || "ACTIVE",
        onTimeDelivery: supplier.onTimeDelivery !== undefined ? String(supplier.onTimeDelivery) : "95",
        qualityPassRate: "95"
      });
    }
  }, [supplier]);

  const computedRating = calculateRating(form.onTimeDelivery, form.qualityPassRate);

  const handleUpdate = async () => {
    try {
      const res = await fetch(`${API_URL}/${supplier.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: form.name, email: form.email, phoneNumber: form.phone,
          address: form.address, status: form.status, country: form.country,
          rating: computedRating,
          onTimeDelivery: parseInt(form.onTimeDelivery) || 95
        }),
      });
      if (res.ok) { onSave(); onClose(); }
    } catch (err) { console.error(err); }
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Edit Supplier (Auto-Rating)" icon={<Pencil className="size-5" />} footer={
      <>
        <button onClick={onClose} className="h-10 px-4 bg-secondary border rounded-lg">Cancel</button>
        <button onClick={handleUpdate} className="h-10 px-5 bg-primary text-white rounded-lg font-medium">Update</button>
      </>
    }>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Supplier Name *" className="sm:col-span-2"><input className={inputCls} value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></Field>
        <Field label="Country *"><input className={inputCls} value={form.country} onChange={e => setForm({...form, country: e.target.value})} /></Field>
        <Field label="Phone *"><input className={inputCls} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></Field>
        <Field label="Email *"><input className={inputCls} value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></Field>
        <Field label="On-Time Delivery (%)"><input type="number" min="0" max="100" className={inputCls} value={form.onTimeDelivery} onChange={e => setForm({...form, onTimeDelivery: e.target.value})} /></Field>
        <Field label="Quality Pass Rate (%)"><input type="number" min="0" max="100" className={inputCls} value={form.qualityPassRate} onChange={e => setForm({...form, qualityPassRate: e.target.value})} /></Field>
        
        <div className="sm:col-span-2 p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-primary" />
            <span className="text-sm font-medium">Updated Auto Rating:</span>
          </div>
          <span className="text-lg font-bold text-amber-500 flex items-center gap-1">
            <Star className="size-5 fill-current" /> {computedRating} / 5.0
          </span>
        </div>

        <Field label="Address *" className="sm:col-span-2"><textarea className={textareaCls} value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></Field>
      </div>
    </ModalShell>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: any; label: string; value: any; tone: any }) {
  const color = tone === "warning" ? "var(--warning)" : tone === "accent" ? "var(--accent)" : "var(--primary)";
  return (
    <div className="surface-card p-5 flex items-center justify-between">
      <div>
        <div className="text-xs uppercase text-muted-foreground">{label}</div>
        <div className="mt-2 text-2xl font-bold">{value}</div>
      </div>
      <div className="size-9 rounded-lg grid place-items-center" style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}>
        <Icon className="size-4" />
      </div>
    </div>
  );
}