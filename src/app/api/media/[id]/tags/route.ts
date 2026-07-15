import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tags } = await req.json();

    if (!Array.isArray(tags)) {
      return NextResponse.json({ error: "Tags must be an array" }, { status: 400 });
    }

    // Process new tags (find or create)
    const tagIds = [];
    for (const tagName of tags) {
      const tag = await prisma.tag.upsert({
        where: { name: tagName.toLowerCase() },
        update: {},
        create: { name: tagName.toLowerCase() },
      });
      tagIds.push(tag.id);
    }

    // Update the Media record to replace existing tags
    // Prisma transaction to clear existing tags and add new ones
    await prisma.$transaction([
      prisma.mediaTag.deleteMany({
        where: { mediaId: id },
      }),
      prisma.mediaTag.createMany({
        data: tagIds.map((tagId) => ({
          mediaId: id,
          tagId: tagId,
        })),
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: "UPDATE_MEDIA_TAGS",
        details: JSON.stringify({ mediaId: id, tags }),
      },
    });

    const updatedMedia = await prisma.media.findUnique({
      where: { id },
      include: {
        mediaTags: { include: { tag: true } },
      },
    });

    return NextResponse.json({ media: updatedMedia });
  } catch (error) {
    console.error("Update tags error:", error);
    return NextResponse.json({ error: "Failed to update tags" }, { status: 500 });
  }
}
