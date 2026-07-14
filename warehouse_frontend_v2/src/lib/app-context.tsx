import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from "react";
import { warehouses, type AppUser, type Role } from "@/lib/warehouse-data";
import { parseJwt } from "@/lib/api";

interface AppContextValue {
  currentUser: AppUser | null;
  /** Active warehouse scope (null = all warehouses, only Admin/Manager). */
  activeWarehouseId: string | null;
  setActiveWarehouseId: (id: string | null) => void;
  canSwitchWarehouse: boolean;
  logout: () => void;
  updateCurrentUser: (data: Partial<AppUser>) => void;
}

const AppCtx = createContext<AppContextValue | null>(null);

export const roleLabels: Record<Role, string> = {
  Admin: "Admin",
  Manager: "Manager",
  Warehouse_Manager: "Warehouse Manager",
  Staff: "Staff",
};

function getUserFromToken(): AppUser | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("token");
  if (!token) return null;
  const payload = parseJwt(token);
  if (!payload) return null;

  let role: Role = "Staff";
  if (payload.role === "ADMIN") role = "Admin";
  else if (payload.role === "MANAGER") role = "Manager";
  else if (payload.role === "WAREHOUSE_MANAGER") role = "Warehouse_Manager";

  const name = payload.username || payload.sub || "User";
  const initials = name.substring(0, 2).toUpperCase();

  return {
    id: String(payload.userId),
    name: name,
    role: role,
    warehouseId: payload.warehouseId ? String(payload.warehouseId) : null,
    initials: initials,
    title: roleLabels[role],
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(getUserFromToken());
  const canSwitchWarehouse = currentUser?.role === "Admin" || currentUser?.role === "Manager";
  
  const [activeWarehouseId, setActiveWarehouseId] = useState<string | null>(
    currentUser?.warehouseId ?? null
  );

  useEffect(() => {
    // Listen for storage changes (e.g. login from another tab)
    const handleStorage = () => {
      setCurrentUser(getUserFromToken());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const value = useMemo<AppContextValue>(() => {
    const scope = canSwitchWarehouse ? activeWarehouseId : currentUser?.warehouseId ?? null;
    return {
      currentUser,
      activeWarehouseId: scope,
      setActiveWarehouseId,
      canSwitchWarehouse,
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
          setCurrentUser(null);
          window.location.href = "/login";
        }
      },
      updateCurrentUser: (data: Partial<AppUser>) => {
        setCurrentUser(prev => prev ? { ...prev, ...data } : null);
      }
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


