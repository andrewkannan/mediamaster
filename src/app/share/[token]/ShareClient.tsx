"use client";

import { Download, Video as VideoIcon, Folder, Link as LinkIcon } from "lucide-react";
import { useState } from "react";

interface ShareClientProps {
  token: string;
  shareLink: any;
  folderMedia: any[];
}

export function ShareClient({ token, shareLink, folderMedia }: ShareClientProps) {
  const [downloading, setDownloading] = useState(false);

  const title = shareLink.folderId ? shareLink.folder?.name : shareLink.media?.original_filename;
  const mediaList = shareLink.folderId ? folderMedia : [shareLink.media];

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const isVideo = (filename: string) => {
    return /\.(mp4|mov|avi|wmv|mkv)$/i.test(filename);
  };

  const handleBulkDownload = async () => {
    if (mediaList.length === 0 || downloading) return;
    setDownloading(true);
    try {
      const res = await fetch("/api/media/bulk-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaIds: mediaList.map(m => m.id), shareToken: token }),
      });
      const data = await res.json();
      if (data.urls) {
        data.urls.forEach((item: any, index: number) => {
          setTimeout(() => {
            const a = document.createElement("a");
            a.href = item.url;
            a.download = item.filename || "download";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }, index * 200);
        });
      }
    } catch (e) {
      console.error("Bulk download failed", e);
    } finally {
      setTimeout(() => setDownloading(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Navbar */}
      <nav className="bg-gray-900 border-b border-gray-800 p-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 text-white">
            <LinkIcon className="w-5 h-5 text-blue-500" />
            <span className="font-semibold text-lg">Shared: {title}</span>
          </div>
          {mediaList.length > 0 && (
            <button
              onClick={handleBulkDownload}
              disabled={downloading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors shadow-lg shadow-blue-900/20"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? "Downloading..." : "Download All"}</span>
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {mediaList.length === 0 ? (
          <div className="text-center py-20 bg-gray-900 rounded-xl border border-gray-800 border-dashed">
            <Folder className="mx-auto h-12 w-12 text-gray-700 mb-4" />
            <h3 className="text-lg font-medium text-white mb-1">Folder is empty</h3>
            <p className="text-gray-500 text-sm">There are no files in this shared folder.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {mediaList.map((item) => {
              const video = isVideo(item.original_filename);

              return (
                <div key={item.id} className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 group hover:border-gray-600 transition-all duration-200 shadow-sm hover:shadow-xl relative flex flex-col">
                  <div className="aspect-square bg-gray-950 relative">
                    {video ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <VideoIcon className="w-12 h-12 text-gray-700" />
                      </div>
                    ) : (
                      <img
                        src={`/api/media/${item.id}/preview?shareToken=${token}`}
                        alt={item.original_filename}
                        className="absolute inset-0 object-cover w-full h-full"
                        loading="lazy"
                      />
                    )}
                  </div>

                  <div className="p-3 flex-1 flex flex-col">
                    <h4 className="text-sm font-medium text-white truncate" title={item.original_filename}>
                      {item.original_filename}
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {formatSize(item.size)}
                    </p>
                    
                    <div className="mt-auto pt-3 flex justify-between items-center">
                      <span className="text-[10px] text-gray-600 truncate max-w-[90px]">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      <a
                        onClick={async (e) => {
                          e.preventDefault();
                          const res = await fetch("/api/media/bulk-download", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ mediaIds: [item.id], shareToken: token }),
                          });
                          const data = await res.json();
                          if (data.urls && data.urls[0]) {
                            const a = document.createElement("a");
                            a.href = data.urls[0].url;
                            a.download = data.urls[0].filename;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                          }
                        }}
                        href="#"
                        className="flex items-center justify-center p-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
                        title="Download Original"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
