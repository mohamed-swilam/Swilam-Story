"use client";

import { useRouter } from "next/navigation";
import { Bell, UserPlus, Eye, MessageSquare, Trash2, CheckCheck, Loader2 } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import type { Notification, NotificationType } from "@/types/notifications";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function notifText(type: NotificationType, username: string, preview?: string): string {
  switch (type) {
    case "follow":     return `${username} started following you`;
    case "story_view": return `${username} viewed your story`;
    case "story_reply": return `${username} replied to your story: "${preview || ""}"`;
  }
}

function notifIcon(type: NotificationType) {
  switch (type) {
    case "follow":     return <UserPlus size={18} className="text-primary" />;
    case "story_view": return <Eye size={18} className="text-purple-400" />;
    case "story_reply": return <MessageSquare size={18} className="text-sky-400" />;
  }
}

function notifBg(type: NotificationType): string {
  switch (type) {
    case "follow":     return "bg-primary/10";
    case "story_view": return "bg-purple-500/10";
    case "story_reply": return "bg-sky-500/10";
  }
}

export default function NotificationsPage() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    hasMore,
    loading,
    markAllRead,
    markOneRead,
    deleteNotification,
    loadMore,
  } = useNotifications();

  const handleClick = async (notif: Notification) => {
    if (!notif.read) await markOneRead(notif._id);
    if (notif.type === "story_reply" && notif.conversationId) {
      router.push(`/messages/${notif.conversationId}`);
    } else if (notif.type === "follow") {
      router.push(`/profile/${notif.sender._id}`);
    }
    // story_view: stay on page
  };

  return (
    <div className="h-full overflow-y-auto bg-background/50 backdrop-blur-sm">
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <Bell size={22} />
            </div>
            <h1 className="text-xl font-bold text-white">Notifications</h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 bg-primary text-white text-xs font-black rounded-full shadow-lg shadow-primary/30">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors px-3 py-2 rounded-xl hover:bg-primary/10"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="p-6 bg-white/5 rounded-full text-muted-foreground">
              <Bell size={48} />
            </div>
            <div>
              <p className="text-lg font-bold text-white">No notifications yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                When someone follows you, messages you, or views your story — it'll show up here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => (
              <div
                key={notif._id}
                className={`relative flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer group ${
                  notif.read
                    ? "bg-card/40 border-white/5 hover:bg-card/60"
                    : "bg-card/70 border-primary/20 hover:bg-card/90"
                }`}
                onClick={() => handleClick(notif)}
              >
                {/* Unread indicator */}
                {!notif.read && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                )}

                {/* Sender avatar + type icon */}
                <div className="relative flex-shrink-0">
                  <img
                    src={notif.sender.user_pic || "/user_profile.jpg"}
                    alt={notif.sender.username}
                    className="w-12 h-12 rounded-full object-cover border border-white/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/profile/${notif.sender._id}`);
                    }}
                  />
                  <div className={`absolute -bottom-1 -right-1 p-1 rounded-full ${notifBg(notif.type)} border border-background`}>
                    {notifIcon(notif.type)}
                  </div>
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${notif.read ? "text-muted-foreground" : "text-white font-medium"}`}>
                    {notifText(notif.type, notif.sender.username, notif.messagePreview)}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">{timeAgo(notif.createdAt)}</p>
                </div>

                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notif._id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}

            {hasMore && (
              <button
                onClick={loadMore}
                className="w-full py-4 text-sm font-bold text-primary hover:text-primary/80 hover:bg-primary/5 rounded-2xl transition-all border border-primary/10"
              >
                Load more
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
