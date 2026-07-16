"use client";

import { useState, useEffect } from "react";
import { Sidebar, ViewType } from "@/components/Sidebar";
import { UploadModal } from "@/components/UploadModal";
import { TagEditModal } from "@/components/TagEditModal";
import { FolderCreateModal } from "@/components/FolderCreateModal";
import { ShareModal } from "@/components/ShareModal";
import { SettingsView } from "@/components/SettingsView";
import { Star, Download, Search, Image as ImageIcon, Video as VideoIcon, Folder, ChevronRight, Tag as TagIcon, Trash2, RotateCcw, Link as LinkIcon, CheckSquare, Square, X, Menu, Plus, Share } from "lucide-react";

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
  const [rootFolders, setRootFolders] = useState<FolderItem[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<{id: string, name: string}[]>([]);
  
  const [view, setView] = useState<ViewType>("home");
  const [currentTag, setCurrentTag] = useState<string | null>(null);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isFolderCreateOpen, setIsFolderCreateOpen] = useState(false);
  const [tagEditMediaId, setTagEditMediaId] = useState<string | null>(null);
  const [shareModalData, setShareModalData] = useState<{id: string, type: 'folder' | 'media', title: string} | null>(null);
  
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set());
  const [storageStats, setStorageStats] = useState<{globalStorageBytes: number, folderStorageBytes: number, maxStorageBytes: number, maxStorageGB: number} | null>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [mediaFilter, setMediaFilter] = useState<"all" | "image" | "video">("all");

  const [isLoading, setIsLoading] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const currentFolderId = view === "folder" && breadcrumbs.length > 0 
    ? breadcrumbs[breadcrumbs.length - 1].id 
    : null;

  useEffect(() => {
    // Initial parallel load
    Promise.all([fetchSidebarData(), fetchData()]).finally(() => {
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setIsLoading(true);
      fetchData().finally(() => setIsLoading(false));
    }
  }, [view, currentFolderId, currentTag]);

  const fetchSidebarData = async () => {
    try {
      const folderRes = await fetch("/api/folders");
      const folderData = await folderRes.json();
      if (folderData.folders) setRootFolders(folderData.folders);

      const tagRes = await fetch("/api/tags");
      const tagData = await tagRes.json();
      if (tagData.tags) setTags(tagData.tags);
      // Also fetch storage stats
      const storageUrl = new URL("/api/storage", window.location.origin);
      const currentFolder = breadcrumbs[breadcrumbs.length - 1];
      if (view === "folder" && currentFolder) {
        storageUrl.searchParams.set("folderId", currentFolder.id);
      }
      const storageRes = await fetch(storageUrl.toString());
      if (storageRes.ok) {
        setStorageStats(await storageRes.json());
      }
    } catch (e) {
      console.error("Failed to fetch sidebar data", e);
    }
  };

  const fetchData = async () => {
    try {
      if (view === "trash") {
        const mediaRes = await fetch(`/api/media?view=trash`);
        const mediaData = await mediaRes.json();
        if (mediaData.media) setMedia(mediaData.media);
        setFolders([]);
      } else {
        const [folderRes, mediaRes] = await Promise.all([
          fetch(`/api/folders${currentFolderId ? `?parentId=${currentFolderId}` : ''}`),
          fetch(`/api/media${currentFolderId ? `?folderId=${currentFolderId}` : ''}`)
        ]);
        
        const folderData = await folderRes.json();
        if (folderData.folders) setFolders(folderData.folders);

        const mediaData = await mediaRes.json();
        if (mediaData.media) setMedia(mediaData.media);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleNavigateHome = () => {
    setView("home");
    setBreadcrumbs([]);
    setCurrentTag(null);
    setSelectedMediaIds(new Set());
    setIsMobileSidebarOpen(false);
  };

  const handleNavigateTrash = () => {
    setView("trash");
    setBreadcrumbs([]);
    setCurrentTag(null);
    setSelectedMediaIds(new Set());
    setIsMobileSidebarOpen(false);
  };

  const handleNavigateFolder = (folderId: string, folderName: string) => {
    setView("folder");
    setCurrentTag(null);
    setSelectedMediaIds(new Set());
    setIsMobileSidebarOpen(false);
    if (!breadcrumbs.find(b => b.id === folderId)) {
      setBreadcrumbs([{ id: folderId, name: folderName }]);
    } else {
      const idx = breadcrumbs.findIndex(b => b.id === folderId);
      setBreadcrumbs(breadcrumbs.slice(0, idx + 1));
    }
  };

  const handleNavigateTag = (tagName: string) => {
    setView("tag");
    setCurrentTag(tagName);
    setBreadcrumbs([]);
    setSelectedMediaIds(new Set());
    setIsMobileSidebarOpen(false);
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

  const deleteMedia = async (id: string, isDeleted: boolean = true) => {
    if (isDeleted && !confirm("Are you sure you want to delete this media? It will be kept in trash for 7 days.")) return;
    
    setMedia(media.filter(m => m.id !== id));
    if (selectedMediaIds.has(id)) {
      const newSet = new Set(selectedMediaIds);
      newSet.delete(id);
      setSelectedMediaIds(newSet);
    }
    try {
      await fetch(`/api/media/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDeleted }),
      });
      if (!isDeleted) fetchData();
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
      fetchSidebarData();
    } catch (e) {
      console.error(e);
      fetchData();
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedMediaIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedMediaIds(newSet);
  };

  const selectAll = () => {
    if (selectedMediaIds.size === filteredMedia.length) {
      setSelectedMediaIds(new Set());
    } else {
      setSelectedMediaIds(new Set(filteredMedia.map(m => m.id)));
    }
  };

  const handleBulkDownload = async () => {
    if (selectedMediaIds.size === 0) return;
    try {
      const res = await fetch("/api/media/bulk-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaIds: Array.from(selectedMediaIds) }),
      });
      const data = await res.json();
      if (data.urls) {
        // Trigger individual downloads in the browser
        data.urls.forEach((item: any, index: number) => {
          setTimeout(() => {
            const a = document.createElement("a");
            a.href = item.url;
            a.download = item.filename || "download";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }, index * 200); // Stagger by 200ms to prevent browser blocking
        });
        setSelectedMediaIds(new Set());
      }
    } catch (e) {
      console.error("Bulk download failed", e);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedMediaIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedMediaIds.size} items?`)) return;

    const ids = Array.from(selectedMediaIds);
    
    // Optimistic UI update
    setMedia(media.filter(m => !ids.includes(m.id)));
    setSelectedMediaIds(new Set());

    try {
      await Promise.all(
        ids.map(id => fetch(`/api/media/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isDeleted: true }),
        }))
      );
    } catch (e) {
      console.error("Bulk delete failed", e);
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
    // 1. Check filter type
    if (mediaFilter === "image" && !item.original_filename.match(/\.(jpg|jpeg|png|gif|webp|heic)$/i)) return false;
    if (mediaFilter === "video" && !item.original_filename.match(/\.(mp4|mov|avi|mkv|webm)$/i)) return false;
    
    // 2. Check search query
    if (view === "tag" && currentTag) {
      if (!item.mediaTags.some(t => t.tag.name === currentTag)) return false;
    }
    
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    if (item.original_filename.toLowerCase().includes(q)) return true;
    if (item.mediaTags.some(t => t.tag.name.includes(q))) return true;
    return false;
  });

  const filteredFolders = folders.filter((folder) => {
    if (view === "trash" || view === "tag") return false;
    if (!searchQuery) return true;
    return folder.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleNativeShare = async (e: React.MouseEvent, item: MediaItem) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        const response = await fetch(`/api/media/${item.id}/download`);
        const blob = await response.blob();
        
        const ext = item.original_filename.split('.').pop()?.toLowerCase();
        let mimeType = blob.type;
        if (ext && ['jpg', 'jpeg'].includes(ext)) mimeType = 'image/jpeg';
        else if (ext === 'png') mimeType = 'image/png';
        else if (ext === 'webp') mimeType = 'image/webp';
        else if (ext === 'gif') mimeType = 'image/gif';
        else if (ext === 'mp4') mimeType = 'video/mp4';
        else if (ext && ['mov', 'qt'].includes(ext)) mimeType = 'video/quicktime';

        const file = new File([blob], item.original_filename, { type: mimeType });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: item.original_filename,
            files: [file]
          });
        } else {
          setShareModalData({ id: item.id, type: 'media', title: item.original_filename });
        }
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      setShareModalData({ id: item.id, type: 'media', title: item.original_filename });
    }
  };

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <Sidebar 
        currentView={view}
        currentFolderId={currentFolderId}
        currentTag={currentTag}
        rootFolders={rootFolders}
        tags={tags}
        onNavigateHome={handleNavigateHome}
        onNavigateFolder={handleNavigateFolder}
        onNavigateTag={handleNavigateTag}
        onNavigateTrash={handleNavigateTrash}
        storageStats={storageStats}
        formatSize={formatSize}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onNavigateSettings={() => {
          setView("settings");
          setBreadcrumbs([]);
          setSearchQuery("");
        }}
      />

      <main className="flex-1 overflow-y-auto w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          
          {/* Header Section */}
          <div className="flex flex-col mb-6 gap-4">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setIsMobileSidebarOpen(true)}
                className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#171717] transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white capitalize flex items-center">
                  {view === "home" ? "Media Library" : view === "trash" ? "Trash Bin" : view === "settings" ? "System Settings" : view === "tag" ? `#${currentTag}` : breadcrumbs[breadcrumbs.length - 1]?.name || "Folder"}
                </h1>
                <p className="text-gray-400 text-sm mt-1 hidden sm:block">
                  {view === "trash" ? "Items here will be permanently deleted after 7 days." : "Manage and organize your church media"}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-between w-full">
              <div className="flex-1 max-w-2xl flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search files, folders, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#171717] border-none text-[#ececec] pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-gray-600 w-full transition-shadow placeholder-gray-500"
                />
                </div>
              </div>

              {/* Media Filter Tabs */}
              <div className="flex bg-[#171717] p-1 rounded-xl">
                {(["all", "image", "video"] as const).map((filterType) => (
                  <button
                    key={filterType}
                    onClick={() => setMediaFilter(filterType)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg capitalize transition-all duration-200 ${
                      mediaFilter === filterType 
                        ? 'bg-[#2f2f2f] text-white shadow-sm' 
                        : 'text-gray-400 hover:text-gray-200 hover:bg-[#212121]'
                    }`}
                  >
                    {filterType}
                  </button>
                ))}
              </div>

              {view !== "trash" && (
                <div className="hidden sm:flex gap-2">
                  <button
                    onClick={() => setIsFolderCreateOpen(true)}
                    className="bg-[#171717] hover:bg-[#212121] text-[#ececec] px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  >
                    New Folder
                  </button>
                  <button
                    onClick={() => setIsUploadOpen(true)}
                    className="bg-white hover:bg-gray-200 text-black px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm"
                  >
                    Upload Media
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Breadcrumbs (only show if in a folder) */}
          {view === "folder" && breadcrumbs.length > 0 && (
            <div className="flex items-center space-x-2 text-sm font-medium mb-6 bg-gray-900/50 p-3 rounded-lg border border-gray-800">
              <button onClick={handleNavigateHome} className="text-gray-400 hover:text-white transition-colors">
                Home
              </button>
              {breadcrumbs.map((bc, idx) => (
                <div key={bc.id} className="flex items-center space-x-2">
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                  <button 
                    onClick={() => handleNavigateFolder(bc.id, bc.name)}
                    className={`${idx === breadcrumbs.length - 1 ? 'text-white' : 'text-gray-400 hover:text-white'} transition-colors`}
                  >
                    {bc.name}
                  </button>
                </div>
              ))}
              {view === "folder" && storageStats && (
                <span className="bg-gray-800 text-gray-300 text-xs px-2.5 py-1 rounded-full font-medium ml-4 border border-gray-700 shadow-sm">
                  {formatSize(storageStats.folderStorageBytes)}
                </span>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="aspect-square bg-[#171717] animate-pulse rounded-xl"></div>
              ))}
            </div>
          ) : filteredFolders.length === 0 && filteredMedia.length === 0 ? (
            <div className="text-center py-20 bg-[#171717] rounded-2xl border border-[#2f2f2f] border-dashed">
              <ImageIcon className="mx-auto h-12 w-12 text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-[#ececec] mb-1">
                {view === "trash" ? "Trash is empty" : "No media found here"}
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                {view === "trash" ? "Deleted items will appear here." : "Create a folder or upload some media to get started."}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* Folders Grid */}
              {filteredFolders.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Folders</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredFolders.map((folder) => (
                      <div
                        key={folder.id}
                        className="group relative bg-[#171717] hover:bg-[#212121] p-4 rounded-xl cursor-pointer transition-all duration-200 border border-transparent hover:border-[#2f2f2f]"
                      >
                        <div className="flex items-center space-x-3 truncate" onClick={() => handleNavigateFolder(folder.id, folder.name)}>
                          <Folder className="w-6 h-6 text-blue-500 flex-shrink-0" />
                          <span className="text-white font-medium truncate">{folder.name}</span>
                        </div>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setShareModalData({ id: folder.id, type: 'folder', title: folder.name }); }}
                            className="text-gray-400 hover:text-blue-400 p-1.5 rounded"
                            title="Share Folder"
                          >
                            <LinkIcon className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteFolder(folder.id); }}
                            className="text-gray-500 hover:text-red-400 p-1.5 rounded"
                            title="Delete Folder"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Media Grid */}
              {filteredMedia.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Files</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredMedia.map((item) => {
                      const video = isVideo(item.original_filename);
                      const isSelected = selectedMediaIds.has(item.id);

                      return (
                        <div key={item.id} className={`content-vis-auto bg-[#171717] rounded-xl overflow-hidden border group transition-all duration-200 shadow-sm hover:shadow-xl relative flex flex-col ${isSelected ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-[#2f2f2f] hover:border-gray-600'}`}>
                          
                          {/* Selection Checkbox Overlay */}
                          {view !== "trash" && (
                            <button
                              onClick={() => toggleSelection(item.id)}
                              className={`absolute top-2 left-2 z-10 p-1 rounded-md transition-all ${isSelected ? 'bg-blue-600 text-white opacity-100' : 'bg-black/60 text-white/70 opacity-0 group-hover:opacity-100 hover:bg-black/80'}`}
                            >
                              {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                            </button>
                          )}

                          <div className="aspect-square bg-[#0a0a0a] relative cursor-pointer" onClick={() => view !== "trash" && toggleSelection(item.id)}>
                            {video ? (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <VideoIcon className="w-12 h-12 text-gray-700" />
                              </div>
                            ) : (
                              <img
                                src={`/api/media/${item.id}/preview`}
                                alt={item.original_filename}
                                className="absolute inset-0 object-cover w-full h-full image-fade-in"
                                loading="lazy"
                              />
                            )}
                            
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 pointer-events-none"></div>
                            
                            {/* Overlay Filename and Size at the bottom-left */}
                            <div className="absolute bottom-2 left-3 right-3 flex flex-col pointer-events-none z-10">
                              <p className="text-xs font-semibold text-white/90 truncate drop-shadow-md">
                                {item.original_filename}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-[10px] text-gray-300 drop-shadow-md font-medium shrink-0">
                                  {formatSize(item.size)}
                                </p>
                                {item.mediaTags.length > 0 && (
                                  <div className="flex gap-1 overflow-hidden h-[18px]">
                                    {item.mediaTags.map((t) => {
                                      const colors = ['bg-blue-500/80 text-white', 'bg-purple-500/80 text-white', 'bg-emerald-500/80 text-white', 'bg-rose-500/80 text-white', 'bg-amber-500/80 text-white', 'bg-indigo-500/80 text-white', 'bg-cyan-500/80 text-white'];
                                      const charSum = t.tag.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                                      const colorClass = colors[charSum % colors.length];
                                      return (
                                        <span key={t.tag.name} className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider backdrop-blur-md border border-white/20 truncate max-w-[70px] flex items-center ${colorClass}`}>
                                          {t.tag.name}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons overlaid on image center on hover/select */}
                            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-1.5 bg-black/50 backdrop-blur-md border border-white/20 rounded-xl p-1.5 w-max shadow-2xl transition-all duration-200 ${isSelected ? 'opacity-100 scale-100 z-20' : 'opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 z-20'}`}>
                                {view !== "trash" ? (
                                  <>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); toggleHighlight(item.id, item.is_highlighted); }}
                                      className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                                      title={item.is_highlighted ? "Remove Highlight" : "Highlight to pin to top"}
                                    >
                                      <Star className={`w-4 h-4 ${item.is_highlighted ? "fill-yellow-400 text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" : "text-white"}`} />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setTagEditMediaId(item.id); }}
                                      className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                                      title="Edit Tags"
                                    >
                                      <TagIcon className="w-4 h-4 text-white" />
                                    </button>
                                    <a
                                      href={`/api/media/${item.id}/download`}
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-2 rounded-lg hover:bg-white/20 transition-colors block"
                                      title="Download Original"
                                    >
                                      <Download className="w-4 h-4 text-white" />
                                    </a>
                                    <button
                                      onClick={(e) => handleNativeShare(e, item)}
                                      className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                                      title="Share to App (e.g. Lightroom)"
                                    >
                                      <Share className="w-4 h-4 text-white" />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); deleteMedia(item.id, true); }}
                                      className="p-2 rounded-lg hover:bg-red-500/40 hover:text-red-300 transition-colors text-white"
                                      title="Delete Media"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); deleteMedia(item.id, false); }}
                                    className="p-2 rounded-lg hover:bg-green-500/40 hover:text-green-300 transition-colors text-white"
                                    title="Restore"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </button>
                                )}
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
        </>
      )}
      </div>
    </main>

      {isUploadOpen && (
        <UploadModal
          folderId={currentFolderId}
          onClose={() => setIsUploadOpen(false)}
          onUploadComplete={() => {
            setIsUploadOpen(false);
            fetchData();
            fetchSidebarData();
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
            fetchSidebarData();
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
            fetchSidebarData();
          }}
        />
      )}

      {shareModalData && (
        <ShareModal
          folderId={shareModalData.type === 'folder' ? shareModalData.id : null}
          mediaId={shareModalData.type === 'media' ? shareModalData.id : null}
          title={shareModalData.title}
          onClose={() => setShareModalData(null)}
        />
      )}

      {/* Floating Bulk Action Bar */}
      {selectedMediaIds.size > 1 && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 bg-[#171717] border border-[#2f2f2f] rounded-full shadow-2xl px-4 sm:px-6 py-2.5 sm:py-3 flex items-center gap-3 sm:gap-6 z-40 w-max max-w-[95vw] overflow-x-auto no-scrollbar">
          <span className="text-xs sm:text-sm font-medium text-white whitespace-nowrap">
            {selectedMediaIds.size} <span className="hidden sm:inline">selected</span>
          </span>
          <div className="h-4 w-px bg-gray-700 shrink-0"></div>
          
          <button onClick={selectAll} className="text-gray-400 hover:text-white text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0">
            {selectedMediaIds.size === filteredMedia.length ? 'Deselect All' : 'Select All'}
          </button>
          
          <button onClick={handleBulkDownload} className="flex items-center space-x-1 sm:space-x-2 text-gray-400 hover:text-white text-xs sm:text-sm font-medium transition-colors shrink-0">
            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Download</span>
          </button>

          <button 
            onClick={handleBulkDelete}
            className="text-red-400 hover:text-red-300 text-xs sm:text-sm font-medium flex items-center space-x-1 sm:space-x-2 transition-colors shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Delete</span>
          </button>
          
          <button 
            onClick={() => setSelectedMediaIds(new Set())}
            className="p-1 rounded-full bg-[#2f2f2f] hover:bg-gray-700 text-gray-400 transition-colors sm:ml-4 shrink-0"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      )}
      {/* Floating Action Button (Mobile Only) */}
      {view !== "trash" && selectedMediaIds.size === 0 && (
        <div className="fixed bottom-6 right-6 sm:hidden flex flex-col gap-3 z-30">
          <button 
            onClick={() => setIsFolderCreateOpen(true)}
            className="w-12 h-12 bg-[#171717] border border-[#2f2f2f] text-[#ececec] rounded-full shadow-lg flex items-center justify-center hover:bg-[#212121] transition-transform active:scale-95"
            aria-label="New Folder"
          >
            <Folder className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setIsUploadOpen(true)}
            className="w-14 h-14 bg-white text-black rounded-full shadow-lg shadow-white/10 flex items-center justify-center hover:bg-gray-200 transition-transform active:scale-95"
            aria-label="Upload Media"
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>
      )}
    </div>
  );
}
