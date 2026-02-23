import { NextResponse } from "next/server";
import { getUploadUrl } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filename, mimeType, clientId } = body;
    if (!filename || !mimeType || !clientId) {
      return NextResponse.json(
        { error: "Missing filename, mimeType, or clientId" },
        { status: 400 }
      );
    }
    const result = await getUploadUrl(filename, mimeType, clientId);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to get upload URL" },
      { status: 500 }
    );
  }
}
