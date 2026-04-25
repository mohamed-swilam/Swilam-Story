import { Story } from "@/types/stories";
import StoryHeader from "./StoryHeader";
import ProgressBar from "./ProgressBar";
import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { API } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👏", "🔥", "🎉"] as const;
type ReactionEmoji = typeof REACTION_EMOJIS[number];

interface StoryMediaProps {
  story: Story;
  currentUserId?: string;
  openViewers: () => void;
  formatDate: (date: string) => string;
  stories: Story[];
  currentIndex: number;
  readyStories: boolean[];
  isPaused: boolean;
  pauseStory: () => void;
  resumeStory: () => void;
  onDeleteConfirmed: () => Promise<void>;
  onClose: () => void;
  setIsReplying?: (val: boolean) => void;
}

export default function StoryMedia({
  story,
  currentUserId,
  openViewers,
  formatDate,
  stories,
  currentIndex,
  readyStories,
  isPaused,
  pauseStory,
  resumeStory,
  onDeleteConfirmed,
  onClose,
  setIsReplying,
}: StoryMediaProps) {
  const isMine = story.mine || (currentUserId && story.storyOwner._id === currentUserId);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [replySent, setReplySent] = useState(false);
  const socket = useSocket();
  const queryClient = useQueryClient();

  // ── Reaction state ──────────────────────────────────────────────────────────
  // Seed from existing viewer entry so the bar shows current state on open
  const existingEntry = story.viewers?.find(
    (v) => (v.storyViewer._id || v.storyViewer).toString() === currentUserId?.toString()
  );
  const [activeReaction, setActiveReaction] = useState<string | null>(
    existingEntry?.reaction ?? null
  );
  const [isReacting, setIsReacting] = useState(false);
  const [viewerCount, setViewerCount] = useState(story.viewersCount || 0);

  // Sync state when story prop changes (e.g. from cache update or navigation)
  useEffect(() => {
    const entry = story.viewers?.find(
      (v) => (v.storyViewer._id || v.storyViewer).toString() === currentUserId?.toString()
    );
    setActiveReaction(entry?.reaction ?? null);
    setViewerCount(story.viewersCount || 0);
  }, [story, currentUserId]);

  useEffect(() => {
    if (!socket || !currentUserId) return;

    const onStoryReaction = ({ storyId, viewer }: { storyId: string, viewer: any }) => {
      if (storyId === story._id && viewer.userId === currentUserId) {
        setActiveReaction(viewer.reaction);
      }
    };

    const onNewViewer = ({ storyId }: { storyId: string }) => {
      if (storyId.toString() === story._id.toString()) {
        setViewerCount(prev => prev + 1);
      }
    };

    socket.on("story_reaction", onStoryReaction);
    socket.on("new_viewer", onNewViewer);
    return () => {
      socket.off("story_reaction", onStoryReaction);
      socket.off("new_viewer", onNewViewer);
    };
  }, [socket, story._id, currentUserId]);

  const handleReaction = async (emoji: ReactionEmoji) => {
    if (isReacting) return;
    setIsReacting(true);

    // Optimistic: toggle off if same, else set new
    const prev = activeReaction;
    setActiveReaction(emoji === prev ? null : emoji);

    try {
      const result = await API.addReaction(story._id, emoji);
      setActiveReaction(result.reaction);
    } catch (err) {
      setActiveReaction(prev); // revert
      console.error("Reaction failed:", err);
    } finally {
      setIsReacting(false);
    }
  };

  // ── Reply handler ───────────────────────────────────────────────────────────
  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSending || !socket) return;

    setIsSending(true);
    try {
      const conv = await API.createOrGetConversation(story.storyOwner._id);

      socket.emit("send_message", {
        conversationId: conv._id,
        content: replyText,
        storyReply: {
          storyId: story._id,
          mediaUrl: story.media_url,
          mediaType: story.media_type,
          storyOwnerId: story.storyOwner._id,
          content: story.content,
          bg_color: story.bg_color,
        },
      });

      queryClient.invalidateQueries({ queryKey: queryKeys.messages(conv._id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chats });

      setReplyText("");
      setReplySent(true);
      setTimeout(() => setReplySent(false), 3000);
      resumeStory();
    } catch (err) {
      console.error("Failed to send reply:", err);
    } finally {
      setIsSending(false);
    }
  };

  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null);

  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    if (isPaused) {
      el.pause();
    } else {
      // Only call play() if the element is ready enough to avoid AbortError
      if (el.readyState >= 2) {
        el.play().catch(() => {});
      }
    }
  }, [isPaused]);

  return (
    <div className="relative w-full h-full flex flex-col bg-black overflow-hidden rounded-2xl shadow-2xl border border-white/5">
      {/* Top Overlay: Progress and Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/80 to-transparent pt-6">
        <ProgressBar
          stories={stories}
          currentIndex={currentIndex}
          readyStories={readyStories}
          isPaused={isPaused}
        />
        <div className="mt-4">
          <StoryHeader
            story={story}
            currentUserId={currentUserId}
            formatDate={formatDate}
            pauseStory={pauseStory}
            resumeStory={resumeStory}
            isPaused={isPaused}
            onDeleteConfirmed={onDeleteConfirmed}
            onClose={onClose}
          />
        </div>
      </div>

      {/* Media Content */}
      <div className="flex-1 flex items-center justify-center bg-black relative">
        {story.media_type === "text" ? (
          <div 
            className="w-full h-full flex items-center justify-center p-8"
            style={{ background: story.bg_color || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
          >
            <p className="text-white text-4xl font-bold text-center leading-tight whitespace-pre-wrap break-words" dir="auto">
              {story.content}
            </p>
          </div>
        ) : story.media_type === "voice" ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-card relative">
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: "radial-gradient(circle at center, var(--primary) 0%, transparent 70%)" }} />
            <audio 
              ref={mediaRef as React.RefObject<HTMLAudioElement>}
              src={story.media_url} 
              autoPlay={!isPaused} 
              onWaiting={pauseStory}
              onPlaying={resumeStory}
              className="hidden"
            />
            <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center mb-12 shadow-[0_0_50px_rgba(168,85,247,0.5)] z-10 animate-pulse">
               <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                 <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                 <line x1="12" x2="12" y1="19" y2="22"/>
               </svg>
            </div>
            {story.waveformData && (
              <div className="flex items-center justify-center gap-1 h-24 w-full max-w-xs z-10">
                {story.waveformData.slice(0, 40).map((h, i) => (
                  <div 
                    key={i} 
                    className="w-1.5 bg-primary rounded-full" 
                    style={{ 
                      height: `${Math.max(10, h)}%`, 
                      animationName: isPaused ? 'none' : 'pulse',
                      animationDuration: '1s',
                      animationTimingFunction: 'ease-in-out',
                      animationIterationCount: 'infinite',
                      animationDelay: `${i * 0.05}s` 
                    }} 
                  />
                ))}
              </div>
            )}
          </div>
        ) : story.media_type === "image" ? (
          <img
            src={story.media_url}
            alt="story content"
            className="w-full h-full object-contain"
          />
        ) : (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={story.media_url}
            className="w-full h-full object-contain"
            autoPlay={!isPaused}
            muted
            playsInline
            loop
            onWaiting={pauseStory}
            onPlaying={resumeStory}
          />
        )}
      </div>

      {/* Bottom Overlay */}
      {isMine ? (
        <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-center bg-gradient-to-t from-black/80 to-transparent z-20">
          <button
            onClick={viewerCount > 0 ? openViewers : undefined}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/20 transition-all group"
          >
            <span className="text-xl group-hover:scale-110 transition-transform">👁️</span>
            <span className="text-white font-medium text-sm">
              {viewerCount} Viewers
            </span>
          </button>
        </div>
      ) : (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent z-20">
          {/* ── Reaction bar ── */}
          <div className="flex items-center justify-center gap-2 pt-4 pb-2 px-4">
            {REACTION_EMOJIS.map((emoji) => {
              const isActive = activeReaction === emoji;
              return (
                <button
                  key={emoji}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReaction(emoji);
                  }}
                  disabled={isReacting}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-xl transition-all duration-150 border disabled:opacity-60 ${
                    isActive
                      ? "bg-white/30 border-white/60 scale-125 shadow-lg"
                      : "bg-black/30 border-white/10 hover:bg-white/15 hover:scale-125 hover:-translate-y-1"
                  }`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>

          {/* ── Reply input ── */}
          <div className="p-4 pt-2">
            <form
              onSubmit={handleReply}
              className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 max-w-md mx-auto"
            >
              <input
                type="text"
                placeholder="Reply to story..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onFocus={() => {
                  pauseStory();
                  setIsReplying?.(true);
                }}
                onBlur={() => {
                  resumeStory();
                  setIsReplying?.(false);
                }}
                className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/60 text-sm text-start"
                dir="auto"
                onClick={(e) => e.stopPropagation()}
              />
              {replySent ? (
                <span className="text-primary text-xs font-bold px-2">Sent!</span>
              ) : (
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSending}
                  className="p-1.5 text-white/80 hover:text-primary transition-colors disabled:opacity-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Send size={18} />
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
