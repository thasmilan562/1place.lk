import { redirect } from "next/navigation";

// Category discovery lives in the storefront, not a separate directory page.
export default function CategoriesPage() {
  redirect("/#categories-strip");
}
