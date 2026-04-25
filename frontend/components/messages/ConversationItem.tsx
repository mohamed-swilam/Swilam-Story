import { Conversation } from "@/types/messages";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { Trash2 } from "lucide-react";

interface Props {
  conversation: Conversation;
  isOnline: boolean;
  currentUserId?: string;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function ConversationItem({ conversation, isOnline, currentUserId }: Props) {
  const router = useRouter();
  const { participant, lastMessage, unreadCount, updatedAt, isGroup, groupName, groupPhoto } = conversation;

  const displayName = isGroup ? groupName : participant?.username;
  const displayPhoto = isGroup ? (groupPhoto || "/user_profile.jpg") : (participant?.user_pic || "/user_profile.jpg");

  const senderId = typeof lastMessage?.sender === 'object' ? lastMessage.sender._id : lastMessage?.sender;
  const isMine = senderId?.toString() === currentUserId?.toString();
  const isRead = lastMessage?.readBy?.some(id => id.toString() !== currentUserId?.toString());

  return (
    <button
      onClick={() => router.push(`/messages/${conversation._id}`)}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-foreground/5 transition-all duration-200 border-b border-border group"
    >
      {/* Avatar + online dot */}
      <div className="relative flex-shrink-0">
        <img
          src={displayPhoto}
          alt={displayName}
          className="w-12 h-12 rounded-full object-cover ring-2 ring-transparent group-hover:ring-primary transition-all shadow-md"
        />
        {isOnline && !isGroup && (
          <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-online-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
            {displayName}
          </span>
          <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0 font-medium uppercase tracking-tight">
            {updatedAt ? formatTime(updatedAt) : ""}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          {conversation.isTyping ? (
            <p className="text-sm text-primary font-bold animate-pulse truncate">
              {isGroup ? `${conversation.typingUsername} is typing...` : "Typing..."}
            </p>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              {lastMessage && isMine && (
                <span className={`text-[10px] font-black flex-shrink-0 ${isRead ? "text-primary brightness-125" : "text-muted-foreground/40"}`}>
                  {isRead ? "✓" : "✓"}
                </span>
              )}
              <p className="text-sm text-muted-foreground truncate font-medium">
                {lastMessage ? (
                    lastMessage.type === "image"  ? "📷 Photo" :
                    lastMessage.type === "video"  ? "🎬 Video" :
                    lastMessage.type === "voice"  ? "🎤 Voice message" :
                    lastMessage.type === "file"   ? "📁 File" :
                    lastMessage.content
                  ) : "Start a conversation"}
              </p>
            </div>
          )}
          {unreadCount > 0 && (
            <span className="ml-2 flex-shrink-0 bg-primary text-primary-foreground text-[10px] rounded-full min-w-[1.25rem] h-5 px-1 flex items-center justify-center font-bold shadow-[0_0_10px_rgba(var(--primary-rgb),0.4)] animate-unread-scale">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
