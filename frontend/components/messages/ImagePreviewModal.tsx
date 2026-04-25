"use client";
import { X, Download, Maximize2 } from "lucide-react";
import { useEffect } from "react";

interface Props {
  imageUrl: string;
  onClose: () => void;
}

export default function ImagePreviewModal({ imageUrl, onClose }: Props) {
  // Prevent scrolling when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md transition-all duration-300 animate-in fade-in">
      {/* Top Controls */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-full text-white/40">
            <Maximize2 size={18} />
          </div>
          <p className="text-white font-medium text-sm">Image Preview</p>
        </div>
        <div className="flex items-center gap-2">
          <a 
            href={imageUrl} 
            download 
            target="_blank"
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
            title="Download"
          >
            <Download size={20} />
          </a>
          <button 
            onClick={onClose}
            className="p-2.5 bg-white/10 hover:bg-red-500 text-white rounded-full transition-all"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Image Container */}
      <div className="relative w-full h-full flex items-center justify-center p-4 md:p-12 group">
        <img 
          src={imageUrl} 
          alt="Preview" 
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl shadow-black/50 transition-transform duration-500 group-hover:scale-[1.01]" 
        />
      </div>

      {/* Background Click to Close */}
      <div className="absolute inset-0 -z-10" onClick={onClose}></div>
    </div>
  );
}
