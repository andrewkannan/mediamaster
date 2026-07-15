import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { is_highlighted } = await req.json();

    const media = await prisma.media.update({
      where: { id: params.id },
      data: { is_highlighted },
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: "HIGHLIGHT_MEDIA",
        details: JSON.stringify({ mediaId: media.id, is_highlighted }),
      },
    });

    return NextResponse.json({ media });
  } catch (error) {
    console.error("Highlight media error:", error);
    return NextResponse.json(
      { error: "Failed to update highlight status" },
      { status: 500 }
    );
  }
}
