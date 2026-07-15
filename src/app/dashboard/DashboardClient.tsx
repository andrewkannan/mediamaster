"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { UploadModal } from "@/components/UploadModal";
import { TagEditModal } from "@/components/TagEditModal";
import { FolderCreateModal } from "@/components/FolderCreateModal";
import { Star, Download, Search, Image as ImageIcon, Video as VideoIcon, Folder, ChevronRight, Tag as TagIcon, Trash2 } from "lucide-react";

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

interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

interface DashboardClientProps {
  initialMedia: MediaItem[];
  bucketName: string;
  region: string;
}

export default function DashboardClient({ initialMedia, bucketName, region }: DashboardClientProps) {
  const [media, setMedia] = useState<MediaItem[]>(initialMedia);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<{id: string, name: string}[]>([]);
  
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isFolderCreateOpen, setIsFolderCreateOpen] = useState(false);
  const [tagEditMediaId, setTagEditMediaId] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");

  const currentFolderId = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].id : null;

  // Fetch folders and media whenever currentFolderId changes
  useEffect(() => {
    fetchData();
  }, [currentFolderId]);

  const fetchData = async () => {
    try {
      const folderRes = await fetch(`/api/folders${currentFolderId ? `?parentId=${currentFolderId}` : ''}`);
      const folderData = await folderRes.json();
      if (folderData.folders) setFolders(folderData.folders);

      const mediaRes = await fetch(`/api/media${currentFolderId ? `?folderId=${currentFolderId}` : ''}`);
      const mediaData = await mediaRes.json();
      if (mediaData.media) setMedia(mediaData.media);
    } catch (e) {
      console.error(e);
    }
  };

  const navigateToFolder = (folderId: string, folderName: string) => {
    setBreadcrumbs([...breadcrumbs, { id: folderId, name: folderName }]);
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      setBreadcrumbs([]); // Go home
    } else {
      setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    }
  };

  const toggleHighlight = async (id: string, currentStatus: boolean) => {
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
    } catch (e) {
      console.error("Failed to highlight", e);
      fetchData();
    }
  };

  const deleteMedia = async (id: string) => {
    if (!confirm("Are you sure you want to delete this media? It will be kept in trash for 7 days.")) return;
    
    setMedia(media.filter(m => m.id !== id));
    try {
      await fetch(`/api/media/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDeleted: true }),
      });
    } catch (e) {
      console.error(e);
      fetchData();
    }
  };

  const deleteFolder = async (id: string) => {
    if (!confirm("Are you sure you want to delete this folder? All contents inside will be inaccessible.")) return;
    
    setFolders(folders.filter(f => f.id !== id));
    try {
      await fetch(`/api/folders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDeleted: true }),
      });
    } catch (e) {
      console.error(e);
      fetchData();
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
    if (item.original_filename.toLowerCase().includes(q)) return true;
    if (item.mediaTags.some(t => t.tag.name.includes(q))) return true;
    return false;
  });

  const filteredFolders = folders.filter((folder) => {
    if (!searchQuery) return true;
    return folder.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex-1 flex flex-col bg-gray-900 min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Media Library</h1>
            <p className="text-gray-400 text-sm mt-1">Manage and organize your church media</p>
          </div>
          
          <div className="flex items-center space-x-3">
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
              onClick={() => setIsFolderCreateOpen(true)}
              className="bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              New Folder
            </button>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
            >
              Upload Media
            </button>
          </div>
        </div>

        {/* Breadcrumbs */}
        <div className="flex items-center space-x-2 text-sm font-medium mb-6 bg-gray-800 p-3 rounded-lg border border-gray-700">
          <button onClick={() => navigateToBreadcrumb(-1)} className="text-gray-400 hover:text-white transition-colors">
            Home
          </button>
          {breadcrumbs.map((bc, idx) => (
            <div key={bc.id} className="flex items-center space-x-2">
              <ChevronRight className="w-4 h-4 text-gray-600" />
              <button 
                onClick={() => navigateToBreadcrumb(idx)}
                className={`${idx === breadcrumbs.length - 1 ? 'text-white' : 'text-gray-400 hover:text-white'} transition-colors`}
              >
                {bc.name}
              </button>
            </div>
          ))}
        </div>

        {filteredFolders.length === 0 && filteredMedia.length === 0 ? (
          <div className="text-center py-20 bg-gray-800 rounded-xl border border-gray-700 border-dashed">
            <ImageIcon className="mx-auto h-12 w-12 text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-1">No media found here</h3>
            <p className="text-gray-400 text-sm mb-4">Create a folder or upload some media to get started.</p>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Folders Grid */}
            {filteredFolders.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Folders</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredFolders.map(folder => (
                    <div 
                      key={folder.id} 
                      className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500 hover:bg-gray-750 transition-all cursor-pointer group flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3 truncate" onClick={() => navigateToFolder(folder.id, folder.name)}>
                        <Folder className="w-6 h-6 text-blue-500 flex-shrink-0" />
                        <span className="text-white font-medium truncate">{folder.name}</span>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}
                        className="text-gray-500 hover:text-red-400 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete Folder"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Media Grid */}
            {filteredMedia.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Files</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredMedia.map((item) => {
                    const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${item.s3_key}`;
                    const video = isVideo(item.original_filename);
                    const currentTags = item.mediaTags.map(mt => mt.tag.name);

                    return (
                      <div key={item.id} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 group hover:border-gray-500 transition-all duration-200 shadow-sm hover:shadow-xl relative flex flex-col">
                        <div className="aspect-w-16 aspect-h-12 bg-gray-900 relative">
                          {video ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <VideoIcon className="w-12 h-12 text-gray-600" />
                            </div>
                          ) : (
                            <img
                              src={s3Url}
                              alt={item.original_filename}
                              className="object-cover w-full h-48"
                              loading="lazy"
                            />
                          )}
                          
                          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-60"></div>
                          
                          {/* Top Right Action Buttons */}
                          <div className="absolute top-3 right-3 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => toggleHighlight(item.id, item.is_highlighted)}
                              className="p-1.5 rounded-full bg-gray-900/70 backdrop-blur-sm border border-white/10 hover:bg-gray-800 transition-colors"
                              title={item.is_highlighted ? "Remove Highlight" : "Highlight to pin to top"}
                            >
                              <Star className={`w-4 h-4 ${item.is_highlighted ? "fill-yellow-400 text-yellow-400" : "text-white"}`} />
                            </button>
                            <button
                              onClick={() => setTagEditMediaId(item.id)}
                              className="p-1.5 rounded-full bg-gray-900/70 backdrop-blur-sm border border-white/10 hover:bg-gray-800 transition-colors"
                              title="Edit Tags"
                            >
                              <TagIcon className="w-4 h-4 text-white" />
                            </button>
                            <button
                              onClick={() => deleteMedia(item.id)}
                              className="p-1.5 rounded-full bg-gray-900/70 backdrop-blur-sm border border-white/10 hover:bg-red-500/20 hover:text-red-400 text-white transition-colors"
                              title="Delete Media"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="p-4 flex-1 flex flex-col">
                          <h4 className="text-sm font-medium text-white truncate" title={item.original_filename}>
                            {item.original_filename}
                          </h4>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatSize(item.size)} • {new Date(item.createdAt).toLocaleDateString()}
                          </p>
                          
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
                            {/* Uses the forced download API route */}
                            <a
                              href={`/api/media/${item.id}/download`}
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
              </div>
            )}
          </div>
        )}
      </main>

      {isUploadOpen && (
        <UploadModal
          folderId={currentFolderId}
          onClose={() => setIsUploadOpen(false)}
          onUploadComplete={() => {
            setIsUploadOpen(false);
            fetchData();
          }}
        />
      )}

      {isFolderCreateOpen && (
        <FolderCreateModal
          parentId={currentFolderId}
          onClose={() => setIsFolderCreateOpen(false)}
          onSuccess={() => {
            setIsFolderCreateOpen(false);
            fetchData();
          }}
        />
      )}

      {tagEditMediaId && (
        <TagEditModal
          mediaId={tagEditMediaId}
          initialTags={media.find(m => m.id === tagEditMediaId)?.mediaTags.map(t => t.tag.name) || []}
          onClose={() => setTagEditMediaId(null)}
          onSave={() => {
            setTagEditMediaId(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
