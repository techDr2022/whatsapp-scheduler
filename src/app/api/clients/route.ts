import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { clientSchema } from "@/lib/validations";

export async function GET() {
  const clients = await prisma.client.findMany({
    include: {
      contacts: true,
      _count: { select: { scheduledPosts: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = clientSchema.parse(body);
    const client = await prisma.client.create({
      data: { name: data.name },
      include: { contacts: true },
    });
    return NextResponse.json(client);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Validation failed" },
      { status: 400 }
    );
  }
}
