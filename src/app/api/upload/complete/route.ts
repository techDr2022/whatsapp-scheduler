import { NextResponse } from "next/server";
import { createAsset } from "@/lib/storage";

// Called after client uploads directly to R2 via presigned URL
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, mimeType, sizeBytes, clientId } = body;

    if (!key || !clientId) {
      return NextResponse.json(
        { error: "Missing key or clientId" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.STORAGE_PUBLIC_URL;
    if (!baseUrl) {
      return NextResponse.json(
        { error: "STORAGE_PUBLIC_URL not configured" },
        { status: 500 }
      );
    }

    const url = `${baseUrl.replace(/\/$/, "")}/${key}`;
    const asset = await createAsset(key, url, mimeType ?? undefined, sizeBytes);
    return NextResponse.json({ asset, url });
  } catch (e) {
    console.error("Upload complete error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to register upload" },
      { status: 500 }
    );
  }
}
