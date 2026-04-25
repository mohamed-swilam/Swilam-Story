import { Message } from "@/types/messages";
import { useState, useEffect, useRef } from "react";
import { API } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { MoreHorizontal, Trash2, Smile, Copy, Check, Target } from "lucide-react";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import { useSocket } from "@/hooks/useSocket";
import VoiceMessagePlayer from "./VoiceMessagePlayer";

interface Props {
  message: Message;
  currentUserId: string;
  nextMessage?: Message;
  isGroup?: boolean;
  onImageClick?: (messageId: string) => void;
  onReply: (message: Message) => void;
  onScrollToMessage: (messageId: string) => void;
  isHighlighted?: boolean;
  onJump?: (messageId: string) => void;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function MessageBubble({ message, currentUserId, nextMessage, isGroup, onImageClick, onReply, onScrollToMessage, isHighlighted, onJump }: Props) {
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

  const socket = useSocket();
  useEffect(() => {
    if (message.storyReply?.storyId) {
      API.checkStoryExists(message.storyReply.storyId)
        .then((res) => {
          if (!res.exists) setIsExpired(true);
        })
        .catch(() => setIsExpired(true));

      if (socket) {
        const handleStoryDeleted = (data: { storyId: string }) => {
          if (data.storyId === message.storyReply?.storyId) {
            setIsExpired(true);
          }
        };
        socket.on("story_deleted", handleStoryDeleted);
        return () => {
          socket.off("story_deleted", handleStoryDeleted);
        };
      }
    }
  }, [message.storyReply?.storyId, socket]);

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
    const storyId = message.storyReply.storyId;
    router.push(`/stories/${message.storyReply.storyOwnerId}?source=chat&storyId=${storyId}`);
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
      <div 
        id={`msg-${message._id}`}
        className={`flex items-end gap-2 mb-1 group animate-message-in ${isMine ? "flex-row-reverse" : "flex-row"}`}
      >
        {!isMine && (
          <div className="w-7 flex-shrink-0 stagger-item stagger-delay-1">
            {showAvatar && (
              <img
                src={message.sender.user_pic || "/user_profile.jpg"}
                alt={message.sender.username}
                className="w-7 h-7 rounded-full object-cover shadow-sm"
              />
            )}
          </div>
        )}

        <div className={`flex flex-col max-w-[75%] min-w-0 ${isMine ? "items-end" : "items-start"}`}>
          {!isMine && isGroup && (
            <span className="text-[10px] text-muted-foreground font-semibold ml-2 mb-1 animate-fadeIn">{message.sender.username}</span>
          )}
          
          <div className={`relative flex items-center gap-2 min-w-0 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
            <div className="relative min-w-0">
              <div
                className={`relative overflow-hidden transition-all duration-300 ${
                  isMine
                    ? "rounded-2xl rounded-br-none shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]"
                    : "bg-secondary text-foreground rounded-2xl rounded-bl-none"
                } ${isHighlighted ? "ring-4 ring-primary/40 ring-offset-2 ring-offset-background scale-[1.02] z-30" : ""}`}
                style={isMine ? { backgroundColor: "var(--accent-color, #a855f7)", color: "var(--accent-text-color, white)" } : {}}
                onMouseDown={handleLongPressStart}
                onMouseUp={handleLongPressEnd}
                onMouseLeave={handleLongPressEnd}
                onTouchStart={handleLongPressStart}
                onTouchEnd={handleLongPressEnd}
              >
                {/* ── Reply preview block ── */}
                {message.replyTo?.messageId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onScrollToMessage(message.replyTo!.messageId);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className={`w-full ${isMine ? "text-right" : "text-left"} px-3 pt-2.5 pb-1.5 border-b border-foreground/10 flex flex-col gap-0.5 focus:outline-none group/reply ${isMine ? "bg-black/10 hover:bg-black/20" : "bg-foreground/5 hover:bg-foreground/10"} transition-all duration-200`}
                  >
                    <div
                      className={`rounded-sm transition-all ${isMine ? "pr-2.5 border-r-2 text-right" : "pl-2.5 border-l-2 text-left"}`}
                      style={{ borderColor: isMine ? "var(--accent-text-color, rgba(255,255,255,0.5))" : "var(--accent-color, #a855f7)" }}
                    >
                      <span
                        className="text-[10px] font-bold block mb-0.5"
                        style={{ color: isMine ? "var(--accent-text-color, white)" : "var(--accent-color, #a855f7)", opacity: isMine ? 0.8 : 1 }}
                      >
                        {message.replyTo.senderUsername}
                      </span>
                      <p 
                        className={`text-[11px] leading-snug line-clamp-2 break-all transition-opacity`}
                        style={{ color: isMine ? "var(--accent-text-color, white)" : "currentColor", opacity: 0.5 }}
                      >
                        {message.replyTo.content}
                      </p>
                    </div>
                  </button>
                )}

                {message.storyReply && (
                  <div className="p-1 border-b border-foreground/10 bg-foreground/10 flex flex-col gap-1 w-48 animate-fadeIn">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground px-1 pt-1 font-bold">Replied to story</span>
                    <div 
                      className={`relative w-full h-32 rounded-lg overflow-hidden bg-background/40 flex items-center justify-center ${isExpired ? "cursor-default" : "cursor-pointer group/story"}`}
                      onClick={handleStoryPreviewClick}
                    >
                      {message.storyReply.mediaType === "text" ? (
                        // Text Story Preview
                        <div className="relative w-full h-full">
                          <div 
                            className={`w-full h-full flex items-center justify-center p-2 transition-all ${isExpired ? "opacity-30 grayscale" : "group-hover/story:scale-105"}`}
                            style={{ background: message.storyReply.bg_color || "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
                          >
                            <p className="text-white text-xs font-bold text-center line-clamp-3 break-words" dir="auto">
                              {message.storyReply.content}
                            </p>
                          </div>
                          {isExpired && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-foreground/60 animate-fadeIn">
                              <span className="text-xs font-semibold">This story expired</span>
                            </div>
                          )}
                        </div>
                      ) : message.storyReply.mediaType === "voice" ? (
                        // Voice Story Preview
                        <div className="relative w-full h-full">
                          <div className={`w-full h-full flex flex-col items-center justify-center gap-2 bg-card transition-all ${isExpired ? "opacity-30 grayscale" : "group-hover/story:scale-105"}`}>
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-md">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                <line x1="12" x2="12" y1="19" y2="22"/>
                              </svg>
                            </div>
                            <p className="text-xs text-muted-foreground font-medium">Voice story</p>
                          </div>
                          {isExpired && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-foreground/60 animate-fadeIn">
                              <span className="text-xs font-semibold">This story expired</span>
                            </div>
                          )}
                        </div>
                      ) : message.storyReply.mediaUrl ? (
                        <>
                          {message.storyReply.mediaType === "video" ? (
                            <>
                              <video src={message.storyReply.mediaUrl} className={`w-full h-full object-cover transition-all duration-300 ${isExpired ? "opacity-30 grayscale" : "opacity-80 group-hover/story:opacity-100 group-hover/story:scale-105"}`} />
                              {!isExpired && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-md transition-transform group-hover/story:scale-110">
                                    <div className="w-0 h-0 border-t-4 border-t-transparent border-l-6 border-l-white border-b-4 border-b-transparent ml-1" />
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <img src={message.storyReply.mediaUrl} className={`w-full h-full object-cover transition-all duration-300 ${isExpired ? "opacity-30 grayscale" : "opacity-80 group-hover/story:opacity-100 group-hover/story:scale-105"}`} alt="Story preview" />
                          )}
                          
                          {isExpired && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-foreground/60 animate-fadeIn">
                              <span className="text-xs font-semibold">This story expired</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Story expired</span>
                      )}
                    </div>
                    {!isExpired && <span className="text-[9px] text-center text-muted-foreground pb-0.5 font-medium tracking-wide">Tap to view story</span>}
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
                        className={`mt-2 text-[11px] font-bold ${isMine ? "text-white/70 hover:text-white" : "text-primary hover:underline"} transition-all`}
                      >
                        Read More...
                      </button>
                    )}
                  </div>
                )}
                {message.type === "image" && (
                  <div className="p-1 animate-fadeIn">
                    <img 
                      src={message.fileUrl} 
                      alt="Image" 
                      className="max-w-full rounded-xl object-cover cursor-pointer hover:brightness-110 transition-all duration-300" 
                      style={{ maxHeight: "300px" }}
                      onClick={() => message.fileUrl && onImageClick?.(message._id)}
                    />
                    {message.content && <p className="px-3 py-2 text-sm text-start" dir="auto">{message.content}</p>}
                  </div>
                )}
                {message.type === "video" && (
                  <div className="p-1 animate-fadeIn">
                    <div 
                      className="relative cursor-pointer group"
                      onClick={() => message.fileUrl && onImageClick?.(message._id)}
                    >
                      <video 
                        src={message.fileUrl} 
                        className="max-w-full rounded-xl object-cover group-hover:brightness-90 transition-all duration-300 pointer-events-none" 
                        style={{ maxHeight: "300px" }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl group-hover:bg-black/30 transition-all">
                        <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white/90 group-hover:scale-110 transition-transform shadow-xl">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                      <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm font-bold">
                        VIDEO
                      </div>
                    </div>
                    {message.content && <p className="px-3 py-2 text-sm text-start" dir="auto">{message.content}</p>}
                  </div>
                )}
                {message.type === "file" && (
                  <a 
                    href={message.fileUrl} 
                    target="_blank" 
                    className={`flex items-center gap-3 px-4 py-3 ${isMine ? "hover:bg-black/10" : "hover:bg-foreground/5"} transition-colors group/file`}
                  >
                    <div className={`p-2 ${isMine ? "bg-black/10" : "bg-foreground/10"} rounded-lg group-hover/file:bg-foreground/20 transition-colors`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a2 2 0 00-.586-1.414l-5.414-5.414A2 2 0 0011.586 2H7a2 2 0 00-2 2v15a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-bold truncate transition-colors`}>{message.fileName || "Document"}</p>
                      <p className="text-[10px] opacity-70">{((message.fileSize || 0) / 1024).toFixed(1)} KB</p>
                    </div>
                  </a>
                )}
                {message.type === "voice" && message.voiceMessage && (
                  <VoiceMessagePlayer 
                    url={message.voiceMessage.url} 
                    duration={message.voiceMessage.duration} 
                    waveformData={message.voiceMessage.waveformData}
                    isMine={isMine}
                  />
                )}
              </div>

              {message.reactions && message.reactions.length > 0 && (
                <div className={`absolute -bottom-2 ${isMine ? "right-0 translate-x-1/3" : "left-0 -translate-x-1/3"} z-10 flex -space-x-1`}>
                  {Array.from(new Set(message.reactions.map(r => r.emoji))).slice(0, 3).map((emoji, i) => (
                    <div key={i} className="bg-card border border-white/10 rounded-full px-1.5 py-0.5 text-[10px] shadow-lg animate-unread-scale hover:scale-125 transition-transform cursor-pointer">
                      {emoji}
                    </div>
                  ))}
                  {message.reactions.length > 1 && (
                    <div className="bg-card border border-white/10 rounded-full px-1 py-0.5 text-[8px] font-bold text-muted-foreground shadow-lg flex items-center justify-center animate-unread-scale">
                      {message.reactions.length}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative flex items-center gap-1" ref={menuRef}>
                         {onJump && (
                <button
                  onClick={() => onJump(message._id)}
                  title="Jump to Message"
                  className="flex items-center justify-center p-1.5 bg-primary text-primary-foreground rounded-full hover:scale-110 active:scale-95 transition-all shadow-lg animate-pulse"
                >
                  <Target size={16} strokeWidth={2.5} />
                </button>
              )}
              <button
                onClick={() => onReply(message)}
                title="Reply"
                className={`opacity-0 group-hover:opacity-100 transition-all p-1 text-muted-foreground/50 hover:text-foreground rounded-full hover:bg-foreground/10 hover:scale-110 active:scale-95`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 17 4 12 9 7" />
                  <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                </svg>
              </button>
              <button
                onClick={() => setShowReactionPicker(!showReactionPicker)}
                className={`opacity-0 group-hover:opacity-100 transition-all p-1 text-muted-foreground/50 hover:text-foreground rounded-full hover:bg-foreground/10 hover:scale-110 active:scale-95 ${showReactionPicker ? "opacity-100 bg-foreground/10" : ""}`}
              >
                <Smile size={16} />
              </button>
 
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`opacity-0 group-hover:opacity-100 transition-all p-1 text-muted-foreground/50 hover:text-foreground rounded-full hover:bg-foreground/10 hover:scale-110 active:scale-95 ${isMenuOpen ? "opacity-100 bg-foreground/10" : ""}`}
              >
                <MoreHorizontal size={16} />
              </button>

              {isMenuOpen && (
                <div className={`absolute bottom-full mb-2 z-50 bg-card border border-border rounded-xl shadow-2xl p-1 min-w-[150px] animate-modal-in ${isMine ? "left-0" : "right-0"}`}>
                  {message.type === "text" && (
                    <button
                      onClick={handleCopy}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-foreground hover:bg-foreground/5 rounded-lg transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check size={14} className="text-green-500 animate-unread-scale" />
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
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-foreground hover:bg-foreground/5 rounded-lg transition-colors"
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

          {/* ── Reaction Picker (as an extra bubble) ── */}
          {showReactionPicker && (
            <div 
              ref={reactionPickerRef}
              className={`mt-1.5 bg-card/60 backdrop-blur-md border border-white/10 p-1.5 flex items-center gap-1 animate-reaction-in shadow-xl z-20 ${
                isMine 
                  ? "rounded-2xl rounded-tr-none self-end" 
                  : "rounded-2xl rounded-tl-none self-start"
              }`}
            >
              {REACTION_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => reactionMutation.mutate(emoji)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-foreground/10 rounded-full transition-all hover:scale-125 hover:-translate-y-1 text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 mt-1 px-1 animate-fadeIn">
            <span className="text-[10px] text-muted-foreground/70 font-medium">{formatTime(message.createdAt)}</span>
            {isMine && (
              <span 
                className={`text-[11px] font-black transition-all ${isRead ? "brightness-125 scale-110" : "text-muted-foreground/50"}`}
                style={isRead ? { color: "var(--accent-color, #a855f7)" } : {}}
              >
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
