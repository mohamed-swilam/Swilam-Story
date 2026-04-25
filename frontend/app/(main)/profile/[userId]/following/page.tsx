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

import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";

export default function FollowingPage() {
  const { userId } = useParams() as { userId: string };
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [following, setFollowing] = useState<SimpleUser[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const authData = await API.authTest();
        setCurrentUser(authData.user);
        await fetchFollowing(1, authData.user);
      } catch (err) {
        console.error("Failed to init:", err);
      }
    };
    init();
  }, [userId]);

  const fetchFollowing = async (p: number, cUser: any = currentUser) => {
    try {
      const data = await API.getFollowing(userId, p);
      if (data.length < 20) setHasMore(false);
      
      const enrichedData = data.map((u: any) => ({
        ...u,
        isFollowing: cUser?.following?.includes(u._id) || false
      }));

      if (p === 1) setFollowing(enrichedData);
      else setFollowing((prev) => [...prev, ...enrichedData]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (targetId: string, isCurrentlyFollowing: boolean, index: number) => {
    // Optimistic update
    const newFollowing = [...following];
    newFollowing[index].isFollowing = !isCurrentlyFollowing;
    setFollowing(newFollowing);

    if (currentUser) {
      if (isCurrentlyFollowing) {
        currentUser.following = currentUser.following.filter((id: string) => id !== targetId);
      } else {
        currentUser.following.push(targetId);
      }
      setCurrentUser({ ...currentUser });
    }

    try {
      const data = await API.followUser(targetId);
      newFollowing[index].isFollowing = data.following;
      setFollowing([...newFollowing]);
    } catch (err) {
      console.error(err);
      // Revert
      newFollowing[index].isFollowing = isCurrentlyFollowing;
      setFollowing([...newFollowing]);
      
      if (currentUser) {
        if (!isCurrentlyFollowing) {
          currentUser.following = currentUser.following.filter((id: string) => id !== targetId);
        } else {
          currentUser.following.push(targetId);
        }
        setCurrentUser({ ...currentUser });
      }
    }
  };

  return (
    <ProtectedPage loadingBG="background">
      <main className="min-h-full max-w-2xl mx-auto p-6 bg-background/50 backdrop-blur-sm">
        <header className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-white/5 rounded-full text-muted-foreground hover:text-white transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold text-white">Following</h1>
        </header>

        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin shadow-[0_0_10px_var(--color-primary)]" />
            </div>
          ) : following.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground bg-card rounded-2xl border border-border">
              Not following anyone yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {following.map((user, idx) => {
                const showFollowButton = user._id !== currentUser?.id;
                
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
                          onClick={() => handleFollowToggle(user._id, !!user.isFollowing, idx)}
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
              
              {hasMore && (
                <button 
                  onClick={() => {
                    const next = page + 1;
                    setPage(next);
                    fetchFollowing(next);
                  }}
                  className="mt-6 w-full py-4 bg-card rounded-2xl font-bold text-muted-foreground hover:text-white hover:bg-card/80 transition-colors border border-border"
                >
                  Load More
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </ProtectedPage>
  );
}
