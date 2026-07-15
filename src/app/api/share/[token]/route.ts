import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      include: {
        folder: true,
        media: {
          include: {
            mediaTags: { include: { tag: true } },
            uploadedBy: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (!shareLink) {
      return NextResponse.json({ error: "Link not found or expired" }, { status: 404 });
    }

    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      return NextResponse.json({ error: "Link has expired" }, { status: 410 });
    }

    // If it's a folder, we need to fetch all media inside that folder
    let folderMedia: any[] = [];
    if (shareLink.folderId) {
      folderMedia = await prisma.media.findMany({
        where: { folderId: shareLink.folderId, deletedAt: null },
        orderBy: [{ is_highlighted: "desc" }, { createdAt: "desc" }],
        include: {
          mediaTags: { include: { tag: true } },
          uploadedBy: { select: { name: true, email: true } },
        },
      });
    }

    return NextResponse.json({
      shareLink,
      folderMedia: shareLink.folderId ? folderMedia : null,
    });
  } catch (error) {
    console.error("Fetch share link error:", error);
    return NextResponse.json(
      { error: "Failed to fetch shared content" },
      { status: 500 }
    );
  }
}
