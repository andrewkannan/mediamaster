"use client";

import { useState, useEffect } from "react";
import { Save, Image as ImageIcon, Video, Loader2 } from "lucide-react";

export function SettingsView() {
  const [allowedTypes, setAllowedTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.allowedFileTypes) {
          setAllowedTypes(data.allowedFileTypes);
        } else {
          setAllowedTypes(["image", "video"]);
        }
      })
      .catch((err) => {
        console.error("Failed to load settings", err);
        setMessage({ text: "Failed to load settings.", type: "error" });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const toggleType = (type: string) => {
    setAllowedTypes((prev) => {
      let newTypes = [...prev];
      if (newTypes.includes("all")) {
        newTypes = ["image", "video"];
      }
      
      if (newTypes.includes(type)) {
        newTypes = newTypes.filter((t) => t !== type);
      } else {
        newTypes.push(type);
      }
      
      if (newTypes.length === 0) {
        newTypes = ["none"];
      } else if (newTypes.includes("none")) {
        newTypes = newTypes.filter(t => t !== "none");
      }
      
      return newTypes;
    });
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedFileTypes: allowedTypes }),
      });
      if (res.ok) {
        setMessage({ text: "Settings saved successfully.", type: "success" });
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      setMessage({ text: "Failed to save settings.", type: "error" });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const isImageAllowed = allowedTypes.includes("all") || allowedTypes.includes("image");
  const isVideoAllowed = allowedTypes.includes("all") || allowedTypes.includes("video");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-[#171717] rounded-2xl border border-[#2f2f2f] overflow-hidden">
        <div className="p-6 border-b border-[#2f2f2f]">
          <h2 className="text-lg font-semibold text-white">Upload Restrictions</h2>
          <p className="text-gray-400 text-sm mt-1">Configure which types of media are allowed to be uploaded to the server. Unsupported files will be silently skipped during bulk uploads.</p>
        </div>
        <div className="p-6 space-y-4">
          <div 
            onClick={() => toggleType("image")}
            className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border ${
              isImageAllowed ? "bg-blue-600/10 border-blue-500/50" : "bg-[#212121] border-transparent hover:border-gray-600"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${isImageAllowed ? "bg-blue-500 text-white" : "bg-gray-800 text-gray-400"}`}>
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`font-medium ${isImageAllowed ? "text-white" : "text-gray-300"}`}>Photos & Images</h3>
                <p className="text-sm text-gray-500">Allow uploading of image formats (.jpg, .png, .heic, etc)</p>
              </div>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors relative ${isImageAllowed ? "bg-blue-500" : "bg-gray-700"}`}>
              <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${isImageAllowed ? "translate-x-6" : "translate-x-0"}`} />
            </div>
          </div>

          <div 
            onClick={() => toggleType("video")}
            className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border ${
              isVideoAllowed ? "bg-blue-600/10 border-blue-500/50" : "bg-[#212121] border-transparent hover:border-gray-600"
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${isVideoAllowed ? "bg-blue-500 text-white" : "bg-gray-800 text-gray-400"}`}>
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`font-medium ${isVideoAllowed ? "text-white" : "text-gray-300"}`}>Videos</h3>
                <p className="text-sm text-gray-500">Allow uploading of video formats (.mp4, .mov, etc)</p>
              </div>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors relative ${isVideoAllowed ? "bg-blue-500" : "bg-gray-700"}`}>
              <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${isVideoAllowed ? "translate-x-6" : "translate-x-0"}`} />
            </div>
          </div>

          {message && (
            <div className={`p-4 rounded-lg text-sm font-medium ${message.type === "success" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
              {message.text}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-[#2f2f2f] bg-[#1a1a1a] flex justify-end">
          <button 
            onClick={saveSettings}
            disabled={isSaving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
