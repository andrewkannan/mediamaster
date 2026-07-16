import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
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
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { filename, contentType } = await req.json();

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "Filename and contentType are required" },
        { status: 400 }
      );
    }

    // Fetch allowed file types setting
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'allowedFileTypes' } });
    let allowedTypes = ["image", "video"];
    if (setting) {
      try {
        allowedTypes = JSON.parse(setting.value);
      } catch (e) {
        console.error("Failed to parse allowedFileTypes setting");
      }
    }

    const isAllowed = allowedTypes.includes("all") || allowedTypes.some(type => contentType.startsWith(`${type}/`));
    if (!isAllowed) {
      return NextResponse.json(
        { error: "File type not allowed" },
        { status: 400 }
      );
    }

    const key = `uploads/${uuidv4()}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    return NextResponse.json({ presignedUrl, key });
  } catch (error) {
    console.error("Presign error:", error);
    return NextResponse.json(
      { error: "Failed to generate presigned URL" },
      { status: 500 }
    );
  }
}
