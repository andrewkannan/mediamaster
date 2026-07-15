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

    const { folderId, mediaId, expiresInDays } = await req.json();

    if (!folderId && !mediaId) {
      return NextResponse.json(
        { error: "Must provide either folderId or mediaId" },
        { status: 400 }
      );
    }

    let expiresAt = null;
    if (expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));
    }

    const shareLink = await prisma.shareLink.create({
      data: {
        folderId: folderId || null,
        mediaId: mediaId || null,
        expiresAt,
        createdById: (session.user as any).id,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: "CREATE_SHARE_LINK",
        details: JSON.stringify({ shareLinkId: shareLink.id, folderId, mediaId }),
      },
    });

    return NextResponse.json({ shareLink });
  } catch (error) {
    console.error("Create share link error:", error);
    return NextResponse.json(
      { error: "Failed to create share link" },
      { status: 500 }
    );
  }
}
