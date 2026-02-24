import { NextResponse } from "next/server";
import { Readable } from "stream";
import { getAssetStream } from "@/lib/storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await params;
  if (!assetId) {
    return NextResponse.json({ error: "Missing asset id" }, { status: 400 });
  }

  const result = await getAssetStream(assetId);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (result.type === "redirect") {
    const url = result.url.startsWith("http")
      ? result.url
      : new URL(result.url, request.url).toString();
    return NextResponse.redirect(url);
  }

  // Convert Node stream to Web ReadableStream for Response
  const webStream = Readable.toWeb(result.body) as ReadableStream;
  return new NextResponse(webStream, {
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
