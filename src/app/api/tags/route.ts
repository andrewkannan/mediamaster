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

    // Fetch tags with their usage count
    const tags = await prisma.tag.findMany({
      include: {
        _count: {
          select: { mediaTags: true }
        }
      },
      orderBy: {
        mediaTags: {
          _count: 'desc'
        }
      }
    });

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Fetch tags error:", error);
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
  }
}
