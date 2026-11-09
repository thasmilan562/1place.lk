import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { verifyAdminRequest } from "@/lib/admin-auth-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!verifyAdminRequest(req)) {
    return NextResponse.json({ success: false, error: "Unauthorized access to file upload API." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "hero_slides";

    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize folder and filename
    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "_");
    const ext = path.extname(file.name) || ".png";
    const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueFileName = `${Date.now()}_${baseName}${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", safeFolder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, uniqueFileName);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/${safeFolder}/${uniqueFileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: uniqueFileName,
      size: buffer.length,
    });
  } catch (err: any) {
    console.error("[Upload API] Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
