"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSwipeable } from "react-swipeable";
import ProtectedPage from "@/components/ProtectedPage";
import ProgressBar from "@/components/stories/ProgressBar";
import StoryMedia from "@/components/stories/StoryMedia";
import ViewersModal from "@/components/stories/ViewersModel";
import { useStories } from "@/hooks/useStories";
import Link from "next/link";

export default function UserStoriesPage() {
  const { user_id } = useParams();
  if (!user_id) {
    throw new Error("User ID is required");
  }
  const userIdStr = Array.isArray(user_id) ? user_id[0] : user_id;
  const [showViewers, setShowViewers] = useState(false);
  const { stories, readyStories, currentIndex, nextStory, prevStory } =
    useStories({ userId: userIdStr });

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

  if (!stories.length)
    return (
      <ProtectedPage loadingBG="bg-black">
        <div className="text-white w-full h-screen bg-black items-center justify-center flex flex-col">
          <p>This user haven't any story</p>
          <Link className="underline" href="/stories/feed">Go To Home{">"}</Link>
        </div>
      </ProtectedPage>
    );

  return (
    <ProtectedPage loadingBG="bg-black">
      <div
        {...handlers}
        className="min-h-screen bg-black flex flex-col items-center justify-center relative "
      >
        <ProgressBar
          stories={stories}
          currentIndex={currentIndex}
          readyStories={readyStories}
        />

        <StoryMedia
          story={stories[currentIndex]}
          openViewers={() => setShowViewers(true)}
          formatDate={formatDate}
        />

        {showViewers && (
          <ViewersModal
            story={stories[currentIndex]}
            closeViewers={() => setShowViewers(false)}
            formatDate={formatDate}
          />
        )}
      </div>
    </ProtectedPage>
  );
}
