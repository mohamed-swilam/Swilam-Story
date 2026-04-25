import { Story } from "@/types/stories";
import StoryHeader from "./StoryHeader";
import ProgressBar from "./ProgressBar";
import { useState } from "react";
import { Send } from "lucide-react";
import { API } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

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
  setIsReplying
}: StoryMediaProps) {
  const isMine = story.mine || (currentUserId && story.storyOwner._id === currentUserId);
  const [replyText, setReplyText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [replySent, setReplySent] = useState(false);
  const socket = useSocket();
  const queryClient = useQueryClient();

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
          storyOwnerId: story.storyOwner._id
        }
      });

      // Invalidate messages query to ensure it's fresh when returning to chat
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
            onDeleteConfirmed={onDeleteConfirmed}
            onClose={onClose}
          />
        </div>
      </div>

      {/* Media Content */}
      <div className="flex-1 flex items-center justify-center bg-black relative">
        {story.media_type === "image" ? (
          <img
            src={story.media_url}
            alt="story content"
            className="w-full h-full object-contain"
          />
        ) : (
          <video
            src={story.media_url}
            className="w-full h-full object-contain"
            autoPlay
            muted
            playsInline
            loop
          />
        )}
      </div>

      {/* Bottom Overlay: Viewers (Only show if it's my story) */}
      {isMine ? (
        <div className="absolute bottom-0 left-0 right-0 p-6 flex justify-center bg-gradient-to-t from-black/80 to-transparent z-20">
          <button
            onClick={story.viewersCount > 0 ? openViewers : undefined}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10 hover:bg-white/20 transition-all group"
          >
            <span className="text-xl group-hover:scale-110 transition-transform">👁️</span>
            <span className="text-white font-medium text-sm">
              {story.viewersCount} Viewers
            </span>
          </button>
        </div>
      ) : (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-20">
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
      )}
    </div>
  );
}
