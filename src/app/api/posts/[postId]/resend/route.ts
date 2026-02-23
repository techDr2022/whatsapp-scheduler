import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsAppMessage } from "@/lib/twilio";
import { getAssetUrl } from "@/lib/storage";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;

  const post = await prisma.scheduledPost.findUnique({
    where: { id: postId },
    include: {
      client: { include: { contacts: true } },
      asset: true,
    },
  });

  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const primaryContact = post.client.contacts.find((c) => c.isPrimaryApproval)
    ?? post.client.contacts[0];
  if (!primaryContact) {
    return NextResponse.json({ error: "No contact" }, { status: 400 });
  }

  const mediaUrl = post.assetId ? await getAssetUrl(post.assetId) : undefined;
  const body = post.caption ?? "";
  const now = new Date();

  try {
    const { sid, success } = await sendWhatsAppMessage({
      to: primaryContact.phone,
      body,
      mediaUrl: mediaUrl ?? undefined,
    });

    if (success) {
      await prisma.scheduledPost.update({
        where: { id: postId },
        data: { status: "CONFIRMED", sentAt: now, confirmedAt: now },
      });
      if (sid) {
        await prisma.messageLog.create({
          data: {
            scheduledPostId: postId,
            twilioSid: sid,
            deliveryStatus: "SENT",
          },
        });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Send failed" },
      { status: 500 }
    );
  }
}
