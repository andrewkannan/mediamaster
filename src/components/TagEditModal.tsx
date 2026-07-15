"use client";

import { useState } from "react";
import { X, Loader2, Tag as TagIcon } from "lucide-react";

interface TagEditModalProps {
  mediaId: string;
  initialTags: string[];
  onClose: () => void;
  onSave: () => void;
}

export function TagEditModal({ mediaId, initialTags, onClose, onSave }: TagEditModalProps) {
  const [tags, setTags] = useState<string>(initialTags.join(", "));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setIsSaving(true);
    setError("");

    const parsedTags = tags.split(",").map((t) => t.trim()).filter(Boolean);

    try {
      const res = await fetch(`/api/media/${mediaId}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: parsedTags }),
      });

      if (!res.ok) throw new Error("Failed to update tags");

      onSave();
    } catch (err: any) {
      setError(err.message);
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl shadow-xl max-w-md w-full border border-gray-700">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <TagIcon className="w-5 h-5 text-gray-400" />
            <h3 className="text-xl font-semibold text-white">Edit Tags</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white" disabled={isSaving}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Tags (comma separated)
          </label>
          <input
            type="text"
            placeholder="e.g. worship, crowd, youth"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full bg-gray-900 border border-gray-600 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
            disabled={isSaving}
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
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Tags
          </button>
        </div>
      </div>
    </div>
  );
}
