import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { isDeleted } = await req.json();

    const updateData: any = {};
    if (isDeleted !== undefined) updateData.deletedAt = isDeleted ? new Date() : null;

    const media = await prisma.media.update({
      where: { id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: isDeleted ? "DELETE_MEDIA" : "RESTORE_MEDIA",
        details: JSON.stringify({ mediaId: media.id }),
      },
    });

    return NextResponse.json({ media });
  } catch (error) {
    console.error("Update media error:", error);
    return NextResponse.json({ error: "Failed to update media" }, { status: 500 });
  }
}
