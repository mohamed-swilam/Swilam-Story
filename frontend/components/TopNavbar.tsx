"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, LayoutDashboard, Search, User, Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { API } from "@/lib/api";
import { useNotifications } from "@/hooks/useNotifications";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useHasNewStories } from "@/hooks/useHasNewStories";

import { useAuth } from "@/hooks/useAuth";

export default function TopNavbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const { unreadMessagesCount } = useUnreadMessages();
  const { hasNewStories } = useHasNewStories();

  const navLinks = [
    { name: "Chats", href: "/messages", icon: MessageSquare },
    { name: "Stories", href: "/stories/feed", icon: LayoutDashboard },
    { name: "Explore", href: "/explore", icon: Search },
  ];

  return (
    <nav className="fixed top-0 inset-x-0 h-16 bg-background/80 backdrop-blur-md border-b border-border z-50 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 flex items-center justify-center">
          <img src="/logo.png" alt="MowaChat" className="w-full h-full object-contain" />
        </div>
      </div>

      <div className="flex items-center gap-6">
        {navLinks.map((link) => {
          const isActive = pathname?.startsWith(
            link.href.split("/")[1] ? `/${link.href.split("/")[1]}` : link.href
          );
          const Icon = link.icon;
          const isChats = link.name === "Chats";
          const isAlerts = link.name === "Alerts";
          const isStories = link.name === "Stories";

          return (
            <Link
              key={link.name}
              href={link.href}
              className={`relative flex items-center gap-2 text-sm font-medium transition-all duration-200 hover:text-primary ${isActive
                ? "text-primary drop-shadow-[0_0_8px_var(--color-primary)]"
                : "text-muted-foreground"
                }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                {isChats && unreadMessagesCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[16px] h-4 flex items-center justify-center bg-destructive text-white text-[9px] font-black rounded-full px-1 shadow-lg shadow-destructive/40 animate-unread-scale">
                    {unreadMessagesCount > 99 ? "99+" : unreadMessagesCount}
                  </span>
                )}
                {isStories && hasNewStories && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full shadow-lg shadow-primary/40 animate-unread-scale" />
                )}
              </div>
              <span className="hidden md:inline">{link.name}</span>
              {isActive && (
                <div className="absolute -bottom-[21px] left-0 right-0 h-0.5 bg-primary rounded-t-full shadow-[0_0_8px_var(--color-primary)] tab-indicator" />
              )}
            </Link>
          );
        })}

      </div>
      <div className="flex items-center gap-6">
        <Link
          href="/notifications"
          className={`relative flex items-center gap-2 text-sm font-medium transition-all duration-200 hover:text-primary ${pathname === '/notifications'
            ? "text-primary drop-shadow-[0_0_8px_var(--color-primary)]"
            : "text-muted-foreground"
            }`}
        >
          <div className="relative">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-[16px] h-4 flex items-center justify-center bg-destructive text-white text-[9px] font-black rounded-full px-1 shadow-lg shadow-destructive/40 animate-unread-scale">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
        </Link>
        <Link
          href="/profile"
          className={`relative flex items-center gap-2 text-sm font-medium transition-all duration-200 hover:text-primary text-primary drop-shadow-[0_0_8px_var(--color-primary)]`}
        >
          <div className="relative">
            {user?.user_pic ? (
              <img
                src={user.user_pic}
                alt="Profile"
                className="w-10 h-10 rounded-full object-cover border border-border"
              />
            ) : (
              <User className="w-5 h-5" />
            )}
          </div>
        </Link>
      </div>
    </nav>
  );
}
