"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { X, UploadCloud, File as FileIcon, CheckCircle, AlertCircle, Loader2, Folder as FolderIcon, Plus } from "lucide-react";
// @ts-ignore
import exifr from "exifr";

interface UploadModalProps {
  onClose: () => void;
  onUploadComplete: () => void;
  folderId?: string | null;
}

interface UploadFile {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

export function UploadModal({ onClose, onUploadComplete, folderId }: UploadModalProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [existingTags, setExistingTags] = useState<{name: string, _count: {mediaTags: number}}[]>([]);
  const [allowedTypes, setAllowedTypes] = useState<string[]>(["image", "video"]);

  // Fetch settings on mount
  React.useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        if (data.allowedFileTypes) {
          setAllowedTypes(data.allowedFileTypes);
        }
      })
      .catch(console.error);

    fetch("/api/tags")
      .then(res => res.json())
      .then(data => {
        if (data.tags) setExistingTags(data.tags);
      })
      .catch(console.error);
  }, []);

  const isTypeAllowed = (type: string) => {
    if (allowedTypes.includes("all")) return true;
    return allowedTypes.some(allowed => type.startsWith(`${allowed}/`));
  };

  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);
      const validFiles = fileList.filter(f => isTypeAllowed(f.type));
      // Silently skip rejected files, do not add them to the queue
      
      setFiles((prev) => [
        ...prev,
        ...validFiles.map((file) => {
          const isTooLarge = file.size > 1 * 1024 * 1024 * 1024;
          return {
            file,
            progress: 0,
            status: (isTooLarge ? "error" : "pending") as "error" | "pending",
            error: isTooLarge ? "File is larger than 1GB" : undefined,
          };
        }),
      ]);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    const validFiles = acceptedFiles.filter(f => isTypeAllowed(f.type));
    
    // Add accepted files
    setFiles((prev) => [
      ...prev,
      ...validFiles.map((file) => ({
        file,
        progress: 0,
        status: "pending" as const,
      })),
        // We ignore file rejections completely to skip them silently
    ]);
  }, [allowedTypes]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    // Only accept allowed types for Dropzone
    accept: allowedTypes.includes("all") ? undefined : allowedTypes.reduce((acc, type) => {
      acc[`${type}/*`] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxSize: 1 * 1024 * 1024 * 1024, // 1GB
  });

  const handleUpload = async () => {
    setIsUploading(true);
    const parsedTags = Array.from(new Set([
      ...selectedTags,
      ...tagInput.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean)
    ]));

    let allSuccess = true;

    // --- 1. Deduplication Pre-Check ---
    const pendingFiles = files.filter(f => f.status === "pending");
    let duplicateIds: string[] = []; // store names of duplicates

    if (pendingFiles.length > 0) {
      try {
        const checkRes = await fetch("/api/upload/check-duplicates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            files: pendingFiles.map(f => ({ name: f.file.name, size: f.file.size }))
          })
        });
        const checkData = await checkRes.json();
        const duplicates: { original_filename: string, size: number }[] = checkData.duplicates || [];
        
        if (duplicates.length > 0) {
          duplicateIds = duplicates.map(d => d.original_filename + '-' + d.size);
          // Optimistically update UI to show skipped items instantly
          setFiles(prev => prev.map(f => {
            if (f.status === "pending" && duplicateIds.includes(f.file.name + '-' + f.file.size)) {
              return { ...f, status: "error", error: "Skipped (Duplicate)" };
            }
            return f;
          }));
        }
      } catch (e) {
        console.error("Failed to check duplicates", e);
      }
    }
    // ----------------------------------

    // 2. Upload only non-duplicates
    for (let i = 0; i < files.length; i++) {
      // Access the freshest file object
      const file = files[i].file;
      
      // Skip if it was caught as duplicate
      if (duplicateIds.includes(file.name + '-' + file.size)) continue;
      // Skip if already success or error (from dropzone rejection)
      if (files[i].status !== "pending") continue;

      setFiles((prev) => {
        const newFiles = [...prev];
        newFiles[i].status = "uploading";
        return newFiles;
      });

      try {
        let takenAt = null;

        // Try to extract EXIF if image
        if (file.type.startsWith("image/")) {
          try {
            const exifData = await exifr.parse(file, ["DateTimeOriginal"]);
            if (exifData && exifData.DateTimeOriginal) {
              takenAt = exifData.DateTimeOriginal.toISOString();
            }
          } catch (e) {
            console.error("EXIF extraction failed", e);
          }
        }

        // 1. Get presigned URL
        const presignRes = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
          }),
        });

        if (!presignRes.ok) throw new Error("Failed to get upload URL");
        const { presignedUrl, key } = await presignRes.json();

        // 2. Upload to S3 directly
        await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", presignedUrl, true);
          xhr.setRequestHeader("Content-Type", file.type);
          
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const progress = Math.round((e.loaded / e.total) * 100);
              setFiles((prev) => {
                const newFiles = [...prev];
                newFiles[i].progress = progress;
                return newFiles;
              });
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve(true);
            else reject(new Error("S3 Upload Failed"));
          };
          xhr.onerror = () => reject(new Error("Network Error"));
          xhr.send(file);
        });

        // 3. Save to database
        const dbRes = await fetch("/api/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            original_filename: file.name,
            s3_key: key,
            size: file.size,
            folderId,
            tags: parsedTags,
            takenAt,
          }),
        });

        if (!dbRes.ok) throw new Error("Failed to save metadata");

        setFiles((prev) => {
          const newFiles = [...prev];
          newFiles[i].status = "success";
          newFiles[i].progress = 100;
          return newFiles;
        });
      } catch (error: any) {
        allSuccess = false;
        setFiles((prev) => {
          const newFiles = [...prev];
          newFiles[i].status = "error";
          newFiles[i].error = error.message;
          return newFiles;
        });
      }
    }

    setIsUploading(false);
    if (allSuccess) {
      onUploadComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-75 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full border border-gray-700 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h3 className="text-xl font-semibold text-white">Upload Media</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white" disabled={isUploading}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors flex flex-col justify-center items-center ${
                isDragActive
                  ? "border-blue-500 bg-blue-500/10"
                  : "border-gray-600 hover:border-gray-500 bg-gray-900"
              }`}
            >
              <input {...getInputProps()} />
              <UploadCloud className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-300">
                Drag & drop files here, or click to select
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Supports raw images and large video files.
              </p>
            </div>

            <div
              onClick={() => folderInputRef.current?.click()}
              className="border-2 border-gray-700 rounded-lg p-10 text-center cursor-pointer hover:border-blue-500/50 hover:bg-gray-800 bg-gray-900 transition-colors flex flex-col items-center justify-center group"
            >
              <input 
                type="file" 
                ref={folderInputRef} 
                onChange={handleFolderSelect} 
                className="hidden" 
                // @ts-ignore - webkitdirectory is non-standard but supported
                webkitdirectory="true" 
                directory="" 
                multiple
              />
              <FolderIcon className="w-12 h-12 text-blue-500 mb-4 group-hover:scale-110 transition-transform" />
              <p className="text-gray-300 font-medium">Extract Memory Card</p>
              <p className="text-sm text-gray-500 mt-2">
                Select a folder or USB drive to automatically scan and extract all media.
              </p>
            </div>
          </div>

          {files.length > 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Apply Tags
                </label>
                
                {/* Selected Tags Display */}
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedTags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 bg-blue-500/20 text-blue-400 px-2 py-1 rounded-md text-sm border border-blue-500/30">
                        {tag}
                        <button onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))} className="hover:text-white transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Type a tag and press comma or Enter..."
                  value={tagInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.endsWith(',')) {
                      const newTag = val.slice(0, -1).trim().toLowerCase();
                      if (newTag && !selectedTags.includes(newTag)) {
                        setSelectedTags(prev => [...prev, newTag]);
                      }
                      setTagInput("");
                    } else {
                      setTagInput(val);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const newTag = tagInput.trim().toLowerCase();
                      if (newTag && !selectedTags.includes(newTag)) {
                        setSelectedTags(prev => [...prev, newTag]);
                      }
                      setTagInput("");
                    }
                  }}
                  className="w-full bg-gray-900 border border-gray-600 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm mb-4"
                  disabled={isUploading}
                />

                {/* Smart Suggestions */}
                <div className="mb-4">
                  <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">Smart Suggestions</p>
                  <div className="flex flex-wrap gap-2">
                    {["sunday-service", new Date().toISOString().split('T')[0]].map(tag => (
                      <button
                        key={tag}
                        onClick={() => !selectedTags.includes(tag) && setSelectedTags(prev => [...prev, tag])}
                        disabled={selectedTags.includes(tag)}
                        className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${
                          selectedTags.includes(tag) 
                            ? 'bg-blue-500/20 border-blue-500/30 text-blue-400 opacity-50 cursor-not-allowed'
                            : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 cursor-pointer'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Existing Tags */}
                {existingTags.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-semibold">Your Tags</p>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                      {existingTags.map(t => (
                        <button
                          key={t.name}
                          onClick={() => !selectedTags.includes(t.name) && setSelectedTags(prev => [...prev, t.name])}
                          disabled={selectedTags.includes(t.name)}
                          className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                            selectedTags.includes(t.name)
                              ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
                              : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white cursor-pointer'
                          }`}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                {files.map((fileObj, idx) => (
                  <div key={idx} className="bg-gray-900 p-3 rounded-lg border border-gray-700 flex items-center space-x-4">
                    <FileIcon className="w-8 h-8 text-gray-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">
                        {fileObj.file.name}
                      </p>
                      <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                        <div
                          className={`h-1.5 rounded-full ${
                            fileObj.status === "error" ? "bg-red-500" : "bg-blue-500"
                          }`}
                          style={{ width: `${fileObj.progress}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-8 flex justify-center">
                      {fileObj.status === "uploading" && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                      {fileObj.status === "success" && <CheckCircle className="w-5 h-5 text-green-500" />}
                      {fileObj.status === "error" && <span title={fileObj.error}><AlertCircle className="w-5 h-5 text-red-500" /></span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-700 flex justify-end space-x-4 bg-gray-800 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || isUploading}
            className="px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition-colors disabled:opacity-50 flex items-center"
          >
            {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isUploading ? "Uploading..." : "Upload Files"}
          </button>
        </div>
      </div>
    </div>
  );
}
