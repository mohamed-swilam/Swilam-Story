"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API } from "@/lib/api";
import Link from "next/link";
import { Mic, Type, Image as ImageIcon, Send, Square, Play, Pause, Trash2 } from "lucide-react";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";

const GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", // Purple
  "linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)", // Pink
  "linear-gradient(120deg, #d4fc79 0%, #96e6a1 100%)", // Green
  "linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)", // Cyan
  "linear-gradient(to right, #fa709a 0%, #fee140 100%)", // Sunset
  "linear-gradient(to right, #434343 0%, #000000 100%)", // Dark
];

export default function UploadStoryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"media" | "text" | "voice">("media");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Media State
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Text State
  const [textContent, setTextContent] = useState("");
  const [bgColor, setBgColor] = useState(GRADIENTS[0]);

  // Voice State
  const { 
    state: recorderState, 
    duration: recorderDuration, 
    audioBlob: recorderBlob, 
    waveformData: recorderWaveform, 
    startRecording, 
    stopRecording, 
    cancelRecording,
    reset: resetRecorder
  } = useVoiceRecorder();
  
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
        previewAudioRef.current.src = "";
      }
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const handleTogglePreview = () => {
    if (!recorderBlob) return;
    
    if (!previewAudioRef.current) {
      const url = URL.createObjectURL(recorderBlob);
      previewUrlRef.current = url;
      const audio = new Audio(url);
      audio.ontimeupdate = () => setPreviewTime(audio.currentTime);
      audio.onended = () => {
        setIsPlayingPreview(false);
        setPreviewTime(0);
      };
      previewAudioRef.current = audio;
    }

    if (isPlayingPreview) {
      previewAudioRef.current.pause();
    } else {
      previewAudioRef.current.play();
    }
    setIsPlayingPreview(!isPlayingPreview);
  };

  const handleCancelVoice = () => {
    cancelRecording();
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = "";
      previewAudioRef.current = null;
    }
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setIsPlayingPreview(false);
    setPreviewTime(0);
    resetRecorder();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  };

  const handleSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();

    // Pause any playing preview immediately
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    }

    const formData = new FormData();

    if (activeTab === "media") {
      if (!file) return setError("Please select a file first");
      formData.append("media_url", file);
    } 
    else if (activeTab === "text") {
      if (!textContent.trim()) return setError("Please write something");
      formData.append("media_type", "text");
      formData.append("content", textContent);
      formData.append("bg_color", bgColor);
    } 
    else if (activeTab === "voice") {
      if (!recorderBlob) return setError("Please record a voice message");
      const audioFile = new File([recorderBlob], "story_voice.webm", { type: "audio/webm" });
      formData.append("media_url", audioFile);
      formData.append("media_type", "voice");
      formData.append("duration", recorderDuration.toString());
      formData.append("waveformData", JSON.stringify(recorderWaveform));
    }

    setLoading(true);
    setError("");

    try {
      await API.uploadStory(formData);
      router.push("/stories/feed");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to upload story");
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = loading || 
    (activeTab === "media" && !file) || 
    (activeTab === "text" && !textContent.trim()) || 
    (activeTab === "voice" && recorderState !== "stopped");

  return (
    <div className="w-full h-full bg-background flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-xl bg-card rounded-3xl border border-border shadow-2xl overflow-hidden animate-slideUp flex flex-col">
        
        {/* Tabs */}
        <div className="flex w-full border-b border-border bg-muted/20">
          <button 
            className={`flex-1 py-4 font-bold flex items-center justify-center gap-2 transition-all ${activeTab === "media" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:bg-foreground/5"}`}
            onClick={() => setActiveTab("media")}
          >
            <ImageIcon size={18} /> Media
          </button>
          <button 
            className={`flex-1 py-4 font-bold flex items-center justify-center gap-2 transition-all ${activeTab === "text" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:bg-foreground/5"}`}
            onClick={() => setActiveTab("text")}
          >
            <Type size={18} /> Text
          </button>
          <button 
            className={`flex-1 py-4 font-bold flex items-center justify-center gap-2 transition-all ${activeTab === "voice" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:bg-foreground/5"}`}
            onClick={() => setActiveTab("voice")}
          >
            <Mic size={18} /> Voice
          </button>
        </div>

        <div className="p-6 sm:p-8 flex-1 flex flex-col gap-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex items-center gap-2 animate-shake">
              {error}
            </div>
          )}

          {/* MEDIA TAB */}
          {activeTab === "media" && (
            <div className="relative group">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className={`w-full aspect-[9/16] max-h-[50vh] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 overflow-hidden ${
                preview ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-foreground/5"
              }`}>
                {preview ? (
                  <div className="relative w-full h-full bg-black">
                    {file?.type.startsWith("image") ? (
                      <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                    ) : (
                      <video src={preview} className="w-full h-full object-contain" controls />
                    )}
                  </div>
                ) : (
                  <>
                    <div className="p-4 bg-foreground/5 rounded-full text-muted-foreground group-hover:text-primary transition-colors">
                      <ImageIcon size={32} />
                    </div>
                    <span className="text-foreground font-medium transition-colors">Select photo or video</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* TEXT TAB */}
          {activeTab === "text" && (
            <div className="flex flex-col gap-4">
              <div 
                className="w-full aspect-[9/16] max-h-[50vh] rounded-2xl shadow-inner flex items-center justify-center p-6 relative overflow-hidden transition-all duration-500"
                style={{ background: bgColor }}
              >
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Type your story..."
                  className="w-full h-full bg-transparent border-none focus:outline-none text-white text-3xl font-bold text-center resize-none placeholder:text-white/50"
                  dir="auto"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
                {GRADIENTS.map((gradient, i) => (
                  <button
                    key={i}
                    className={`w-10 h-10 rounded-full flex-shrink-0 transition-transform ${bgColor === gradient ? "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:scale-105"}`}
                    style={{ background: gradient }}
                    onClick={() => setBgColor(gradient)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* VOICE TAB */}
          {activeTab === "voice" && (
            <div className="flex flex-col items-center justify-center gap-8 w-full aspect-[9/16] max-h-[50vh] rounded-2xl bg-card border border-border shadow-inner relative overflow-hidden">
              <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: "radial-gradient(circle at center, var(--primary) 0%, transparent 70%)" }} />
              
              {recorderState === "idle" ? (
                <div className="flex flex-col items-center gap-4 z-10">
                  <button 
                    onClick={startRecording}
                    className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-lg hover:scale-105 active:scale-95 transition-all"
                  >
                    <Mic size={32} />
                  </button>
                  <p className="font-bold text-foreground">Tap to record</p>
                </div>
              ) : recorderState === "recording" ? (
                <div className="flex flex-col items-center gap-6 z-10 w-full px-8">
                  <div className="text-4xl font-mono font-bold text-primary animate-pulse">
                    {recorderDuration.toFixed(1)}s
                  </div>
                  
                  <div className="h-16 w-full flex items-center gap-1 justify-center">
                    {recorderWaveform.slice(-30).map((h, i) => (
                      <div key={i} className="w-1.5 bg-primary rounded-full transition-all duration-75" style={{ height: `${Math.max(10, h)}%` }} />
                    ))}
                  </div>

                  <div className="flex items-center gap-6 mt-4">
                    <button onClick={handleCancelVoice} className="p-4 bg-destructive/10 text-destructive rounded-full hover:bg-destructive/20 transition-all">
                      <Trash2 size={24} />
                    </button>
                    <button onClick={stopRecording} className="p-4 bg-primary text-primary-foreground rounded-full hover:scale-105 transition-all shadow-lg">
                      <Square size={24} fill="currentColor" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6 z-10 w-full px-8">
                  <div className="text-4xl font-mono font-bold text-foreground">
                    {recorderDuration.toFixed(1)}s
                  </div>
                  
                  <div className="h-16 w-full flex items-center gap-1 justify-center relative cursor-pointer" onClick={handleTogglePreview}>
                    {/* Simplified Waveform Preview */}
                    {recorderWaveform.slice(0, 30).map((h, i) => {
                      const isActive = (i / 30) <= (previewTime / recorderDuration);
                      return (
                        <div key={i} className={`w-1.5 rounded-full transition-colors ${isActive ? "bg-primary" : "bg-primary/30"}`} style={{ height: `${Math.max(10, h)}%` }} />
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-6 mt-4">
                    <button onClick={handleCancelVoice} className="p-4 bg-muted text-muted-foreground rounded-full hover:bg-muted/80 transition-all">
                      <Trash2 size={24} />
                    </button>
                    <button onClick={handleTogglePreview} className="p-4 bg-primary text-primary-foreground rounded-full hover:scale-105 transition-all shadow-lg">
                      {isPlayingPreview ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 mt-auto">
            <button
              onClick={() => handleSubmit()}
              disabled={isSubmitDisabled}
              className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg disabled:opacity-30 disabled:shadow-none flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  Share Story
                  <Send size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform ml-1" />
                </>
              )}
            </button>
            <button 
              onClick={() => router.push("/stories/feed")}
              className="w-full py-4 bg-transparent text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-2xl font-bold text-center transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
