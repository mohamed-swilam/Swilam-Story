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
      // Only increment if the message was sent by someone else
      const senderId = message.sender?._id || message.sender;
      if (senderId === currentUserId) return;

      // If we are currently in this conversation, it gets read immediately
      const isCurrentConversation = pathname === `/messages/${message.conversationId}`;
      if (!isCurrentConversation) {
        queryClient.setQueryData(queryKeys.unreadCount, (old: number | undefined) => (old || 0) + 1);
      }
    };

    const onMessagesRead = (data: any) => {
      // If messages were read, the most reliable way is to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount });
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
