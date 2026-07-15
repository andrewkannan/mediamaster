import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import prisma from "@/lib/prisma";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // Allow public access if a valid share token is provided
    let isPublicShare = false;
    
    const { mediaIds, shareToken } = await req.json();

    if (!session || !session.user) {
      if (shareToken) {
        const share = await prisma.shareLink.findUnique({ where: { token: shareToken } });
        if (!share || (share.expiresAt && share.expiresAt < new Date())) {
          return NextResponse.json({ error: "Invalid or expired share link" }, { status: 401 });
        }
        isPublicShare = true;
      } else {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
      return NextResponse.json({ error: "No media IDs provided" }, { status: 400 });
    }

    // Fetch media details
    const mediaItems = await prisma.media.findMany({
      where: { id: { in: mediaIds }, deletedAt: null },
    });

    // Generate presigned URLs
    const urls = await Promise.all(
      mediaItems.map(async (media) => {
        const command = new GetObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: media.s3_key,
          ResponseContentDisposition: `attachment; filename="${media.original_filename}"`,
        });

        const url = await getSignedUrl(s3Client, command, {
          expiresIn: 3600, // 1 hour
        });
        return { id: media.id, url, filename: media.original_filename };
      })
    );

    return NextResponse.json({ urls });
  } catch (error) {
    console.error("Bulk download error:", error);
    return NextResponse.json(
      { error: "Failed to generate bulk download links" },
      { status: 500 }
    );
  }
}
