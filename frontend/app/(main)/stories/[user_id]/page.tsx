"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useSwipeable } from "react-swipeable";
import StoryMedia from "@/components/stories/StoryMedia";
import ViewersModal from "@/components/stories/ViewersModel";
import { useStories } from "@/hooks/useStories";
import { API } from "@/lib/api";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { Story } from "@/types/stories";

export default function UserStoriesPage() {
  const { user_id } = useParams();
  const searchParams = useSearchParams();
  const initialIndex = parseInt(searchParams.get("index") || "0");
  const source = searchParams.get("source");
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    API.authTest().then(data => setCurrentUser(data.user)).catch(console.error);
  }, []);

  if (!user_id) {
    throw new Error("User ID is required");
  }
  const userIdStr = Array.isArray(user_id) ? user_id[0] : user_id;
  const router = useRouter();
  const [showViewers, setShowViewers] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const queryClient = useQueryClient();
  const { stories, readyStories, currentIndex, setCurrentIndex, nextStory, prevStory, isPaused, pauseStory, resumeStory, cancelTimer, loading } =
    useStories({ userId: userIdStr, initialIndex });

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    return date.toLocaleDateString("en-GB");
  }

  const handlers = useSwipeable({
    onSwipedLeft: nextStory,
    onSwipedRight: prevStory,
    trackMouse: true,
  });

  // Long press detection
  let pressTimer: NodeJS.Timeout;
  const isPressing = useRef(false);

  const handlePressStart = () => {
    isPressing.current = true;
    pressTimer = setTimeout(() => {
      pauseStory();
    }, 200); // pause after 200ms hold
  };

  const handlePressEnd = () => {
    clearTimeout(pressTimer);
    // Only resume if we were actually pressing (not a manual pause button toggle)
    // and we're not in a state that REQUIRES a pause
    if (isPressing.current) {
      isPressing.current = false;
      if (isPaused && !showViewers && !isReplying) {
        resumeStory();
      }
    }
  };

  const handleDeleteConfirmed = async () => {
    const deletedStoryId = stories[currentIndex]._id;
    try {
      await API.deleteStory(deletedStoryId);

      // Hard cancel timer before mutating state
      cancelTimer();

      if (stories.length === 1) {
        router.back();
        return;
      }

      // Update state in React Query cache
      queryClient.setQueryData(queryKeys.userStories(userIdStr), (old: Story[] | undefined) => {
        if (!old) return old;
        return old.filter((s) => s._id !== deletedStoryId);
      });

      // Adjust index if it's now out of bounds
      const nextLength = stories.length - 1;
      if (currentIndex >= nextLength) {
        setCurrentIndex(nextLength - 1 >= 0 ? nextLength - 1 : 0);
      }
    } catch (err) {
      console.error("Failed to delete story:", err);
      throw err;
    }
  };

  const handleExit = () => {
    if (source === "feed") {
      router.push("/stories/feed");
    } else {
      router.back();
    }
  };

  // Prevent flicker: if loading and no data, show black screen. 
  // If not loading and no data, show "No stories".
  if (loading && stories.length === 0) {
    return <div className="w-full h-full bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  if (!stories.length || !stories[currentIndex]) {
    if (loading) return <div className="w-full h-full bg-black" />; // Safety for transitions
    return (
      <div className="text-white w-full h-full bg-black flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-card rounded-full border border-white/10 mb-4 text-muted-foreground">
           <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
        </div>
        <p className="font-bold text-xl">No stories found</p>
        <p className="text-muted-foreground mt-2 max-w-xs">This user hasn&apos;t posted any stories or they have expired.</p>
        <Link className="mt-8 px-8 py-3 bg-primary text-white rounded-2xl font-bold hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] transition-all" href="/stories/feed">
          View Feed
        </Link>
      </div>
    );
  }

  return (
    <div
      {...handlers}
      className="w-full h-full bg-black flex flex-col items-center justify-center relative overflow-hidden select-none"
      onMouseDown={handlePressStart}
      onTouchStart={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchEnd={handlePressEnd}
    >
      <StoryMedia
        story={stories[currentIndex]}
        currentUserId={currentUser?.id}
        openViewers={() => {
          pauseStory();
          setShowViewers(true);
        }}
        formatDate={formatDate}
        stories={stories}
        currentIndex={currentIndex}
        readyStories={readyStories}
        isPaused={isPaused}
        pauseStory={pauseStory}
        resumeStory={resumeStory}
        onDeleteConfirmed={handleDeleteConfirmed}
        onClose={handleExit}
        setIsReplying={setIsReplying}
      />

      {/* Left Arrow */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            prevStory();
          }}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors z-30"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {/* Right Arrow */}
      {currentIndex < stories.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            nextStory();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors z-30"
        >
          <ChevronRight size={20} />
        </button>
      )}

      {/* Pause/Play Toggle Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          isPaused ? resumeStory() : pauseStory();
        }}
        className="absolute top-12 right-20 w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-colors z-30"
      >
        {isPaused ? <Play size={18} className="ml-0.5" /> : <Pause size={18} />}
      </button>

      {showViewers && (
        <ViewersModal
          story={stories[currentIndex]}
          closeViewers={() => {
            setShowViewers(false);
            resumeStory();
          }}
          formatDate={formatDate}
        />
      )}
    </div>
  );
}
