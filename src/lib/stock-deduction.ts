import { getAdminDb } from "@/lib/firebase-admin";
import { Product } from "@/lib/types";

export interface OrderItemStockRef {
  productId: string;
  variantId?: string;
  storage?: string;
  color?: string;
  quantity: number;
}

/**
 * Deduct stock for ordered items from the Firestore "products" collection.
 * Decrements stock_quantity, stock_count, and specific variant_combos stock.
 * Automatically updates stock_status to 'out_of_stock' if count reaches 0 or 'low_stock' if <= 5.
 */
export async function deductProductStock(items: OrderItemStockRef[]): Promise<void> {
  if (!items || !Array.isArray(items) || items.length === 0) return;
  const db = getAdminDb();

  for (const item of items) {
    if (!item.productId || !item.quantity || item.quantity <= 0) continue;

    try {
      const prodRef = db.collection("products").doc(item.productId);
      const snap = await prodRef.get();

      if (!snap.exists) {
        console.warn(`[Stock Deduction] Product doc ${item.productId} not found in Firestore. Skipping.`);
        continue;
      }

      const productData = snap.data() as Partial<Product>;
      const currentQty = typeof productData.stock_quantity === "number" 
        ? productData.stock_quantity 
        : typeof productData.stock_count === "number" 
        ? productData.stock_count 
        : 10;

      const newQty = Math.max(0, currentQty - Number(item.quantity));
      const newStatus = newQty === 0 ? "out_of_stock" : newQty <= 5 ? "low_stock" : "in_stock";

      // If product has variant combos, deduct variant stock as well
      let updatedVariantCombos = productData.variant_combos;
      if (Array.isArray(updatedVariantCombos) && updatedVariantCombos.length > 0) {
        updatedVariantCombos = updatedVariantCombos.map((combo) => {
          const isMatch =
            (item.variantId && combo.id === item.variantId) ||
            (item.storage && combo.storage === item.storage && (!item.color || combo.color_name === item.color));

          if (isMatch) {
            const comboQty = typeof combo.stock_quantity === "number" ? combo.stock_quantity : 10;
            const newComboQty = Math.max(0, comboQty - Number(item.quantity));
            const newAvail = Math.max(0, (combo.available_stock ?? comboQty) - Number(item.quantity));
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

      await prodRef.set(updatePayload, { merge: true });
      console.log(`[Stock Deduction] Successfully deducted ${item.quantity} units for product ${item.productId}. New stock: ${newQty}`);
    } catch (err) {
      console.error(`[Stock Deduction] Error deducting stock for product ${item.productId}:`, err);
    }
  }
}
