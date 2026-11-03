"use client";

import { createContext, useContext, Suspense } from "react";
import AdminWorkspace from "@/components/admin/AdminWorkspace";

export interface AdminThemeContextType {
  theme: "dark" | "light";
  isLight: boolean;
  toggleTheme: () => void;
}
export const AdminThemeContext = createContext<AdminThemeContextType>({ theme: "light", isLight: true, toggleTheme: () => {} });
export function useAdminTheme() { return useContext(AdminThemeContext); }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="admin-workspace-loading">Opening your store workspace…</div>}>
    <AdminWorkspace>{children}</AdminWorkspace>
  </Suspense>;
}
