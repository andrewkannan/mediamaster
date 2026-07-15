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

    const { files } = await req.json();

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ duplicates: [] });
    }

    // Query the database for files matching BOTH original_filename and size
    // We only check files that are not soft-deleted.
    const existing = await prisma.media.findMany({
      where: {
        deletedAt: null,
        OR: files.map((f: any) => ({
          original_filename: f.name,
          size: f.size,
        })),
      },
      select: {
        original_filename: true,
        size: true,
      },
    });

    // Return the matches so the frontend can skip them
    return NextResponse.json({ duplicates: existing });
  } catch (error) {
    console.error("Duplicate check error:", error);
    return NextResponse.json(
      { error: "Failed to check for duplicates" },
      { status: 500 }
    );
  }
}
