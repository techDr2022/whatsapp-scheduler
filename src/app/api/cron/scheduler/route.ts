import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsAppMessage } from "@/lib/twilio";
import { getAssetUrlForWhatsApp } from "@/lib/storage";

// Vercel cron: add to vercel.json "crons": [{"path": "/api/cron/scheduler", "schedule": "*/15 * * * *"}]
// Or call manually for testing

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  // Vercel cron sends Authorization: Bearer <CRON_SECRET>
  // In development, allow unauthenticated (scheduler doesn't run automatically locally)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isDev = process.env.NODE_ENV !== "production";
  if (!isDev && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const posts = await prisma.scheduledPost.findMany({
    where: {
      status: "SCHEDULED",
      approvalSendAt: { lte: now },
      sentAt: null,
    },
    include: {
      client: { include: { contacts: true } },
      asset: true,
    },
  });

  const results: { postId: string; success: boolean; error?: string }[] = [];

  for (const post of posts) {
    const primaryContact = post.client.contacts.find((c) => c.isPrimaryApproval)
      ?? post.client.contacts[0];

    if (!primaryContact) {
      results.push({ postId: post.id, success: false, error: "No contact" });
      continue;
    }

    const mediaUrl = post.assetId ? getAssetUrlForWhatsApp(post.assetId) : undefined;
    const body = (post.caption && post.caption.trim()) ? post.caption.trim() : "";

    try {
      console.log("[Scheduler] Sending post", {
        postId: post.id,
        to: primaryContact.phone,
        bodyLen: body.length,
        hasMedia: !!mediaUrl,
      });
      const { sid, success } =       await sendWhatsAppMessage({
        to: primaryContact.phone,
        body: body || " ", // never send empty string; twilio lib uses placeholder if needed
        mediaUrl: mediaUrl ?? undefined,
      });

      if (success) {
        await prisma.scheduledPost.update({
          where: { id: post.id },
          data: { status: "CONFIRMED", sentAt: now, confirmedAt: now },
        });
        if (sid) {
          await prisma.messageLog.create({
            data: {
              scheduledPostId: post.id,
              twilioSid: sid,
              deliveryStatus: "SENT",
            },
          });
        }
        results.push({ postId: post.id, success: true });
      } else {
        results.push({ postId: post.id, success: false, error: "Send failed" });
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Unknown error";
      console.error(`Scheduler error for post ${post.id}:`, errMsg);
      results.push({
        postId: post.id,
        success: false,
        error: errMsg,
      });
    }
  }

  return NextResponse.json({
    processed: posts.length,
    results,
    successCount: results.filter((r) => r.success).length,
  });
}
