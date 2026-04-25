"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, UserPlus, Eye, MessageSquare, Trash2, CheckCheck, Loader2, Heart, Settings } from "lucide-react";
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

function notifText(type: NotificationType, username: string, preview?: string, reaction?: string): string {
  switch (type) {
    case "follow":          return `${username} started following you`;
    case "story_view":      return `${username} viewed your story`;
    case "story_reply":     return `${username} replied to your story: "${preview || ""}"`;
    case "story_reaction":  return `${username} reacted ${reaction ?? ""} to your story`;
  }
}

function notifIcon(type: NotificationType, reaction?: string) {
  switch (type) {
    case "follow":          return <UserPlus size={18} className="text-primary" />;
    case "story_view":      return <Eye size={18} className="text-purple-400" />;
    case "story_reply":     return <MessageSquare size={18} className="text-sky-400" />;
    case "story_reaction":  return <span className="text-base leading-none">{reaction ?? "❤️"}</span>;
  }
}

function notifBg(type: NotificationType): string {
  switch (type) {
    case "follow":          return "bg-primary/10";
    case "story_view":      return "bg-purple-500/10";
    case "story_reply":     return "bg-sky-500/10";
    case "story_reaction":  return "bg-pink-500/10";
  }
}

type TabId = "all" | "follows" | "views" | "replies" | "reactions";

interface Tab {
  id: TabId;
  label: string;
  types: NotificationType[] | null;
  icon: any;
}

const TABS: Tab[] = [
  { id: "all", label: "All", types: null, icon: Bell },
  { id: "follows", label: "Follows", types: ["follow"], icon: UserPlus },
  { id: "views", label: "Views", types: ["story_view"], icon: Eye },
  { id: "replies", label: "Replies", types: ["story_reply"], icon: MessageSquare },
  { id: "reactions", label: "Reactions", types: ["story_reaction"], icon: Heart },
];



export default function NotificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("all");

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

  const currentTab = TABS.find(t => t.id === activeTab)!;
  
  const filteredNotifications = currentTab.types 
    ? notifications.filter(n => currentTab.types!.includes(n.type))
    : notifications;

  const tabUnreadCount = currentTab.types
    ? notifications.filter(n => currentTab.types!.includes(n.type) && !n.read).length
    : unreadCount;

  const handleClick = async (notif: Notification) => {
    if (!notif.read) await markOneRead(notif._id);
    if (notif.type === "story_reply" && notif.conversationId) {
      router.push(`/messages/${notif.conversationId}`);
    } else if (notif.type === "follow") {
      router.push(`/profile/${notif.sender._id}`);
    }
  };

  const handleMarkTabRead = () => {
    markAllRead(currentTab.types as string[] | undefined);
  };

  return (
    <div className="h-full overflow-y-auto bg-background/50 backdrop-blur-sm">
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6 pb-32">
        {/* Header */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <Bell size={22} />
              </div>
              <h1 className="text-xl font-bold text-foreground">Notifications</h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 bg-primary text-primary-foreground text-[10px] font-black rounded-full shadow-lg shadow-primary/30 animate-unread-scale">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead()}
                  className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-foreground transition-all bg-primary/5 hover:bg-primary px-3 py-2 rounded-xl border border-primary/20"
                >
                  <CheckCheck size={14} />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => router.push("/profile/notifications")}
                className="p-2 bg-foreground/5 hover:bg-foreground/10 text-muted-foreground hover:text-foreground rounded-xl border border-border transition-all"
                title="Notification Settings"
              >
                <Settings size={18} />
              </button>
            </div>
          </div>

          {/* Smart Tabs Container */}
          <div className="flex p-1 bg-card rounded-2xl border border-border w-full shadow-inner">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const count = tab.types 
                ? notifications.filter(n => tab.types!.includes(n.type) && !n.read).length
                : unreadCount;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all duration-300 ${
                    isActive
                      ? "text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-primary rounded-xl shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)] animate-modal-in" />
                  )}
                  <Icon className={`relative z-10 w-4 h-4 ${isActive ? "scale-110" : ""}`} />
                  <span className="relative z-10 hidden xs:inline-block">{tab.label}</span>
                  
                  {count > 0 && (
                    <span className={`relative z-10 flex items-center justify-center min-w-[16px] h-[16px] rounded-full text-[9px] font-black shadow-sm ${
                      isActive ? "bg-background text-primary" : "bg-primary text-primary-foreground"
                    }`}>
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Actions Area */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-1 h-3 bg-primary/40 rounded-full" />
            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">{currentTab.label}</h2>
          </div>
          {tabUnreadCount > 0 && activeTab !== 'all' && (
             <button
                onClick={handleMarkTabRead}
                className="text-[11px] font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/5 hover:bg-primary/10 border border-primary/10"
             >
                <CheckCheck size={12} />
                Mark {currentTab.label} as read
             </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center animate-page-in">
            <div className="p-6 bg-foreground/5 rounded-full text-muted-foreground">
              <currentTab.icon size={48} />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">No {currentTab.label.toLowerCase()} notifications</p>
              <p className="text-sm text-muted-foreground mt-1">
                You're all caught up with this category!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notif, index) => (
              <div
                key={notif._id}
                className={`relative flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer group animate-page-in stagger-item stagger-delay-${Math.min(index + 1, 5)} ${
                  notif.read
                    ? "bg-card border-border hover:bg-muted/50"
                    : "bg-card border-primary/20 hover:bg-card/90"
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
                    className="w-12 h-12 rounded-full object-cover border border-border"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/profile/${notif.sender._id}`);
                    }}
                  />
                  <div className={`absolute -bottom-1 -right-1 p-1 rounded-full ${notifBg(notif.type)} border border-background shadow-sm`}>
                    {notifIcon(notif.type, notif.reaction)}
                  </div>
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${notif.read ? "text-muted-foreground" : "text-foreground font-medium"}`}>
                    <span className="font-bold text-foreground mr-1">{notif.sender.username}</span>
                    {notifText(notif.type, "", notif.messagePreview, notif.reaction)}
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

            {hasMore && activeTab === 'all' && (
              <button
                onClick={() => loadMore()}
                className="w-full py-4 text-sm font-bold text-primary hover:text-primary-foreground hover:bg-primary rounded-2xl transition-all border border-primary/10 mt-4"
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
