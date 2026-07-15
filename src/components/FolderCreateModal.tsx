"use client";

import { useState } from "react";
import { X, Loader2, FolderPlus } from "lucide-react";

interface FolderCreateModalProps {
  parentId?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function FolderCreateModal({ parentId, onClose, onSuccess }: FolderCreateModalProps) {
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    setError("");

    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), parentId }),
      });

      if (!res.ok) throw new Error("Failed to create folder");

      onSuccess();
    } catch (err: any) {
      setError(err.message);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl shadow-xl max-w-sm w-full border border-gray-700">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <FolderPlus className="w-5 h-5 text-gray-400" />
            <h3 className="text-xl font-semibold text-white">New Folder</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white" disabled={isSaving}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <input
            type="text"
            placeholder="Folder Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
            disabled={isSaving}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
          />
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>

        <div className="p-6 border-t border-gray-700 flex justify-end space-x-4 bg-gray-800 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isSaving || !name.trim()}
            className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
