import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

/**
 * Compresses an image file and converts it to a Base64 data URL string.
 * Keeps file size under ~150KB for safe Firestore storage.
 */
export function compressImageToBase64(file: File, maxDimension = 1000, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const isPngOrSvg =
            file.type === "image/png" ||
            file.type === "image/svg+xml" ||
            file.type === "image/webp" ||
            file.name.toLowerCase().endsWith(".png") ||
            file.name.toLowerCase().endsWith(".svg") ||
            file.name.toLowerCase().endsWith(".webp");
          resolve(canvas.toDataURL(isPngOrSvg ? "image/png" : "image/jpeg", quality));
        } else {
          resolve((e.target?.result as string) || "");
        }
      };
      img.onerror = () => resolve((e.target?.result as string) || "");
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function withTimeout<T>(promise: Promise<T>, ms = 2500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Upload timeout")), ms)),
  ]);
}

/**
 * Uploads an image file.
 * 1. Tries the fast server-side upload API (/api/admin/upload).
 * 2. If unavailable, falls back to Firebase Storage with a 2.5s timeout.
 * 3. If that fails, falls back to compressed Base64 data URL.
 */
export async function uploadImageWithFallback(file: File, folder: string): Promise<string> {
  // 1. Try local server-side upload endpoint first (instant, 0% cloud quota)
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const res = await withTimeout(
      fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      }),
      4000
    );

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.url) {
        return data.url;
      }
    }
  } catch (serverErr) {
    console.warn(`[UploadUtils] Server upload to /api/admin/upload failed:`, serverErr);
  }

  // 2. Try Firebase Storage with 2.5s timeout guard
  try {
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageRef = ref(storage, `${folder}/${Date.now()}_${safeFileName}`);
    const uploadResult = await withTimeout(uploadBytes(storageRef, file), 2500);
    return await getDownloadURL(uploadResult.ref);
  } catch (error) {
    console.warn(`[UploadUtils] Firebase Storage upload failed for ${folder}/${file.name}. Falling back to compressed base64:`, error);
  }

  // 3. Fallback to compressed base64
  return await compressImageToBase64(file);
}
