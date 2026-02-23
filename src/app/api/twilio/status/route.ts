import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Twilio status callback webhook - updates MessageLog.deliveryStatus

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const messageSid = formData.get("MessageSid") as string | null;
    const messageStatus = formData.get("MessageStatus") as string | null;

    if (!messageSid || !messageStatus) {
      return NextResponse.json({ error: "Missing MessageSid or MessageStatus" }, { status: 400 });
    }

    const statusMap: Record<string, "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED"> = {
      queued: "PENDING",
      sending: "PENDING",
      sent: "SENT",
      delivered: "DELIVERED",
      read: "READ",
      failed: "FAILED",
      undelivered: "FAILED",
    };

    const deliveryStatus = statusMap[messageStatus] ?? "PENDING";

    await prisma.messageLog.updateMany({
      where: { twilioSid: messageSid },
      data: { deliveryStatus },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Twilio status webhook error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
