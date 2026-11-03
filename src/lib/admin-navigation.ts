import { LayoutDashboard, Package, ShoppingBag, Boxes, Users, FolderOpen, Tag, Image, PanelBottom, Ticket, Gift, CreditCard, Settings } from "lucide-react";

export const ADMIN_NAVIGATION = [
  { id: "overview", label: "Overview", group: "Store", icon: LayoutDashboard },
  { id: "orders", label: "Orders", group: "Store", icon: ShoppingBag },
  { id: "products", label: "Products", group: "Store", icon: Package },
  { id: "inventory", label: "Inventory", group: "Store", icon: Boxes },
  { id: "categories", label: "Categories", group: "Store", icon: FolderOpen },
  { id: "brands", label: "Brands", group: "Store", icon: Tag },
  { id: "users", label: "Customers", group: "Store", icon: Users },
  { id: "hero", label: "Homepage", group: "Website", icon: Image },
  { id: "footer", label: "Footer", group: "Website", icon: PanelBottom },
  { id: "coupons", label: "Discount codes", group: "Promotions", icon: Ticket },
  { id: "spin-win", label: "Spin & win", group: "Promotions", icon: Gift },
  { id: "payments", label: "Payments", group: "Settings", icon: CreditCard },
  { id: "settings", label: "Store settings", group: "Settings", icon: Settings },
] as const;
export const ESSENTIAL_ADMIN_TABS = new Set<string>(ADMIN_NAVIGATION.map((item) => item.id));
export function adminTabHref(id: string) { return id === "overview" ? "/admin/dashboard" : `/admin/dashboard?tab=${id}`; }
