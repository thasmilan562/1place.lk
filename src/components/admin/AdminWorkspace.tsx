"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Bell, ExternalLink, LogOut, Menu, Moon, Plus, Search, Sun, X } from "lucide-react";
import { Category } from "@/lib/types";
import { getCategories } from "@/lib/firestore-client";
import { ADMIN_NAVIGATION, adminTabHref } from "@/lib/admin-navigation";
import { AdminThemeContext } from "@/app/admin/dashboard/layout";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import ProductModal from "./ProductModal";
import CommandPalette from "./CommandPalette";
import { playOrderChime } from "@/lib/audio-chime";
import { connectAdminFirebase, disconnectAdminFirebase } from "@/lib/admin-firebase";

export default function AdminWorkspace({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("tab") || "overview";
  const current = ADMIN_NAVIGATION.find((item) => item.id === active) || ADMIN_NAVIGATION[0];
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pending, setPending] = useState(0);
  const [orderAlert, setOrderAlert] = useState("");
  const [orderAlertIds, setOrderAlertIds] = useState<string[]>([]);
  const [notificationError, setNotificationError] = useState("");
  const mobileRef = useDialogFocus(mobileOpen, () => setMobileOpen(false));

  useEffect(() => {
    const saved = localStorage.getItem("admin_minimal_theme");
    if (saved === "dark" || saved === "light") setTheme(saved);
    let active = true;
    fetch("/api/admin/auth/session", { cache: "no-store" }).then(async (res) => {
      if (res.status === 401 || res.status === 403) { router.replace("/admin/login"); return; }
      if (!res.ok) throw new Error("Session unavailable");
      const result = await res.json();
      if (!active) return;
      if (result.authenticated) {
        connectAdminFirebase().catch((e) => {
          setNotificationError(e instanceof Error ? e.message : "Admin database sign-in is unavailable.");
          console.warn("Firebase client admin token warning (server API continues):", e);
        });
        if (active) setAuthed(true);
      }
      else router.replace("/admin/login");
    }).catch((error) => { if (active) setAuthError(error instanceof Error ? error.message : "Unable to connect to the admin database."); });
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    return () => { root.classList.remove("dark", "light"); };
  }, [theme]);

  useEffect(() => {
    if (!authed || !productOpen || categories.length > 0) return;
    getCategories().then(setCategories).catch(() => {});
  }, [authed, productOpen, categories.length]);

  useEffect(() => {
    if (!authed) return;
    let initialized = false;
    const known = new Set<string>();

    const handleOrdersUpdated = (event: Event) => {
      const orders = ((event as CustomEvent<Array<Record<string, any>>>).detail || []);
      setNotificationError("");
      setPending(
        orders.filter((order) =>
          order.notificationRead !== true &&
          ["pending", "pending cod", "processing", "payment pending"].includes(
            String(order.status || order.orderStatus || "").toLowerCase()
          )
        ).length
      );
      const added = orders.filter((order) => order.id && !known.has(order.id) && order.notificationRead !== true);
      orders.forEach((order) => {
        if (order.id) known.add(order.id);
      });
      if (initialized && added.length) {
        playOrderChime();
        setOrderAlertIds(added.map((order) => String(order.id)));
        setOrderAlert(
          `${added.length === 1 ? "A new order has" : `${added.length} new orders have`} arrived. Review in Orders.`
        );
      }
      initialized = true;
    };

    const handleOrdersError = (event: Event) => {
      const msg = (event as CustomEvent<string>).detail;
      if (msg) setNotificationError(msg);
    };

    window.addEventListener("admin-orders-updated", handleOrdersUpdated);
    window.addEventListener("admin-orders-error", handleOrdersError);
    return () => {
      window.removeEventListener("admin-orders-updated", handleOrdersUpdated);
      window.removeEventListener("admin-orders-error", handleOrdersError);
    };
  }, [authed]);

  const viewNewOrders = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (orderAlertIds.length) {
      const readAt = new Date().toISOString();
      try {
        const response = await fetch("/api/admin/orders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: orderAlertIds,
            updates: { notificationRead: true, notificationReadAt: readAt },
          }),
        });
        if (!response.ok) throw new Error("Could not save notification read state.");
      } catch (error) {
        console.warn("Could not mark order notification as read:", error);
      }
    }
    setOrderAlert("");
    setOrderAlertIds([]);
    router.push(adminTabHref("orders"));
  };

  useEffect(() => {
    const openProduct = () => setProductOpen(true);
    const shortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen((open) => !open); }
    };
    window.addEventListener("open-add-product-modal", openProduct);
    window.addEventListener("keydown", shortcut);
    return () => { window.removeEventListener("open-add-product-modal", openProduct); window.removeEventListener("keydown", shortcut); };
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname, active]);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [mobileOpen]);

  const toggleTheme = () => setTheme((previous) => {
    const next = previous === "light" ? "dark" : "light";
    localStorage.setItem("admin_minimal_theme", next);
    return next;
  });
  const logout = async () => {
    const result = await fetch("/api/admin/auth/logout", { method: "POST" }).catch(() => null);
    if (!result?.ok) { window.alert("Could not sign out. Please try again."); return; }
    await disconnectAdminFirebase();
    sessionStorage.removeItem("admin_auth"); localStorage.removeItem("admin_auth"); router.replace("/admin/login");
  };

  if (!authed) return <div data-admin-root className="admin-workspace-loading"><p role={authError ? "alert" : "status"}>{authError || "Opening your store workspace…"}</p>{authError && <button type="button" onClick={() => window.location.reload()}>Try again</button>}</div>;

  return <AdminThemeContext.Provider value={{ theme, isLight: theme === "light", toggleTheme }}>
    <div data-admin-root data-admin-theme={theme} data-theme={theme} className={`minimal-admin ${theme}`}>
      {mobileOpen && <div className="admin-mobile-scrim" aria-hidden="true" onClick={() => setMobileOpen(false)} />}
      <aside ref={mobileOpen ? mobileRef : undefined} className={`admin-rail ${mobileOpen ? "admin-rail--open" : ""}`} role={mobileOpen ? "dialog" : undefined} aria-modal={mobileOpen ? true : undefined} aria-label="Store navigation" tabIndex={mobileOpen ? -1 : undefined}>
        <div className="admin-rail__brand"><Link href="/admin/dashboard" aria-label="ONEPLACE admin"><img src="/logo.png" alt="ONEPLACE" /></Link><button type="button" className="admin-mobile-only" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={19} /></button></div>
        <p className="admin-rail__caption">Your store, at a glance.</p>
        <nav data-admin-nav aria-label="Admin navigation">
          {["Store", "Website", "Promotions", "Settings"].map((group) => <div key={group} className="admin-nav-group"><p>{group}</p>{ADMIN_NAVIGATION.filter((item) => item.group === group).map((item) => <Link key={item.id} href={adminTabHref(item.id)} aria-current={current.id === item.id ? "page" : undefined} onClick={() => setMobileOpen(false)}><item.icon size={17} strokeWidth={1.65} /><span>{item.label}</span>{item.id === "orders" && pending > 0 && <small>{pending}</small>}</Link>)}</div>)}
        </nav>
        <div className="admin-rail__bottom"><Link href="/" target="_blank" rel="noopener noreferrer"><ExternalLink size={16} /> View store</Link><button type="button" onClick={logout}><LogOut size={16} /> Sign out</button></div>
      </aside>
      <div className="admin-workspace">
        <header data-admin-header className="admin-toolbar"><div className="admin-toolbar__title"><button type="button" className="admin-mobile-only" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20} /></button><span>{current.label}</span></div>
          <div className="admin-toolbar__actions"><button type="button" className="admin-search-button" onClick={() => setSearchOpen(true)} aria-label="Search admin"><Search size={16} /><span>Find anything</span><kbd>⌘ K</kbd></button><button type="button" aria-label={theme === "light" ? "Use dark appearance" : "Use light appearance"} onClick={toggleTheme}>{theme === "light" ? <Moon size={17} /> : <Sun size={17} />}</button><Link href={adminTabHref("orders")} aria-label={`${pending} pending orders`}><Bell size={17} />{pending > 0 && <small>{pending}</small>}</Link><button type="button" className="admin-primary" onClick={() => setProductOpen(true)}><Plus size={16} /><span>Add product</span></button></div>
        </header>
        <main className="admin-main">{notificationError && <p className="admin-feedback" role="status">Live order updates disconnected: {notificationError}</p>}{orderAlert && <div className="admin-order-alert" role="status" aria-live="polite"><Bell size={20}/><div><strong>New order</strong><p>{orderAlert}</p><Link href={adminTabHref("orders")} onClick={viewNewOrders}>View orders</Link></div><button type="button" aria-label="Dismiss new order notification" onClick={() => setOrderAlert("")}><X size={18}/></button></div>}<div className="admin-main__content">{children}</div><footer data-admin-footer>ONEPLACE · Store workspace</footer></main>
      </div>
      <CommandPalette isOpen={searchOpen} onClose={() => setSearchOpen(false)} onOpenAddProduct={() => setProductOpen(true)} />
      <ProductModal isOpen={productOpen} onClose={() => setProductOpen(false)} categories={categories} onSave={() => { setProductOpen(false); window.location.reload(); }} />
    </div>
  </AdminThemeContext.Provider>;
}
