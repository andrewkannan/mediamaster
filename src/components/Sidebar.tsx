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
}: SidebarProps) {
  const [foldersExpanded, setFoldersExpanded] = useState(true);
  const [tagsExpanded, setTagsExpanded] = useState(true);

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 h-screen flex flex-col hidden md:flex text-gray-300">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-white tracking-tight">
          <span className="text-blue-500">Media</span>Master
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-6">
        {/* Main Navigation */}
        <div className="space-y-1">
          <button
            onClick={onNavigateHome}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
              currentView === "home" ? "bg-blue-600/10 text-blue-500" : "hover:bg-gray-800 hover:text-white"
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="font-medium text-sm">Home</span>
          </button>
          
          <button
            onClick={onNavigateTrash}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
              currentView === "trash" ? "bg-blue-600/10 text-blue-500" : "hover:bg-gray-800 hover:text-white"
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
                    className={`w-full flex items-center space-x-3 px-3 py-1.5 rounded-lg transition-colors ${
                      currentView === "folder" && currentFolderId === folder.id 
                        ? "bg-gray-800 text-white" 
                        : "hover:bg-gray-800/50 hover:text-white"
                    }`}
                  >
                    <Folder className={`w-4 h-4 ${currentView === "folder" && currentFolderId === folder.id ? "text-blue-400" : "text-gray-500"}`} />
                    <span className="text-sm truncate">{folder.name}</span>
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
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-colors ${
                      currentView === "tag" && currentTag === tag.name 
                        ? "bg-gray-800 text-white" 
                        : "hover:bg-gray-800/50 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center space-x-3 truncate">
                      <TagIcon className={`w-4 h-4 ${currentView === "tag" && currentTag === tag.name ? "text-blue-400" : "text-gray-500"}`} />
                      <span className="text-sm truncate">{tag.name}</span>
                    </div>
                    <span className="text-xs bg-gray-800 px-1.5 py-0.5 rounded text-gray-500">
                      {tag._count.mediaTags}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-800 space-y-1">
        <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors hover:bg-gray-800 hover:text-white text-gray-400">
          <Settings className="w-5 h-5" />
          <span className="font-medium text-sm">Settings</span>
        </button>
        <button 
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors hover:bg-gray-800 hover:text-white text-gray-400"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
