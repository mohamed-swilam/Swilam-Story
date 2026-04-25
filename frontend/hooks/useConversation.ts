"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API } from "@/lib/api";
import { Message, MessagesPage } from "@/types/messages";
import { Socket } from "socket.io-client";

interface UseConversationProps {
  conversationId: string;
  currentUserId: string;
  socket: Socket | null;
}

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

export function useConversation({
  conversationId,
  currentUserId,
  socket,
}: UseConversationProps) {
  const queryClient = useQueryClient();
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsername, setTypingUsername] = useState("");
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: queryKeys.messages(conversationId),
    queryFn: ({ pageParam = 1 }) => API.getMessages(conversationId, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    enabled: !!conversationId,
    staleTime: 5 * 1000,
  });

  // Process messages: flat array in chronological order (oldest -> newest)
  // Since API returns [newest ... oldest], we reverse the pages and then reverse each page's messages
  const messages = data?.pages
    ? [...data.pages].reverse().flatMap((page) => [...page.messages].reverse())
    : [];

  // ── Socket: join room & listen for events ──────────────────────────────────
  useEffect(() => {
    if (!socket || !conversationId) return;

    socket.emit("join_conversation", { conversationId });

    const onMessageReceived = (msg: Message) => {
      queryClient.setQueryData(queryKeys.messages(conversationId), (old: any) => {
        if (!old) return old;
        
        // Check if message already exists (deduplication)
        const exists = old.pages.some((page: any) => 
          page.messages.some((m: Message) => m._id === msg._id)
        );
        if (exists) return old;

        // Inject into first page (most recent)
        const newPages = [...old.pages];
        newPages[0] = {
          ...newPages[0],
          messages: [msg, ...newPages[0].messages], // newest-first in cache
        };
        return { ...old, pages: newPages };
      });

      const senderId = typeof msg.sender === 'string' ? msg.sender : msg.sender._id;
      if (senderId !== currentUserId) {
        socket.emit("mark_read", { conversationId });
      }
    };

    const onMessagesRead = ({
      conversationId: incomingConvId,
      readBy,
    }: {
      conversationId: string;
      readBy: string;
    }) => {
      if (incomingConvId !== conversationId) return;

      queryClient.setQueryData(queryKeys.messages(conversationId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((m: Message) => {
              const alreadyRead = m.readBy.some(id => id.toString() === readBy.toString());
              if (alreadyRead) return m;
              return { ...m, readBy: [...m.readBy, readBy] };
            })
          }))
        };
      });
    };

    const onUserTyping = ({ username }: { username: string; userId: string }) => {
      setIsTyping(true);
      setTypingUsername(username);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);
    };

    const onUserStopTyping = () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setIsTyping(false);
      setTypingUsername("");
    };

    const onMessageDeleted = ({ messageId }: { messageId: string }) => {
      queryClient.setQueryData(queryKeys.messages(conversationId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.filter((m: any) => m._id !== messageId),
          })),
        };
      });
    };

    const onMessageReaction = ({ messageId, reactions }: { messageId: string, reactions: any[] }) => {
      queryClient.setQueryData(queryKeys.messages(conversationId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((m: any) => 
              m._id === messageId ? { ...m, reactions } : m
            ),
          })),
        };
      });
    };

    socket.on("message_received", onMessageReceived);
    socket.on("messages_read", onMessagesRead);
    socket.on("user_typing", onUserTyping);
    socket.on("user_stop_typing", onUserStopTyping);
    socket.on("message_deleted", onMessageDeleted);
    socket.on("message_reaction", onMessageReaction);
    socket.on("error_message", ({ message }: { message: string }) => {
      alert(message);
    });

    socket.emit("mark_read", { conversationId });

    return () => {
      socket.off("message_received", onMessageReceived);
      socket.off("messages_read", onMessagesRead);
      socket.off("user_typing", onUserTyping);
      socket.off("user_stop_typing", onUserStopTyping);
      socket.off("message_deleted", onMessageDeleted);
      socket.off("message_reaction", onMessageReaction);
      socket.off("error_message");
    };
  }, [socket, conversationId, currentUserId, queryClient]);

  const loadMore = useCallback(async () => {
    if (isFetchingNextPage || !hasNextPage) return;
    fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const sendMessage = useCallback(
    (content: string, type: "text" | "image" | "file" | "voice" = "text", fileData?: { fileUrl?: string; fileName?: string; fileSize?: number }) => {
      if (!socket) return;
      socket.emit("send_message", { 
        conversationId, 
        content, 
        type,
        fileUrl: fileData?.fileUrl,
        fileName: fileData?.fileName,
        fileSize: fileData?.fileSize
      });
    },
    [socket, conversationId]
  );

  const emitTyping = useCallback(() => {
    if (!socket) return;
    socket.emit("typing", { conversationId });
  }, [socket, conversationId]);

  const emitStopTyping = useCallback(() => {
    if (!socket) return;
    socket.emit("stop_typing", { conversationId });
  }, [socket, conversationId]);

  return {
    messages,
    hasMore: hasNextPage,
    loadingMore: isFetchingNextPage,
    isTyping,
    typingUsername,
    loadMore,
    sendMessage,
    emitTyping,
    emitStopTyping,
    isLoading,
  };
}
