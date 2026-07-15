import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { original_filename, s3_key, size, folderId, tags, takenAt } = await req.json();

    if (!original_filename || !s3_key || !size) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Process tags (find or create)
    const tagIds = [];
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        const tag = await prisma.tag.upsert({
          where: { name: tagName.toLowerCase() },
          update: {},
          create: { name: tagName.toLowerCase() },
        });
        tagIds.push(tag.id);
      }
    }

    // Create the Media record
    const media = await prisma.media.create({
      data: {
        original_filename,
        s3_key,
        size,
        folderId: folderId || null,
        uploadedById: (session.user as any).id,
        takenAt: takenAt ? new Date(takenAt) : null,
        mediaTags: {
          create: tagIds.map((tagId) => ({
            tag: { connect: { id: tagId } },
          })),
        },
      },
      include: {
        mediaTags: { include: { tag: true } },
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: "UPLOAD_MEDIA",
        details: JSON.stringify({ mediaId: media.id, original_filename }),
      },
    });

    return NextResponse.json({ media });
  } catch (error) {
    console.error("Save media error:", error);
    return NextResponse.json(
      { error: "Failed to save media metadata" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get("folderId");
    
    const media = await prisma.media.findMany({
      where: folderId 
        ? { folderId, deletedAt: null } 
        : { folderId: null, deletedAt: null },
      orderBy: [
        { is_highlighted: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        mediaTags: { include: { tag: true } },
        uploadedBy: { select: { name: true, email: true } }
      },
    });

    return NextResponse.json({ media });
  } catch (error) {
    console.error("Fetch media error:", error);
    return NextResponse.json(
      { error: "Failed to fetch media" },
      { status: 500 }
    );
  }
}
