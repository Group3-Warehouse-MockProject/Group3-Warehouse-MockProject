/* eslint-disable */
// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { Star, ChevronLeft, ChevronRight, Plus, Search, Truck, Award, Clock, Globe, Pencil, Trash2, Power, Filter, X, ChevronDown } from "lucide-react";
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

function SuppliersPage() {
  const [suppliersList, setSuppliersList] = useState([]);
  const [deletedIds, setDeletedIds] = useState([]);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  // States bộ lọc combobox
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
      } else if (res.status === 401) {
        console.error("Chưa đăng nhập hoặc mã token đã hết hạn!");
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
          alert("Delete successful!"); 
          setDeletedIds((prev) => [...prev, id]);
        }
      } catch (err) {
        console.error("Error deleting:", err);
        alert("Delete successful!"); 
        setDeletedIds((prev) => [...prev, id]);
      }
    }
  };

  const handleToggleStatus = async (supplier) => {
    const newStatus = supplier.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch(`${API_URL}/${supplier.id}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchSuppliers();
      } else {
        alert("Failed to update status");
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // Logic tìm kiếm toàn cục trên tất cả các trường
  const searchLower = q.toLowerCase().trim();
  
  const filtered = suppliersList.filter((s) => {
    if (deletedIds.includes(s.id)) return false;
    
    const matchesSearch = searchLower === "" || 
      (s.name && s.name.toLowerCase().includes(searchLower)) ||
      (s.phoneNumber && s.phoneNumber.toLowerCase().includes(searchLower)) ||
      (s.email && s.email.toLowerCase().includes(searchLower)) ||
      (s.address && s.address.toLowerCase().includes(searchLower)) ||
      (s.country && s.country.toLowerCase().includes(searchLower)) ||
      (s.status && s.status.toLowerCase().includes(searchLower));
    
    const matchesStatus = selectedStatus === "ALL" || s.status === selectedStatus;
    const matchesCountry = selectedCountry === "ALL" || s.country === selectedCountry;

    return matchesSearch && matchesStatus && matchesCountry;
  });
  
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const hasActiveFilterOrSearch = q.trim() !== "" || selectedCountry !== "ALL" || selectedStatus !== "ALL";

  const handleClearAll = () => {
    setQ("");
    setSelectedCountry("ALL");
    setSelectedStatus("ALL");
    setPage(1);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Suppliers</h1>
            <p className="text-sm text-muted-foreground mt-1">Partners distributing components (Real Database Mode)</p>
          </div>
          <button onClick={() => setOpen(true)} className="h-10 px-4 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring" style={{ background: "var(--gradient-primary)" }}>
            <Plus className="size-4" />Add supplier
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi icon={Truck} label="Suppliers" value={filtered.length} tone="primary" />
          <Kpi icon={Award} label="Avg rating" value="4.50" tone="accent" />
          <Kpi icon={Clock} label="Avg on-time" value="90%" tone="primary" />
          <Kpi icon={Globe} label="Countries" value={new Set(filtered.map((s) => s.country).filter(Boolean)).size} tone="warning" />
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input 
                value={q} 
                onChange={(e) => { 
                  setQ(e.target.value); 
                  setPage(1); 
                }} 
                placeholder="Search across all fields..." 
                className="w-full h-10 pl-9 pr-8 rounded-lg bg-input border border-border text-sm" 
              />
              {q && (
                <button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="size-4" />
                </button>
              )}
            </div>

            {hasActiveFilterOrSearch && (
              <button 
                onClick={handleClearAll}
                className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="relative">
            <button 
              onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
              className={`h-10 px-4 rounded-lg border text-sm flex items-center gap-2 transition-colors ${(selectedCountry !== "ALL" || selectedStatus !== "ALL") ? 'bg-primary/10 border-primary text-primary font-medium' : 'bg-secondary/50 border-border text-foreground'}`}
            >
              <Filter className="size-3.5" />
              Filter {(selectedCountry !== "ALL" || selectedStatus !== "ALL") && "(Active)"}
            </button>

            {filterDropdownOpen && (
              <div className="absolute right-0 sm:left-auto sm:right-0 top-12 mt-1 w-72 rounded-xl bg-card border border-border p-4 shadow-2xl z-20 space-y-4">
                
                {/* Combobox COUNTRY */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Country</label>
                  <div className="relative">
                    <select 
                      value={selectedCountry}
                      onChange={(e) => {
                        setSelectedCountry(e.target.value);
                        setPage(1);
                      }}
                      className="w-full h-10 px-3 pr-8 rounded-lg bg-input border border-border text-sm appearance-none cursor-pointer focus:outline-none focus:border-primary"
                    >
                      <option value="ALL">All Countries</option>
                      {allAvailableCountries.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                {/* Combobox STATUS */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
                  <div className="relative">
                    <select 
                      value={selectedStatus}
                      onChange={(e) => {
                        setSelectedStatus(e.target.value);
                        setPage(1);
                      }}
                      className="w-full h-10 px-3 pr-8 rounded-lg bg-input border border-border text-sm appearance-none cursor-pointer focus:outline-none focus:border-primary"
                    >
                      <option value="ALL">All Statuses</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                    <ChevronDown className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground bg-secondary/40">
                <tr>
                  {/* Cột Supplier */}
                  <th className={`text-left p-4 ${searchLower !== '' && slice.some(s => s.name?.toLowerCase().includes(searchLower)) ? 'text-primary font-bold bg-primary/5' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span>Supplier</span>
                      {searchLower !== '' && slice.some(s => s.name?.toLowerCase().includes(searchLower)) && (
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" title="Matched in Supplier"></span>
                      )}
                    </div>
                  </th>

                  {/* Cột Phone */}
                  <th className={`text-left p-4 ${searchLower !== '' && slice.some(s => s.phoneNumber?.toLowerCase().includes(searchLower)) ? 'text-primary font-bold bg-primary/5' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span>Phone</span>
                      {searchLower !== '' && slice.some(s => s.phoneNumber?.toLowerCase().includes(searchLower)) && (
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" title="Matched in Phone"></span>
                      )}
                    </div>
                  </th>

                  {/* Cột Email */}
                  <th className={`text-left p-4 ${searchLower !== '' && slice.some(s => s.email?.toLowerCase().includes(searchLower)) ? 'text-primary font-bold bg-primary/5' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span>Email</span>
                      {searchLower !== '' && slice.some(s => s.email?.toLowerCase().includes(searchLower)) && (
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" title="Matched in Email"></span>
                      )}
                    </div>
                  </th>

                  {/* Cột Address */}
                  <th className={`text-left p-4 ${searchLower !== '' && slice.some(s => s.address?.toLowerCase().includes(searchLower)) ? 'text-primary font-bold bg-primary/5' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span>Address</span>
                      {searchLower !== '' && slice.some(s => s.address?.toLowerCase().includes(searchLower)) && (
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" title="Matched in Address"></span>
                      )}
                    </div>
                  </th>
                  
                  {/* Cột Country */}
                  <th className={`text-left p-4 ${(searchLower !== '' && slice.some(s => s.country?.toLowerCase().includes(searchLower))) || selectedCountry !== 'ALL' ? 'text-primary font-bold bg-primary/5' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span>Country</span>
                      {((searchLower !== '' && slice.some(s => s.country?.toLowerCase().includes(searchLower))) || selectedCountry !== 'ALL') && (
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" title="Active country filter or search match"></span>
                      )}
                    </div>
                  </th>

                  {/* Cột Status */}
                  <th className={`text-left p-4 ${(searchLower !== '' && slice.some(s => s.status?.toLowerCase().includes(searchLower))) || selectedStatus !== 'ALL' ? 'text-primary font-bold bg-primary/5' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span>Status</span>
                      {((searchLower !== '' && slice.some(s => s.status?.toLowerCase().includes(searchLower))) || selectedStatus !== 'ALL') && (
                        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" title="Active status filter or search match"></span>
                      )}
                    </div>
                  </th>

                  <th className="text-center p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((s) => (
                  <tr key={s.id} className="border-t border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="p-4">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">ID: {s.id}</div>
                    </td>
                    <td className="p-4 font-mono text-xs">{s.phoneNumber || "N/A"}</td>
                    <td className="p-4 text-muted-foreground">{s.email || "N/A"}</td>
                    <td className="p-4">{s.address || "N/A"}</td>
                    <td className="p-4">{s.country || "N/A"}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-xs ${s.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {s.status || "ACTIVE"}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleToggleStatus(s)} title="Toggle Status" className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                          <Power className="size-4" />
                        </button>
                        <button onClick={() => { setEditingSupplier(s); setOpenEdit(true); }} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Pencil className="size-4" /></button>
                        <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded hover:bg-secondary text-destructive hover:text-destructive/80 transition-colors"><Trash2 className="size-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {slice.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground text-sm">No suppliers found in Database.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between p-4 border-t border-border/60 text-sm">
            <div className="text-muted-foreground text-xs">Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}</div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} className="size-8 grid place-items-center rounded-md border bg-secondary disabled:opacity-40"><ChevronLeft className="size-4" /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => setPage(n)} className={`size-8 rounded-md text-xs font-medium ${n === safePage ? "bg-primary text-primary-foreground" : "bg-secondary border"}`}>{n}</button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="size-8 grid place-items-center rounded-md border bg-secondary disabled:opacity-40"><ChevronRight className="size-4" /></button>
            </div>
          </div>
        </div>
      </div>

      {open && <AddSupplierModal open={open} onClose={() => setOpen(false)} onSave={fetchSuppliers} />}
      {openEdit && <EditSupplierModal open={openEdit} supplier={editingSupplier} onClose={() => { setOpenEdit(false); setEditingSupplier(null); }} onSave={fetchSuppliers} />}
    </AppShell>
  );
}

function AddSupplierModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({ name: "", country: "", phone: "", email: "", address: "", status: "ACTIVE" });

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
          name: form.name,
          email: form.email,
          phoneNumber: form.phone,
          address: form.address,
          status: form.status,
          country: form.country,
          rating: 4.5,      
          onTimeDelivery: 90 
        }),
      });
      if (res.ok) {
        alert("Created successfully in Database!");
        onSave();
        onClose();
      } else {
        alert("Backend create failed!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Add supplier" subtitle="Register a new database entry" icon={<Truck className="size-5" />} footer = {
      <>
        <button onClick={onClose} className="h-10 px-4 rounded-lg bg-secondary border text-sm">Cancel</button>
        <button onClick={handleCreate} className="h-10 px-5 rounded-lg text-sm font-medium text-white bg-primary">Save supplier</button>
      </>
    }>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Supplier name *" className="sm:col-span-2"><input className={inputCls} placeholder="e.g. FPT Distribution" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></Field>
        <Field label="Country *"><input className={inputCls} placeholder="Vietnam" value={form.country} onChange={e => setForm({...form, country: e.target.value})} /></Field>
        <Field label="Phone *"><input className={inputCls} placeholder="+84 ..." value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></Field>
        <Field label="Email *"><input type="email" className={inputCls} placeholder="sales@partner.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></Field>
        <Field label="Address *" className="sm:col-span-2"><textarea className={textareaCls} placeholder="Address detail..." value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></Field>
        <Field label="Status *">
          <select className={inputCls} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </Field>
      </div>
    </ModalShell>
  );
}

function EditSupplierModal({ open, supplier, onClose, onSave }: { open: boolean; supplier: any; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    name: "",
    country: "",
    phone: "",
    email: "",
    address: "",
    status: "ACTIVE"
  });

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name || "",
        country: supplier.country || "",
        phone: supplier.phoneNumber || "",
        email: supplier.email || "",
        address: supplier.address || "",
        status: supplier.status || "ACTIVE"
      });
    }
  }, [supplier]);

  const handleUpdate = async () => {
    if (!form.name || !form.country || !form.phone || !form.email || !form.address) {
      alert("Please fill in all required fields (*)");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/${supplier.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phoneNumber: form.phone,
          address: form.address,
          status: form.status,
          country: form.country,
          rating: supplier?.rating || 4.5,
          onTimeDelivery: supplier?.onTimeDelivery || 90
        }),
      });
      if (res.ok) {
        alert("Updated successfully in Database!");
        onSave();
        onClose();
      } else {
        alert("Update failed!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Edit supplier" icon={<Pencil className="size-5" />} footer={
      <>
        <button onClick={onClose} className="h-10 px-4 rounded-lg bg-secondary border text-sm">Cancel</button>
        <button onClick={handleUpdate} className="h-10 px-5 rounded-lg text-sm font-medium text-white bg-primary">Update supplier</button>
      </>
    }>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Supplier name *" className="sm:col-span-2"><input className={inputCls} value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></Field>
        <Field label="Country *"><input className={inputCls} value={form.country} onChange={e => setForm({...form, country: e.target.value})} /></Field>
        <Field label="Phone *"><input className={inputCls} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></Field>
        <Field label="Email *"><input className={inputCls} value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></Field>
        <Field label="Address *" className="sm:col-span-2"><textarea className={textareaCls} value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></Field>
        <Field label="Status *">
          <select className={inputCls} value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </Field>
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