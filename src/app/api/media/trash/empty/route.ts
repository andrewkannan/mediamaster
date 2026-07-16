import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all media in trash
    const trashedMedia = await prisma.media.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true, s3_key: true }
    });

    if (trashedMedia.length === 0) {
      return NextResponse.json({ message: "Trash is already empty" });
    }

    // Delete from S3 in batches of 1000
    const chunkSize = 1000;
    for (let i = 0; i < trashedMedia.length; i += chunkSize) {
      const chunk = trashedMedia.slice(i, i + chunkSize);
      
      const deleteParams = {
        Bucket: process.env.AWS_BUCKET_NAME!,
        Delete: {
          Objects: chunk.map(media => ({ Key: media.s3_key })),
          Quiet: false,
        },
      };

      try {
        const command = new DeleteObjectsCommand(deleteParams);
        await s3Client.send(command);
      } catch (s3Error) {
        console.error("Failed to delete objects from S3:", s3Error);
        // Continue with database deletion anyway to clean up state
      }
    }

    // Delete from Database
    await prisma.media.deleteMany({
      where: { deletedAt: { not: null } }
    });

    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: "EMPTY_TRASH",
        details: JSON.stringify({ count: trashedMedia.length }),
      },
    });

    return NextResponse.json({ message: "Trash emptied successfully", count: trashedMedia.length });
  } catch (error) {
    console.error("Empty trash error:", error);
    return NextResponse.json({ error: "Failed to empty trash" }, { status: 500 });
  }
}
