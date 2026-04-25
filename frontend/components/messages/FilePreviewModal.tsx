import { X, File as FileIcon, Send, Plus } from "lucide-react";
import { useState, useEffect } from "react";

interface Props {
  files: File[];
  onClose: () => void;
  onSend: (files: File[], caption: string) => void;
  onRemoveFile: (index: number) => void;
  onAddMore: () => void;
}

export default function FilePreviewModal({ files, onClose, onSend, onRemoveFile, onAddMore }: Props) {
  const [caption, setCaption] = useState("");
  const [previews, setPreviews] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    const objectUrls = files.map((file) => {
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        return URL.createObjectURL(file);
      }
      return ""; // No visual preview for other types
    });

    setPreviews(objectUrls);

    // Cleanup object URLs on unmount or when files change
    return () => {
      objectUrls.forEach((url) => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [files]);

  if (files.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-card rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            Send {files.length} {files.length === 1 ? "file" : "files"}
          </h3>
          <button 
            onClick={onClose}
            className="p-2 bg-foreground/5 hover:bg-foreground/10 text-muted-foreground rounded-full transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Previews Area */}
        <div className="p-6 overflow-x-auto flex items-start gap-4 custom-scrollbar bg-background/50 min-h-[200px]">
          {files.map((file, idx) => {
            const isMedia = file.type.startsWith("image/") || file.type.startsWith("video/");
            
            return (
              <div key={`${file.name}-${idx}`} className="relative flex-shrink-0 group pt-2 pr-2">
                <div 
                  className={`w-32 h-32 rounded-xl overflow-hidden border border-border bg-card flex items-center justify-center shadow-md relative ${isMedia ? 'cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all' : ''}`}
                  onClick={() => isMedia && setSelectedIndex(idx)}
                >
                  {isMedia && previews[idx] ? (
                    file.type.startsWith("video/") ? (
                      <video src={previews[idx]} className="w-full h-full object-cover" />
                    ) : (
                      <img src={previews[idx]} className="w-full h-full object-cover" alt="Preview" />
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground p-2">
                      <FileIcon size={40} className="mb-2 opacity-50" />
                      <span className="text-[10px] text-center w-full truncate px-2 font-mono">
                        {file.name}
                      </span>
                    </div>
                  )}
                  
                  {file.type.startsWith("video/") && (
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm font-bold z-10 pointer-events-none">
                      VIDEO
                    </div>
                  )}
                </div>

                {/* Remove Button (Moved outside overflow-hidden) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(idx);
                  }}
                  className="absolute top-0 right-0 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 group-hover:scale-100 z-20 hover:bg-red-600"
                >
                  <X size={14} strokeWidth={3} />
                </button>
              </div>
            );
          })}
          
          {/* Add More Button */}
          <button 
            onClick={onAddMore}
            className="w-32 h-32 flex-shrink-0 rounded-xl border-2 border-dashed border-primary/40 hover:border-primary flex flex-col items-center justify-center text-primary/60 hover:text-primary transition-all hover:bg-primary/5 group"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Plus size={24} />
            </div>
            <span className="text-xs font-bold">Add More</span>
          </button>
        </div>

        {/* Footer (Caption & Send) */}
        <div className="p-4 bg-muted/20 border-t border-border flex items-end gap-3">
          <div className="flex-1 bg-background rounded-xl border border-border overflow-hidden focus-within:ring-2 focus-within:ring-primary/50 transition-all shadow-sm">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="w-full bg-transparent px-4 py-3 text-sm focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend(files, caption);
                }
              }}
              autoFocus
            />
          </div>
          <button
            onClick={() => onSend(files, caption)}
            className="h-[46px] w-[46px] flex-shrink-0 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/30"
          >
            <Send size={20} className="ml-1" />
          </button>
        </div>
      </div>

      {/* Full Screen Preview Overlay */}
      {selectedIndex !== null && previews[selectedIndex] && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setSelectedIndex(null)} />
          <button 
            onClick={() => setSelectedIndex(null)}
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all z-10"
          >
            <X size={24} />
          </button>
          
          <div className="relative z-10 w-full h-full max-w-5xl max-h-[80vh] flex items-center justify-center p-4">
            {files[selectedIndex].type.startsWith("video/") ? (
              <video 
                src={previews[selectedIndex]} 
                controls 
                autoPlay 
                className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" 
              />
            ) : (
              <img 
                src={previews[selectedIndex]} 
                alt="Full Preview" 
                className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" 
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
