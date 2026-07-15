"use client";

import { Home, Folder, Tag as TagIcon, Trash2, Settings, ChevronDown, ChevronRight, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";

export type ViewType = "home" | "folder" | "trash" | "tag";

interface SidebarProps {
  currentView: ViewType;
  currentFolderId: string | null;
  currentTag: string | null;
  rootFolders: any[];
  tags: any[];
  onNavigateHome: () => void;
  onNavigateFolder: (id: string, name: string) => void;
  onNavigateTag: (name: string) => void;
  onNavigateTrash: () => void;
  storageStats: { globalStorageBytes: number; maxStorageBytes: number; maxStorageGB: number } | null;
  formatSize: (bytes: number) => string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  currentView,
  currentFolderId,
  currentTag,
  rootFolders,
  tags,
  onNavigateHome,
  onNavigateFolder,
  onNavigateTag,
  onNavigateTrash,
  storageStats,
  formatSize,
  isMobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const [foldersExpanded, setFoldersExpanded] = useState(true);
  const [tagsExpanded, setTagsExpanded] = useState(true);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-50 md:static w-[260px] bg-[#171717] h-screen flex-col text-[#ececec] font-sans transition-transform duration-300 ease-in-out ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      } flex`}>
      <div className="p-4 pt-6 pb-2">
        <div className="flex items-center space-x-3 px-2 mb-4">
          <img src="/logo.png" alt="MediaMaster Logo" className="w-8 h-8 rounded-md" />
          <h2 className="text-lg font-semibold tracking-wide text-[#ececec]">
            MediaMaster
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-6 scrollbar-hide">
        {/* Main Navigation */}
        <div className="space-y-1">
          <button
            onClick={onNavigateHome}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
              currentView === "home" ? "bg-[#212121] text-white" : "hover:bg-[#212121] text-gray-300"
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="font-medium text-sm">Home</span>
          </button>
          
          <button
            onClick={onNavigateTrash}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
              currentView === "trash" ? "bg-[#212121] text-white" : "hover:bg-[#212121] text-gray-300"
            }`}
          >
            <Trash2 className="w-5 h-5" />
            <span className="font-medium text-sm">Trash</span>
          </button>
        </div>

        {/* Folders Section */}
        <div>
          <div 
            className="flex items-center justify-between px-3 mb-1 cursor-pointer hover:text-white transition-colors text-xs font-semibold uppercase tracking-wider text-gray-500"
            onClick={() => setFoldersExpanded(!foldersExpanded)}
          >
            <span>Folders</span>
            {foldersExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </div>
          {foldersExpanded && (
            <div className="space-y-1 mt-2">
              {rootFolders.length === 0 ? (
                <div className="px-3 text-sm text-gray-600 italic">No folders yet</div>
              ) : (
                rootFolders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => onNavigateFolder(folder.id, folder.name)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      currentView === "folder" && currentFolderId === folder.id 
                        ? "bg-[#212121] text-white" 
                        : "hover:bg-[#212121] text-gray-300"
                    }`}
                  >
                    <Folder className={`w-4 h-4 ${currentView === "folder" && currentFolderId === folder.id ? "text-blue-400" : "text-gray-400"}`} />
                    <span className="text-sm truncate font-medium">{folder.name}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Tags Section */}
        <div>
          <div 
            className="flex items-center justify-between px-3 mb-1 cursor-pointer hover:text-white transition-colors text-xs font-semibold uppercase tracking-wider text-gray-500"
            onClick={() => setTagsExpanded(!tagsExpanded)}
          >
            <span>Popular Tags</span>
            {tagsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </div>
          {tagsExpanded && (
            <div className="space-y-1 mt-2">
              {tags.length === 0 ? (
                <div className="px-3 text-sm text-gray-600 italic">No tags yet</div>
              ) : (
                tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => onNavigateTag(tag.name)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                      currentView === "tag" && currentTag === tag.name 
                        ? "bg-[#212121] text-white" 
                        : "hover:bg-[#212121] text-gray-300"
                    }`}
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <TagIcon className={`w-4 h-4 ${currentView === "tag" && currentTag === tag.name ? "text-blue-400" : "text-gray-400"}`} />
                      <span className="text-sm truncate font-medium">{tag.name}</span>
                    </div>
                    <span className="text-xs bg-[#2f2f2f] px-1.5 py-0.5 rounded text-gray-400">
                      {tag._count.mediaTags}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Storage Bar */}
        {storageStats && (
          <div className="space-y-2 mb-4 px-2">
            <div className="flex justify-between text-xs text-gray-400 font-medium">
              <span>Storage</span>
              <span>{Math.round((storageStats.globalStorageBytes / storageStats.maxStorageBytes) * 100)}%</span>
            </div>
            <div className="w-full bg-[#2f2f2f] rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full ${
                  (storageStats.globalStorageBytes / storageStats.maxStorageBytes) > 0.9 
                    ? 'bg-red-500' 
                    : 'bg-[#ececec]'
                }`}
                style={{ width: `${Math.min((storageStats.globalStorageBytes / storageStats.maxStorageBytes) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <button className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-[#212121] text-gray-300">
            <Settings className="w-5 h-5" />
            <span className="font-medium text-sm">Settings</span>
          </button>
          <button 
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-[#212121] text-gray-300"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
