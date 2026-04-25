"use client";
import { useRouter } from "next/navigation";
import { API } from "@/lib/api";
import { UserProfile } from "@/types/follow";
import { Story } from "@/types/stories";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useState, useEffect } from "react";
import { Search, MessageCircle, UserPlus, UserCheck, Play } from "lucide-react";

export default function ExplorePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 1. Fetch Explore Stories (Discovery Grid) - only when not searching
  const { data: exploreStories, isLoading: loadingStories } = useQuery({
    queryKey: ["explore-stories"],
    queryFn: () => API.getExploreStories(),
    enabled: !debouncedSearch,
  });

  // 2. Fetch Users (Search results or suggested)
  const {
    data: userData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: loadingUsers,
  } = useInfiniteQuery({
    queryKey: [queryKeys.explore, debouncedSearch],
    queryFn: ({ pageParam = 1 }) => API.getExploreUsers(pageParam as number, debouncedSearch),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => lastPage.length < 20 ? undefined : allPages.length + 1,
  });

  const users = userData?.pages.flat() || [];

  const followMutation = useMutation({
    mutationFn: (userId: string) => API.followUser(userId),
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: [queryKeys.explore, debouncedSearch] });
      const previousData = queryClient.getQueryData([queryKeys.explore, debouncedSearch]);

      queryClient.setQueryData([queryKeys.explore, debouncedSearch], (old: any) => {
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
        queryClient.setQueryData([queryKeys.explore, debouncedSearch], context.previousData);
      }
    },
    onSettled: (_, __, userId) => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.explore] });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed });
      queryClient.invalidateQueries({ queryKey: ["explore-stories"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.followers(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.following(userId) });
      // Also invalidate current user's following list
      const currentUser = queryClient.getQueryData(queryKeys.user) as any;
      if (currentUser?.id || currentUser?._id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.following(currentUser.id || currentUser._id) });
      }
    },
  });

  const handleFollowToggle = (userId: string) => {
    if (followMutation.isPending) return;
    followMutation.mutate(userId);
  };

  return (
    <main className="min-h-screen max-w-4xl mx-auto p-4 md:p-8 page-transition">
      <header className="mb-8 space-y-2">
        <h1 className="text-4xl font-black tracking-tight text-foreground">Explore</h1>
        <p className="text-muted-foreground text-lg">Discover new stories and connect with people.</p>
      </header>

      {/* ── Search Bar ── */}
      <div className="relative mb-10 group">
        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none transition-transform group-focus-within:scale-110">
          <Search className="w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
        </div>
        <input 
          type="text" 
          placeholder="Search usernames..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-card border border-border rounded-3xl py-5 pl-14 pr-6 text-foreground text-lg placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-2xl"
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm("")}
            className="absolute inset-y-0 right-5 flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="space-y-8">
        {/* ── MODE 1: DISCOVERY GRID (No active search) ── */}
        {!debouncedSearch && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <span className="w-2 h-8 bg-primary rounded-full" />
                Featured Stories
              </h2>
            </div>

            {loadingStories ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 animate-pulse">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="aspect-[9/16] bg-card rounded-2xl border border-border" />
                ))}
              </div>
            ) : exploreStories?.length === 0 ? (
              <div className="text-center py-20 bg-card rounded-3xl border border-border text-muted-foreground">
                No public stories right now. Try searching for users!
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {exploreStories?.map((story: Story, index: number) => (
                  <div 
                    key={story._id}
                    onClick={() => router.push(`/stories/${story.storyOwner._id}?index=0`)}
                    className={`group relative aspect-[9/16] bg-card rounded-2xl overflow-hidden cursor-pointer border border-border hover:border-primary/50 transition-all hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)] stagger-item stagger-delay-${Math.min(index + 1, 5)}`}
                  >
                    {story.media_type === "video" ? (
                      <video src={story.media_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <img src={story.media_url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="" />
                    )}
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                    
                    {/* Owner Info */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2">
                      <img src={story.storyOwner.user_pic || "/user_profile.jpg"} className="w-6 h-6 rounded-full border border-border" alt="" />
                      <span className="text-xs font-bold text-white truncate drop-shadow-md">{story.storyOwner.username}</span>
                    </div>

                    {story.media_type === "video" && (
                      <div className="absolute top-3 right-3 p-1 bg-black/20 backdrop-blur-md rounded-lg">
                        <Play size={12} className="text-white fill-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── MODE 2: SEARCH RESULTS (Active search) ── */}
        {debouncedSearch && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <span className="w-2 h-8 bg-secondary rounded-full" />
              Search Results
            </h2>

            {loadingUsers ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-card rounded-2xl border border-border animate-pulse" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-20 bg-card rounded-3xl border border-border text-muted-foreground">
                No users found for &quot;{debouncedSearch}&quot;
              </div>
            ) : (
              <div className="grid gap-3">
                {users.map((user, index) => (
                  <div key={user._id} className={`flex items-center justify-between bg-card hover:bg-muted/50 transition-all p-4 rounded-3xl border border-border group stagger-item stagger-delay-${Math.min(index + 1, 5)}`}>
                    <button 
                      onClick={() => router.push(`/profile/${user._id}`)}
                      className="flex items-center gap-5 flex-1 text-left"
                    >
                      <div className="relative">
                        <img 
                          src={user.user_pic || "/user_profile.jpg"} 
                          alt="" 
                          className="w-14 h-14 rounded-full object-cover border-2 border-primary/20 group-hover:border-primary transition-all"
                        />
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-card rounded-full" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-lg">{user.username}</p>
                        <p className="text-sm text-muted-foreground font-medium">{user.followersCount} followers</p>
                      </div>
                    </button>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const conv = await API.createOrGetConversation(user._id);
                            queryClient.invalidateQueries({ queryKey: queryKeys.chats });
                            router.push(`/messages/${conv._id}`);
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="p-3 bg-foreground/10 text-foreground hover:bg-primary hover:text-primary-foreground rounded-2xl border border-border transition-all shadow-xl"
                        title="Send Message"
                      >
                        <MessageCircle size={20} />
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFollowToggle(user._id);
                        }}
                        disabled={followMutation.isPending}
                        className={`flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-2xl transition-all duration-300 ${
                          user.isFollowing 
                            ? "bg-foreground/10 text-foreground hover:bg-foreground/20"
                            : "bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:scale-105 active:scale-95"
                        }`}
                      >
                        {user.isFollowing ? <UserCheck size={18} /> : <UserPlus size={18} />}
                        <span className="hidden sm:inline">{user.isFollowing ? "Following" : "Follow"}</span>
                      </button>
                    </div>
                  </div>
                ))}

                {hasNextPage && (
                  <button 
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="mt-6 w-full py-4 bg-card rounded-2xl font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-all border border-border disabled:opacity-50"
                  >
                    {isFetchingNextPage ? "Loading..." : "Load More"}
                  </button>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
