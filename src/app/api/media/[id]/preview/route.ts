import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import prisma from "@/lib/prisma";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const { searchParams } = new URL(req.url);
    const shareToken = searchParams.get("shareToken");
    
    // The preview route is intentionally left unauthenticated. 
    // Security relies on the 25-character unguessable CUID of the media item.
    // This allows Next.js Image Optimization to securely fetch and cache thumbnails.

    const media = await prisma.media.findUnique({
      where: { id },
    });

    if (!media) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: media.s3_key,
    });

    const s3Response = await s3Client.send(command);

    if (!s3Response.Body) {
      return NextResponse.json({ error: "Empty file" }, { status: 404 });
    }

    // Convert the AWS SDK stream to a Web ReadableStream
    const stream = s3Response.Body.transformToWebStream();

    return new NextResponse(stream, {
      headers: {
        "Content-Type": s3Response.ContentType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Preview error:", error);
    return NextResponse.json(
      { error: "Failed to generate preview link" },
      { status: 500 }
    );
  }
}
