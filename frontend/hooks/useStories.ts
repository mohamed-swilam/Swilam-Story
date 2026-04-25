import { useEffect, useState, useRef } from "react";
import { API } from "@/lib/api";
import { Story } from "@/types/stories";
import { useSocket } from "./useSocket";

interface UseStoriesProps {
  userId: string;
  initialIndex?: number;
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

export function useStories({ userId, initialIndex = 0 }: UseStoriesProps) {
  const queryClient = useQueryClient();
  const { data: stories = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.userStories(userId),
    queryFn: () => API.getUserStories(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false, // Prevent interruption while watching
  });

  const [readyStories, setReadyStories] = useState<boolean[]>([]);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const socket = useSocket();

  const [isPaused, setIsPaused] = useState(false);
  const remainingTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const deletingRef = useRef(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setIsPaused(false);
    deletingRef.current = false;
  }, [initialIndex]);

  // Handle socket updates to stories cache
  useEffect(() => {
    if (!socket || !userId) return;

    const onStoryViewed = (data: { storyId: string; viewer: any; viewedAt: string }) => {
      queryClient.setQueryData(queryKeys.userStories(userId), (old: Story[] | undefined) => {
        if (!old) return old;
        return old.map((s) => {
          if (s._id === data.storyId) {
            const exists = s.viewers?.some(v => v.storyViewer._id === data.viewer._id);
            if (exists) return s;
            return {
              ...s,
              viewersCount: (s.viewersCount || 0) + 1,
              viewers: s.viewers ? [...s.viewers, { storyViewer: data.viewer, viewed_at: data.viewedAt }] : undefined
            };
          }
          return s;
        });
      });
    };

    const onPrivacyUpdate = (data: { userId: string; isPrivate: boolean }) => {
      if (data.userId === userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userStories(userId) });
      }
    };

    const onBlockUpdate = (data: { targetUserId?: string; blockerId?: string; blocked: boolean }) => {
      if ((data.targetUserId === userId || data.blockerId === userId) && data.blocked) {
        queryClient.setQueryData(queryKeys.userStories(userId), []);
      }
    };

    socket.on("story_viewed", onStoryViewed);
    socket.on("privacy_update", onPrivacyUpdate);
    socket.on("block_update", onBlockUpdate);

    return () => {
      socket.off("story_viewed", onStoryViewed);
      socket.off("privacy_update", onPrivacyUpdate);
      socket.off("block_update", onBlockUpdate);
    };
  }, [socket, userId, queryClient]);

  // Load stories incrementally
  useEffect(() => {
    if (!stories.length) return;
    
    // Initialize ready state if needed
    setReadyStories(prev => {
      if (prev.length === stories.length) return prev;
      return new Array(stories.length).fill(false);
    });

    stories.forEach((story, idx) => {
      const loadMedia = () => new Promise<boolean>((resolve) => {
        if (story.media_type === "image") {
          const img = new Image();
          img.src = story.media_url;
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
        } else {
          const video = document.createElement("video");
          video.src = story.media_url;
          video.onloadeddata = () => resolve(true);
          video.onerror = () => resolve(false);
        }
      });

      loadMedia().then(success => {
        setReadyStories(prev => {
          const next = [...prev];
          next[idx] = success;
          return next;
        });
      });
    });
  }, [stories]);

  useEffect(() => {
    if (!stories.length || !readyStories[currentIndex]) return;
    if (isPaused) return;

    const currentStory = stories[currentIndex];
    if (!currentStory) return; // guard against undefined after deletion

    API.newView(currentStory._id).catch(console.error);

    // Initial setup for remaining time
    if (remainingTimeRef.current === 0) {
      remainingTimeRef.current = currentStory.duration * 1000;
    }
    
    startTimeRef.current = Date.now();

    timerRef.current = setTimeout(() => {
      if (deletingRef.current) return; // story is being deleted, don't advance
      remainingTimeRef.current = 0; // reset for next story
      setIsPaused(false);
      setCurrentIndex((prev) =>
        prev + 1 < stories.length ? prev + 1 : 0
      );
    }, remainingTimeRef.current);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, stories, readyStories, isPaused]);

  const pauseStory = () => {
    if (isPaused) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    setIsPaused(true);
    deletingRef.current = true; // Mark as potentially deleting (will be reset in resume)
  };

  const resumeStory = () => {
    if (!isPaused) return;
    setIsPaused(false);
    deletingRef.current = false;
  };

  const cancelTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    remainingTimeRef.current = 0;
    startTimeRef.current = 0;
    setIsPaused(false);
    deletingRef.current = false;
  };

  const nextStory = () => {
    if (!stories[currentIndex]) return; // guard
    if (timerRef.current) clearTimeout(timerRef.current);
    remainingTimeRef.current = 0;
    setIsPaused(false);
    deletingRef.current = false;
    setCurrentIndex((prev) => (prev + 1 < stories.length ? prev + 1 : prev));
  };
  
  const prevStory = () => {
    if (!stories[currentIndex]) return; // guard
    if (timerRef.current) clearTimeout(timerRef.current);
    remainingTimeRef.current = 0;
    setIsPaused(false);
    deletingRef.current = false;
    setCurrentIndex((prev) => (prev - 1 >= 0 ? prev - 1 : prev));
  };

  return {
    stories,
    readyStories,
    currentIndex,
    setCurrentIndex,
    nextStory,
    prevStory,
    pauseStory,
    resumeStory,
    cancelTimer,
    isPaused,
    loading,
  };
}
