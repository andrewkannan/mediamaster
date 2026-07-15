import { ShareClient } from "./ShareClient";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const shareLink = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      folder: true,
      media: {
        include: {
          mediaTags: { include: { tag: true } },
          uploadedBy: { select: { name: true, email: true } },
        },
      },
    },
  });

  if (!shareLink) {
    return notFound();
  }

  if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-white mb-2">Link Expired</h2>
          <p className="text-gray-400">This share link has expired and is no longer accessible.</p>
        </div>
      </div>
    );
  }

  let folderMedia = [];
  if (shareLink.folderId) {
    folderMedia = await prisma.media.findMany({
      where: { folderId: shareLink.folderId, deletedAt: null },
      orderBy: [{ is_highlighted: "desc" }, { createdAt: "desc" }],
      include: {
        mediaTags: { include: { tag: true } },
        uploadedBy: { select: { name: true, email: true } },
      },
    });
  }

  return (
    <ShareClient 
      token={token} 
      shareLink={shareLink} 
      folderMedia={folderMedia} 
    />
  );
}
