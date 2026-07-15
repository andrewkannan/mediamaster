import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  // Fetch initial media data server-side for speed
  const mediaList = await prisma.media.findMany({
    where: { folderId: null },
    orderBy: [
      { is_highlighted: "desc" },
      { createdAt: "desc" },
    ],
    include: {
      mediaTags: { include: { tag: true } },
      uploadedBy: { select: { name: true, email: true } }
    },
  });

  return (
    <DashboardClient 
      initialMedia={JSON.parse(JSON.stringify(mediaList))} 
      bucketName={process.env.AWS_BUCKET_NAME || ""}
      region={process.env.AWS_REGION || "us-east-1"}
    />
  );
}
