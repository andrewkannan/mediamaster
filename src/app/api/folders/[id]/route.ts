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

    const { name, isDeleted } = await req.json();

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (isDeleted !== undefined) updateData.deletedAt = isDeleted ? new Date() : null;

    const folder = await prisma.folder.update({
      where: { id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: isDeleted ? "DELETE_FOLDER" : "UPDATE_FOLDER",
        details: JSON.stringify({ folderId: folder.id, updateData }),
      },
    });

    return NextResponse.json({ folder });
  } catch (error) {
    console.error("Update folder error:", error);
    return NextResponse.json({ error: "Failed to update folder" }, { status: 500 });
  }
}
