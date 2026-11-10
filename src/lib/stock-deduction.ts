import { AdminWriteBatch, getAdminDb } from "@/lib/firebase-admin";
import { Product } from "@/lib/types";

export interface OrderItemStockRef {
  productId: string;
  variantId?: string;
  storage?: string;
  color?: string;
  quantity: number;
  isFreeGift?: boolean;
}

export interface DeductProductStockOptions {
  prefetchedProducts?: Map<string, Partial<Product>>;
  batch?: AdminWriteBatch;
}

/**
 * Deduct stock for ordered items from the Firestore "products" collection.
 * - Groups items by productId so each product is read at most once (fresh read, no stale cache).
 * - Batches all product stock updates into a single Firestore commit (or appends to the caller's batch).
 * - Decrements stock_quantity, stock_count, and matching variant_combos stock.
 * - Automatically updates stock_status to 'out_of_stock' if count reaches 0 or 'low_stock' if <= 5.
 */
export async function deductProductStock(
  items: OrderItemStockRef[],
  options?: DeductProductStockOptions
): Promise<void> {
  if (!items || !Array.isArray(items) || items.length === 0) return;

  const groupedByProduct = new Map<string, OrderItemStockRef[]>();
  for (const item of items) {
    if (!item?.productId || !item.quantity || Number(item.quantity) <= 0) continue;
    const pid = item.productId.trim();
    if (!pid) continue;
    const list = groupedByProduct.get(pid) || [];
    list.push(item);
    groupedByProduct.set(pid, list);
  }

  if (groupedByProduct.size === 0) return;

  const db = getAdminDb();
  const writeBatch = options?.batch || db.batch();
  let queuedCount = 0;

  for (const [productId, productItems] of groupedByProduct.entries()) {
    try {
      const prodRef = db.collection("products").doc(productId);
      let productData = options?.prefetchedProducts?.get(productId);

      if (!productData) {
        const snap = await prodRef.get();
        if (!snap.exists) {
          console.warn(`[Stock Deduction] Product doc ${productId} not found in Firestore. Skipping.`);
          continue;
        }
        productData = (snap.data() || {}) as Partial<Product>;
      }

      const currentQty =
        typeof productData.stock_quantity === "number"
          ? productData.stock_quantity
          : typeof productData.stock_count === "number"
          ? productData.stock_count
          : 10;

      const totalProductQtyToDeduct = productItems.reduce(
        (sum, it) => sum + Math.max(0, Number(it.quantity) || 0),
        0
      );
      if (totalProductQtyToDeduct <= 0) continue;

      const newQty = Math.max(0, currentQty - totalProductQtyToDeduct);
      const newStatus = newQty === 0 ? "out_of_stock" : newQty <= 5 ? "low_stock" : "in_stock";

      let updatedVariantCombos = productData.variant_combos;
      if (Array.isArray(updatedVariantCombos) && updatedVariantCombos.length > 0) {
        updatedVariantCombos = updatedVariantCombos.map((combo) => {
          let variantDeduct = 0;
          for (const item of productItems) {
            const isMatch =
              (item.variantId && combo.id === item.variantId) ||
              (item.storage &&
                combo.storage === item.storage &&
                (!item.color || combo.color_name === item.color));
            if (isMatch) {
              variantDeduct += Math.max(0, Number(item.quantity) || 0);
            }
          }

          if (variantDeduct > 0) {
            const comboQty = typeof combo.stock_quantity === "number" ? combo.stock_quantity : 10;
            const newComboQty = Math.max(0, comboQty - variantDeduct);
            const newAvail = Math.max(0, (combo.available_stock ?? comboQty) - variantDeduct);
            return {
              ...combo,
              stock_quantity: newComboQty,
              available_stock: newAvail,
            };
          }
          return combo;
        });
      }

      const updatePayload: Record<string, any> = {
        stock_quantity: newQty,
        stock_count: newQty,
        stock_status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (updatedVariantCombos) {
        updatePayload.variant_combos = updatedVariantCombos;
      }

      writeBatch.set(prodRef, updatePayload, { merge: true });
      queuedCount += 1;
      console.log(
        `[Stock Deduction] Queued deduction of ${totalProductQtyToDeduct} units for product ${productId}. New stock: ${newQty}`
      );
    } catch (err) {
      console.error(`[Stock Deduction] Error preparing stock deduction for product ${productId}:`, err);
    }
  }

  if (!options?.batch && queuedCount > 0) {
    await writeBatch.commit();
  }
}
