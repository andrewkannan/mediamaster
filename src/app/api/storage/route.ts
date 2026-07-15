import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get("folderId");

    let folderStorageBytes = 0;
    
    // Calculate global total
    const globalTotal = await prisma.media.aggregate({
      _sum: { size: true },
      where: { deletedAt: null },
    });
    
    const globalStorageBytes = globalTotal._sum.size || 0;

    // Calculate folder total if requested
    if (folderId) {
      const folderTotal = await prisma.media.aggregate({
        _sum: { size: true },
        where: { folderId, deletedAt: null },
      });
      folderStorageBytes = folderTotal._sum.size || 0;
    }

    const maxStorageGB = parseInt(process.env.MAX_STORAGE_GB || "100", 10);
    const maxStorageBytes = maxStorageGB * 1024 * 1024 * 1024;

    return NextResponse.json({
      globalStorageBytes,
      folderStorageBytes,
      maxStorageBytes,
      maxStorageGB,
    });
  } catch (error) {
    console.error("Storage API error:", error);
    return NextResponse.json(
      { error: "Failed to calculate storage" },
      { status: 500 }
    );
  }
}
