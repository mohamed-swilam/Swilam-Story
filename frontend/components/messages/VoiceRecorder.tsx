import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { Trash2, Square, Send, Play, Pause, X } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { API } from "@/lib/api";

interface Props {
  state: "recording" | "stopped" | "idle";
  duration: number;
  waveformData: number[];
  isPlayingPreview: boolean;
  previewTime: number;
  onTogglePreview: () => void;
  onStop: () => void;
  onCancel: () => void;
  dragTarget?: "trash" | "stop" | null;
}

export default function VoiceRecorder({ 
  state, 
  duration, 
  waveformData, 
  isPlayingPreview, 
  previewTime,
  onTogglePreview,
  onStop,
  onCancel,
  dragTarget
}: Props) {

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full h-full flex items-center justify-between px-3 gap-2 bg-background rounded-2xl animate-in fade-in zoom-in-95 duration-200">
      {/* Left Action: Trash */}
      <div 
        className={`p-2 rounded-full transition-all cursor-pointer ${
          dragTarget === "trash" ? "bg-destructive text-white scale-125 shadow-lg shadow-destructive/20" : "text-destructive/60 hover:text-destructive hover:bg-destructive/10"
        }`}
        id="recorder-trash-target"
        onClick={onCancel}
      >
        <Trash2 size={20} />
      </div>

      {/* Center: Waveform & Timer */}
      <div className="flex-1 flex items-center gap-3 overflow-hidden">
        <div className="flex-1 flex items-center justify-center gap-[2px] h-8 relative group">
          {waveformData.map((val, i) => {
            const progress = state === "stopped" && duration > 0 ? (previewTime / duration) * 40 : 40;
            const isActive = state === "stopped" ? i < progress : true;
            return (
              <div 
                key={i}
                className={`w-1 rounded-full transition-all duration-75 ${
                  isActive 
                    ? "bg-primary" 
                    : "bg-primary/20"
                }`}
                style={{ 
                  height: `${Math.max(15, val * 100)}%`,
                  opacity: state === "recording" ? (0.3 + (val * 0.7)) : 1
                }}
              />
            );
          })}
        </div>
        <div className="text-xs font-mono font-bold text-primary min-w-[35px] tabular-nums">
          {formatDuration(state === "stopped" && isPlayingPreview ? previewTime : duration)}
        </div>
      </div>

      {/* Right Action: Stop / Play */}
      <div 
        className={`p-2 rounded-full transition-all ${
          dragTarget === "stop" ? "bg-primary text-white scale-125 shadow-lg shadow-primary/20" : "text-muted-foreground/40"
        }`}
        id="recorder-stop-target"
      >
        {state === "recording" ? (
          <Square size={20} fill="currentColor" onClick={onStop} className="cursor-pointer" />
        ) : (
          <div onClick={onTogglePreview} className="cursor-pointer text-primary">
            {isPlayingPreview ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          </div>
        )}
      </div>
    </div>
  );
}
