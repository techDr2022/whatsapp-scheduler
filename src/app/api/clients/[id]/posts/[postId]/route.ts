import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scheduledPostUpdateSchema } from "@/lib/validations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  const { id, postId } = await params;
  const post = await prisma.scheduledPost.findFirst({
    where: { id: postId, clientId: id },
    include: { asset: true },
  });
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(post);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  const { id, postId } = await params;
  try {
    const body = await request.json();
    const data = scheduledPostUpdateSchema.parse(body);

    const existing = await prisma.scheduledPost.findFirst({
      where: { id: postId, clientId: id },
    });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updateData: Record<string, unknown> = {};
    if (data.assetId !== undefined) updateData.assetId = data.assetId;
    if (data.caption !== undefined) updateData.caption = data.caption;
    if (data.approvalSendAt !== undefined) updateData.approvalSendAt = data.approvalSendAt;
    if (data.offsetDays !== undefined) updateData.offsetDays = data.offsetDays;
    if (data.status !== undefined) updateData.status = data.status;

    const post = await prisma.scheduledPost.update({
      where: { id: postId },
      data: updateData,
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  const { id, postId } = await params;
  const existing = await prisma.scheduledPost.findFirst({
    where: { id: postId, clientId: id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.scheduledPost.delete({ where: { id: postId } });
  return new Response(null, { status: 204 });
}
