import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scheduledPostSchema } from "@/lib/validations";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // YYYY-MM

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Invalid month param" }, { status: 400 });
  }

  const [y, m] = month.split("-").map(Number);
  const start = startOfMonth(new Date(y, m - 1));
  const end = endOfMonth(new Date(y, m - 1));

  const posts = await prisma.scheduledPost.findMany({
    where: {
      clientId: id,
      postDate: { gte: start, lte: end },
    },
    include: { asset: true },
    orderBy: { postDate: "asc" },
  });

  return NextResponse.json(posts);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const data = scheduledPostSchema.parse(body);

    const post = await prisma.scheduledPost.create({
      data: {
        clientId: id,
        postDate: data.postDate,
        assetId: data.assetId ?? undefined,
        caption: data.caption ?? undefined,
        approvalSendAt: data.approvalSendAt ?? undefined,
        offsetDays: data.offsetDays,
        status: data.status,
      },
      include: { asset: true },
    });
    return NextResponse.json(post);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Validation failed" },
      { status: 400 }
    );
  }
}
