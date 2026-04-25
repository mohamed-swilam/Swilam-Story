"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { API } from "@/lib/api";
import { ChevronLeft } from "lucide-react";
import ProtectedPage from "@/components/ProtectedPage";

interface SimpleUser {
  _id: string;
  username: string;
  user_pic: string;
  isFollowing?: boolean;
}

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queryKeys";

export default function FollowersPage() {
  const { userId } = useParams() as { userId: string };
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: loading,
  } = useInfiniteQuery({
    queryKey: queryKeys.followers(userId),
    queryFn: ({ pageParam = 1 }) => API.getFollowers(userId, pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => lastPage.length < 20 ? undefined : allPages.length + 1,
    enabled: !!userId,
  });

  const followers = data?.pages.flat() || [];

  const followMutation = useMutation({
    mutationFn: (targetId: string) => API.followUser(targetId),
    onMutate: async (targetId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.followers(userId) });
      const previousData = queryClient.getQueryData(queryKeys.followers(userId));

      queryClient.setQueryData(queryKeys.followers(userId), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any[]) =>
            page.map((u) => {
              if (u._id === targetId) {
                return { ...u, isFollowing: !u.isFollowing };
              }
              return u;
            })
          ),
        };
      });
      return { previousData };
    },
    onError: (err, targetId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.followers(userId), context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.followers(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.user }); // Current user's following list might have changed
    },
  });

  const handleFollowToggle = (targetId: string) => {
    if (followMutation.isPending) return;
    followMutation.mutate(targetId);
  };

  return (
    <ProtectedPage>
      <main className="min-h-full max-w-2xl mx-auto p-6 bg-background/50 backdrop-blur-sm">
        <header className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-white/5 rounded-full text-muted-foreground hover:text-white transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-white">Followers</h1>
        </header>

        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_10px_var(--color-primary)]" />
            </div>
          ) : followers.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground bg-card rounded-2xl border border-border">
              No followers yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {followers.map((user, idx) => {
                const isOwnProfile = currentUser?.id === userId;
                const showFollowButton = isOwnProfile ? true : user._id !== currentUser?.id;
                
                // If viewing own profile, they are a follower, so we can just show Follow/Following
                // wait, if viewing own profile, "Remove" or "Follow/Following"? 
                // The prompt says: "If viewing own profile -> show unfollow button on each user".
                // But this is the followers page. Wait! The prompt says "If viewing own profile → show unfollow button on each user" for BOTH pages.
                // Wait, if it's my follower, I might not be following them!
                // Ah! The prompt means: Follow button behavior: optimistic update.
                // If it's my own profile and I'm looking at my *following* list, I show unfollow.
                // For followers list, I show follow/unfollow based on whether *I* follow them.
                
                return (
                  <div key={user._id} className="flex items-center justify-between bg-card hover:bg-card/80 transition-colors p-4 rounded-2xl border border-border">
                    <button 
                      onClick={() => router.push(`/profile/${user._id}`)}
                      className="flex items-center gap-4 flex-1 text-left"
                    >
                      <img 
                        src={user.user_pic || "/user_profile.jpg"} 
                        alt="" 
                        className="w-12 h-12 rounded-full object-cover border-2 border-border shadow-sm"
                      />
                      <div>
                        <p className="font-semibold text-white">{user.username}</p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          try {
                            const conv = await API.createOrGetConversation(user._id);
                            queryClient.invalidateQueries({ queryKey: queryKeys.chats });
                            router.push(`/messages/${conv._id}`);
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="p-2 bg-white/5 text-white hover:bg-white/10 rounded-xl border border-white/10 transition-all"
                        title="Send Message"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </button>
                      {showFollowButton && (
                        <button
                          onClick={() => handleFollowToggle(user._id)}
                          disabled={followMutation.isPending}
                          className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all duration-300 ${
                            user.isFollowing 
                              ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                              : "bg-primary text-white shadow-[0_0_15px_var(--color-primary)] shadow-primary/30 hover:shadow-primary/50"
                          }`}
                        >
                          {user.isFollowing ? "Following" : "Follow"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {hasNextPage && (
                <button 
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="mt-6 w-full py-4 bg-card rounded-2xl font-bold text-muted-foreground hover:text-white hover:bg-card/80 transition-colors border border-border disabled:opacity-50"
                >
                  {isFetchingNextPage ? "Loading..." : "Load More"}
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </ProtectedPage>
  );
}
