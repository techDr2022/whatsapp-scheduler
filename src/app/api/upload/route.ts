import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import path from "path";
import { saveUploadLocal, saveUploadS3, createAsset } from "@/lib/storage";

const isProd = process.env.NODE_ENV === "production";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const clientId = (formData.get("clientId") as string) ?? "unknown";

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const ext = path.extname(file.name) || ".bin";
    const key = `posts/${clientId}/${randomUUID()}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";
    const sizeBytes = buffer.length;

    let url: string;
    if (isProd) {
      url = await saveUploadS3(key, buffer, mimeType);
    } else {
      url = await saveUploadLocal(key, buffer, mimeType);
    }

    const asset = await createAsset(key, url, mimeType, sizeBytes);
    return NextResponse.json({ asset, url });
  } catch (e) {
    console.error("Upload error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 500 }
    );
  }
}
