import fs from "fs";
import path from "path";
import { Product } from "@/lib/types";

const PRODUCTS_FILE_PATH = path.join(process.cwd(), "src", "lib", "local-products.json");

export function getLocalProducts(): Product[] {
  try {
    if (!fs.existsSync(PRODUCTS_FILE_PATH)) {
      return [];
    }
    const raw = fs.readFileSync(PRODUCTS_FILE_PATH, "utf8");
    if (!raw.trim()) return [];
    return JSON.parse(raw) as Product[];
  } catch (e) {
    console.error("Error reading local-products.json:", e);
    return [];
  }
}

export function saveLocalProduct(product: Product): Product {
  try {
    const list = getLocalProducts();
    const existingIndex = list.findIndex(
      (p) => (product.id && p.id === product.id) || (product.slug && p.slug === product.slug)
    );
    const updatedRecord: Product = {
      ...product,
      updatedAt: new Date().toISOString(),
      created_at: product.created_at || new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...updatedRecord };
    } else {
      list.unshift(updatedRecord);
    }

    fs.writeFileSync(PRODUCTS_FILE_PATH, JSON.stringify(list, null, 2), "utf8");
    return updatedRecord;
  } catch (e) {
    console.error("Error saving local product:", e);
    return product;
  }
}

export function deleteLocalProduct(id: string): boolean {
  try {
    const list = getLocalProducts();
    const filtered = list.filter((p) => p.id !== id && p.slug !== id);
    fs.writeFileSync(PRODUCTS_FILE_PATH, JSON.stringify(filtered, null, 2), "utf8");
    return true;
  } catch (e) {
    console.error("Error deleting local product:", e);
    return false;
  }
}
