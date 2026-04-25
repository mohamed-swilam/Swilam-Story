"use client";
import { useRouter } from "next/navigation";
import { API } from "@/lib/api";
import { UserProfile } from "@/types/follow";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

export default function ExplorePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: loading,
  } = useInfiniteQuery({
    queryKey: queryKeys.explore,
    queryFn: ({ pageParam = 1 }) => API.getExploreUsers(pageParam as number),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => lastPage.length < 20 ? undefined : allPages.length + 1,
  });

  const users = data?.pages.flat() || [];

  const followMutation = useMutation({
    mutationFn: (userId: string) => API.followUser(userId),
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.explore });
      const previousData = queryClient.getQueryData(queryKeys.explore);

      queryClient.setQueryData(queryKeys.explore, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: UserProfile[]) =>
            page.map((u) => {
              if (u._id === userId) {
                const newFollowing = !u.isFollowing;
                return {
                  ...u,
                  isFollowing: newFollowing,
                  followersCount: newFollowing ? u.followersCount + 1 : u.followersCount - 1,
                };
              }
              return u;
            })
          ),
        };
      });
      return { previousData };
    },
    onError: (err, userId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.explore, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.explore });
    },
  });

  const handleFollowToggle = (userId: string) => {
    if (followMutation.isPending) return;
    followMutation.mutate(userId);
  };

  return (
      <main className="min-h-full max-w-2xl mx-auto p-6">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Explore</h1>
          <p className="text-muted-foreground">Find people to follow and discover new stories.</p>
        </header>

        <div className="relative mb-8">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <input 
            type="text" 
            placeholder="Search for users..." 
            className="w-full bg-card border border-border rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm"
          />
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_10px_var(--color-primary)]" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground bg-card rounded-2xl border border-border">No users found. Try adjusting your search.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {users.map((user) => (
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
                      <p className="text-sm text-muted-foreground">{user.followersCount} followers</p>
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
                  </div>
                </div>
              ))}
              
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
  );
}
