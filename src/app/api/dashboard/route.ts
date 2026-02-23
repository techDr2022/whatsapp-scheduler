import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const status = searchParams.get("status");
  const clientId = searchParams.get("clientId");

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Invalid month param" }, { status: 400 });
  }

  const [y, m] = month.split("-").map(Number);
  const start = startOfMonth(new Date(y, m - 1));
  const end = endOfMonth(new Date(y, m - 1));

  const where: Record<string, unknown> = {
    postDate: { gte: start, lte: end },
  };

  if (status) {
    where.status = status;
  }

  if (clientId) {
    where.clientId = clientId;
  }

  const posts = await prisma.scheduledPost.findMany({
    where,
    include: {
      client: { include: { contacts: true } },
      asset: true,
    },
    orderBy: [{ postDate: "asc" }, { client: { name: "asc" } }],
  });

  return NextResponse.json(posts);
}
