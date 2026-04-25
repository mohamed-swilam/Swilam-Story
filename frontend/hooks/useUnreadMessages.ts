import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { API } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queryKeys";

export function useUnreadMessages() {
  const socket = useSocket();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const currentUserId = user?._id || user?.id;

  const { data: unreadCount = 0 } = useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: async () => {
      const data = await API.getUnreadMessagesCount();
      return data.totalUnread;
    },
    enabled: !!currentUserId,
    staleTime: 5 * 60 * 1000,
  });

  // Real-time socket events
  useEffect(() => {
    if (!socket || !currentUserId) return;

    const onMessageReceived = (message: any) => {
      // 1. Update unread count if needed
      const senderId = message.sender?._id || message.sender;
      const isMine = senderId === currentUserId;
      
      const isCurrentConversation = pathname === `/messages/${message.conversationId}`;
      if (!isCurrentConversation && !isMine) {
        queryClient.setQueryData(queryKeys.unreadCount, (old: number | undefined) => (old || 0) + 1);
      }

      // 2. Globally update Chat Sidebar cache
      queryClient.setQueryData(queryKeys.chats, (old: any[] | undefined) => {
        if (!old) return old;
        const index = old.findIndex((c) => c._id.toString() === message.conversationId.toString());
        
        if (index !== -1) {
          const updatedConversations = [...old];
          const conv = { ...updatedConversations[index] };
          
          if (conv.lastMessage?._id === message._id) return old;

          conv.lastMessage = message;
          conv.updatedAt = message.createdAt;
          
          if (!isCurrentConversation && !isMine) {
            conv.unreadCount = (conv.unreadCount || 0) + 1;
          }
          
          updatedConversations.splice(index, 1);
          updatedConversations.unshift(conv);
          return updatedConversations;
        } else {
          // If conversation not in list, refetch the whole list
          queryClient.invalidateQueries({ queryKey: queryKeys.chats });
          return old;
        }
      });

      // 3. Globally update Message Window cache
      queryClient.setQueryData(queryKeys.messages(message.conversationId), (old: any) => {
        if (!old) return old;
        
        const exists = old.pages.some((page: any) => 
          page.messages.some((m: any) => m._id === message._id)
        );
        if (exists) return old;

        const newPages = [...old.pages];
        newPages[0] = {
          ...newPages[0],
          messages: [message, ...newPages[0].messages],
        };
        return { ...old, pages: newPages };
      });
    };

    const onMessagesRead = ({ conversationId, readBy }: { conversationId: string; readBy: string }) => {
      // Update unread count
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });

      // Update sidebar cache for read status
      queryClient.setQueryData(queryKeys.chats, (old: any[] | undefined) => {
        if (!old) return old;
        return old.map((c) => {
          if (c._id.toString() === conversationId.toString()) {
            const updatedConv = { ...c };
            if (readBy.toString() === currentUserId?.toString()) {
              updatedConv.unreadCount = 0;
            }
            if (updatedConv.lastMessage) {
              const alreadyRead = updatedConv.lastMessage.readBy?.some((id: any) => id.toString() === readBy.toString());
              if (!alreadyRead) {
                updatedConv.lastMessage = {
                  ...updatedConv.lastMessage,
                  readBy: [...(updatedConv.lastMessage.readBy || []), readBy]
                };
              }
            }
            return updatedConv;
          }
          return c;
        });
      });
    };

    socket.on("message_received", onMessageReceived);
    socket.on("messages_read", onMessagesRead);

    return () => {
      socket.off("message_received", onMessageReceived);
      socket.off("messages_read", onMessagesRead);
    };
  }, [socket, pathname, currentUserId, queryClient]);

  return {
    unreadMessagesCount: unreadCount,
    refetchUnreadCount: () => queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount }),
  };
}
