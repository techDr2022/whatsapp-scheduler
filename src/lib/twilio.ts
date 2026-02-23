import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM; // e.g. whatsapp:+14155238886
const mockMode = process.env.TWILIO_MOCK_MODE === "true";

let client: ReturnType<typeof twilio> | null = null;

export function getTwilioClient() {
  if (mockMode) return null;
  if (!accountSid || !authToken) return null;
  if (!client) {
    client = twilio(accountSid, authToken);
  }
  return client;
}

export async function sendWhatsAppMessage(params: {
  to: string;
  body: string;
  mediaUrl?: string;
}): Promise<{ sid: string | null; success: boolean }> {
  const twilioClient = getTwilioClient();

  if (mockMode || !twilioClient) {
    console.log("[TWILIO MOCK] Would send WhatsApp:", {
      to: params.to,
      body: params.body,
      mediaUrl: params.mediaUrl,
    });
    return { sid: `mock_${Date.now()}`, success: true };
  }

  if (!whatsappFrom) {
    throw new Error("TWILIO_WHATSAPP_FROM is not set");
  }

  const to = params.to.startsWith("whatsapp:") ? params.to : `whatsapp:${params.to}`;

  const messageParams = {
    from: whatsappFrom,
    to,
    body: params.body,
    ...(params.mediaUrl && { mediaUrl: [params.mediaUrl] }),
  };

  const message = await twilioClient.messages.create(messageParams);
  return { sid: message.sid, success: true };
}

export async function sendWhatsAppTemplate(params: {
  to: string;
  contentSid: string;
  contentVariables?: Record<string, string>;
  mediaUrl?: string;
}): Promise<{ sid: string | null; success: boolean }> {
  const twilioClient = getTwilioClient();

  if (mockMode || !twilioClient) {
    console.log("[TWILIO MOCK] Would send template:", {
      to: params.to,
      contentSid: params.contentSid,
      mediaUrl: params.mediaUrl,
    });
    return { sid: `mock_${Date.now()}`, success: true };
  }

  if (!whatsappFrom) {
    throw new Error("TWILIO_WHATSAPP_FROM is not set");
  }

  const to = params.to.startsWith("whatsapp:") ? params.to : `whatsapp:${params.to}`;

  const messageParams: Record<string, unknown> = {
    from: whatsappFrom,
    to,
    contentSid: params.contentSid,
    contentVariables: JSON.stringify(params.contentVariables ?? {}),
  };

  if (params.mediaUrl) {
    messageParams.mediaUrl = [params.mediaUrl];
  }

  const message = await twilioClient.messages.create(messageParams as never);
  return { sid: message.sid, success: true };
}

export { mockMode as isTwilioMockMode };
