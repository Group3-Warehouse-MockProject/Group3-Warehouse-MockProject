import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { users, warehouses, type AppUser, type Role } from "@/lib/warehouse-data";

interface AppContextValue {
  currentUser: AppUser;
  setUserId: (id: string) => void;
  /** Active warehouse scope (null = all warehouses, only Admin/Manager). */
  activeWarehouseId: string | null;
  setActiveWarehouseId: (id: string | null) => void;
  canSwitchWarehouse: boolean;
}

const AppCtx = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string>(users[0].id);
  const currentUser = users.find((u) => u.id === userId) ?? users[0];

  const canSwitchWarehouse = currentUser.role === "Admin" || currentUser.role === "Manager";
  const [activeWarehouseId, setActiveWarehouseId] = useState<string | null>(
    currentUser.warehouseId,
  );

  const value = useMemo<AppContextValue>(() => {
    const scope = canSwitchWarehouse ? activeWarehouseId : currentUser.warehouseId;
    return {
      currentUser,
      setUserId: (id) => {
        const u = users.find((x) => x.id === id);
        setUserId(id);
        if (u) setActiveWarehouseId(u.warehouseId);
      },
      activeWarehouseId: scope,
      setActiveWarehouseId,
      canSwitchWarehouse,
    };
  }, [currentUser, activeWarehouseId, canSwitchWarehouse]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

export function useScopedWarehouseIds(): string[] {
  const { activeWarehouseId } = useApp();
  return activeWarehouseId ? [activeWarehouseId] : warehouses.map((w) => w.id);
}

export const roleLabels: Record<Role, string> = {
  Admin: "Admin",
  Manager: "Manager",
  Warehouse_Manager: "Warehouse Manager",
  Staff: "Staff",
};
