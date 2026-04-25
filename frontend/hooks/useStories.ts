import { useEffect, useState, useRef } from "react";
import { API } from "@/lib/api";
import { Story } from "@/types/stories";
import { useSocket } from "./useSocket";
import { useAuth } from "./useAuth";

interface UseStoriesProps {
  userId: string;
  initialIndex?: number;
  storyId?: string;
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

export function useStories({ userId, initialIndex = 0, storyId }: UseStoriesProps) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { data: stories = [], isLoading: loading, isFetching } = useQuery<Story[]>({
    queryKey: queryKeys.userStories(userId),
    queryFn: () => API.getUserStories(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false, // Prevent interruption while watching
  });

  const [readyStories, setReadyStories] = useState<boolean[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const socket = useSocket();

  const [isPaused, setIsPaused] = useState(false);
  const remainingTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const deletingRef = useRef(false);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const hasSetInitialRef = useRef(false);

  useEffect(() => {
    // Wait for fresh data before finding the correct story
    if (isFetching) return;
    if (stories.length === 0) return;
    if (hasSetInitialRef.current) return;

    hasSetInitialRef.current = true;

    if (storyId) {
      // Navigate to the specific story by ID
      const idx = stories.findIndex(s => s._id === storyId);
      if (idx !== -1) {
        setCurrentIndex(idx);
        return;
      }
    }

    // Default: jump to first unviewed (only when initialIndex === 0)
    if (initialIndex !== 0) return;
    const firstUnviewed = stories.findIndex(s => !s.isViewed);
    if (firstUnviewed !== -1) {
      setCurrentIndex(firstUnviewed);
    }
  }, [stories, initialIndex, isFetching, storyId]);

  useEffect(() => {
    // Only reset currentIndex to initialIndex when there's no storyId target.
    // If storyId is present, the storyId effect below handles the correct index.
    if (!storyId) {
      setCurrentIndex(initialIndex);
    }
    setIsPaused(false);
    deletingRef.current = false;
    // hasSetInitialRef resets automatically on remount (new user navigation)
  }, [initialIndex, storyId]);

  // Handle socket updates to stories cache
  useEffect(() => {
    if (!socket || !userId) return;

    const onNewViewer = (data: { storyId: string; viewer: any; viewedAt: string; viewed_at?: string }) => {
      queryClient.setQueryData(queryKeys.userStories(userId), (old: Story[] | undefined) => {
        if (!old) return old;
        return old.map((s) => {
          if (s._id === data.storyId) {
            const exists = s.viewers?.some(v => v.storyViewer._id === data.viewer.userId);
            if (exists) return s;
            return {
              ...s,
              viewersCount: (s.viewersCount || 0) + 1,
              viewers: s.viewers ? [...s.viewers, { 
                storyViewer: {
                  _id: data.viewer.userId,
                  username: data.viewer.username,
                  user_pic: data.viewer.user_pic
                }, 
                viewed_at: data.viewer.viewed_at || data.viewed_at || data.viewedAt,
                reaction: data.viewer.reaction
              }] : undefined
            };
          }
          return s;
        });
      });
    };

    const onStoryReaction = (data: { storyId: string; viewer: any }) => {
      queryClient.setQueryData(queryKeys.userStories(userId), (old: Story[] | undefined) => {
        if (!old) return old;
        return old.map((s) => {
          if (s._id === data.storyId) {
            return {
              ...s,
              viewers: s.viewers?.map(v => 
                (v.storyViewer._id || v.storyViewer).toString() === data.viewer.userId.toString()
                  ? { ...v, reaction: data.viewer.reaction }
                  : v
              )
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

    socket.on("new_viewer", onNewViewer);
    socket.on("story_reaction", onStoryReaction);
    socket.on("privacy_update", onPrivacyUpdate);
    socket.on("block_update", onBlockUpdate);

    return () => {
      socket.off("new_viewer", onNewViewer);
      socket.off("story_reaction", onStoryReaction);
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

    stories.forEach((story: Story, idx: number) => {
      const loadMedia = () => new Promise<boolean>((resolve) => {
        if (story.media_type === "text") {
          resolve(true);
        } else if (story.media_type === "image") {
          const img = new Image();
          img.src = story.media_url || "";
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
        } else {
          // video or voice
          const media = document.createElement(story.media_type === "voice" ? "audio" : "video");
          media.src = story.media_url || "";
          media.onloadeddata = () => resolve(true);
          media.onerror = () => resolve(false);
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

  const lastViewedId = useRef<string | null>(null);

  useEffect(() => {
    if (!stories.length || !readyStories[currentIndex]) return;
    if (isPaused) return;

    const currentStory = stories[currentIndex];
    if (!currentStory) return; // guard against undefined after deletion

    // 1. Don't record view if it's my own story
    const isMine = currentStory.mine || (currentUser && currentStory.storyOwner._id === (currentUser._id || currentUser.id));
    if (isMine) return;

    // 2. Don't record view if we already sent it for this specific story ID in this session
    if (lastViewedId.current === currentStory._id) return;
    
    lastViewedId.current = currentStory._id;
    API.newView(currentStory._id)
      .then(() => {
        // Invalidate feed and user stories so everything updates in real-time
        queryClient.invalidateQueries({ queryKey: queryKeys.feed });
        queryClient.invalidateQueries({ queryKey: queryKeys.userStories(userId) });
      })
      .catch((err) => {
        // Story no longer exists — remove it from cache so user isn't stuck
        if (err?.response?.status === 404) {
          queryClient.setQueryData(queryKeys.userStories(userId), (old: Story[] | undefined) => {
            if (!old) return old;
            return old.filter((s) => s._id !== currentStory._id);
          });
        }
      });

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
  }, [currentIndex, stories, readyStories, isPaused, currentUser, userId, queryClient]);

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
