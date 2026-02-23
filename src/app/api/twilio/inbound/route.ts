import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWhatsAppMessage } from "@/lib/twilio";

// Twilio inbound webhook - handles button clicks and text replies

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const from = formData.get("From") as string | null;
    const body = (formData.get("Body") ?? formData.get("body")) as string | null;
    const messageSid = formData.get("MessageSid") as string | null;

    if (!from || !body) {
      return NextResponse.json({ error: "Missing From or Body" }, { status: 400 });
    }

    const phone = from.replace("whatsapp:", "");
    const text = body.trim().toLowerCase();

    // Save reply to ReplyLog
    await prisma.replyLog.create({
      data: { twilioSid: messageSid ?? undefined, fromPhone: phone, body: body },
    });

    // Find the most recent PENDING_APPROVAL post for a contact with this phone
    const normalizedFrom = from.replace("whatsapp:", "").replace(/\D/g, "");
    const contact = await prisma.contact.findFirst({
      where: {
        OR: [
          { phone: from },
          { phone: { contains: normalizedFrom.slice(-10) } },
        ],
      },
      include: { client: true },
    });

    if (!contact) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    const post = await prisma.scheduledPost.findFirst({
      where: {
        clientId: contact.clientId,
        status: "PENDING_APPROVAL",
      },
      orderBy: { approvalSendAt: "desc" },
      include: { asset: true },
    });

    if (!post) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (text.includes("confirm") || text === "confirm") {
      updateData.status = "CONFIRMED";
      updateData.confirmedAt = new Date();
    } else if (text.includes("need changes") || text.includes("changes")) {
      updateData.status = "CHANGES_REQUESTED";
      await sendWhatsAppMessage({
        to: from,
        body: "Thanks for the feedback. Please describe exactly what changes you'd like to make to the post.",
      });
    } else if (text.includes("skip") || text.includes("tomorrow")) {
      updateData.status = "SKIPPED";
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.scheduledPost.update({
        where: { id: post.id },
        data: updateData as never,
      });
    }

    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { "Content-Type": "text/xml" } }
    );
  } catch (e) {
    console.error("Twilio inbound webhook error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
