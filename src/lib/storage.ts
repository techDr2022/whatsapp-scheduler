import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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

    s3Client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      forcePathStyle: !!endpoint, // R2 uses path-style
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
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: mimeType,
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
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );
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
