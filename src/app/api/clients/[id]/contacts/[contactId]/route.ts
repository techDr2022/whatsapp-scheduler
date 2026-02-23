import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { contactSchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const { id, contactId } = await params;
  try {
    const body = await request.json();
    const data = contactSchema.parse(body);

    if (data.isPrimaryApproval) {
      await prisma.contact.updateMany({
        where: { clientId: id, id: { not: contactId } },
        data: { isPrimaryApproval: false },
      });
    }

    const existing = await prisma.contact.findFirst({
      where: { id: contactId, clientId: id },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const contact = await prisma.contact.update({
      where: { id: contactId },
      data: {
        name: data.name,
        phone: data.phone,
        isPrimaryApproval: data.isPrimaryApproval,
      },
    });
    return NextResponse.json(contact);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Validation failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const { id, contactId } = await params;
  const existing = await prisma.contact.findFirst({
    where: { id: contactId, clientId: id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.contact.delete({
    where: { id: contactId },
  });
  return NextResponse.json({ success: true });
}
