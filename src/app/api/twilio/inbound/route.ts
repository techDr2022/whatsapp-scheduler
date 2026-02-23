import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Twilio inbound webhook - saves incoming messages to ReplyLog

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

    await prisma.replyLog.create({
      data: {
        twilioSid: messageSid ?? undefined,
        fromPhone: phone,
        body: body,
      },
    });

    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { "Content-Type": "text/xml" } }
    );
  } catch (e) {
    console.error("Twilio inbound webhook error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
