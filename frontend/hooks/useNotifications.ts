import { useEffect, useCallback } from "react";
import { useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { API } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { queryKeys } from "@/lib/queryKeys";
import type { Notification } from "@/types/notifications";

export function useNotifications() {
  const socket = useSocket();
  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: queryKeys.notifications,
    queryFn: ({ pageParam = 1 }) => API.getNotifications(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    staleTime: 1 * 60 * 1000,
  });

  const notifications = data?.pages.flatMap((page) => page.notifications) || [];
  
  // unreadCount is returned by the API on every page fetch, but for simplicity 
  // we'll take it from the most recent first page or just refetch it.
  // Actually, let's look at the first page of the cache.
  const unreadCount = data?.pages[0]?.unreadCount || 0;

  // Real-time socket events
  useEffect(() => {
    if (!socket) return;

    const onNew = (notif: Notification) => {
      // Update unread count
      queryClient.setQueryData(queryKeys.notifications, (old: any) => {
        if (!old) return old;
        
        // Check if already exists (deduplication)
        const exists = old.pages.some((page: any) => 
          page.notifications.some((n: any) => n._id === notif._id)
        );
        if (exists) return old;

        const newPages = [...old.pages];
        newPages[0] = {
          ...newPages[0],
          notifications: [notif, ...newPages[0].notifications],
          unreadCount: (newPages[0].unreadCount || 0) + 1,
        };
        return { ...old, pages: newPages };
      });
    };

    socket.on("new_notification", onNew);
    return () => { socket.off("new_notification", onNew); };
  }, [socket, queryClient]);

  const markAllRead = useCallback(async (types?: string[]) => {
    try {
      await API.markAllRead(types);
      queryClient.setQueryData(queryKeys.notifications, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => {
            let newlyReadCount = 0;
            const updatedNotifs = page.notifications.map((n: any) => {
              const isTargetType = !types || types.includes(n.type);
              if (isTargetType && !n.read) {
                newlyReadCount++;
                return { ...n, read: true };
              }
              return n;
            });

            return {
              ...page,
              notifications: updatedNotifs,
              unreadCount: Math.max(0, (page.unreadCount || 0) - newlyReadCount)
            };
          }),
        };
      });
      // Force invalidate to ensure total sync
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    } catch (err) {
      console.error(err);
    }
  }, [queryClient]);

  const markOneRead = useCallback(async (id: string) => {
    try {
      await API.markOneRead(id);
      queryClient.setQueryData(queryKeys.notifications, (old: any) => {
        if (!old) return old;
        let found = false;
        const newPages = old.pages.map((page: any) => {
          const newNotifs = page.notifications.map((n: any) => {
            if (n._id === id && !n.read) {
              found = true;
              return { ...n, read: true };
            }
            return n;
          });
          return { ...page, notifications: newNotifs };
        });

        if (found) {
          newPages[0].unreadCount = Math.max(0, (newPages[0].unreadCount || 0) - 1);
        }
        return { ...old, pages: newPages };
      });
    } catch (err) {
      console.error(err);
    }
  }, [queryClient]);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await API.deleteNotification(id);
      queryClient.setQueryData(queryKeys.notifications, (old: any) => {
        if (!old) return old;
        let wasUnread = false;
        const newPages = old.pages.map((page: any) => {
          const filtered = page.notifications.filter((n: any) => {
            if (n._id === id) {
              if (!n.read) wasUnread = true;
              return false;
            }
            return true;
          });
          return { ...page, notifications: filtered };
        });

        if (wasUnread) {
          newPages[0].unreadCount = Math.max(0, (newPages[0].unreadCount || 0) - 1);
        }
        return { ...old, pages: newPages };
      });
    } catch (err) {
      console.error(err);
    }
  }, [queryClient]);

  return {
    notifications,
    unreadCount,
    hasMore: hasNextPage,
    loading: isLoading,
    isFetchingMore: isFetchingNextPage,
    markAllRead,
    markOneRead,
    deleteNotification,
    loadMore: fetchNextPage,
  };
}
