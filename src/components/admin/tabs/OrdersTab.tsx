"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useDialogFocus } from "@/lib/use-dialog-focus";
import { buildOrdersCSV } from "@/lib/order-admin-utils";
import {
  normalizeOrder,
  formatLKR,
  printOrderInvoice,
  printPackingSlip,
  NormalizedOrder,
  OrderAuditEntry,
} from "@/lib/order-utils";
import { useAdminTheme } from "@/app/admin/dashboard/layout";
import {
  Search,
  Filter,
  RefreshCw,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Printer,
  PackageCheck,
  MessageCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  ShieldCheck,
  Truck,
  CreditCard,
  Banknote,
  Trash2,
  Edit,
  Check,
  ExternalLink,
  FileText,
  DollarSign,
  User,
  Clock,
  MapPin,
  Tag,
  SlidersHorizontal,
  ChevronDown,
  Phone,
  Mail,
  Copy,
  ShoppingCart,
  Package,
  Settings,
  CheckCheck,
  RotateCcw,
  Eye,
  MoreHorizontal,
  Bike,
  AlertTriangle,
  Layers,
  CircleCheck as Sparkles,
} from "lucide-react";

interface OrdersTabProps {
  orders: any[];
  onUpdateStatus?: (id: string, newStatus: string) => Promise<void> | void;
  onDeleteOrder?: (id: string) => Promise<boolean | void> | void;
  onBulkDeleteOrders?: (ids: string[]) => Promise<{ deletedCount: number; failedCount: number }>;
  onRefresh?: () => void;
}

async function persistAdminOrderChanges(id: string | string[], updates: Record<string, unknown>) {
  const response = await fetch("/api/admin/orders", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...(Array.isArray(id) ? { ids: id } : { id }), updates }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) throw new Error(result.error || "Order changes could not be saved.");
}

async function persistAdminOrderBatch(changes: Array<{ id: string; updates: Record<string, unknown> }>) {
  const response = await fetch("/api/admin/orders", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ changes }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) throw new Error(result.error || "Order changes could not be saved.");
}

export default function OrdersTab({
  orders: rawOrders,
  onUpdateStatus,
  onDeleteOrder,
  onBulkDeleteOrders,
  onRefresh,
}: OrdersTabProps) {
  // Theme context (default dark SaaS styling, adapts to light mode cleanly)
  const { isLight } = useAdminTheme();

  // 1. Normalize All Orders (Guarantees customer name, delivery info, and items are safe)
  const normalizedOrders = useMemo(() => {
    return (rawOrders || []).map((ord) => normalizeOrder(ord, ord.id));
  }, [rawOrders]);

  // 2. Selection & Filter States
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"overview" | "items" | "timeline" | "notes">("overview");
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [activeRowMenuId, setActiveRowMenuId] = useState<string | null>(null);

  // Filters
  const [activeStatusTab, setActiveStatusTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<"all" | "today" | "week" | "month">("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [deliveryMethodFilter, setDeliveryMethodFilter] = useState<string>("all");
  const [amountRangeFilter, setAmountRangeFilter] = useState<string>("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Real-time Last Updated String
  const [lastUpdatedTime, setLastUpdatedTime] = useState("");
  useEffect(() => {
    setLastUpdatedTime(new Date().toLocaleTimeString("en-LK", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Colombo" }));
  }, [rawOrders]);

  // Close row action menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-row-menu]")) {
        setActiveRowMenuId(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Editing state inside details panel
  const [editingTracking, setEditingTracking] = useState("");
  const [editingNotes, setEditingNotes] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

  // Modals & Deletion State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [deleteModalOrder, setDeleteModalOrder] = useState<NormalizedOrder | null>(null);
  const [isDeletingSingle, setIsDeletingSingle] = useState(false);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState<{ current: number; total: number } | null>(null);
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
  const [bulkOrderStatus, setBulkOrderStatus] = useState<NormalizedOrder["orderStatus"]>("Processing");
  const [bulkPaymentStatus, setBulkPaymentStatus] = useState<NormalizedOrder["paymentStatus"] | "unchanged">("unchanged");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [savingBulkStatus, setSavingBulkStatus] = useState(false);
  const [statusConfirmModal, setStatusConfirmModal] = useState<{
    isOpen: boolean;
    orderId: string;
    newStatus: NormalizedOrder["orderStatus"];
  }>({ isOpen: false, orderId: "", newStatus: "Processing" });
  const orderDrawerRef = useDialogFocus(isDrawerOpen && !statusConfirmModal.isOpen && !deleteModalOrder && !bulkStatusModalOpen && !cancelModalOpen, () => setIsDrawerOpen(false));

  // In-app toast notification
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 3. Dynamic Real-Time Status KPI Counts (Derived strictly from real data)
  const kpiCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: normalizedOrders.length,
      pending: 0,
      confirmed: 0,
      processing: 0,
      packed: 0,
      shipped: 0,
      "out for delivery": 0,
      delivered: 0,
      cancelled: 0,
      returned: 0,
    };

    normalizedOrders.forEach((o) => {
      const s = (o.orderStatus || "").toLowerCase();
      if (s === "pending") counts.pending++;
      else if (s === "confirmed") counts.confirmed++;
      else if (s === "processing") counts.processing++;
      else if (s === "packed") counts.packed++;
      else if (s === "shipped") counts.shipped++;
      else if (s === "out for delivery" || s.includes("out")) counts["out for delivery"]++;
      else if (s === "delivered" || s.includes("complete")) counts.delivered++;
      else if (s === "cancelled") counts.cancelled++;
      else if (s === "returned") counts.returned++;
      else counts.processing++;
    });

    return counts;
  }, [normalizedOrders]);

  // 4. KPI Cards Configuration
  const KPI_CONFIGS = [
    { key: "all", label: "All orders", icon: ShoppingCart, count: kpiCounts.all },
    { key: "pending", label: "Pending", icon: Clock, count: kpiCounts.pending },
    { key: "shipped", label: "Shipped", icon: Truck, count: kpiCounts.shipped },
    { key: "delivered", label: "Delivered", icon: CheckCheck, count: kpiCounts.delivered },
  ];

  // 5. Status Tabs Configuration
  const STATUS_TABS = [
    { key: "all", label: "All Orders", count: kpiCounts.all },
    { key: "pending", label: "Pending", count: kpiCounts.pending },
    { key: "confirmed", label: "Confirmed", count: kpiCounts.confirmed },
    { key: "processing", label: "Processing", count: kpiCounts.processing },
    { key: "packed", label: "Packed", count: kpiCounts.packed },
    { key: "shipped", label: "Shipped", count: kpiCounts.shipped },
    { key: "out for delivery", label: "Out for Delivery", count: kpiCounts["out for delivery"] },
    { key: "delivered", label: "Delivered", count: kpiCounts.delivered },
    { key: "cancelled", label: "Cancelled", count: kpiCounts.cancelled },
    { key: "returned", label: "Returned", count: kpiCounts.returned },
  ];

  // 6. Filtered & Sorted Orders List
  const filteredOrders = useMemo(() => {
    let list = [...normalizedOrders];

    // Status Tab Filter
    if (activeStatusTab !== "all") {
      list = list.filter((o) => o.orderStatus.toLowerCase() === activeStatusTab.toLowerCase());
    }

    // Search filter (Order ID, Customer Name, Phone, Email, Tracking, Items)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.orderId.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerEmail.toLowerCase().includes(q) ||
          o.primaryPhone.toLowerCase().includes(q) ||
          o.alternativePhone.toLowerCase().includes(q) ||
          (o.trackingNumber && o.trackingNumber.toLowerCase().includes(q)) ||
          o.items.some((it) => it.name.toLowerCase().includes(q) || (it.sku && it.sku.toLowerCase().includes(q)))
      );
    }

    // Date range filter
    if (dateRange !== "all") {
      const now = new Date();
      list = list.filter((o) => {
        const d = new Date(o.createdAt);
        if (isNaN(d.getTime())) return false;
        if (dateRange === "today") return d.toDateString() === now.toDateString();
        if (dateRange === "week") {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return d >= weekAgo;
        }
        if (dateRange === "month") {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return d >= monthAgo;
        }
        return true;
      });
    }

    // Payment method filter
    if (paymentMethodFilter !== "all") {
      list = list.filter((o) => {
        const method = o.paymentMethod.toLowerCase();
        if (paymentMethodFilter === "card") return /card|payhere/.test(method);
        if (paymentMethodFilter === "bank") return method.includes("bank");
        return method === paymentMethodFilter.toLowerCase();
      });
    }

    // Delivery method filter
    if (deliveryMethodFilter !== "all") {
      list = list.filter((o) => {
        const isPickup = (o.rawDoc?.deliveryOption || "").toLowerCase().includes("pickup");
        if (deliveryMethodFilter === "pickup") return isPickup;
        if (deliveryMethodFilter === "courier") return !isPickup;
        return true;
      });
    }

    // Amount range filter
    if (amountRangeFilter !== "all") {
      list = list.filter((o) => {
        const amount = o.grandTotal || 0;
        if (amountRangeFilter === "under_10k") return amount < 10000;
        if (amountRangeFilter === "10k_50k") return amount >= 10000 && amount <= 50000;
        if (amountRangeFilter === "50k_100k") return amount > 50000 && amount <= 100000;
        if (amountRangeFilter === "over_100k") return amount > 100000;
        return true;
      });
    }

    // Payment status filter
    if (paymentStatusFilter !== "all") {
      list = list.filter((o) => o.paymentStatus.toLowerCase() === paymentStatusFilter.toLowerCase());
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "highest") return b.grandTotal - a.grandTotal;
      if (sortBy === "lowest") return a.grandTotal - b.grandTotal;
      return 0;
    });

    return list;
  }, [
    normalizedOrders,
    activeStatusTab,
    searchQuery,
    dateRange,
    paymentMethodFilter,
    deliveryMethodFilter,
    amountRangeFilter,
    paymentStatusFilter,
    sortBy,
  ]);

  // Active filter count (for "Clear Filters" button)
  const isAnyFilterActive =
    activeStatusTab !== "all" ||
    searchQuery.trim() !== "" ||
    dateRange !== "all" ||
    paymentMethodFilter !== "all" ||
    deliveryMethodFilter !== "all" ||
    amountRangeFilter !== "all" ||
    paymentStatusFilter !== "all";

  const handleClearAllFilters = () => {
    setActiveStatusTab("all");
    setSearchQuery("");
    setDateRange("all");
    setPaymentMethodFilter("all");
    setDeliveryMethodFilter("all");
    setAmountRangeFilter("all");
    setPaymentStatusFilter("all");
    setSortBy("newest");
    setCurrentPage(1);
  };

  // 7. Paginated Orders
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage]);

  // Auto-clamp page if items deletion reduces total pages
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // 8. Single Source of Truth for Selected Order (Rule 15)
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    return normalizedOrders.find((o) => o.id === selectedOrderId) || null;
  }, [normalizedOrders, selectedOrderId]);

  // Open Drawer and populate tracking/notes
  const handleOpenDrawer = (order: NormalizedOrder) => {
    setSelectedOrderId(order.id);
    setEditingTracking(order.trackingNumber || "");
    setEditingNotes(order.internalNotes || "");
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  // Selection Checkbox Handlers
  const handleToggleSelectAll = () => {
    const pageIds = paginatedOrders.map((order) => order.id);
    if (pageIds.length > 0 && pageIds.every((id) => selectedRowIds.includes(id))) {
      setSelectedRowIds((previous) => previous.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedRowIds((previous) => Array.from(new Set([...previous, ...pageIds])));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    if (selectedRowIds.includes(id)) {
      setSelectedRowIds(selectedRowIds.filter((r) => r !== id));
    } else {
      setSelectedRowIds([...selectedRowIds, id]);
    }
  };

  // Copy helper with feedback
  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(label);
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch { showToast("Couldn't copy. Select and copy the text manually.", "error"); }
  };

  // 9. Real-Time Status Update Handlers
  const executeOrderStatusUpdate = async (orderId: string, newOrderStatus: NormalizedOrder["orderStatus"]) => {
    if (updatingOrderId) return;
    setUpdatingOrderId(orderId);
    try {
      const currentOrder = normalizedOrders.find((o) => o.id === orderId);
      const auditEntry: OrderAuditEntry = {
        action: "Order Status Updated",
        previousStatus: currentOrder?.orderStatus || "Pending",
        newStatus: newOrderStatus,
        timestamp: new Date().toISOString(),
      };

      if (onUpdateStatus) {
        await onUpdateStatus(orderId, newOrderStatus);
      } else {
        await persistAdminOrderChanges(orderId, {
          orderStatus: newOrderStatus, status: newOrderStatus,
          updatedAt: new Date().toISOString(), statusHistory: [auditEntry],
        });
        onRefresh?.();
      }
      setStatusConfirmModal({ isOpen: false, orderId: "", newStatus: "Processing" });
      showToast("Order status updated.");
    } catch (e) {
      console.error("Error updating order status:", e);
      showToast("Couldn't update the status. Please try again.", "error");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleRequestStatusChange = (orderId: string, newOrderStatus: NormalizedOrder["orderStatus"]) => {
    setStatusConfirmModal({
      isOpen: true,
      orderId,
      newStatus: newOrderStatus,
    });
  };

  const handleUpdatePaymentStatus = async (orderId: string, newPaymentStatus: NormalizedOrder["paymentStatus"]) => {
    try {
      const currentOrder = normalizedOrders.find((o) => o.id === orderId);
      if (currentOrder && /card|payhere/i.test(currentOrder.paymentMethod) && newPaymentStatus === "Paid" && currentOrder.paymentStatus !== "Paid") {
        showToast("Online payments are confirmed by the payment provider. This payment is not verified yet.", "error");
        return;
      }
      const auditEntry: OrderAuditEntry = {
        action: "Payment Status Updated",
        previousStatus: currentOrder?.paymentStatus || "Pending",
        newStatus: newPaymentStatus,
        timestamp: new Date().toISOString(),
      };

      await persistAdminOrderChanges(orderId, {
        paymentStatus: newPaymentStatus,
        updatedAt: new Date().toISOString(),
        statusHistory: [auditEntry],
      });

      if (onRefresh) onRefresh();
    } catch (e) {
      console.error("Error updating payment status:", e);
      alert("Failed to update payment status.");
    }
  };

  const handleConfirmCashCollected = async (orderId: string) => {
    if (!confirm("Confirm cash collection for this COD order?")) return;
    await handleUpdatePaymentStatus(orderId, "Paid");
  };

  const handleSaveDetails = async () => {
    if (!selectedOrder) return;
    try {
      setSavingDetails(true);
      await persistAdminOrderChanges(selectedOrder.id, {
        trackingNumber: editingTracking,
        internalNotes: editingNotes,
        updatedAt: new Date().toISOString(),
      });
      showToast("Tracking and notes saved.");
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error("Error saving order details:", e);
      showToast("Couldn't save tracking and notes. Please try again.", "error");
    } finally {
      setSavingDetails(false);
    }
  };

  const handleCancelOrderSubmit = async () => {
    if (!selectedOrder || !cancelReason.trim()) return;
    try {
      const auditEntry: OrderAuditEntry = {
        action: "Order Cancelled",
        previousStatus: selectedOrder.orderStatus,
        newStatus: "Cancelled",
        timestamp: new Date().toISOString(),
        note: cancelReason,
      };

      await persistAdminOrderChanges(selectedOrder.id, {
        orderStatus: "Cancelled",
        status: "Cancelled",
        ...(selectedOrder.paymentStatus === "Paid" || selectedOrder.paymentStatus === "Refunded" ? {} : { paymentStatus: "Cancelled" }),
        cancellationReason: cancelReason,
        updatedAt: new Date().toISOString(),
        statusHistory: [auditEntry],
      });

      setCancelModalOpen(false);
      setCancelReason("");
      alert("Order cancelled successfully.");
      if (onRefresh) onRefresh();
    } catch (e) {
      console.error("Error cancelling order:", e);
      showToast("Failed to cancel order.", "error");
    }
  };

  // Permanent Single Order Deletion
  const handleExecuteSingleDelete = async () => {
    if (!deleteModalOrder) return;
    const targetId = deleteModalOrder.id;
    try {
      setIsDeletingSingle(true);
      if (onDeleteOrder) {
        await onDeleteOrder(targetId);
      } else {
        const response = await fetch("/api/admin/orders", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: targetId }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result.success) throw new Error(result.error || "Order deletion failed");
      }

      setDeleteModalOrder(null);
      if (selectedOrderId === targetId) {
        setIsDrawerOpen(false);
        setSelectedOrderId(null);
      }
      setSelectedRowIds((prev) => prev.filter((id) => id !== targetId));
      showToast(`Order #${targetId.slice(-8)} permanently deleted.`, "success");
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to delete order:", err);
      showToast("Failed to delete order from database.", "error");
    } finally {
      setIsDeletingSingle(false);
    }
  };

  // Permanent Bulk Orders Deletion
  const handleExecuteBulkDelete = async () => {
    if (selectedRowIds.length === 0) return;
    const total = selectedRowIds.length;
    try {
      setIsDeletingBulk(true);
      setBulkDeleteProgress({ current: 0, total });

      if (onBulkDeleteOrders) {
        const CHUNK_SIZE = 25;
        let totalDeleted = 0;
        let totalFailed = 0;
        for (let i = 0; i < selectedRowIds.length; i += CHUNK_SIZE) {
          const chunk = selectedRowIds.slice(i, i + CHUNK_SIZE);
          const res = await onBulkDeleteOrders(chunk);
          totalDeleted += res.deletedCount;
          totalFailed += res.failedCount;
          setBulkDeleteProgress({ current: Math.min(total, i + CHUNK_SIZE), total });
        }

        if (totalFailed > 0) {
          showToast(`${totalDeleted} orders deleted. ${totalFailed} failed.`, "error");
        } else {
          showToast(`${totalDeleted} orders permanently deleted.`, "success");
        }
      } else {
        const CHUNK_SIZE = 50;
        let deleted = 0;
        for (let i = 0; i < selectedRowIds.length; i += CHUNK_SIZE) {
          const chunk = selectedRowIds.slice(i, i + CHUNK_SIZE);
          const response = await fetch("/api/admin/orders", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: chunk }),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || !result.success) throw new Error(result.error || "Order bulk deletion failed");
          deleted += Number(result.deletedCount) || chunk.length;
          setBulkDeleteProgress({ current: deleted, total });
        }
        showToast(`${deleted} orders permanently deleted.`, "success");
      }

      setBulkDeleteModalOpen(false);
      setSelectedRowIds([]);
      if (selectedOrderId && selectedRowIds.includes(selectedOrderId)) {
        setIsDrawerOpen(false);
        setSelectedOrderId(null);
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Bulk delete failed:", err);
      showToast("Bulk delete failed. Please try again.", "error");
    } finally {
      setIsDeletingBulk(false);
      setBulkDeleteProgress(null);
    }
  };

  const handleExportSelectedCSV = () => {
    const listToExport =
      selectedRowIds.length > 0
        ? normalizedOrders.filter((o) => selectedRowIds.includes(o.id))
        : filteredOrders;

    const blob = new Blob([buildOrdersCSV(listToExport)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `oneplace-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleApplyBulkStatus = async () => {
    if (!selectedRowIds.length || savingBulkStatus) return;
    const selectedOrders = normalizedOrders.filter((order) => selectedRowIds.includes(order.id));
    if (bulkPaymentStatus === "Paid" && selectedOrders.some((order) => /card|payhere/i.test(order.paymentMethod) && order.paymentStatus !== "Paid")) {
      showToast("Online payments must be verified by the payment provider. Keep their current payment status.", "error"); return;
    }
    setSavingBulkStatus(true);
    try {
      await persistAdminOrderBatch(selectedOrders.map((order) => ({ id: order.id, updates: {
          orderStatus: bulkOrderStatus, status: bulkOrderStatus,
          ...(bulkPaymentStatus === "unchanged" ? {} : { paymentStatus: bulkPaymentStatus }),
          updatedAt: new Date().toISOString(),
          statusHistory: [{ action: "Bulk Status Updated", previousStatus: order.orderStatus, newStatus: bulkOrderStatus, timestamp: new Date().toISOString() }],
        } })));
      setBulkStatusModalOpen(false); setSelectedRowIds([]);
      showToast(`${selectedOrders.length} orders updated.`); onRefresh?.();
    } catch { showToast("Couldn't update selected orders. No partial batch was saved.", "error"); }
    finally { setSavingBulkStatus(false); }
  };

  // Order Status Badge Visual Helper
  const renderOrderStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "delivered" || s.includes("complete")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCheck className="w-3.5 h-3.5" />
          <span>Delivered</span>
        </span>
      );
    }
    if (s === "shipped") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
          <Truck className="w-3.5 h-3.5" />
          <span>Shipped</span>
        </span>
      );
    }
    if (s === "out for delivery" || s.includes("out")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
          <Bike className="w-3.5 h-3.5" />
          <span>Out for Delivery</span>
        </span>
      );
    }
    if (s === "packed") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          <Package className="w-3.5 h-3.5" />
          <span>Packed</span>
        </span>
      );
    }
    if (s === "processing") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
          <Settings className="w-3.5 h-3.5 animate-spin-slow" />
          <span>Processing</span>
        </span>
      );
    }
    if (s === "confirmed") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Confirmed</span>
        </span>
      );
    }
    if (s === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
          <XCircle className="w-3.5 h-3.5" />
          <span>Cancelled</span>
        </span>
      );
    }
    if (s === "returned") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Returned</span>
        </span>
      );
    }
    // Pending fallback
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
        <Clock className="w-3.5 h-3.5" />
        <span>Pending</span>
      </span>
    );
  };

  // Payment Status Badge Visual Helper
  const renderPaymentStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "paid" || s === "confirmed") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Confirmed</span>
        </span>
      );
    }
    if (s === "failed" || s === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          <span>Failed</span>
        </span>
      );
    }
    if (s === "refunded") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          <span>Refunded</span>
        </span>
      );
    }
    // Pending
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
        <span>Pending</span>
      </span>
    );
  };

  // Payment Method Badge Visual Helper
  const renderMethodBadge = (method: string) => {
    const m = (method || "").toUpperCase();
    if (m === "CARD" || m.includes("PAYHERE") || m.includes("CARD")) {
      return (
        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
          isLight ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-white/5 border-white/[0.08] text-slate-300"
        }`}>
          Card
        </span>
      );
    }
    if (m.includes("BANK")) {
      return (
        <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
          isLight ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-white/5 border-white/[0.08] text-slate-300"
        }`}>
          Bank Transfer
        </span>
      );
    }
    return (
      <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
        isLight ? "bg-slate-100 border-slate-200 text-slate-700" : "bg-white/5 border-white/[0.08] text-slate-300"
      }`}>
        COD
      </span>
    );
  };

  return (
    <div data-orders-workspace data-more-filters={showMoreFilters ? "true" : "false"} className={`space-y-4 font-sans ${isLight ? "text-slate-900" : "text-[#F8FAFC]"}`}>
      {/* ════════════════════════════════════════════════════════════════════
         1. ORDERS MANAGEMENT TOP HEADER
      ════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20 shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Orders</h1>
            <p className={`text-xs mt-0.5 ${isLight ? "text-slate-500" : "text-[#94A3B8]"}`}>
              Review purchases, prepare deliveries and keep customers informed.
            </p>
          </div>
        </div>

        {/* Top Right: Last Updated Clock + Action Buttons */}
        <div className="flex items-center gap-2.5 self-end sm:self-center flex-wrap">
          {lastUpdatedTime && (
            <div className={`hidden md:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border ${
              isLight ? "bg-white border-slate-200 text-slate-500" : "bg-[#0E141D] border-white/[0.08] text-[#94A3B8]"
            }`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Data received {lastUpdatedTime}</span>
            </div>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                isLight
                  ? "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-xs"
                  : "bg-[#0E141D] border-white/[0.08] hover:bg-[#121A25] text-slate-300 hover:text-white"
              }`}
              title="Refresh orders from database"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportSelectedCSV}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
              isLight
                ? "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-xs"
                : "bg-[#0E141D] border-white/[0.08] hover:bg-[#121A25] text-slate-300 hover:text-white"
            }`}
            title="Export order records as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{selectedRowIds.length ? "Export selected" : "Export results"}</span>
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
         2. STATUS KPI CARDS (10 Compact Cards, Real Dynamic Counts)
      ════════════════════════════════════════════════════════════════════ */}
      <div className="orders-summary-grid">
        {KPI_CONFIGS.map((kpi) => {
          const Icon = kpi.icon;
          const isActive = activeStatusTab === kpi.key;
          const isZero = kpi.count === 0;

          return (
            <button
              key={kpi.key}
              aria-pressed={isActive}
              type="button"
              onClick={() => {
                setActiveStatusTab(kpi.key);
                setCurrentPage(1);
              }}
              className={`p-2 sm:p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between group ${
                isActive
                  ? isLight
                    ? "bg-blue-50/80 border-blue-500 shadow-xs"
                    : "bg-[#121A25] border-blue-500 shadow-md shadow-blue-500/10"
                  : isZero
                  ? isLight
                    ? "bg-white border-slate-200 opacity-60 hover:opacity-100"
                    : "bg-[#0E141D] border-white/[0.06] opacity-60 hover:opacity-100 hover:bg-[#121A25]"
                  : isLight
                  ? "bg-white border-[#E5E7EB] hover:border-slate-300 shadow-xs"
                  : "bg-[#0E141D] border-white/[0.08] hover:border-white/20 hover:bg-[#121A25]"
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <div className={`p-1 rounded-lg ${
                  isActive ? "bg-blue-500/20 text-blue-400" : isLight ? "bg-slate-100 text-slate-600" : "bg-white/5 text-slate-400 group-hover:text-white"
                }`}>
                  <Icon className="w-3 h-3" />
                </div>

              </div>

              <div>
                <p className={`text-[10px] font-medium leading-tight truncate ${
                  isActive ? "text-blue-400 font-bold" : isLight ? "text-slate-500" : isZero ? "text-slate-500" : "text-[#94A3B8]"
                }`}>
                  {kpi.label}
                </p>
                <h3 className={`text-sm sm:text-base font-bold font-mono mt-0.5 ${
                  isActive ? "text-blue-400" : isLight ? "text-slate-900" : isZero ? "text-slate-400" : "text-white"
                }`}>
                  {kpi.count.toLocaleString()}
                </h3>
              </div>
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
         3. STATUS TABS (Horizontal scrolling pill bar)
      ════════════════════════════════════════════════════════════════════ */}
      <label className="orders-status-filter">Order status
        <select aria-label="Filter by order status" value={activeStatusTab} onChange={(event) => { setActiveStatusTab(event.target.value); setCurrentPage(1); }}>
          {STATUS_TABS.map((item) => <option key={item.key} value={item.key}>{item.label} ({item.count})</option>)}
        </select>
      </label>

      {/* ════════════════════════════════════════════════════════════════════
         4. SEARCH + FILTER TOOLBAR
      ════════════════════════════════════════════════════════════════════ */}
      <div className="orders-toolbar flex flex-col lg:flex-row lg:items-center gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${
            isLight ? "text-slate-400" : "text-[#94A3B8]"
          }`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Search orders"
            placeholder="Search orders, customers or phone numbers…"
            className={`w-full pl-10 pr-9 py-2.5 rounded-xl text-xs font-medium outline-none border transition-all ${
              isLight
                ? "bg-white border-[#E5E7EB] text-[#111827] placeholder-slate-400 focus:border-blue-500"
                : "bg-[#0E141D] border-white/[0.08] text-[#F8FAFC] placeholder-slate-500 focus:border-blue-500"
            }`}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Range Dropdown */}
          <div className="relative">
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value as any);
                setCurrentPage(1);
              }}
              className={`appearance-none pl-3 pr-8 py-2.5 rounded-xl text-xs font-semibold outline-none border cursor-pointer ${
                isLight ? "bg-white border-[#E5E7EB] text-[#111827]" : "bg-[#0E141D] border-white/[0.08] text-[#F8FAFC]"
              }`}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
          </div>

          {/* Payment Method Dropdown */}
          <div className="relative">
            <select
              value={paymentMethodFilter}
              onChange={(e) => {
                setPaymentMethodFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={`appearance-none pl-3 pr-8 py-2.5 rounded-xl text-xs font-semibold outline-none border cursor-pointer ${
                isLight ? "bg-white border-[#E5E7EB] text-[#111827]" : "bg-[#0E141D] border-white/[0.08] text-[#F8FAFC]"
              }`}
            >
              <option value="all">All Payment Methods</option>
              <option value="cod">Cash on Delivery (COD)</option>
              <option value="card">Card / PayHere Online</option>
              <option value="bank">Bank Transfer</option>
              <option value="whatsapp">WhatsApp Direct</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
          </div>

          {/* Delivery Method Dropdown */}
          <div data-order-extra-filter className="relative">
            <select
              value={deliveryMethodFilter}
              onChange={(e) => {
                setDeliveryMethodFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={`appearance-none pl-3 pr-8 py-2.5 rounded-xl text-xs font-semibold outline-none border cursor-pointer ${
                isLight ? "bg-white border-[#E5E7EB] text-[#111827]" : "bg-[#0E141D] border-white/[0.08] text-[#F8FAFC]"
              }`}
            >
              <option value="all">All Delivery Methods</option>
              <option value="courier">Courier Delivery</option>
              <option value="pickup">Store Pickup</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
          </div>

          {/* Amount Range Dropdown */}
          <div data-order-extra-filter className="relative">
            <select
              value={amountRangeFilter}
              onChange={(e) => {
                setAmountRangeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={`appearance-none pl-3 pr-8 py-2.5 rounded-xl text-xs font-semibold outline-none border cursor-pointer ${
                isLight ? "bg-white border-[#E5E7EB] text-[#111827]" : "bg-[#0E141D] border-white/[0.08] text-[#F8FAFC]"
              }`}
            >
              <option value="all">All Amounts</option>
              <option value="under_10k">Under LKR 10,000</option>
              <option value="10k_50k">LKR 10,000 - 50,000</option>
              <option value="50k_100k">LKR 50,000 - 100,000</option>
              <option value="over_100k">Over LKR 100,000</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500" />
          </div>

          {/* More Filters Toggle */}
          <button
            type="button"
            onClick={() => setShowMoreFilters(!showMoreFilters)}
            className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              showMoreFilters
                ? "bg-blue-600 text-white border-blue-600"
                : isLight
                ? "bg-white border-[#E5E7EB] text-[#111827] hover:bg-slate-50"
                : "bg-[#0E141D] border-white/[0.08] text-[#F8FAFC] hover:bg-[#121A25]"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>More Filters</span>
          </button>

          {/* Clear Filters (Dynamic) */}
          {isAnyFilterActive && (
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="px-3 py-2.5 rounded-xl border border-white/[0.08] bg-white/5 hover:bg-white/10 text-amber-400 text-xs font-semibold cursor-pointer flex items-center gap-1.5"
              title="Reset all active search and filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* More Filters Popover / Bar */}
      {showMoreFilters && (
        <div className={`p-3 rounded-2xl border flex items-center gap-3 flex-wrap text-xs animate-in fade-in ${
          isLight ? "bg-slate-50 border-slate-200" : "bg-[#121A25] border-white/[0.08]"
        }`}>
          {/* Payment Status */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold">Payment Status:</span>
            <select
              value={paymentStatusFilter}
              onChange={(e) => {
                setPaymentStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold outline-none cursor-pointer ${
                isLight ? "bg-white border-slate-300 text-slate-900" : "bg-[#0E141D] border-white/10 text-white"
              }`}
            >
              <option value="all">All</option>
              <option value="paid">Paid / Confirmed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-semibold">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold outline-none cursor-pointer ${
                isLight ? "bg-white border-slate-300 text-slate-900" : "bg-[#0E141D] border-white/10 text-white"
              }`}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
            </select>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
         5. ORDERS TABLE (High Density, Pixel-Perfect Matching Reference)
      ════════════════════════════════════════════════════════════════════ */}
      <div className={`rounded-2xl border overflow-hidden transition-all ${
        isLight ? "bg-white border-[#E5E7EB] shadow-xs" : "bg-[#0E141D] border-white/[0.08]"
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[850px]">
            <thead>
              <tr className={`border-b text-[10px] font-bold uppercase tracking-wider select-none ${
                isLight ? "bg-slate-50 border-slate-200 text-slate-500" : "bg-[#080C12]/80 border-white/[0.06] text-[#94A3B8]"
              }`}>
                <th className="py-3.5 pl-4 pr-2 w-10 text-center">
                  <input
                    type="checkbox"
                    aria-label="Select all orders"
                    checked={paginatedOrders.length > 0 && paginatedOrders.every((order) => selectedRowIds.includes(order.id))}
                    onChange={handleToggleSelectAll}
                    className="rounded border-white/20 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-3 font-semibold">ORDER ID</th>
                <th className="py-3.5 px-3 font-semibold">DATE ↓</th>
                <th className="py-3.5 px-3 font-semibold">CUSTOMER</th>
                <th className="py-3.5 px-3 font-semibold">ITEMS</th>
                <th className="py-3.5 px-3 font-semibold">METHOD</th>
                <th className="py-3.5 px-3 font-semibold">PAYMENT</th>
                <th className="py-3.5 px-3 font-semibold">STATUS</th>
                <th className="py-3.5 px-3 font-semibold">TOTAL</th>
                <th className="py-3.5 pr-4 pl-3 text-right font-semibold">ACTIONS</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? "divide-slate-100" : "divide-white/[0.03]"}`}>
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center">
                    <div className="space-y-3 max-w-xs mx-auto">
                      <PackageCheck className="w-10 h-10 mx-auto opacity-30 text-blue-500" />
                      <p className={`font-bold text-sm ${isLight ? "text-slate-900" : "text-white"}`}>
                        No Orders Found
                      </p>
                      <p className="text-xs text-slate-400">
                        Try changing your search keywords or resetting filters.
                      </p>
                      {isAnyFilterActive && (
                        <button
                          type="button"
                          onClick={handleClearAllFilters}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Clear Filters</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((ord) => {
                  const isSelected = selectedRowIds.includes(ord.id);
                  const isCurrentDrawerOpen = isDrawerOpen && selectedOrderId === ord.id;
                  const orderDate = new Date(ord.createdAt);
                  const dateStr = !isNaN(orderDate.getTime())
                    ? orderDate.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
                    : "Date unavailable";
                  const timeStr = !isNaN(orderDate.getTime())
                    ? orderDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
                    : "";

                  const cleanPhone = (ord.primaryPhone || "").replace(/[^0-9]/g, "");
                  const whatsappMsg = `Hello ${ord.customerName}, regarding your 1PLACE.LK order #${ord.id.slice(-8)}...`;
                  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMsg)}`;

                  return (
                    <tr
                      key={ord.id}
                      onClick={() => handleOpenDrawer(ord)}
                      className={`transition-colors cursor-pointer ${
                        isCurrentDrawerOpen
                          ? isLight ? "bg-blue-50/80" : "bg-blue-600/10"
                          : isSelected
                          ? isLight ? "bg-slate-50" : "bg-white/[0.04]"
                          : isLight ? "hover:bg-slate-50/80" : "hover:bg-white/[0.02]"
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 pl-4 pr-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select order ${ord.id}`}
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(ord.id)}
                          className="rounded border-white/20 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* ORDER ID */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`font-mono font-bold text-xs tracking-tight ${isLight ? "text-slate-900" : "text-white"} hover:text-blue-400 transition-colors`}>
                          #{ord.id.slice(-9).toUpperCase()}
                        </span>
                        {ord.needsReview && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold">
                            Review
                          </span>
                        )}
                      </td>

                      {/* DATE */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="leading-tight">
                          <p className={`font-semibold text-xs ${isLight ? "text-slate-900" : "text-slate-200"}`}>{dateStr}</p>
                          <p className="text-[11px] text-slate-500">{timeStr}</p>
                        </div>
                      </td>

                      {/* CUSTOMER */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="leading-tight max-w-[160px] truncate">
                          <p className={`font-semibold text-xs truncate ${isLight ? "text-slate-900" : "text-white"}`}>
                            {ord.customerName}
                          </p>
                          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                            {ord.primaryPhone || "No phone"}
                          </p>
                        </div>
                      </td>

                      {/* ITEMS THUMBNAILS */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {ord.items.slice(0, 2).map((it, idx) => (
                            <div
                              key={idx}
                              className={`w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center p-0.5 shrink-0 border ${
                                isLight ? "bg-slate-100 border-slate-200" : "bg-[#121A25] border-white/[0.08]"
                              }`}
                              title={`${it.name} (${it.quantity}x)`}
                            >
                              {it.image && it.image !== "/placeholder.png" ? (
                                <img src={it.image} alt="" className="w-full h-full object-contain" />
                              ) : (
                                <Package className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </div>
                          ))}
                          {ord.items.length > 2 && (
                            <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400">
                              +{ord.items.length - 2}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* METHOD */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {renderMethodBadge(ord.paymentMethod)}
                      </td>

                      {/* PAYMENT */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {renderPaymentStatusBadge(ord.paymentStatus)}
                      </td>

                      {/* STATUS */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {renderOrderStatusBadge(ord.orderStatus)}
                      </td>

                      {/* TOTAL */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`font-mono font-bold text-xs tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                          {formatLKR(ord.grandTotal)}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="py-3 pr-4 pl-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenDrawer(ord)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              isLight
                                ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                                : "bg-[#121A25] hover:bg-white/10 border-white/[0.08] text-slate-300 hover:text-white"
                            }`}
                            title="View Order Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* WhatsApp Button */}
                          {cleanPhone ? (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30 transition-all cursor-pointer"
                              title="Message Customer on WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="p-1.5 rounded-lg bg-white/5 border border-white/5 text-slate-600 opacity-40 cursor-not-allowed"
                              title="No phone number"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* More Options Dropdown */}
                          <div className="relative inline-block text-left" data-row-menu={ord.id}>
                            <button
                              type="button"
                              onClick={() => setActiveRowMenuId(activeRowMenuId === ord.id ? null : ord.id)}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                isLight
                                  ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700"
                                  : "bg-[#121A25] hover:bg-white/10 border-white/[0.08] text-slate-300 hover:text-white"
                              }`}
                              title="More actions"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>

                            {activeRowMenuId === ord.id && (
                              <div className={`absolute right-0 mt-1.5 w-44 rounded-xl p-1 shadow-2xl border z-30 animate-in fade-in slide-in-from-top-2 text-xs ${
                                isLight
                                  ? "bg-white border-slate-200 text-slate-800 shadow-slate-200"
                                  : "bg-[#0E141D] border-white/[0.1] text-[#F8FAFC]"
                              }`}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveRowMenuId(null);
                                    handleOpenDrawer(ord);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer font-semibold"
                                >
                                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                                  <span>View Order</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveRowMenuId(null);
                                    printOrderInvoice(ord);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer font-semibold"
                                >
                                  <Printer className="w-3.5 h-3.5 text-slate-300" />
                                  <span>Print Invoice</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveRowMenuId(null);
                                    printPackingSlip(ord);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer font-semibold"
                                >
                                  <PackageCheck className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Print Packing Slip</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveRowMenuId(null);
                                    handleCopyText(ord.id, "Order ID");
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/5 cursor-pointer font-semibold"
                                >
                                  <Copy className="w-3.5 h-3.5 text-purple-400" />
                                  <span>Copy Order ID</span>
                                </button>

                                <div className="my-1 border-t border-white/[0.06]" />

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveRowMenuId(null);
                                    setDeleteModalOrder(ord);
                                  }}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 cursor-pointer font-semibold"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                  <span>Delete Order</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ════════════════════════════════════════════════════════════════════
           6. PAGINATION FOOTER
        ════════════════════════════════════════════════════════════════════ */}
        <div className={`p-3.5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
          isLight ? "bg-slate-50/80 border-slate-200" : "bg-[#080C12]/80 border-white/[0.06]"
        }`}>
          {/* Left: Orders Count Summary */}
          <div className={`text-xs ${isLight ? "text-slate-500" : "text-[#94A3B8]"}`}>
            Showing <strong>{filteredOrders.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong>–
            <strong>{Math.min(currentPage * itemsPerPage, filteredOrders.length)}</strong> of{" "}
            <strong>{filteredOrders.length.toLocaleString()}</strong> orders
          </div>

          {/* Right: Numeric Page Buttons */}
          <div className="flex items-center gap-1 self-end sm:self-center">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                isLight ? "bg-white border-slate-200 text-slate-700" : "bg-[#121A25] border-white/[0.08] text-white"
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currentPage === pageNum
                      ? "bg-blue-600 text-white shadow-xs"
                      : isLight
                      ? "hover:bg-slate-100 text-slate-700"
                      : "hover:bg-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {totalPages > 5 && (
              <>
                <span className="px-1 text-slate-500 font-bold">...</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currentPage === totalPages
                      ? "bg-blue-600 text-white shadow-xs"
                      : isLight
                      ? "hover:bg-slate-100 text-slate-700"
                      : "hover:bg-white/10 text-slate-400 hover:text-white"
                  }`}
                >
                  {totalPages}
                </button>
              </>
            )}

            <button
              type="button"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                isLight ? "bg-white border-slate-200 text-slate-700" : "bg-[#121A25] border-white/[0.08] text-white"
              }`}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
         7. RIGHT-SIDE ORDER DETAILS DRAWER (440–480px, Exact Matching Reference)
      ════════════════════════════════════════════════════════════════════ */}
      {isDrawerOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={handleCloseDrawer}
          />

          {/* Drawer Container */}
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-6">
            <div ref={orderDrawerRef} role="dialog" aria-modal="true" aria-label="Order details" tabIndex={-1} data-order-drawer className={`w-screen max-w-md sm:max-w-[480px] shadow-2xl border-l flex flex-col animate-in slide-in-from-right duration-300 ${
              isLight ? "bg-white border-[#E5E7EB]" : "bg-[#0E141D] border-white/[0.1] text-white"
            }`}>
              {/* Drawer Top Header */}
              <div className={`p-4 sm:p-5 border-b flex items-start justify-between gap-3 shrink-0 ${
                isLight ? "border-slate-100" : "border-white/[0.08]"
              }`}>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className={`text-base sm:text-lg font-bold font-mono tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                      #{selectedOrder.id}
                    </h2>
                    {renderOrderStatusBadge(selectedOrder.orderStatus)}
                  </div>
                  <p className={`text-xs mt-1 flex items-center gap-1 ${isLight ? "text-slate-500" : "text-[#94A3B8]"}`}>
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Placed on {new Date(selectedOrder.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}, {new Date(selectedOrder.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => printOrderInvoice(selectedOrder)}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isLight ? "bg-slate-100 hover:bg-slate-200 border-slate-200" : "bg-[#121A25] hover:bg-white/10 border-white/[0.08]"
                    }`}
                    title="Print PDF Invoice"
                  >
                    <Printer className="w-3.5 h-3.5 text-blue-400" />
                    <span>Invoice</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => printPackingSlip(selectedOrder)}
                    className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isLight ? "bg-slate-100 hover:bg-slate-200 border-slate-200" : "bg-[#121A25] hover:bg-white/10 border-white/[0.08]"
                    }`}
                    title="Print Packing Slip"
                  >
                    <PackageCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Packing</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCloseDrawer}
                    className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                      isLight ? "bg-slate-100 hover:bg-slate-200 border-slate-200" : "bg-[#121A25] hover:bg-white/10 border-white/[0.08] text-slate-400 hover:text-white"
                    }`}
                    title="Close Details"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Drawer Tabs: [ Overview ] [ Items ] [ Timeline ] [ Notes ] */}
              <div className={`flex items-center px-4 pt-3 border-b gap-2 shrink-0 ${
                isLight ? "border-slate-100 bg-slate-50" : "border-white/[0.06] bg-[#0A0F16]"
              }`}>
                {[
                  { id: "overview", label: "Overview" },
                  { id: "items", label: `Items (${selectedOrder.items.length})` },
                  { id: "timeline", label: "Timeline" },
                  { id: "notes", label: "Notes" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDrawerTab(t.id as any)}
                    className={`px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                      drawerTab === t.id
                        ? "border-blue-500 text-blue-400"
                        : "border-transparent text-slate-400 hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Drawer Body Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-xs">
                {drawerTab === "overview" && (
                  <>
                    {/* Copy Feedback Notification */}
                    {copyFeedback && (
                      <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold text-center animate-in fade-in">
                        Copied {copyFeedback} to clipboard!
                      </div>
                    )}

                    {/* Customer Information Card */}
                    <div className={`p-4 rounded-2xl border space-y-3 ${
                      isLight ? "bg-slate-50 border-slate-200" : "bg-[#121A25] border-white/[0.08]"
                    }`}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-400">
                          Customer Information
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            const info = `${selectedOrder.customerName} | Phone: ${selectedOrder.primaryPhone} | Email: ${selectedOrder.customerEmail}`;
                            handleCopyText(info, "Customer Details");
                          }}
                          className="text-[11px] text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy All</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {/* Name */}
                        <div className="flex items-center justify-between gap-2">
                          <div className={`flex items-center gap-2 ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className={`font-bold text-xs ${isLight ? "text-slate-900" : "text-white"}`}>{selectedOrder.customerName}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyText(selectedOrder.customerName, "Name")}
                            className="text-slate-400 hover:text-white p-1 cursor-pointer"
                            title="Copy Name"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Primary Phone */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-slate-300">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-mono text-xs">{selectedOrder.primaryPhone}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyText(selectedOrder.primaryPhone, "Phone")}
                            className="text-slate-400 hover:text-white p-1 cursor-pointer"
                            title="Copy Phone"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Alternative Phone (if present) */}
                        {selectedOrder.alternativePhone && (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-slate-300">
                              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <div>
                                <span className="text-[10px] text-slate-500 block">Alternative Phone</span>
                                <span className="font-mono text-xs">{selectedOrder.alternativePhone}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyText(selectedOrder.alternativePhone, "Alt Phone")}
                              className="text-slate-400 hover:text-white p-1 cursor-pointer"
                              title="Copy Alt Phone"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {/* Email */}
                        {selectedOrder.customerEmail && selectedOrder.customerEmail !== "Not provided" && (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-slate-300 truncate">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate text-xs">{selectedOrder.customerEmail}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyText(selectedOrder.customerEmail, "Email")}
                              className="text-slate-400 hover:text-white p-1 cursor-pointer shrink-0"
                              title="Copy Email"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Customer Action Buttons: [ WhatsApp ] [ Call ] [ Email ] */}
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/[0.06]">
                        <a
                          href={`https://wa.me/${(selectedOrder.primaryPhone || "").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                            `Hello ${selectedOrder.customerName}, regarding your 1PLACE.LK order #${selectedOrder.id.slice(-8)}...`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#25D366]/20 transition-all text-center"
                        >
                          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>WhatsApp</span>
                        </a>

                        <a
                          href={`tel:${selectedOrder.primaryPhone}`}
                          className={`py-2 px-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-colors text-center ${
                            isLight
                              ? "bg-white hover:bg-slate-100 border-slate-200 text-slate-800"
                              : "bg-[#0E141D] hover:bg-white/10 border-white/[0.08] text-white"
                          }`}
                        >
                          <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>Call</span>
                        </a>

                        <a
                          href={`mailto:${selectedOrder.customerEmail}?subject=STREET%20MOBILE%20Order%20%23${selectedOrder.id.slice(-8)}`}
                          className={`py-2 px-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-colors text-center ${
                            isLight
                              ? "bg-white hover:bg-slate-100 border-slate-200 text-slate-800"
                              : "bg-[#0E141D] hover:bg-white/10 border-white/[0.08] text-white"
                          }`}
                        >
                          <Mail className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span>Email</span>
                        </a>
                      </div>
                    </div>

                    {/* Delivery Information Card */}
                    <div className={`p-4 rounded-2xl border space-y-3 ${
                      isLight ? "bg-slate-50 border-slate-200" : "bg-[#121A25] border-white/[0.08]"
                    }`}>
                      <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-400">
                        Delivery Information
                      </h3>

                      <div className="flex items-start gap-2.5">
                        <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                        <div className="leading-relaxed">
                          <p className={`font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
                            {selectedOrder.deliveryAddress.address}
                          </p>
                          <p className="text-slate-400 mt-0.5">
                            {selectedOrder.deliveryAddress.city}, {selectedOrder.deliveryAddress.district}, {selectedOrder.deliveryAddress.province} ({selectedOrder.deliveryAddress.postalCode})
                          </p>
                          {selectedOrder.deliveryAddress.landmark && (
                            <p className="text-slate-500 mt-1">Landmark: {selectedOrder.deliveryAddress.landmark}</p>
                          )}
                          {selectedOrder.deliveryAddress.instructions && (
                            <p className="text-slate-500 mt-0.5">Note: {selectedOrder.deliveryAddress.instructions}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/[0.06]">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-semibold">Delivery Method</span>
                          <span className={`font-bold mt-0.5 block ${isLight ? "text-slate-900" : "text-white"}`}>
                            {selectedOrder.rawDoc?.deliveryOption === "pickup" ? "Store Pickup" : "Courier Delivery"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-semibold">Courier / Tracking</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <input
                              type="text"
                              value={editingTracking}
                              onChange={(e) => setEditingTracking(e.target.value)}
                              placeholder="Add tracking code..."
                              className={`w-full px-2 py-1 border rounded-lg text-xs font-mono outline-none focus:border-blue-500 ${
                                isLight ? "bg-white border-slate-300 text-slate-900" : "bg-black/40 border-white/10 text-white"
                              }`}
                            />
                            <button
                              type="button"
                              onClick={handleSaveDetails}
                              disabled={savingDetails}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                              title="Save tracking code"
                            >
                              {savingDetails ? "..." : "✓"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Order & Payment Status Controls */}
                    <div className={`p-4 rounded-2xl border space-y-3 ${
                      isLight ? "bg-slate-50 border-slate-200" : "bg-[#121A25] border-white/[0.08]"
                    }`}>
                      <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-400">
                        Order &amp; Payment Status
                      </h3>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Order Status Select */}
                        <div>
                          <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                            Order Status
                          </label>
                          <div className="relative">
                            <select
                              value={selectedOrder.orderStatus}
                              onChange={(e) => handleRequestStatusChange(selectedOrder.id, e.target.value as any)}
                              className={`w-full appearance-none px-3 py-2 rounded-xl text-xs font-bold border outline-none cursor-pointer ${
                                isLight ? "bg-white border-slate-300 text-slate-900" : "bg-[#0E141D] border-white/15 text-white"
                              }`}
                            >
                              <option value="Pending">⏳ Pending</option>
                              <option value="Confirmed">✓ Confirmed</option>
                              <option value="Processing">⚙ Processing</option>
                              <option value="Packed">📦 Packed</option>
                              <option value="Shipped">🚚 Shipped</option>
                              <option value="Out for Delivery">🛵 Out for Delivery</option>
                              <option value="Delivered">✅ Delivered</option>
                              <option value="Cancelled">❌ Cancelled</option>
                              <option value="Returned">↩ Returned</option>
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                          </div>
                        </div>

                        {/* Payment Status Select */}
                        <div>
                          <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                            Payment Status
                          </label>
                          <div className="relative">
                            <select
                              value={selectedOrder.paymentStatus}
                              onChange={(e) => handleUpdatePaymentStatus(selectedOrder.id, e.target.value as any)}
                              className={`w-full appearance-none px-3 py-2 rounded-xl text-xs font-bold border outline-none cursor-pointer ${
                                isLight ? "bg-white border-slate-300 text-slate-900" : "bg-[#0E141D] border-white/15 text-white"
                              }`}
                            >
                              <option value="Pending">⏳ Pending</option>
                              <option value="Paid">✅ Paid</option>
                              <option value="Failed">❌ Failed</option>
                              <option value="Cancelled">🚫 Cancelled</option>
                              <option value="Refunded">↩ Refunded</option>
                              <option value="Charged Back">⚠️ Charged Back</option>
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                          </div>
                        </div>
                      </div>

                      {/* Cash collection confirmation for COD */}
                      {selectedOrder.paymentMethod === "COD" && selectedOrder.paymentStatus !== "Paid" && (
                        <button
                          type="button"
                          onClick={() => handleConfirmCashCollected(selectedOrder.id)}
                          className="w-full py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Banknote className="w-3.5 h-3.5" />
                          <span>Confirm Cash Collected (Mark Paid)</span>
                        </button>
                      )}
                    </div>

                    {/* Payment Information Card */}
                    <div className={`p-4 rounded-2xl border space-y-3 ${
                      isLight ? "bg-slate-50 border-slate-200" : "bg-[#121A25] border-white/[0.08]"
                    }`}>
                      <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-400">
                        Payment Information
                      </h3>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-slate-400" />
                          <div>
                            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Method</span>
                            <span className={`font-bold mt-0.5 block ${isLight ? "text-slate-900" : "text-white"}`}>{selectedOrder.paymentMethod}</span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-semibold">Amount</span>
                          <span className={`font-mono font-bold mt-0.5 block ${isLight ? "text-slate-900" : "text-white"}`}>{formatLKR(selectedOrder.grandTotal)}</span>
                        </div>
                      </div>

                      {selectedOrder.transactionId && (
                        <div className="pt-2 border-t border-white/[0.06] font-mono text-[11px]">
                          <span className="text-slate-500 block">Transaction Reference:</span>
                          <span className="text-slate-300 font-semibold">{selectedOrder.transactionId}</span>
                        </div>
                      )}
                    </div>

                    {/* Order Summary & Pricing */}
                    <div className={`p-4 rounded-2xl border space-y-2.5 ${
                      isLight ? "bg-slate-50 border-slate-200" : "bg-[#121A25] border-white/[0.08]"
                    }`}>
                      <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-400">
                        Order Summary
                      </h3>

                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-slate-400">
                          <span>Subtotal</span>
                          <span className={`font-mono font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>{formatLKR(selectedOrder.subtotal)}</span>
                        </div>
                        {selectedOrder.deliveryFee > 0 && (
                          <div className="flex items-center justify-between text-slate-400">
                            <span>Delivery Fee</span>
                            <span className={`font-mono font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>{formatLKR(selectedOrder.deliveryFee)}</span>
                          </div>
                        )}
                        {selectedOrder.codFee > 0 && (
                          <div className="flex items-center justify-between text-slate-400">
                            <span>COD Handling</span>
                            <span className={`font-mono font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>{formatLKR(selectedOrder.codFee)}</span>
                          </div>
                        )}
                        {(selectedOrder.cardFee ?? 0) > 0 && (
                          <div className="flex items-center justify-between text-slate-400">
                            <span>PayHere Fee (2%)</span>
                            <span className={`font-mono font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>{formatLKR(selectedOrder.cardFee!)}</span>
                          </div>
                        )}
                        {selectedOrder.discountTotal > 0 && (
                          <div className="flex items-center justify-between text-emerald-500 font-bold">
                            <span>Discount</span>
                            <span className="font-mono">-{formatLKR(selectedOrder.discountTotal)}</span>
                          </div>
                        )}

                        <div className={`pt-2 border-t flex items-center justify-between ${isLight ? "border-slate-200" : "border-white/[0.08]"}`}>
                          <span className={`text-sm font-bold ${isLight ? "text-slate-900" : "text-white"}`}>Total</span>
                          <span className="text-base font-bold font-mono text-blue-600">
                            {formatLKR(selectedOrder.grandTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Items Tab */}
                {drawerTab === "items" && (
                  <div className="space-y-3">
                    <h3 className={`font-bold text-xs ${isLight ? "text-slate-900" : "text-white"}`}>Ordered Products ({selectedOrder.items.length})</h3>
                    <div className="space-y-2.5">
                      {selectedOrder.items.map((it, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-2xl border flex items-center gap-3 ${
                            isLight ? "bg-slate-50 border-slate-200" : "bg-[#121A25] border-white/[0.08]"
                          }`}
                        >
                          <div className={`w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center p-1 shrink-0 border ${
                            isLight ? "bg-white border-slate-200" : "bg-[#0E141D] border-white/[0.08]"
                          }`}>
                            {it.image && it.image !== "/placeholder.png" ? (
                              <img src={it.image} alt={it.name} className="w-full h-full object-contain" />
                            ) : (
                              <Package className="w-5 h-5 text-slate-400" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className={`font-bold text-xs truncate leading-snug ${isLight ? "text-slate-900" : "text-white"}`}>{it.name}</h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {[it.storage, it.color, it.ram].filter(Boolean).join(" • ")}
                            </p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[11px] font-mono text-slate-500">
                                {it.quantity} × {formatLKR(it.price)}
                              </span>
                              <span className={`font-mono font-bold text-xs ${isLight ? "text-slate-900" : "text-white"}`}>
                                {formatLKR(it.lineTotal)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timeline Tab */}
                {drawerTab === "timeline" && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-xs text-white">Audit History &amp; Events</h3>
                    {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 ? (
                      <div className="space-y-3 relative pl-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
                        {selectedOrder.statusHistory.map((h, idx) => (
                          <div key={idx} className="relative pl-3">
                            <span className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-[#0E141D]" />
                            <p className="font-bold text-white text-xs">{h.action}</p>
                            {h.newStatus && (
                              <p className="text-[11px] text-blue-400 font-semibold mt-0.5">
                                Status changed to {h.newStatus}
                              </p>
                            )}
                            {h.note && (
                              <p className="text-[11px] text-slate-400 mt-0.5 italic">&quot;{h.note}&quot;</p>
                            )}
                            <span className="text-[10px] text-slate-500 mt-1 block">
                              {new Date(h.timestamp).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-xs italic">No timeline events recorded yet.</p>
                    )}
                  </div>
                )}

                {/* Notes Tab */}
                {drawerTab === "notes" && (
                  <div className="space-y-3">
                    <h3 className="font-bold text-xs text-white">Internal Staff Notes</h3>
                    <textarea
                      rows={4}
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      placeholder="Add private staff notes regarding this order..."
                      className="w-full p-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white outline-none focus:border-blue-500 resize-none font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleSaveDetails}
                      disabled={savingDetails}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      {savingDetails ? "Saving..." : "Save Internal Note"}
                    </button>
                  </div>
                )}
              </div>

              {/* Drawer Bottom Sticky Action Buttons */}
              <div className={`p-4 sm:p-5 border-t space-y-2 shrink-0 ${
                isLight ? "border-slate-100 bg-white" : "border-white/[0.08] bg-[#0A0F16]"
              }`}>
                <button
                  type="button"
                  onClick={() => handleRequestStatusChange(selectedOrder.id, "Processing")}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Update Status</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeleteModalOrder(selectedOrder)}
                  className="w-full py-2.5 rounded-xl bg-red-600/15 hover:bg-red-600/25 text-red-400 border border-red-500/30 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Permanently Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
         8. STATUS CONFIRMATION MODAL
      ════════════════════════════════════════════════════════════════════ */}
      {statusConfirmModal.isOpen && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className={`border rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 ${
            isLight ? "bg-white border-slate-200" : "bg-[#0E141D] border-white/10 text-white"
          }`}>
            <h3 className="font-bold text-sm">Confirm Status Update</h3>
            <p className="text-xs text-slate-400">
              Update order <strong>#{statusConfirmModal.orderId.slice(-8)}</strong> to status{" "}
              <strong className="text-blue-400">{statusConfirmModal.newStatus}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStatusConfirmModal({ isOpen: false, orderId: "", newStatus: "Processing" })}
                className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!!updatingOrderId}
                onClick={() => executeOrderStatusUpdate(statusConfirmModal.orderId, statusConfirmModal.newStatus)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                {updatingOrderId ? "Updating…" : "Confirm update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
         9. SINGLE ORDER DELETE CONFIRMATION MODAL
      ════════════════════════════════════════════════════════════════════ */}
      {deleteModalOrder && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className={`border rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4 ${
            isLight ? "bg-white border-slate-200" : "bg-[#0E141D] border-white/10 text-white"
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-white/10">
              <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-500" />
                <span>Delete Order?</span>
              </h3>
              <button
                type="button"
                disabled={isDeletingSingle}
                onClick={() => setDeleteModalOrder(null)}
                className="text-slate-400 hover:text-white disabled:opacity-40 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Order:</span>
                  <span className="font-mono font-bold text-[#F8FAFC]">#{deleteModalOrder.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Customer:</span>
                  <span className="font-semibold text-[#F8FAFC]">{deleteModalOrder.customerName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total:</span>
                  <span className="font-mono font-bold text-blue-400">{formatLKR(deleteModalOrder.grandTotal)}</span>
                </div>
              </div>

              <p className="text-slate-400 text-xs leading-relaxed pt-1">
                This will permanently delete this order and its order-related database data. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                disabled={isDeletingSingle}
                onClick={() => setDeleteModalOrder(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingSingle}
                onClick={handleExecuteSingleDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {isDeletingSingle ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting order...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
         9B. BULK DELETE CONFIRMATION MODAL
      ════════════════════════════════════════════════════════════════════ */}
      {bulkDeleteModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className={`border rounded-2xl p-5 sm:p-6 w-full max-w-md shadow-2xl space-y-4 ${
            isLight ? "bg-white border-slate-200" : "bg-[#0E141D] border-white/10 text-white"
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-white/10">
              <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-500" />
                <span>Delete {selectedRowIds.length} Orders?</span>
              </h3>
              <button
                type="button"
                disabled={isDeletingBulk}
                onClick={() => setBulkDeleteModalOpen(false)}
                className="text-slate-400 hover:text-white disabled:opacity-40 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300">
                These orders will be permanently deleted from the database. This action cannot be undone.
              </p>

              {isDeletingBulk && bulkDeleteProgress && (
                <div className="p-3 rounded-xl bg-black/40 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-400" />
                      <span>Deleting orders...</span>
                    </span>
                    <span className="font-mono font-bold">
                      Deleting {bulkDeleteProgress.current} of {bulkDeleteProgress.total}...
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-red-500 transition-all duration-300 rounded-full"
                      style={{
                        width: `${Math.round((bulkDeleteProgress.current / bulkDeleteProgress.total) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
              <button
                type="button"
                disabled={isDeletingBulk}
                onClick={() => setBulkDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingBulk}
                onClick={handleExecuteBulkDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {isDeletingBulk ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting {bulkDeleteProgress?.current || 0} of {selectedRowIds.length}...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
         10. BULK STATUS UPDATE MODAL
      ════════════════════════════════════════════════════════════════════ */}
      {bulkStatusModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className={`border rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 ${
            isLight ? "bg-white border-slate-200" : "bg-[#0E141D] border-white/10 text-white"
          }`}>
            <div className="flex items-center justify-between border-b pb-3 border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                <span>Bulk Update ({selectedRowIds.length} Orders)</span>
              </h3>
              <button
                type="button"
                onClick={() => setBulkStatusModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Set New Order Status</label>
                <select
                  value={bulkOrderStatus}
                  onChange={(e) => setBulkOrderStatus(e.target.value as any)}
                  className="w-full p-2.5 bg-black/40 border border-white/15 rounded-xl text-xs text-white font-bold outline-none cursor-pointer"
                >
                  <option value="Processing">Processing</option>
                  <option value="Packed">Packed</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Confirmed">Confirmed</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Set New Payment Status</label>
                <select
                  value={bulkPaymentStatus}
                  onChange={(e) => setBulkPaymentStatus(e.target.value as any)}
                  className="w-full p-2.5 bg-black/40 border border-white/15 rounded-xl text-xs text-white font-bold outline-none cursor-pointer"
                >
                  <option value="unchanged">Keep current payment status</option>
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Refunded">Refunded</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setBulkStatusModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingBulkStatus}
                onClick={handleApplyBulkStatus}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Apply to {selectedRowIds.length} Orders
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ════════════════════════════════════════════════════════════════════
         11. FLOATING BULK ACTION BAR (Only visible when 1+ selected)
      ════════════════════════════════════════════════════════════════════ */}
      {selectedRowIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className={`px-4 py-2.5 rounded-2xl border shadow-2xl backdrop-blur-md flex items-center gap-2.5 ${
            isLight ? "bg-white/95 border-slate-300 text-slate-900 shadow-slate-300/50" : "bg-[#0E141D]/95 border-white/15 text-white shadow-black/80"
          }`}>
            <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold font-mono text-xs">
              {selectedRowIds.length} selected
            </span>

            <button
              type="button"
              onClick={() => setBulkStatusModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-semibold cursor-pointer flex items-center gap-1.5 text-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Change Status</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const targetOrders = normalizedOrders.filter((o) => selectedRowIds.includes(o.id));
                targetOrders.forEach((o) => printOrderInvoice(o));
              }}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-semibold cursor-pointer flex items-center gap-1.5 text-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Invoice</span>
            </button>

            <button
              type="button"
              onClick={handleExportSelectedCSV}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-semibold cursor-pointer flex items-center gap-1.5 text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={() => setBulkDeleteModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 font-semibold cursor-pointer flex items-center gap-1.5 text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRowIds([])}
              className="text-slate-400 hover:text-white px-2 py-1 cursor-pointer font-medium text-xs ml-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
         12. IN-APP TOAST NOTIFICATION BANNER
      ════════════════════════════════════════════════════════════════════ */}
      {toast && (
        <div className="fixed top-5 right-5 z-70 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className={`px-4 py-3 rounded-2xl border shadow-2xl flex items-center gap-2.5 text-xs font-semibold backdrop-blur-md ${
            toast.type === "error"
              ? "bg-red-950/90 border-red-500/40 text-red-200"
              : toast.type === "info"
              ? "bg-blue-950/90 border-blue-500/40 text-blue-200"
              : "bg-emerald-950/90 border-emerald-500/40 text-emerald-200"
          }`}>
            {toast.type === "error" ? (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
