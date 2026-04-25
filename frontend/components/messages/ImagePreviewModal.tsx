"use client";
import { X, Download, Maximize2, ChevronLeft, ChevronRight, Target } from "lucide-react";
import { useEffect, useState, useRef } from "react";

interface Props {
  images: { url: string; type?: string; sender: string; date: string; messageId: string }[];
  initialIndex: number;
  onClose: () => void;
  onJumpToMessage: (messageId: string) => void;
}

export default function ImagePreviewModal({ images, initialIndex, onClose, onJumpToMessage }: Props) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [currentIndex, onClose]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setIsZoomed(false);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setIsZoomed(false);
  };

  const currentImage = images[currentIndex];

  useEffect(() => {
    if (carouselRef.current) {
      const activeThumb = carouselRef.current.children[currentIndex] as HTMLElement;
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, [currentIndex]);

  const handleDownload = async () => {
    try {
      const response = await fetch(currentImage.url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `swichat_image_${Date.now()}.jpg`; // Default fallback name
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Failed to download image", error);
      // Fallback to opening in new tab
      window.open(currentImage.url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-xl transition-all duration-300 animate-in fade-in">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-white transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm truncate">{currentImage.sender}</p>
            <p className="text-white/50 text-[10px]">{currentImage.date}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-white/60 text-xs font-mono mr-4">
            {currentIndex + 1} / {images.length}
          </span>
          <button 
            onClick={() => {
              onJumpToMessage(currentImage.messageId);
              onClose();
            }}
            className="p-2.5 bg-white/5 hover:bg-primary text-white rounded-full transition-all"
            title="Jump to Message"
          >
            <Target size={20} />
          </button>
          <button 
            onClick={handleDownload}
            className="p-2.5 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all"
            title="Download Image"
          >
            <Download size={20} />
          </button>
          <button 
            onClick={onClose}
            className="p-2.5 bg-red-500/20 hover:bg-red-500 text-white rounded-full transition-all ml-2"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Image View */}
      <div className="flex-1 relative flex items-center justify-center p-4 select-none">
        <button 
          onClick={handlePrev}
          className="absolute left-4 z-10 p-4 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 md:opacity-100"
        >
          <ChevronLeft size={32} />
        </button>

        <div 
          className={`relative max-w-full max-h-full transition-all duration-500 ${currentImage.type !== "video" && isZoomed ? 'scale-150 cursor-zoom-out' : 'scale-100 cursor-zoom-in'}`}
          onClick={() => currentImage.type !== "video" && setIsZoomed(!isZoomed)}
        >
          {currentImage.type === "video" ? (
            <video 
              src={currentImage.url} 
              controls
              autoPlay
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl shadow-black" 
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img 
              src={currentImage.url} 
              alt="Preview" 
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl shadow-black" 
            />
          )}
        </div>

        <button 
          onClick={handleNext}
          className="absolute right-4 z-10 p-4 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 md:opacity-100"
        >
          <ChevronRight size={32} />
        </button>
      </div>

      {/* Bottom Carousel */}
      <div className="h-28 bg-black/40 backdrop-blur-md border-t border-white/5 flex flex-col justify-center gap-2 px-4 pb-4">
        <div 
          ref={carouselRef}
          className="flex items-center gap-2 overflow-x-auto py-4 scrollbar-hide no-scrollbar snap-x snap-mandatory px-[45%]"
        >
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all duration-300 snap-center ${
                idx === currentIndex 
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-black scale-110 z-10" 
                  : "opacity-40 hover:opacity-100 hover:scale-105"
              }`}
            >
              {img.type === "video" ? (
                <video src={img.url} className="w-full h-full object-cover" />
              ) : (
                <img src={img.url} className="w-full h-full object-cover" alt="" />
              )}
              {img.type === "video" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
                    <div className="w-0 h-0 border-t-[3px] border-t-transparent border-l-[5px] border-l-white border-b-[3px] border-b-transparent ml-0.5" />
                  </div>
                </div>
              )}
              {idx === currentIndex && (
                <div className="absolute inset-0 bg-primary/20 animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Close Background Click */}
      <div className="absolute inset-0 -z-10" onClick={onClose}></div>
    </div>
  );
}
