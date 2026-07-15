"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { UploadModal } from "@/components/UploadModal";
import { Star, Download, Search, Image as ImageIcon, Video as VideoIcon } from "lucide-react";

interface MediaTag {
  tag: {
    id: string;
    name: string;
  };
}

interface MediaItem {
  id: string;
  original_filename: string;
  s3_key: string;
  size: number;
  is_highlighted: boolean;
  createdAt: string;
  mediaTags: MediaTag[];
  uploadedBy: {
    name: string | null;
    email: string | null;
  };
}

interface DashboardClientProps {
  initialMedia: MediaItem[];
  bucketName: string;
  region: string;
}

export default function DashboardClient({ initialMedia, bucketName, region }: DashboardClientProps) {
  const [media, setMedia] = useState<MediaItem[]>(initialMedia);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const refreshMedia = async () => {
    try {
      const res = await fetch("/api/media");
      const data = await res.json();
      if (data.media) {
        setMedia(data.media);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleHighlight = async (id: string, currentStatus: boolean) => {
    // Optimistic UI update
    setMedia(media.map(m => {
      if (m.id === id) return { ...m, is_highlighted: !currentStatus };
      return m;
    }).sort((a, b) => {
      if (a.is_highlighted === b.is_highlighted) return 0;
      return a.is_highlighted ? -1 : 1;
    }));

    try {
      await fetch(`/api/media/${id}/highlight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_highlighted: !currentStatus }),
      });
      // Optionally refresh from server to ensure sync
      // refreshMedia();
    } catch (e) {
      console.error("Failed to highlight", e);
      // Revert on failure
      refreshMedia();
    }
  };

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

  const filteredMedia = media.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    // Search by filename or tag
    if (item.original_filename.toLowerCase().includes(q)) return true;
    if (item.mediaTags.some(t => t.tag.name.includes(q))) return true;
    return false;
  });

  return (
    <div className="flex-1 flex flex-col bg-gray-900 min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Media Library</h1>
            <p className="text-gray-400 text-sm mt-1">Manage and organize your church media</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search files or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-white pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500 w-64 transition-colors"
              />
            </div>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
            >
              Upload Media
            </button>
          </div>
        </div>

        {filteredMedia.length === 0 ? (
          <div className="text-center py-20 bg-gray-800 rounded-xl border border-gray-700 border-dashed">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-1">No media found</h3>
            <p className="text-gray-400 text-sm mb-4">Get started by uploading some photos or videos.</p>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="text-blue-500 hover:text-blue-400 font-medium"
            >
              Click here to upload
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredMedia.map((item) => {
              const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${item.s3_key}`;
              const video = isVideo(item.original_filename);

              return (
                <div key={item.id} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 group hover:border-gray-500 transition-all duration-200 shadow-sm hover:shadow-xl relative flex flex-col">
                  {/* Image/Video Preview */}
                  <div className="aspect-w-16 aspect-h-12 bg-gray-900 relative">
                    {video ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <VideoIcon className="w-12 h-12 text-gray-600" />
                      </div>
                    ) : (
                      // Note: We use an img tag here because the user is uploading directly to S3. 
                      // In a production scenario with massive raw files, we'd generate thumbnails.
                      // Using the raw S3 url here works as a quick preview but will be slow for massive images.
                      <img
                        src={s3Url}
                        alt={item.original_filename}
                        className="object-cover w-full h-48"
                        loading="lazy"
                      />
                    )}
                    
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60"></div>
                    
                    {/* Highlight Button */}
                    <button
                      onClick={() => toggleHighlight(item.id, item.is_highlighted)}
                      className="absolute top-3 right-3 p-1.5 rounded-full bg-gray-900/50 backdrop-blur-sm border border-white/10 hover:bg-gray-800/80 transition-colors"
                      title={item.is_highlighted ? "Remove Highlight" : "Highlight to pin to top"}
                    >
                      <Star className={`w-4 h-4 ${item.is_highlighted ? "fill-yellow-400 text-yellow-400" : "text-white"}`} />
                    </button>
                  </div>

                  {/* Metadata */}
                  <div className="p-4 flex-1 flex flex-col">
                    <h4 className="text-sm font-medium text-white truncate" title={item.original_filename}>
                      {item.original_filename}
                    </h4>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatSize(item.size)} • {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                    
                    {/* Tags */}
                    {item.mediaTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {item.mediaTags.map(mt => (
                          <span key={mt.tag.id} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-900/30 text-blue-400 border border-blue-800/50">
                            {mt.tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div className="mt-auto pt-4 flex justify-between items-center">
                      <span className="text-[10px] text-gray-500 truncate max-w-[120px]">
                        by {item.uploadedBy?.name || item.uploadedBy?.email?.split('@')[0]}
                      </span>
                      <a
                        href={s3Url}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-1 text-xs font-medium text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded transition-colors"
                      >
                        <Download className="w-3 h-3" />
                        <span>Original</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {isUploadOpen && (
        <UploadModal
          onClose={() => setIsUploadOpen(false)}
          onUploadComplete={() => {
            setIsUploadOpen(false);
            refreshMedia();
          }}
        />
      )}
    </div>
  );
}
