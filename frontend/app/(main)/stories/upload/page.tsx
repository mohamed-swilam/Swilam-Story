"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API } from "@/lib/api";
import Link from "next/link";

export default function UploadStoryPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!file) {
      setError("Please select a file first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("media_url", file);
      await API.uploadStory(formData);
      router.push("/stories/feed");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to upload story");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full bg-background flex flex-col items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-xl bg-card rounded-3xl border border-white/5 shadow-2xl overflow-hidden animate-slideUp">
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Create New Story</h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-xs">
            Share a photo or video that will disappear in 24 hours.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex items-center gap-2 animate-shake">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Upload Area */}
          <div className="relative group">
            <input
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              id="file-upload"
            />
            <div className={`w-full aspect-video rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 overflow-hidden ${
              preview 
                ? "border-primary bg-primary/5" 
                : "border-white/10 bg-white/5 group-hover:border-primary/50 group-hover:bg-white/10"
            }`}>
              {preview ? (
                <div className="relative w-full h-full">
                  {file?.type.startsWith("image") ? (
                    <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                  ) : (
                    <video src={preview} className="w-full h-full object-contain" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-white text-black px-4 py-2 rounded-full font-bold text-sm shadow-xl">Change Media</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-white/5 rounded-full text-white/50 group-hover:text-primary transition-colors">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <span className="text-white font-medium group-hover:text-white transition-colors">Click to select photo or video</span>
                  <span className="text-white/40 text-xs">Max file size: 50MB</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={loading || !file}
              className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/80 transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-30 disabled:shadow-none flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  Share to Story
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
            <Link 
              href="/stories/feed" 
              className="w-full py-4 bg-white/5 text-white/70 rounded-2xl font-bold text-center hover:bg-white/10 hover:text-white transition-all"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
