import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { contactSchema } from "@/lib/validations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const contacts = await prisma.contact.findMany({
    where: { clientId: id },
    orderBy: [{ isPrimaryApproval: "desc" }, { name: "asc" }],
  });
  return NextResponse.json(contacts);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const data = contactSchema.parse(body);

    if (data.isPrimaryApproval) {
      await prisma.contact.updateMany({
        where: { clientId: id },
        data: { isPrimaryApproval: false },
      });
    }

    const contact = await prisma.contact.create({
      data: {
        clientId: id,
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
