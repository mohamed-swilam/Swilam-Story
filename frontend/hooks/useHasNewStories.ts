"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { API } from "@/lib/api";
import { useSocket } from "@/hooks/useSocket";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/hooks/useAuth";

interface FeedItem {
  storyOwner: string;
  hasNewStory: boolean;
  username: string;
  user_pic: string;
}

export function useHasNewStories() {
  const socket = useSocket();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const currentUserId = user?._id || user?.id;

  // Use a local state to track if the user has "seen" the new stories notification
  // this prevents the dot from showing up again until a NEWER story arrives.
  const [lastAckTimestamp, setLastAckTimestamp] = useState<number>(0);

  const { data: feed = [] } = useQuery<FeedItem[]>({
    queryKey: queryKeys.feed,
    queryFn: API.getFeed,
    enabled: !!currentUserId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  const hasUnseenStories = feed.some((item) => item.hasNewStory);

  useEffect(() => {
    if (!socket || !currentUserId) return;

    const onNewStory = () => {
      // Invalidate feed to get fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.feed });
      // Reset acknowledgement so the dot can appear again for the new content
      setLastAckTimestamp(0);
    };

    socket.on("new_story", onNewStory);
    return () => {
      socket.off("new_story", onNewStory);
    };
  }, [socket, currentUserId, queryClient]);

  // Clear the dot notification when navigating to the stories feed
  // We do this by setting the acknowledgement timestamp
  useEffect(() => {
    if (pathname === "/stories/feed" && hasUnseenStories) {
      setLastAckTimestamp(Date.now());
    }
  }, [pathname, hasUnseenStories]);

  // The dot shows if there are unseen stories AND we haven't acknowledged them recently
  const shouldShowDot = hasUnseenStories && lastAckTimestamp === 0;

  return {
    hasNewStories: pathname === "/stories/feed" ? false : shouldShowDot,
  };
}
