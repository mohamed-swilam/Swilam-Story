import { Message } from "@/types/messages";
import { useState, useEffect, useRef } from "react";
import { API } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { MoreHorizontal, Trash2, Smile, Copy, Check } from "lucide-react";
import ConfirmationModal from "@/components/ui/ConfirmationModal";

interface Props {
  message: Message;
  currentUserId: string;
  nextMessage?: Message;
  isGroup?: boolean;
  onImageClick?: (url: string) => void;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function MessageBubble({ message, currentUserId, nextMessage, isGroup, onImageClick }: Props) {
  const isMine = message.sender._id === currentUserId || (typeof message.sender === 'string' && message.sender === currentUserId);
  const isRead = message.readBy.some((id) => id.toString() !== currentUserId.toString());

  // Only show avatar if next message is from a different sender
  const showAvatar =
    !isMine && (!nextMessage || nextMessage.sender._id !== message.sender._id);

  const router = useRouter();
  const queryClient = useQueryClient();
  const [isExpired, setIsExpired] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message.storyReply?.storyId) {
      API.checkStoryExists(message.storyReply.storyId)
        .then((res) => {
          if (!res.exists) setIsExpired(true);
        })
        .catch(() => setIsExpired(true));
    }
  }, [message.storyReply?.storyId]);

  // Handle clicking outside of menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  const [deleteType, setDeleteType] = useState<"me" | "everyone" | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const reactionPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(e.target as Node)) {
        setShowReactionPicker(false);
      }
    };
    if (showReactionPicker) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showReactionPicker]);

  const reactionMutation = useMutation({
    mutationFn: (emoji: string) => API.toggleReaction(message._id, emoji),
    onMutate: async (emoji: string) => {
      const qKey = queryKeys.messages(message.conversationId);
      await queryClient.cancelQueries({ queryKey: qKey });
      const previousMessages = queryClient.getQueryData(qKey);

      queryClient.setQueryData(qKey, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((m: any) => {
              if (m._id !== message._id) return m;
              const reactions = [...(m.reactions || [])];
              const idx = reactions.findIndex(r => r.userId === currentUserId);
              if (idx > -1) {
                if (reactions[idx].emoji === emoji) reactions.splice(idx, 1);
                else reactions[idx].emoji = emoji;
              } else {
                reactions.push({ userId: currentUserId, emoji });
              }
              return { ...m, reactions };
            })
          }))
        };
      });
      setShowReactionPicker(false);
      return { previousMessages };
    },
    onError: (err, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(queryKeys.messages(message.conversationId), context.previousMessages);
      }
    }
  });

  const REACTION_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

  // Long press handling
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const handleLongPressStart = () => {
    longPressTimer.current = setTimeout(() => setShowReactionPicker(true), 500);
  };
  const handleLongPressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const deleteMutation = useMutation({
    mutationFn: (forEveryone: boolean) => API.deleteMessage(message._id, forEveryone),
    onMutate: async (forEveryone: boolean) => {
      // If deleting for everyone, socket will handle UI update for others
      // But for local user, we can optimistically remove it either way
      const qKey = queryKeys.messages(message.conversationId);
      await queryClient.cancelQueries({ queryKey: qKey });
      const previousMessages = queryClient.getQueryData(qKey);

      queryClient.setQueryData(qKey, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.filter((m: any) => m._id !== message._id),
          })),
        };
      });

      setDeleteType(null);
      return { previousMessages };
    },
    onError: (err, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(queryKeys.messages(message.conversationId), context.previousMessages);
      }
    },
  });

  const handleDeleteConfirm = () => {
    if (deleteType) {
      deleteMutation.mutate(deleteType === "everyone");
    }
  };

  const handleStoryPreviewClick = () => {
    if (isExpired || !message.storyReply?.storyOwnerId) return;
    router.push(`/stories/${message.storyReply.storyOwnerId}?source=chat`);
  };

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (message.type === "text") {
      navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setIsMenuOpen(false);
      }, 1500);
    }
  };

  const [visibleChars, setVisibleChars] = useState(500);
  const isTruncated = message.type === "text" && message.content.length > visibleChars;

  return (
    <>
      <div className={`flex items-end gap-2 mb-1 group ${isMine ? "flex-row-reverse" : "flex-row"}`}>
        {!isMine && (
          <div className="w-7 flex-shrink-0">
            {showAvatar && (
              <img
                src={message.sender.user_pic || "/user_profile.jpg"}
                alt={message.sender.username}
                className="w-7 h-7 rounded-full object-cover"
              />
            )}
          </div>
        )}

        <div className={`flex flex-col max-w-[75%] min-w-0 ${isMine ? "items-end" : "items-start"}`}>
          {!isMine && isGroup && (
            <span className="text-[10px] text-muted-foreground font-semibold ml-2 mb-1">{message.sender.username}</span>
          )}
          
          <div className={`relative flex items-center gap-2 min-w-0 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
            <div className="relative min-w-0">
              <div
                className={`relative overflow-hidden ${
                  isMine
                    ? "bg-primary text-white rounded-2xl rounded-br-none shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                    : "bg-secondary text-white rounded-2xl rounded-bl-none"
                }`}
                style={isMine ? { backgroundColor: "var(--accent-color, #a855f7)" } : {}}
                onMouseDown={handleLongPressStart}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                onTouchStart={handleLongPressStart}
                onTouchEnd={handleLongPressEnd}
              >
                {message.storyReply && (
                  <div className="p-1 border-b border-white/10 bg-black/20 flex flex-col gap-1 w-48">
                    <span className="text-[10px] uppercase tracking-wider text-white/50 px-1 pt-1 font-bold">Replied to story</span>
                    <div 
                      className={`relative w-full h-32 rounded-lg overflow-hidden bg-black/40 flex items-center justify-center ${isExpired ? "cursor-default" : "cursor-pointer"}`}
                      onClick={handleStoryPreviewClick}
                    >
                      {message.storyReply.mediaUrl ? (
                        <>
                          {message.storyReply.mediaType === "video" ? (
                            <>
                              <video src={message.storyReply.mediaUrl} className={`w-full h-full object-cover ${isExpired ? "opacity-30 grayscale" : "opacity-80 hover:opacity-100 transition-opacity"}`} />
                              {!isExpired && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-md">
                                    <div className="w-0 h-0 border-t-4 border-t-transparent border-l-6 border-l-white border-b-4 border-b-transparent ml-1" />
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <img src={message.storyReply.mediaUrl} className={`w-full h-full object-cover ${isExpired ? "opacity-30 grayscale" : "opacity-80 hover:opacity-100 transition-opacity"}`} alt="Story preview" />
                          )}
                          
                          {isExpired && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60">
                              <span className="text-xl mb-1">📷</span>
                              <span className="text-xs font-semibold">This story expired</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-white/40">Story expired</span>
                      )}
                    </div>
                    {!isExpired && <span className="text-[9px] text-center text-white/40 pb-0.5 font-medium tracking-wide">Tap to view story</span>}
                  </div>
                )}
                {message.type === "text" && (
                  <div className="px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-all [overflow-wrap:anywhere]">
                    {(isTruncated ? message.content.slice(0, visibleChars) : message.content).split('\n').map((line, i) => (
                      <div key={i} dir="auto" className="text-start min-h-[1.25rem] break-all [overflow-wrap:anywhere]">
                        {line || ' '}
                      </div>
                    ))}
                    {isTruncated && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setVisibleChars(prev => prev + 500);
                        }}
                        className="mt-2 text-[11px] font-bold text-white/70 hover:text-white underline decoration-white/20 hover:decoration-white transition-all"
                      >
                        Read More...
                      </button>
                    )}
                  </div>
                )}
                {message.type === "image" && (
                  <div className="p-1">
                    <img 
                      src={message.fileUrl} 
                      alt="Image" 
                      className="max-w-full rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                      style={{ maxHeight: "300px" }}
                      onClick={() => onImageClick?.(message.fileUrl)}
                    />
                    {message.content && <p className="px-3 py-2 text-sm text-start" dir="auto">{message.content}</p>}
                  </div>
                )}
                {message.type === "file" && (
                  <a 
                    href={message.fileUrl} 
                    target="_blank" 
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                  >
                    <div className="p-2 bg-white/10 rounded-lg">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a2 2 0 00-.586-1.414l-5.414-5.414A2 2 0 0011.586 2H7a2 2 0 00-2 2v15a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{message.fileName || "Document"}</p>
                      <p className="text-[10px] opacity-70">{(message.fileSize / 1024).toFixed(1)} KB</p>
                    </div>
                  </a>
                )}
                {message.type === "voice" && (
                  <div className="px-4 py-3 flex items-center gap-3">
                    <audio src={message.fileUrl} controls className="h-8 max-w-[200px]" />
                  </div>
                )}
              </div>

              {message.reactions && message.reactions.length > 0 && (
                <div className={`absolute -bottom-2 ${isMine ? "right-0 translate-x-1/3" : "left-0 -translate-x-1/3"} z-10 flex -space-x-1`}>
                  {Array.from(new Set(message.reactions.map(r => r.emoji))).slice(0, 3).map((emoji, i) => (
                    <div key={i} className="bg-card border border-white/10 rounded-full px-1.5 py-0.5 text-[10px] shadow-lg animate-bounceIn">
                      {emoji}
                    </div>
                  ))}
                  {message.reactions.length > 1 && (
                    <div className="bg-card border border-white/10 rounded-full px-1 py-0.5 text-[8px] font-bold text-muted-foreground shadow-lg flex items-center justify-center">
                      {message.reactions.length}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative flex items-center gap-1" ref={menuRef}>
              <button
                onClick={() => setShowReactionPicker(!showReactionPicker)}
                className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground/50 hover:text-white rounded-full hover:bg-white/10 ${showReactionPicker ? "opacity-100 bg-white/10" : ""}`}
              >
                <Smile size={16} />
              </button>

              {showReactionPicker && (
                <div 
                  ref={reactionPickerRef}
                  className={`absolute bottom-full mb-2 z-[60] bg-card/95 backdrop-blur-md border border-white/10 rounded-full shadow-2xl p-1.5 flex items-center gap-1 animate-slideUp ${isMine ? "left-0" : "right-0"}`}
                >
                  {REACTION_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => reactionMutation.mutate(emoji)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-full transition-all hover:scale-125 text-lg"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground/50 hover:text-white rounded-full hover:bg-white/10 ${isMenuOpen ? "opacity-100 bg-white/10" : ""}`}
              >
                <MoreHorizontal size={16} />
              </button>

              {isMenuOpen && (
                <div className={`absolute bottom-full mb-2 z-50 bg-card border border-white/10 rounded-xl shadow-2xl p-1 min-w-[150px] animate-slideUp ${isMine ? "left-0" : "right-0"}`}>
                  {message.type === "text" && (
                    <button
                      onClick={handleCopy}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check size={14} className="text-green-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={14} className="text-primary" />
                          Copy
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      setDeleteType("me");
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} className="text-red-500" />
                    Delete
                  </button>
                  {isMine && (
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setDeleteType("everyone");
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                      Unsend
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-1 px-1">
            <span className="text-[10px] text-muted-foreground/70 font-medium">{formatTime(message.createdAt)}</span>
            {isMine && (
              <span className={`text-[11px] font-black ${isRead ? "text-primary brightness-125" : "text-muted-foreground/50"}`}>
                {isRead ? "✓" : "✓"}
              </span>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!deleteType}
        onClose={() => setDeleteType(null)}
        onConfirm={handleDeleteConfirm}
        title={deleteType === "everyone" ? "Unsend Message?" : "Delete Message?"}
        message={
          deleteType === "everyone"
            ? "This will remove the message for everyone in the chat. This action cannot be undone."
            : "This will remove the message for you. Other participants will still be able to see it."
        }
        confirmText={deleteType === "everyone" ? "Unsend for everyone" : "Delete for me"}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}
