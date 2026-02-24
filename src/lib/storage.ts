import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "./db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const isProd = process.env.NODE_ENV === "production";
const uploadDir = process.env.UPLOAD_DIR ?? "./public/uploads";

let s3Client: S3Client | null = null;

function getS3Client() {
  if (!s3Client) {
    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION ?? "auto";
    const accessKey = process.env.S3_ACCESS_KEY;
    const secretKey = process.env.S3_SECRET_KEY;

    if (!accessKey || !secretKey) {
      throw new Error("S3 credentials not configured");
    }

    if (!endpoint) {
      throw new Error("S3_ENDPOINT is required for R2 (e.g. https://ACCOUNT_ID.r2.cloudflarestorage.com)");
    }

    // R2: endpoint https://<ACCOUNT_ID>.r2.cloudflarestorage.com, path-style /bucket/key
    s3Client = new S3Client({
      region,
      endpoint,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      forcePathStyle: true,
    });
  }
  return s3Client;
}

const bucket = process.env.S3_BUCKET ?? "whatsapp-post-planner";
const baseUrl = process.env.STORAGE_BASE_URL ?? "/uploads";

export async function getUploadUrl(
  filename: string,
  mimeType: string,
  clientId: string
): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  const ext = path.extname(filename) || ".bin";
  const key = `posts/${clientId}/${randomUUID()}${ext}`;

  if (isProd) {
    const client = getS3Client();
    // Do NOT include ContentType in the command - browser may send different headers
    // and R2/S3 will reject with Access Denied if signature doesn't match
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
    const publicUrl = process.env.STORAGE_PUBLIC_URL
      ? `${process.env.STORAGE_PUBLIC_URL}/${key}`
      : uploadUrl;
    return { uploadUrl, key, publicUrl };
  }

  // Dev: return a URL for client to POST to our API
  const uploadId = randomUUID();
  return {
    uploadUrl: `/api/upload?key=${encodeURIComponent(key)}&mime=${encodeURIComponent(mimeType)}&uploadId=${uploadId}`,
    key,
    publicUrl: `${baseUrl}/${key}`,
  };
}

export async function saveUploadLocal(
  key: string,
  buffer: Buffer,
  mimeType?: string
): Promise<string> {
  void mimeType;
  const dir = path.join(process.cwd(), uploadDir, path.dirname(key));
  await mkdir(dir, { recursive: true });
  const filePath = path.join(process.cwd(), uploadDir, key);
  await writeFile(filePath, buffer);
  return `${baseUrl}/${key}`;
}

export async function saveUploadS3(
  key: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const client = getS3Client();
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      })
    );
  } catch (err: unknown) {
    const raw =
      err && typeof err === "object" && "name" in err && "message" in err
        ? `${(err as { name: string }).name}: ${(err as { message: string }).message}`
        : err instanceof Error
          ? err.message
          : "R2 upload failed";
    const hint =
      typeof raw === "string" && (raw.includes("Access Denied") || raw.includes("403"))
        ? " Check R2 API token has Object Read & Write for this bucket (Cloudflare R2 → Manage R2 API Tokens)."
        : "";
    throw new Error(raw + hint);
  }
  const publicUrl = process.env.STORAGE_PUBLIC_URL
    ? `${process.env.STORAGE_PUBLIC_URL}/${key}`
    : `https://${bucket}.s3.amazonaws.com/${key}`;
  return publicUrl;
}

export async function createAsset(
  key: string,
  url: string,
  mimeType?: string,
  sizeBytes?: number
) {
  return prisma.asset.create({
    data: { key, url, mimeType, sizeBytes },
  });
}

export async function getAssetUrl(assetId: string): Promise<string | null> {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
  });
  return asset?.url ?? null;
}

/** URL for WhatsApp media: use our proxy so Twilio can fetch (R2 may be private). */
export function getAssetUrlForWhatsApp(assetId: string): string {
  const base =
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/api/asset/${assetId}`;
}

/** For GET /api/asset/[assetId]: stream from R2 or return redirect URL for local. */
export async function getAssetStream(
  assetId: string
): Promise<
  | { type: "stream"; body: NodeJS.ReadableStream; contentType: string }
  | { type: "redirect"; url: string }
  | null
> {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) return null;

  const useS3 =
    isProd &&
    process.env.S3_ACCESS_KEY &&
    process.env.S3_SECRET_KEY &&
    process.env.S3_ENDPOINT &&
    asset.key;

  if (useS3) {
    const client = getS3Client();
    const res = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: asset.key })
    );
    if (!res.Body) return null;
    const contentType =
      asset.mimeType ?? res.ContentType ?? "application/octet-stream";
    return {
      type: "stream",
      body: res.Body as NodeJS.ReadableStream,
      contentType,
    };
  }

  return { type: "redirect", url: asset.url };
}
