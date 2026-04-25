"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import MessageBubble from "@/components/messages/MessageBubble";
import TypingIndicator from "@/components/messages/TypingIndicator";
import { API } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { useConversation } from "@/hooks/useConversation";
import { Conversation } from "@/types/messages";
import GroupInfoPanel from "@/components/messages/GroupInfoPanel";
import ImagePreviewModal from "@/components/messages/ImagePreviewModal";
import UserInfoPanel from "@/components/messages/UserInfoPanel";
import { Shield, Ban, Smile } from "lucide-react";

// Dynamic import for Emoji Picker to avoid SSR issues
const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

interface CurrentUser {
  id: string;
  username: string;
  user_pic: string;
  settings?: {
    fontSize?: "small" | "medium" | "large";
    accentColor?: string;
    chatWallpaper?: string;
  };
}

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const router = useRouter();
  const socket = useSocket();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isOtherOnline, setIsOtherOnline] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const onEmojiClick = (emojiData: { emoji: string }) => {
    setInputValue(prev => prev + emojiData.emoji);
    if (!isUserTyping) {
      setIsUserTyping(true);
      emitTyping();
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsUserTyping(false);
      emitStopTyping();
    }, 2000);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isNearBottomRef = useRef(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    hasMore,
    loadingMore,
    isTyping,
    typingUsername,
    loadMore,
    sendMessage,
    emitTyping,
    emitStopTyping,
  } = useConversation({
    conversationId,
    currentUserId: currentUser?.id ?? "",
    socket,
  });

  // ── Fetch current user ──────────────────────────────────────────────────────
  useEffect(() => {
    API.authTest()
      .then((data) => setCurrentUser(data.user))
      .catch(console.error);
  }, []);

  // ── Fetch conversation info ─────────────────────────────
  useEffect(() => {
    if (!currentUser || !conversationId) return;
    
    API.getConversation(conversationId)
      .then((conv) => {
        setConversation(conv);
        // Check initial online status for DMs
        if (!conv.isGroup && conv.participant) {
          API.getOnlineStatus([conv.participant._id]).then((status) => {
            setIsOtherOnline(status[conv.participant!._id] ?? false);
          });
        }
      })
      .catch((err) => {
        console.error("Failed to fetch conversation:", err);
        // If not found or unauthorized, redirect back
        if (err.response?.status === 404 || err.response?.status === 401) {
          router.push("/messages");
        }
      });
  }, [currentUser, conversationId, router]);

  // ── Socket: online status ───────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !conversation || conversation.isGroup) return;

    const onOnline = ({ userId }: { userId: string }) => {
      if (userId === conversation.participant?._id) setIsOtherOnline(true);
    };
    const onOffline = ({ userId }: { userId: string }) => {
      if (userId === conversation.participant?._id) setIsOtherOnline(false);
    };

    const onPrivacyUpdate = ({ userId: updatedUserId, isPrivate }: { userId: string, isPrivate: boolean }) => {
      setConversation(prev => {
        if (prev && !prev.isGroup && prev.participant?._id === updatedUserId) {
          return {
            ...prev,
            participant: { ...prev.participant, isPrivate }
          };
        }
        return prev;
      });
    };

    const onBlockUpdate = (data: { targetUserId?: string, blockerId?: string, blocked: boolean }) => {
      setConversation(prev => {
        if (!prev || prev.isGroup) return prev;
        if (prev.participant?._id === data.targetUserId || prev.participant?._id === data.blockerId) {
          return {
            ...prev,
            participant: { 
              ...prev.participant, 
              // If I am the target, then amIBlocked changes. If I am the blocker, then isBlocked changes.
              ...(data.targetUserId === prev.participant?._id ? { isBlocked: data.blocked } : { amIBlocked: data.blocked })
            }
          };
        }
        return prev;
      });
    };

    socket.on("user_online", onOnline);
    socket.on("user_offline", onOffline);
    socket.on("privacy_update", onPrivacyUpdate);
    socket.on("block_update", onBlockUpdate);

    return () => {
      socket.off("user_online", onOnline);
      socket.off("user_offline", onOffline);
      socket.off("privacy_update", onPrivacyUpdate);
      socket.off("block_update", onBlockUpdate);
    };
  }, [socket, conversation]);

  // ── Auto-scroll to bottom ──────────────────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0 && scrollContainerRef.current) {
      if (isNearBottomRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [messages]);

  // ── Infinite scroll upward via IntersectionObserver ────────────────────────
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  // ── Track if user is near bottom ───────────────────────────────────────────
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    isNearBottomRef.current = Math.abs(el.scrollTop) < 100;
  }, []);

  // ── Typing logic ───────────────────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);

    if (!isUserTyping) {
      setIsUserTyping(true);
      emitTyping();
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsUserTyping(false);
      emitStopTyping();
    }, 1500);
  };

  // ── Send message ───────────────────────────────────────────────────────────
  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue.trim());
    setInputValue("");
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsUserTyping(false);
    emitStopTyping();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await API.uploadFile(formData);
      const type = file.type.startsWith("image/") ? "image" : (file.type.startsWith("audio/") ? "voice" : "file");
      sendMessage("", type, { fileUrl: res.fileUrl, fileName: res.fileName, fileSize: res.fileSize });
    } catch (err) {
      console.error(err);
      alert("Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isGroup = conversation?.isGroup;
  const displayName = isGroup ? conversation.groupName : conversation?.participant?.username;
  const displayPhoto = isGroup ? (conversation.groupPhoto || "/user_profile.jpg") : (conversation?.participant?.user_pic || "/user_profile.jpg");

  // Dynamic Styles
  const fontSizeClass = currentUser?.settings?.fontSize === "small" ? "text-xs" : currentUser?.settings?.fontSize === "large" ? "text-lg" : "text-sm";
  const accentColor = currentUser?.settings?.accentColor || "#a855f7";

  return (
    <main 
      className={`flex flex-col w-full h-full bg-background relative overflow-hidden ${fontSizeClass}`}
      style={{ "--accent-color": accentColor } as any}
    >
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-4 px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm z-10">
        <button
          onClick={() => router.push("/messages")}
          className="md:hidden text-muted-foreground hover:text-white transition-colors p-2 -ml-2 rounded-lg hover:bg-white/5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>

        {conversation && (
          <div className="relative">
            <img
              src={displayPhoto}
              alt={displayName || ""}
              className="w-9 h-9 rounded-full object-cover"
            />
            {isOtherOnline && !isGroup && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="font-bold text-base text-white truncate">{displayName ?? "..."}</p>
          <p className="text-xs text-muted-foreground">
            {isGroup ? `${conversation?.participants?.length || 0} members` : (isOtherOnline ? <span className="text-primary font-medium">Online</span> : "Offline")}
          </p>
        </div>

        {isGroup ? (
          <button
            onClick={() => setIsGroupInfoOpen(true)}
            className="p-2 text-muted-foreground hover:text-white transition-colors rounded-full hover:bg-white/5"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        ) : (
          <button
            onClick={() => setIsUserInfoOpen(true)}
            className="p-2 text-muted-foreground hover:text-white transition-colors rounded-full hover:bg-white/5"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}
      </header>

      {/* Messages area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-3 flex flex-col-reverse relative"
        onScroll={handleScroll}
        style={{
          backgroundImage: currentUser?.settings?.chatWallpaper ? `url(${currentUser.settings.chatWallpaper})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Wallpaper Overlay for readability if wallpaper exists */}
        {currentUser?.settings?.chatWallpaper && <div className="absolute inset-0 bg-black/40 pointer-events-none" />}

        <div className="relative z-0 flex flex-col-reverse">
          <div ref={messagesEndRef} />

          {isTyping && <div className="mb-2"><TypingIndicator username={typingUsername} /></div>}

          {messages.slice().reverse().map((msg, idx, arr) => (
            <MessageBubble
              key={msg._id}
              message={msg}
              currentUserId={currentUser?.id ?? ""}
              nextMessage={arr[idx - 1]}
              isGroup={isGroup}
              onImageClick={setPreviewImage}
            />
          ))}

          {loadingMore && (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {/* Top sentinel for infinite scroll */}
          <div ref={topSentinelRef} className="h-1" />
        </div>
      </div>

      {/* Input area */}
      {!isGroup && (conversation?.participant?.isBlocked || conversation?.participant?.amIBlocked || (conversation?.participant?.isPrivate && !conversation.participant.followsMe)) ? (
        <div className="flex-shrink-0 border-t border-border bg-card/80 backdrop-blur-md px-6 py-8 flex flex-col items-center gap-3 z-10 animate-fadeIn">
          <div className={`p-3 rounded-full ring-4 ${conversation.participant.isBlocked || conversation.participant.amIBlocked ? 'bg-destructive/10 text-destructive ring-destructive/5' : 'bg-primary/10 text-primary ring-primary/5'}`}>
            {conversation.participant.isBlocked || conversation.participant.amIBlocked ? <Ban size={24} /> : <Shield size={24} />}
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-white">
              {conversation.participant.isBlocked ? "You have blocked this user" : conversation.participant.amIBlocked ? "You cannot message this user" : "This Account is Private"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 max-w-[250px]">
              {conversation.participant.isBlocked ? "Unblock them from their profile to resume chat." : conversation.participant.amIBlocked ? "This user has restricted their communication." : "You can only message this user if they follow you back."}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 border-t border-border bg-card px-4 py-4 flex items-end gap-3 z-10">
          <div className="flex gap-1">
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="p-3 text-muted-foreground hover:text-white hover:bg-white/5 rounded-xl transition-all"
            >
              {isUploading ? <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              )}
            </button>
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            
            <div className="relative">
              <button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-3 rounded-xl transition-all ${showEmojiPicker ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white hover:bg-white/5"}`}
              >
                <Smile size={22} />
              </button>
              
              {showEmojiPicker && (
                <div className="absolute bottom-full left-0 mb-4 z-[100] shadow-2xl">
                  <div className="fixed inset-0" onClick={() => setShowEmojiPicker(false)} />
                  <div className="relative">
                    <EmojiPicker 
                      onEmojiClick={onEmojiClick} 
                      autoFocusSearch={false}
                      theme={"dark" as any}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              rows={1}
              dir="auto"
              maxLength={1000}
              className="w-full resize-none rounded-2xl border border-border bg-background px-5 py-3 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all max-h-32 overflow-auto shadow-sm text-start"
            />
            {inputValue.length >= 950 && (
              <span className="absolute -top-4 right-2 text-[10px] font-bold text-destructive">
                {inputValue.length}/1000
              </span>
            )}
          </div>
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="flex-shrink-0 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center disabled:opacity-40 hover:bg-primary/80 transition-colors shadow-lg shadow-primary/20"
            style={{ backgroundColor: accentColor }}
          >
            <svg className="w-5 h-5 rotate-90 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9-2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      )}

      {isGroupInfoOpen && conversation && (
        <GroupInfoPanel
          conversation={conversation}
          currentUserId={currentUser?.id ?? ""}
          onClose={() => setIsGroupInfoOpen(false)}
          onUpdateConversation={setConversation}
        />
      )}

      {previewImage && (
        <ImagePreviewModal 
          imageUrl={previewImage} 
          onClose={() => setPreviewImage(null)} 
        />
      )}

      {isUserInfoOpen && conversation?.participant && (
        <UserInfoPanel
          user={conversation.participant}
          currentUserId={currentUser?.id ?? ""}
          onClose={() => setIsUserInfoOpen(false)}
          conversationId={conversationId}
        />
      )}
    </main>
  );
}
