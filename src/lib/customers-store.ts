import fs from "fs";
import path from "path";

export interface CustomerRecord {
  id: string;
  isGuest: boolean;
  displayName: string;
  email: string;
  phone?: string;
  phoneNumber?: string;
  photoURL?: string;
  role?: string;
  ordersCount?: number;
  totalSpent?: number;
  lastOrderDate?: string;
  addresses?: any[];
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  [key: string]: any;
}

const CUSTOMERS_FILE_PATH = path.join(process.cwd(), "src", "lib", "local-customers.json");

export function getLocalCustomers(): CustomerRecord[] {
  try {
    if (!fs.existsSync(CUSTOMERS_FILE_PATH)) {
      return [];
    }
    const content = fs.readFileSync(CUSTOMERS_FILE_PATH, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Error reading local customers file:", err);
    return [];
  }
}

export function saveLocalCustomers(customers: CustomerRecord[]): void {
  try {
    fs.writeFileSync(CUSTOMERS_FILE_PATH, JSON.stringify(customers, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving local customers file:", err);
  }
}

export function deleteLocalCustomer(id: string): boolean {
  try {
    const customers = getLocalCustomers();
    const filtered = customers.filter((c) => c.id !== id && c.email !== id);
    fs.writeFileSync(CUSTOMERS_FILE_PATH, JSON.stringify(filtered, null, 2), "utf-8");
    return true;
  } catch (err) {
    console.error("Error deleting local customer:", err);
    return false;
  }
}
