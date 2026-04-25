"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import MessageBubble from "@/components/messages/MessageBubble";
import TypingIndicator from "@/components/messages/TypingIndicator";
import { API } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { useConversation } from "@/hooks/useConversation";
import { Conversation, Message } from "@/types/messages";
import GroupInfoPanel from "@/components/messages/GroupInfoPanel";
import ImagePreviewModal from "@/components/messages/ImagePreviewModal";
import UserInfoPanel from "@/components/messages/UserInfoPanel";
import { Mic, Search, MoreVertical, Paperclip, Send, Smile, ChevronLeft, Phone, Video, Settings, Ban, Shield, X, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import VoiceRecorder from "@/components/messages/VoiceRecorder";
import FilePreviewModal from "@/components/messages/FilePreviewModal";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import CameraModal from "@/components/messages/CameraModal";
import { Camera as CameraIcon } from "lucide-react";

// Dynamic import for Emoji Picker to avoid SSR issues
const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

export default function ConversationPage() {
  const router = useRouter();
  const { conversationId } = useParams() as { conversationId: string };
  const { user: currentUser } = useAuth();
  const socket = useSocket();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isOtherOnline, setIsOtherOnline] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  // Voice Recording Hooks & States
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

  const [isHoldMode, setIsHoldMode] = useState(false);
  const [dragTarget, setDragTarget] = useState<"trash" | "stop" | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewTime, setPreviewTime] = useState(0);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isNearBottomRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);

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
    currentUserId: (currentUser as any)?.id || (currentUser as any)?._id || "",
    socket,
    search: searchTerm
  });

  const isGroup = conversation?.isGroup;
  const otherUser = conversation?.participant;
  
  const currentChatSettings = (currentUser as any)?.chatSettings?.find(
    (s: any) => s.conversationId?.toString() === conversationId
  );

  const accentColor = currentChatSettings?.accentColor || currentUser?.settings?.accentColor || "#a855f7";
  const accentTextColor = accentColor === "#ffffff" ? "#000000" : "#ffffff";
  const effectiveWallpaper = currentChatSettings?.chatWallpaper || currentUser?.settings?.chatWallpaper || "";

  // ── Voice Logic ───────────────────────────────────────────────────────────
  const previewUrlRef = useRef<string | null>(null);

  const handleVoiceSend = async () => {
    if (!recorderBlob) return;
    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("audio", recorderBlob, "voice_message.webm");
      formData.append("duration", recorderDuration.toString());

      const res = await API.uploadVoiceMessage(formData);
      sendMessage("", "voice", undefined, replyingTo ? {
        messageId: replyingTo._id,
        content: replyingTo.content.slice(0, 100),
        senderUsername: replyingTo.sender.username,
      } : undefined, {
        url: res.url,
        duration: res.duration,
        publicId: res.publicId,
        waveformData: recorderWaveform,
      });
      
      handleCancelRecording();
    } catch (err) {
      console.error("Voice upload failed", err);
    } finally {
      setIsUploading(false);
    }
  };

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

  const handleMicPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    holdTimerRef.current = setTimeout(() => {
      setIsHoldMode(true);
      startRecording();
      setIsUserTyping(false);
      emitStopTyping();
    }, 200);
  };

  const handleMicPointerMove = (e: React.PointerEvent) => {
    if (!isHoldMode || recorderState !== "recording") return;
    
    const trashEl = document.getElementById("recorder-trash-target");
    const stopEl = document.getElementById("recorder-stop-target");
    
    if (trashEl && stopEl) {
      const trashRect = trashEl.getBoundingClientRect();
      const stopRect = stopEl.getBoundingClientRect();
      const x = e.clientX;
      const y = e.clientY;

      if (x >= trashRect.left - 30 && x <= trashRect.right + 30 && y >= trashRect.top - 30 && y <= trashRect.bottom + 30) {
        setDragTarget("trash");
      } else if (x >= stopRect.left - 30 && x <= stopRect.right + 30 && y >= stopRect.top - 30 && y <= stopRect.bottom + 30) {
        setDragTarget("stop");
      } else {
        setDragTarget(null);
      }
    }
  };

  const handleMicPointerUp = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (recorderState === "recording") {
      if (dragTarget === "trash") {
        handleCancelRecording();
      } else if (dragTarget === "stop") {
        stopRecording();
        setIsHoldMode(false);
      } else {
        if (isHoldMode) {
          stopRecording();
          setDragTarget("send-pending" as any);
        }
      }
    } else if (recorderState === "idle") {
      startRecording();
      setIsHoldMode(false);
    }
    setDragTarget(null);
  };

  const handleCancelRecording = () => {
    cancelRecording();
    setIsHoldMode(false);
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
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

  useEffect(() => {
    if (recorderState === "stopped" && recorderBlob && (dragTarget as any) === "send-pending") {
      setDragTarget(null);
      handleVoiceSend();
    }
  }, [recorderState, recorderBlob, dragTarget]);

  const handleCameraCapture = (blob: Blob) => {
    const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
    setPendingFiles((prev) => [...prev, file]);
    setIsCameraOpen(false);
  };

  const handleSendFiles = async (files: File[], caption: string) => {
    setIsUploading(true);
    setPendingFiles([]); // Close modal immediately
    
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await API.uploadFile(formData);
        const type = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "file";
        
        // Send caption with the first file only, or all files? Usually first file or last file. 
        // Let's send the caption with the last file.
        const isLast = file === files[files.length - 1];
        sendMessage(isLast ? caption : "", type as any, { fileUrl: res.fileUrl, fileName: res.fileName, fileSize: res.fileSize });
      }
    } catch (err) {
      console.error("Files upload failed", err);
    } finally {
      setIsUploading(false);
    }
  };

  // ── Intersection Observer for Infinite Scroll ────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    if (topSentinelRef.current) {
      observer.observe(topSentinelRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  // ── Existing Effects ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser || !conversationId) return;
    API.getConversation(conversationId).then(setConversation).catch(err => {
      if (err.response?.status === 404) router.push("/messages");
    });
  }, [currentUser, conversationId, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (!isUserTyping) { setIsUserTyping(true); emitTyping(); }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => { setIsUserTyping(false); emitStopTyping(); }, 1500);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(inputValue.trim(), "text", undefined, replyingTo ? { messageId: replyingTo._id, content: replyingTo.content.slice(0, 100), senderUsername: replyingTo.sender.username } : undefined);
    setInputValue("");
    setReplyingTo(null);
  };

  const chatMedia = messages
    .filter(m => (m.type === "image" || m.type === "video") && m.fileUrl)
    .map(m => ({
      url: m.fileUrl!,
      type: m.type,
      sender: m.sender.username,
      date: new Date(m.createdAt).toLocaleString(),
      messageId: m._id
    }))
    .reverse(); 

  const handleMediaClick = (messageId: string) => {
    const index = chatMedia.findIndex(img => img.messageId === messageId);
    if (index !== -1) setPreviewImageIndex(index);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleScrollToMessage = (messageId: string) => {
    if (isSearching) {
      setIsSearching(false);
      setSearchTerm("");
      // Wait for the query to reset and messages to load
      setTimeout(() => {
        const el = document.getElementById(`msg-${messageId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          setHighlightedMessageId(messageId);
          setTimeout(() => setHighlightedMessageId(null), 2000);
        }
      }, 500);
      return;
    }

    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setPendingFiles((prev) => [...prev, ...files]);
    // Reset input so the same files can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const isNearBottom = Math.abs(el.scrollTop) < 100;
    isNearBottomRef.current = isNearBottom;
    setShowScrollToBottom(!isNearBottom);
  };

  const onEmojiClick = (emojiData: any) => {
    setInputValue(prev => prev + emojiData.emoji);
  };

  const displayName = isGroup ? conversation?.groupName : otherUser?.username;
  const displayPhoto = isGroup ? (conversation?.groupPhoto || "/user_profile.jpg") : (otherUser?.user_pic || "/user_profile.jpg");

  return (
    <main className="flex flex-col w-full h-full bg-background relative overflow-hidden" style={{ "--accent-color": accentColor, "--accent-text-color": accentTextColor } as any}>
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-4 px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm z-10">
        {isSearching ? (
          <div className="flex-1 flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
            <Search size={18} className="text-primary" />
            <input 
              autoFocus
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search in chat..."
              className="flex-1 bg-transparent border-none focus:outline-none text-sm text-foreground"
            />
            <button 
              onClick={() => {
                setIsSearching(false);
                setSearchTerm("");
              }}
              className="p-2 hover:bg-foreground/5 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        ) : (
          <>
            <button onClick={() => router.push("/messages")} className="md:hidden text-muted-foreground hover:text-foreground p-2 rounded-lg"><ChevronLeft /></button>
            <div className="flex-1 flex items-center gap-3 min-w-0">
              <div className="relative">
                <img 
                  src={displayPhoto} 
                  alt={displayName || ""} 
                  className="h-9 w-9 rounded-full object-cover border border-border"
                />
                {isOtherOnline && (
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-foreground truncate">{displayName ?? "..."}</p>
                <p className="text-[10px] text-muted-foreground">{isOtherOnline ? "Online" : "Offline"}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button 
                onClick={() => setIsSearching(true)}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-foreground/5"
              >
                <Search size={20} />
              </button>
              <button onClick={() => isGroup ? setIsGroupInfoOpen(true) : setIsUserInfoOpen(true)} className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-foreground/5"><MoreVertical size={20} /></button>
            </div>
          </>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {effectiveWallpaper && <div className="absolute inset-0 pointer-events-none opacity-40" style={{ backgroundImage: `url(${effectiveWallpaper})`, backgroundSize: 'cover' }} />}
        <div 
          ref={scrollContainerRef} 
          className="flex-1 overflow-y-auto px-4 py-3 flex flex-col-reverse relative z-10 scrollbar-hide" 
          onScroll={handleScroll}
        >
          <div className="flex flex-col-reverse">
            <div ref={messagesEndRef} />
            {isTyping && <div className="mb-2"><TypingIndicator username={typingUsername} /></div>}
            {messages.slice().reverse().map((msg) => (
              <MessageBubble 
                key={msg._id} 
                message={msg} 
                currentUserId={(currentUser as any)?.id || ""} 
                isGroup={isGroup} 
                onReply={setReplyingTo}
                onScrollToMessage={handleScrollToMessage}
                isHighlighted={highlightedMessageId === msg._id}
                onImageClick={handleMediaClick}
                onJump={isSearching ? handleScrollToMessage : undefined}
              />
            ))}
            <div ref={topSentinelRef} className="h-px" />
          </div>
        </div>
      </div>

      {/* Input Bar */}
      <div className="flex-shrink-0 border-t border-border bg-card px-4 py-4 z-10 flex flex-col gap-2">
        {replyingTo && (
          <div className="bg-primary/5 border-l-4 border-primary p-2 rounded flex items-center justify-between animate-in slide-in-from-bottom-2">
            <div className="min-w-0"><p className="text-[10px] font-bold text-primary">Replying to {replyingTo.sender.username}</p><p className="text-xs text-muted-foreground truncate">{replyingTo.content || "Voice Message"}</p></div>
            <button onClick={() => setReplyingTo(null)}><X size={14} /></button>
          </div>
        )}

        <div className="flex items-end gap-3">
          {/* Column 1: Left (Emoji/Attachment) */}
          <div className="flex gap-1 mb-1">
            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-2.5 rounded-xl transition-all ${showEmojiPicker ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}><Smile size={22} /></button>
            <button onClick={() => setIsCameraOpen(true)} className="p-2.5 text-muted-foreground hover:text-foreground"><CameraIcon size={20} /></button>
            <button onClick={() => fileInputRef.current?.click()} className="p-2.5 text-muted-foreground hover:text-foreground"><Paperclip size={20} /></button>
            <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          </div>

          {/* Column 2: Center (Input / Recorder) */}
          <div className="flex-1 relative min-h-[44px] bg-background border border-border rounded-2xl overflow-hidden flex items-center shadow-inner">
            {recorderState !== "idle" ? (
              <VoiceRecorder 
                state={recorderState}
                duration={recorderDuration}
                waveformData={recorderWaveform}
                isPlayingPreview={isPlayingPreview}
                previewTime={previewTime}
                onTogglePreview={handleTogglePreview}
                onStop={stopRecording}
                onCancel={handleCancelRecording}
                dragTarget={dragTarget}
              />
            ) : (
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                rows={1}
                dir="auto"
                className="w-full resize-none bg-transparent px-4 py-3 text-sm text-foreground focus:outline-none max-h-32"
              />
            )}
          </div>

          {/* Column 3: Right (Mic / Send) */}
          <div className="flex-shrink-0 mb-1">
            {(inputValue.trim() && recorderState === "idle") || (recorderState === "recording" && !isHoldMode) || recorderState === "stopped" ? (
              <button 
                onClick={() => {
                  if (recorderState === "recording") {
                    stopRecording();
                    setDragTarget("send-pending" as any);
                  } else if (recorderState === "stopped") {
                    handleVoiceSend();
                  } else {
                    handleSend();
                  }
                }}
                disabled={isUploading}
                className="w-11 h-11 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
                style={{ backgroundColor: accentColor }}
              >
                {isUploading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send size={18} fill="currentColor" className={recorderState === "idle" ? "ml-1" : ""} />
                )}
              </button>
            ) : (
              <button 
                onPointerDown={handleMicPointerDown}
                onPointerMove={handleMicPointerMove}
                onPointerUp={handleMicPointerUp}
                className={`w-11 h-11 flex items-center justify-center rounded-full transition-all touch-none relative z-50 ${
                  recorderState === "recording"
                    ? "bg-destructive text-white shadow-[0_0_20px_rgba(239,68,68,0.6)] animate-pulse scale-125" 
                    : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                }`}
              >
                <Mic size={22} fill={recorderState === "recording" ? "currentColor" : "none"} />
              </button>
            )}
          </div>
        </div>
      </div>

      {showEmojiPicker && <div className="fixed inset-0 z-[90]" onClick={() => setShowEmojiPicker(false)} />}
      {showEmojiPicker && <div className="absolute bottom-24 left-4 z-[100] shadow-2xl"><EmojiPicker onEmojiClick={onEmojiClick} theme={"dark" as any} /></div>}

      {/* Panels & Modals */}
      {isGroupInfoOpen && <GroupInfoPanel conversation={conversation!} currentUserId={(currentUser as any)?.id || ""} onClose={() => setIsGroupInfoOpen(false)} onUpdateConversation={setConversation} />}
      {isUserInfoOpen && <UserInfoPanel user={otherUser!} currentUserId={(currentUser as any)?.id || ""} onClose={() => setIsUserInfoOpen(false)} conversationId={conversationId} />}
      
      {previewImageIndex !== null && (
        <ImagePreviewModal 
          images={chatMedia}
          initialIndex={previewImageIndex}
          onClose={() => setPreviewImageIndex(null)}
          onJumpToMessage={handleScrollToMessage}
        />
      )}
      
      <CameraModal 
        isOpen={isCameraOpen} 
        onClose={() => setIsCameraOpen(false)} 
        onCapture={handleCameraCapture} 
      />

      <FilePreviewModal
        files={pendingFiles}
        onClose={() => setPendingFiles([])}
        onSend={handleSendFiles}
        onRemoveFile={(idx) => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))}
        onAddMore={() => fileInputRef.current?.click()}
      />
    </main>
  );
}
