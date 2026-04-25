"use client";

import { useEffect, useState } from "react";
import { API } from "@/lib/api";
import { Conversation } from "@/types/messages";
import { useSocket } from "@/hooks/useSocket";
import ConversationItem from "@/components/messages/ConversationItem";
import CreateGroupModal from "@/components/messages/CreateGroupModal";

import { usePathname } from "next/navigation";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queryKeys";

export default function ChatSidebar() {
  const pathname = usePathname();
  const socket = useSocket();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  
  const [onlineStatus, setOnlineStatus] = useState<Record<string, boolean>>({});
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  const { data: conversations = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.chats,
    queryFn: API.getConversations,
    enabled: !!currentUser,
    staleTime: 30 * 1000,
  });

  // Batch-check online status when conversations load
  useEffect(() => {
    if (conversations.length > 0) {
      const ids = conversations
        .filter((c) => !c.isGroup && c.participant)
        .map((c) => c.participant!._id);
      if (ids.length > 0) {
        API.getOnlineStatus(ids).then(setOnlineStatus).catch(console.error);
      }
    }
  }, [conversations.length]);

  // Clear unread count locally when entering a chat
  useEffect(() => {
    if (!pathname) return;
    const conversationId = pathname.split('/').pop();
    if (conversationId && conversationId !== 'messages') {
      queryClient.setQueryData(queryKeys.chats, (old: Conversation[] | undefined) => {
        if (!old) return old;
        return old.map((c) =>
          c._id === conversationId ? { ...c, unreadCount: 0 } : c
        );
      });
      socket?.emit("mark_read", { conversationId });
    }
  }, [pathname, socket, queryClient]);

  // Real-time updates: messages and online status
  useEffect(() => {
    if (!socket || !currentUser) return;

    const onUserOnline = ({ userId }: { userId: string }) => {
      setOnlineStatus((prev) => ({ ...prev, [userId]: true }));
    };
    const onUserOffline = ({ userId }: { userId: string }) => {
      setOnlineStatus((prev) => ({ ...prev, [userId]: false }));
    };

    const onMessageReceived = (msg: any) => {
      queryClient.setQueryData(queryKeys.chats, (old: Conversation[] | undefined) => {
        if (!old) return old;
        const index = old.findIndex((c) => c._id === msg.conversationId);
        
        if (index !== -1) {
          const updatedConversations = [...old];
          const conv = { ...updatedConversations[index] };
          
          if (conv.lastMessage?._id === msg._id) return old;

          conv.lastMessage = msg;
          
          const isCurrentChat = pathname?.includes(msg.conversationId);
          if (!isCurrentChat && msg.sender._id !== currentUser.id && msg.sender !== currentUser.id) {
            conv.unreadCount = (conv.unreadCount || 0) + 1;
          }
          
          updatedConversations.splice(index, 1);
          updatedConversations.unshift(conv);
          return updatedConversations;
        } else {
          // New conversation
          queryClient.invalidateQueries({ queryKey: queryKeys.chats });
          return old;
        }
      });
    };

    const onMessagesRead = ({ conversationId, readBy }: { conversationId: string; readBy: string }) => {
      queryClient.setQueryData(queryKeys.chats, (old: Conversation[] | undefined) => {
        if (!old) return old;
        return old.map((c) => {
          if (c._id === conversationId) {
            const updatedConv = { ...c };
            if (readBy.toString() === currentUser.id.toString()) {
              updatedConv.unreadCount = 0;
            }
            if (updatedConv.lastMessage) {
              const alreadyRead = updatedConv.lastMessage.readBy.some(id => id.toString() === readBy.toString());
              if (!alreadyRead) {
                updatedConv.lastMessage = {
                  ...updatedConv.lastMessage,
                  readBy: [...updatedConv.lastMessage.readBy, readBy]
                };
              }
            }
            return updatedConv;
          }
          return c;
        });
      });
    };

    const onUserTyping = ({ conversationId, username }: { conversationId: string; username: string }) => {
      queryClient.setQueryData(queryKeys.chats, (old: Conversation[] | undefined) => {
        if (!old) return old;
        return old.map((c) =>
          c._id === conversationId ? { ...c, isTyping: true, typingUsername: username } : c
        );
      });
    };

    const onUserStopTyping = ({ conversationId }: { conversationId: string }) => {
      queryClient.setQueryData(queryKeys.chats, (old: Conversation[] | undefined) => {
        if (!old) return old;
        return old.map((c) =>
          c._id === conversationId ? { ...c, isTyping: false, typingUsername: "" } : c
        );
      });
    };

    socket.on("user_online", onUserOnline);
    socket.on("user_offline", onUserOffline);
    socket.on("message_received", onMessageReceived);
    socket.on("messages_read", onMessagesRead);
    socket.on("user_typing", onUserTyping);
    socket.on("user_stop_typing", onUserStopTyping);

    return () => {
      socket.off("user_online", onUserOnline);
      socket.off("user_offline", onUserOffline);
      socket.off("message_received", onMessageReceived);
      socket.off("messages_read", onMessagesRead);
      socket.off("user_typing", onUserTyping);
      socket.off("user_stop_typing", onUserStopTyping);
    };
  }, [socket, currentUser, pathname, queryClient]);

  return (
    <aside className={`h-full bg-card border-r border-border overflow-hidden flex flex-col flex-shrink-0 ${pathname === '/messages' ? 'w-full md:w-80' : 'hidden md:flex md:w-80'}`}>
      <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
        <h2 className="text-xl font-bold text-white">Chats</h2>
        <button
          onClick={() => setIsCreateGroupOpen(true)}
          className="text-primary font-semibold text-sm hover:text-primary/80 transition-colors"
        >
          New Group
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_10px_var(--color-primary)]" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-6 text-center">
            <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm font-semibold text-white">No chats yet</p>
            <p className="text-xs">
              Find someone in Explore and start a DM.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {conversations.map((conv) => (
              <ConversationItem
                key={conv._id}
                conversation={conv}
                currentUserId={currentUser?.id}
                isOnline={conv.participant ? !!onlineStatus[conv.participant._id] : false}
              />
            ))}
          </div>
        )}
      </div>

      {isCreateGroupOpen && (
        <CreateGroupModal
          onClose={() => setIsCreateGroupOpen(false)}
          conversations={conversations}
        />
      )}
    </aside>
  );
}
