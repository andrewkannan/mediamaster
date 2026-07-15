"use client";

import { useState } from "react";
import { Copy, Check, X, Link as LinkIcon } from "lucide-react";

interface ShareModalProps {
  folderId?: string | null;
  mediaId?: string | null;
  title: string;
  onClose: () => void;
}

export function ShareModal({ folderId, mediaId, title, onClose }: ShareModalProps) {
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState("7");

  const generateLink = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId, mediaId, expiresInDays }),
      });
      const data = await res.json();
      if (data.shareLink) {
        const url = `${window.location.origin}/share/${data.shareLink.token}`;
        setShareLink(url);
      }
    } catch (e) {
      console.error("Failed to generate link", e);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white flex items-center">
            <LinkIcon className="w-5 h-5 mr-2 text-blue-500" />
            Share: {title}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          {!shareLink ? (
            <>
              <p className="text-gray-400 text-sm">
                Generate a secure, public link to share this {folderId ? 'folder' : 'file'}. Anyone with the link can view and download the content.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Expires in</label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="1">1 Day</option>
                  <option value="7">7 Days</option>
                  <option value="30">30 Days</option>
                  <option value="">Never Expires</option>
                </select>
              </div>
              <button
                onClick={generateLink}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors mt-2"
              >
                {loading ? "Generating..." : "Generate Link"}
              </button>
            </>
          ) : (
            <>
              <p className="text-green-400 text-sm font-medium">Link generated successfully!</p>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={shareLink}
                  className="flex-1 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg p-2.5 text-sm focus:outline-none"
                />
                <button
                  onClick={copyToClipboard}
                  className={`p-2.5 rounded-lg text-white font-medium transition-colors ${
                    copied ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
