import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause } from "lucide-react";

interface Props {
  url: string;
  duration: number;
  waveformData?: number[];
  isMine: boolean;
}

// Global reference to track currently playing audio across all instances
let currentlyPlayingAudio: HTMLAudioElement | null = null;

export default function VoiceMessagePlayer({ url, duration, waveformData, isMine }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [localDuration, setLocalDuration] = useState(duration);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fallback waveform if data is missing
  const bars = waveformData && waveformData.length === 40 
    ? waveformData 
    : new Array(40).fill(0).map(() => 0.2 + Math.random() * 0.6);

  useEffect(() => {
    audioRef.current = new Audio(url);
    return () => {
      if (audioRef.current) {
        if (currentlyPlayingAudio === audioRef.current) {
          currentlyPlayingAudio = null;
        }
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [url]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      if (currentlyPlayingAudio === audioRef.current) {
        currentlyPlayingAudio = null;
      }
    } else {
      if (currentlyPlayingAudio && currentlyPlayingAudio !== audioRef.current) {
        currentlyPlayingAudio.pause();
        window.dispatchEvent(new CustomEvent("swichat-audio-play", { detail: { url } }));
      }
      audioRef.current.play();
      currentlyPlayingAudio = audioRef.current;
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, url]);

  useEffect(() => {
    const handleGlobalPlay = (e: any) => {
      if (e.detail.url !== url && isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      }
    };

    window.addEventListener("swichat-audio-play", handleGlobalPlay);
    return () => {
      window.removeEventListener("swichat-audio-play", handleGlobalPlay);
    };
  }, [isPlaying, url]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (currentlyPlayingAudio === audio) {
        currentlyPlayingAudio = null;
      }
    };
    const handleMetadata = () => {
      if (isFinite(audio.duration)) setLocalDuration(audio.duration);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("loadedmetadata", handleMetadata);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("loadedmetadata", handleMetadata);
    };
  }, []);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    } else {
      setCurrentTime(newTime);
    }
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const displayDuration = isFinite(localDuration) && localDuration > 0 ? localDuration : (duration || 0);
  const progress = displayDuration > 0 ? (currentTime / displayDuration) * 40 : 0;

  return (
    <div className="flex items-center gap-3 py-2 px-1 min-w-[200px] sm:min-w-[240px]">
      <button
        onClick={togglePlay}
        className={`w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full transition-all active:scale-90 ${
          isMine 
            ? "bg-white/20 text-white hover:bg-white/30" 
            : "bg-primary text-white hover:bg-primary/90"
        }`}
      >
        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
      </button>

      <div 
        className="flex-1 flex items-end gap-[2px] h-8 cursor-pointer group"
        onClick={handleSeek}
      >
        {bars.map((val, i) => {
          const isActive = i < progress;
          return (
            <div 
              key={i}
              className={`w-1 rounded-full transition-colors duration-200 ${
                isActive 
                  ? (isMine ? "bg-white" : "bg-primary") 
                  : (isMine ? "bg-white/30" : "bg-black/10")
              }`}
              style={{ 
                height: `${Math.max(20, val * 100)}%`,
              }}
            />
          );
        })}
      </div>

      <div className={`text-[11px] font-bold min-w-[32px] ${isMine ? "text-white/70" : "text-muted-foreground"}`}>
        {isPlaying ? formatTime(Math.ceil(Math.max(0, displayDuration - currentTime))) : formatTime(displayDuration)}
      </div>
    </div>
  );
}
