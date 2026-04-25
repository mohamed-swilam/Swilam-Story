"use client";

import { useEffect } from "react";
import { API } from "@/lib/api";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queryKeys";

interface Feed {
  storyOwner: string;
  hasNewStory: boolean;
  username: string;
  user_pic: string;
}

export default function StorySidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const source = searchParams.get('source');
  const socket = useSocket();
  const { user: currentUser } = useAuth();

  // Fetch Feed
  const { data: feed = [] } = useQuery<Feed[]>({
    queryKey: queryKeys.feed,
    queryFn: API.getFeed,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Check if current user has stories
  const { data: ownStories = [] } = useQuery({
    queryKey: queryKeys.userStories(currentUser?._id || currentUser?.id || ""),
    queryFn: () => API.getUserStories(currentUser?._id || currentUser?.id || ""),
    enabled: !!(currentUser?._id || currentUser?.id),
    staleTime: 2 * 60 * 1000,
  });

  const hasOwnStory = ownStories.length > 0;

  useEffect(() => {
    if (!socket) return;

    const onNewStory = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed });
      queryClient.invalidateQueries({ queryKey: queryKeys.userStories(currentUser?._id || currentUser?.id || "") });
    };

    const onStoryDeleted = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed });
      queryClient.invalidateQueries({ queryKey: queryKeys.userStories(currentUser?._id || currentUser?.id || "") });
    };

    const onPrivacyUpdate = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed });
    };

    const onBlockUpdate = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feed });
    };

    socket.on("new_story", onNewStory);
    socket.on("story_deleted", onStoryDeleted);
    socket.on("privacy_update", onPrivacyUpdate);
    socket.on("block_update", onBlockUpdate);

    return () => {
      socket.off("new_story", onNewStory);
      socket.off("story_deleted", onStoryDeleted);
      socket.off("privacy_update", onPrivacyUpdate);
      socket.off("block_update", onBlockUpdate);
    };
  }, [socket, currentUser, queryClient]);

  const handleStoryClick = (id: string, hasStory: boolean) => {
    if (!hasStory) {
      router.push("/stories/upload");
      return;
    }

    const url = `/stories/${id}?source=feed`;
    if (pathname?.startsWith("/stories/")) {
      router.replace(url);
    } else {
      router.push(url);
    }
  };

  // Hide sidebar if we are in story viewer and source is not 'feed'
  const isStoryPage = pathname?.includes('/stories/') && pathname !== '/stories/feed' && pathname !== '/stories/upload';
  if (isStoryPage && source !== 'feed') {
    return null;
  }

  return (
    <aside className={`h-full bg-card border-r border-border overflow-y-auto flex flex-col flex-shrink-0 ${pathname === '/stories/feed' ? 'w-full md:w-80' : 'hidden md:flex md:w-80'}`}>
      <div className="p-4 border-b border-border sticky top-0 bg-card z-10 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white tracking-tight">Stories</h2>
        <Link 
          href="/stories/upload"
          className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-full transition-all duration-300 group"
          title="Add Story"
        >
          <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </Link>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {currentUser && (
          <button
            onClick={() => handleStoryClick(currentUser._id || currentUser.id, hasOwnStory)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 mb-2 ${
              pathname?.includes(`/stories/${currentUser._id || currentUser.id}`) ? "bg-secondary" : "hover:bg-secondary/50"
            }`}
          >
            <div className="relative">
              <img
                src={currentUser.user_pic || "/user_profile.jpg"}
                alt="Your Story"
                className={`w-12 h-12 rounded-full object-cover border-2 border-background ${
                  hasOwnStory ? "ring-2 ring-primary shadow-[0_0_10px_var(--color-primary)] ring-offset-2 ring-offset-background" : "opacity-70"
                }`}
              />
              {!hasOwnStory && (
                <div className="absolute bottom-0 right-0 bg-primary text-white w-4 h-4 rounded-full flex items-center justify-center border-2 border-background text-xs font-bold leading-none pb-[1px] pl-[1px]">
                  +
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className={`font-semibold truncate ${pathname?.includes(`/stories/${currentUser._id || currentUser.id}`) ? "text-white" : "text-gray-200"}`}>
                Your Story
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {hasOwnStory ? "View your story" : "Add a new story"}
              </p>
            </div>
          </button>
        )}

        <div className="h-px bg-border my-2 mx-2" />

        {feed.length === 0 ? (
          <p className="text-muted-foreground p-4 text-center text-sm">No recent stories from others.</p>
        ) : (
          feed.map((item) => {
            const isActive = pathname?.includes(`/stories/${item.storyOwner}`);
            return (
              <button
                key={item.storyOwner}
                onClick={() => handleStoryClick(item.storyOwner, true)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                  isActive ? "bg-secondary" : "hover:bg-secondary/50"
                }`}
              >
                <div className="relative">
                  <img
                    src={item.user_pic || "/user_profile.jpg"}
                    alt={item.username}
                    className={`w-12 h-12 rounded-full object-cover border-2 border-background ${
                      item.hasNewStory ? "ring-2 ring-primary shadow-[0_0_10px_var(--color-primary)] ring-offset-2 ring-offset-background" : "opacity-70"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className={`font-semibold truncate ${isActive ? "text-white" : "text-gray-200"}`}>
                    {item.username}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.hasNewStory ? "New Story" : "Viewed"}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
