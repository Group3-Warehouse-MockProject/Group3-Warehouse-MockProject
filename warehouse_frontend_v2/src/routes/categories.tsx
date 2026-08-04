import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useApp } from "@/lib/app-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Search, Layers, Pencil, Trash2, AlertCircle, Package } from "lucide-react";
import { ModalShell, Field, inputCls } from "@/components/modal-shell";
import { useState } from "react";

export const Route = createFileRoute("/categories")({
  head: () => ({ meta: [{ title: "Categories — TechStock" }] }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { currentUser } = useApp();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [hardDeleteTarget, setHardDeleteTarget] = useState<any>(null);

  const isAdmin = currentUser?.role === "Admin";
  const canManage = currentUser?.role === "Admin" || currentUser?.role === "Manager";

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get("/categories");
      return res.data as any[];
    },
  });

  const filtered = categories.filter((c: any) =>
    c.name.toLowerCase().includes(q.toLowerCase()) ||
    (c.description || "").toLowerCase().includes(q.toLowerCase())
  );

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/categories", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category created successfully");
      setAddOpen(false);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to create category"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.put(`/categories/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category updated successfully");
      setEditCategory(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to update category"),
  });

  const softDeleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category deactivated");
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to delete category"),
  });

  const hardDeleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/categories/${id}/hard`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category permanently deleted");
      setHardDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Failed to permanently delete category"),
  });

  if (isLoading) return <AppShell><div className="p-8">Loading categories...</div></AppShell>;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Categories</h1>
            <p className="text-sm text-muted-foreground mt-1">{filtered.length} categories</p>
          </div>
          {canManage && (
            <button
              onClick={() => setAddOpen(true)}
              className="h-10 px-4 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 glow-ring"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Plus className="size-4" />Add Category
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search categories..."
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-input border border-border text-sm"
          />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((cat: any) => (
            <div
              key={cat.id}
              className="surface-card border border-border/60 rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all duration-300 group flex flex-col"
            >
              <div className="h-36 bg-secondary/40 relative overflow-hidden">
                {cat.imageUrl ? (
                  <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Layers className="size-12 text-muted-foreground/30 group-hover:scale-110 transition-transform duration-500" />
                  </div>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-semibold text-base">{cat.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2 flex-1">{cat.description || "No description"}</p>
                {canManage && (
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/40">
                    <button
                      onClick={() => setEditCategory(cat)}
                      className="h-8 px-3 rounded-md text-xs font-medium bg-secondary border border-border hover:bg-muted flex items-center gap-1.5 transition-colors"
                    >
                      <Pencil className="size-3" />Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(cat)}
                      className="h-8 px-3 rounded-md text-xs font-medium border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="size-3" />Deactivate
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => setHardDeleteTarget(cat)}
                        className="h-8 px-3 rounded-md text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center gap-1.5 transition-colors ml-auto"
                      >
                        <Trash2 className="size-3" />Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-16 text-center">
              <Layers className="size-12 text-muted-foreground/30 mx-auto mb-3" />
              <div className="text-muted-foreground font-medium">No categories found.</div>
              <div className="text-sm text-muted-foreground/60 mt-1">Try adjusting your search or add a new category.</div>
            </div>
          )}
        </div>
      </div>

      {/* Add Category Modal */}
      <AddCategoryModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={(data: any) => createMutation.mutate(data)}
        saving={createMutation.isPending}
      />

      {/* Edit Category Modal */}
      {editCategory && (
        <EditCategoryModal
          category={editCategory}
          onClose={() => setEditCategory(null)}
          onSave={(data: any) => updateMutation.mutate({ id: editCategory.id, data })}
          saving={updateMutation.isPending}
        />
      )}

      {/* Soft Delete Confirmation */}
      <ModalShell
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Deactivate Category"
        subtitle="This will hide the category from listings"
        icon={<AlertCircle className="size-5" />}
        maxWidth="28rem"
        footer={
          <>
            <button onClick={() => setDeleteTarget(null)} className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm hover:bg-muted">Cancel</button>
            <button
              onClick={() => deleteTarget && softDeleteMutation.mutate(deleteTarget.id)}
              disabled={softDeleteMutation.isPending}
              className="h-10 px-5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90"
            >
              {softDeleteMutation.isPending ? "Deactivating..." : "Confirm Deactivate"}
            </button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Are you sure you want to deactivate <strong>{deleteTarget?.name}</strong>? The category will be hidden but can be restored later.
        </p>
      </ModalShell>

      {/* Hard Delete Confirmation */}
      <ModalShell
        open={!!hardDeleteTarget}
        onClose={() => setHardDeleteTarget(null)}
        title="Permanently Delete Category"
        subtitle="This action cannot be undone"
        icon={<AlertCircle className="size-5" />}
        maxWidth="28rem"
        footer={
          <>
            <button onClick={() => setHardDeleteTarget(null)} className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm hover:bg-muted">Cancel</button>
            <button
              onClick={() => hardDeleteTarget && hardDeleteMutation.mutate(hardDeleteTarget.id)}
              disabled={hardDeleteMutation.isPending}
              className="h-10 px-5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90"
            >
              {hardDeleteMutation.isPending ? "Deleting..." : "Permanently Delete"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to <strong className="text-destructive">permanently delete</strong> <strong>{hardDeleteTarget?.name}</strong>?
          </p>
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
            ⚠️ This will remove the category permanently. Categories with existing products cannot be deleted.
          </div>
        </div>
      </ModalShell>
    </AppShell>
  );
}

function AddCategoryModal({ open, onClose, onSave, saving }: {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  saving: boolean;
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSave({
      name: fd.get("name"),
      description: fd.get("description") || null,
      imageUrl: fd.get("imageUrl") || null,
    });
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Add Category"
      subtitle="Create a new product category"
      icon={<Layers className="size-5" />}
      footer={
        <>
          <button onClick={onClose} disabled={saving} className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm hover:bg-muted">Cancel</button>
          <button type="submit" form="add-cat-form" disabled={saving} className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground glow-ring" style={{ background: "var(--gradient-primary)" }}>
            {saving ? "Creating..." : "Create Category"}
          </button>
        </>
      }
    >
      <form id="add-cat-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Category Name" required><input name="name" className={inputCls} placeholder="e.g. CPUs, Motherboards, RAM" required /></Field>
        <Field label="Description"><textarea name="description" className={`${inputCls} min-h-20 resize-y py-2`} placeholder="Optional description..." /></Field>
        <Field label="Image URL"><input name="imageUrl" className={inputCls} placeholder="https://example.com/image.png" /></Field>
      </form>
    </ModalShell>
  );
}

function EditCategoryModal({ category, onClose, onSave, saving }: {
  category: any;
  onClose: () => void;
  onSave: (data: any) => void;
  saving: boolean;
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSave({
      name: fd.get("name"),
      description: fd.get("description") || null,
      imageUrl: fd.get("imageUrl") || null,
    });
  };

  return (
    <ModalShell
      open={true}
      onClose={onClose}
      title="Edit Category"
      subtitle={category.name}
      icon={<Pencil className="size-5" />}
      footer={
        <>
          <button onClick={onClose} disabled={saving} className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm hover:bg-muted">Cancel</button>
          <button type="submit" form="edit-cat-form" disabled={saving} className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground glow-ring" style={{ background: "var(--gradient-primary)" }}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </>
      }
    >
      <form id="edit-cat-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Category Name" required><input name="name" className={inputCls} defaultValue={category.name} required /></Field>
        <Field label="Description"><textarea name="description" className={`${inputCls} min-h-20 resize-y py-2`} defaultValue={category.description || ""} /></Field>
        <Field label="Image URL"><input name="imageUrl" className={inputCls} defaultValue={category.imageUrl || ""} /></Field>
      </form>
    </ModalShell>
  );
}
