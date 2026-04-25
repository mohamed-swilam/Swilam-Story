"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { API } from "@/lib/api";
import { UserProfile } from "@/types/follow";
import { Story } from "@/types/stories";
import { MessageSquare, UserPlus, UserCheck, ChevronLeft, Loader2, Shield, Ban } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import ConfirmModal from "@/components/modals/ConfirmModal";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queryKeys";

export default function ProfilePage() {
  const { userId } = useParams() as { userId: string };
  const router = useRouter();
  const socket = useSocket();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  
  // Queries
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: queryKeys.profile(userId),
    queryFn: () => API.getProfile(userId),
    enabled: !!userId,
  });

  const { data: stories = [], isLoading: storiesLoading } = useQuery({
    queryKey: queryKeys.userStories(userId),
    queryFn: () => API.getUserStories(userId),
    enabled: !!userId && !!profile && !profile.isBlocked && !profile.amIBlocked,
    retry: false,
  });

  // Mutations
  const followMutation = useMutation({
    mutationFn: () => API.followUser(userId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.profile(userId) });
      const previousProfile = queryClient.getQueryData<UserProfile>(queryKeys.profile(userId));
      
      if (previousProfile) {
        queryClient.setQueryData(queryKeys.profile(userId), {
          ...previousProfile,
          isFollowing: !previousProfile.isFollowing,
          followersCount: previousProfile.isFollowing 
            ? previousProfile.followersCount - 1 
            : previousProfile.followersCount + 1,
        });
      }
      return { previousProfile };
    },
    onError: (err, variables, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(queryKeys.profile(userId), context.previousProfile);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.explore });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed });
      queryClient.invalidateQueries({ queryKey: ["explore-stories"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.followers(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.following(userId) });
      
      // Also invalidate current user's following list
      if (currentUser?.id || currentUser?._id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.following(currentUser.id || currentUser._id) });
      }
    },
  });

  const blockMutation = useMutation({
    mutationFn: async (isBlocked: boolean) => {
      if (isBlocked) await API.unblockUser(userId);
      else await API.blockUser(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.userStories(userId) });
    },
  });

  // Block Modal State
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);

  useEffect(() => {
    if (!socket || !userId) return;

    const onPrivacyUpdate = (data: { userId: string, isPrivate: boolean }) => {
      if (data.userId === userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.userStories(userId) });
      }
    };

    const onBlockUpdate = (data: { targetUserId?: string, blockerId?: string, blocked: boolean }) => {
      if (data.targetUserId === userId || data.blockerId === userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.userStories(userId) });
      }
    };

    const onNewStory = (data: { storyOwner: string }) => {
      if (data.storyOwner === userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userStories(userId) });
      }
    };

    const onStoryDeleted = (data: { storyOwner: string }) => {
      if (data.storyOwner === userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userStories(userId) });
      }
    };

    socket.on("privacy_update", onPrivacyUpdate);
    socket.on("block_update", onBlockUpdate);
    socket.on("new_story", onNewStory);
    socket.on("story_deleted", onStoryDeleted);
    
    return () => {
      socket.off("privacy_update", onPrivacyUpdate);
      socket.off("block_update", onBlockUpdate);
      socket.off("new_story", onNewStory);
      socket.off("story_deleted", onStoryDeleted);
    };
  }, [socket, userId, queryClient]);

  const handleBlockToggle = async () => {
    if (!profile) return;
    blockMutation.mutate(profile.isBlocked);
    setIsBlockModalOpen(false);
  };

  const handleFollowToggle = () => {
    if (!profile || followMutation.isPending) return;
    followMutation.mutate();
  };

  const startChat = async () => {
    try {
      const conv = await API.createOrGetConversation(userId);
      queryClient.invalidateQueries({ queryKey: queryKeys.chats });
      router.push(`/messages/${conv._id}`);
    } catch (err) {
      console.error(err);
    }
  };

  if (profileLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center p-6 bg-background">
        <div className="p-4 bg-card/50 rounded-full border border-white/10 text-muted-foreground">
          <UserPlus size={48} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">User not found</h1>
          <p className="text-muted-foreground">The profile you're looking for doesn't exist.</p>
        </div>
        <button onClick={() => router.back()} className="px-6 py-2 bg-primary text-white rounded-full font-bold">Go back</button>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profile._id;
  const isRestricted = profile.isPrivate && !profile.followsMe && !isOwnProfile;

  return (
    <div className="h-full overflow-y-auto bg-background/50 backdrop-blur-sm">
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8 pb-32">
        {/* Header Bar */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-white/5 rounded-full text-muted-foreground hover:text-white transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white">{profile.username}</h1>
            {profile.isPrivate && <Shield size={16} className="text-primary" />}
          </div>
        </div>

        {/* Profile Card */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-3xl blur opacity-25"></div>
          <section className="relative bg-card/80 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 border border-white/10 shadow-2xl overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
            
            <div className="relative flex-shrink-0">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-1 bg-gradient-to-tr from-primary to-purple-500 shadow-2xl">
                <img 
                  src={profile.user_pic || "/user_profile.jpg"} 
                  alt={profile.username} 
                  className="w-full h-full rounded-full object-cover border-4 border-card shadow-inner"
                />
              </div>
            </div>

            <div className="flex-1 text-center md:text-left space-y-6">
              <div>
                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">{profile.username}</h2>
                <p className="text-primary font-medium mt-1">@{profile.username.toLowerCase()}</p>
              </div>

              {profile.bio && (
                <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                  {profile.bio}
                </p>
              )}
              
              <div className="flex items-center justify-center md:justify-start gap-6">
                <button 
                  onClick={() => router.push(`/profile/${profile._id}/followers`)}
                  className="text-center md:text-left hover:opacity-80 transition-opacity"
                >
                  <p className="text-xl font-bold text-white">{profile.followersCount}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Followers</p>
                </button>
                <div className="w-px h-8 bg-border/50"></div>
                <button 
                  onClick={() => router.push(`/profile/${profile._id}/following`)}
                  className="text-center md:text-left hover:opacity-80 transition-opacity"
                >
                  <p className="text-xl font-bold text-white">{profile.followingCount}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Following</p>
                </button>
              </div>

              {!isOwnProfile && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleFollowToggle}
                    disabled={followMutation.isPending || profile.amIBlocked}
                    className={`flex-1 md:flex-initial px-8 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 ${
                      profile.isFollowing 
                        ? "bg-secondary text-white hover:bg-secondary/80" 
                        : "bg-primary text-white shadow-lg shadow-primary/20 hover:shadow-primary/40"
                    } disabled:opacity-50`}
                  >
                    {followMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : profile.isFollowing ? <UserCheck size={18} /> : <UserPlus size={18} />}
                    {profile.isFollowing ? "Following" : "Follow"}
                  </button>
                  <button 
                    onClick={startChat}
                    disabled={isRestricted || profile.amIBlocked}
                    className={`p-3 rounded-2xl transition-all border ${
                      isRestricted || profile.amIBlocked
                        ? "bg-white/5 text-muted-foreground border-white/5 cursor-not-allowed" 
                        : "bg-white/5 text-white hover:bg-white/10 border-white/10"
                    }`}
                    title={profile.amIBlocked ? "You are blocked by this user" : isRestricted ? "Private account: they must follow you to chat" : "Send message"}
                  >
                    {profile.amIBlocked ? <Ban size={22} className="text-destructive" /> : isRestricted ? <Shield size={22} /> : <MessageSquare size={22} />}
                  </button>
                  <button 
                    onClick={() => setIsBlockModalOpen(true)}
                    className={`p-3 rounded-2xl transition-all border ${
                      profile.isBlocked 
                        ? "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20" 
                        : "bg-white/5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-white/10 hover:border-destructive/20"
                    }`}
                    title={profile.isBlocked ? "Unblock user" : "Block user"}
                  >
                    <Ban size={22} />
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        <ConfirmModal
          isOpen={isBlockModalOpen}
          onClose={() => setIsBlockModalOpen(false)}
          onConfirm={handleBlockToggle}
          isLoading={blockMutation.isPending}
          title={profile?.isBlocked ? "Unblock User?" : "Block User?"}
          description={profile?.isBlocked 
            ? `Are you sure you want to unblock ${profile?.username}? They will be able to message you and see your profile.` 
            : `Are you sure you want to block ${profile?.username}? They won't be able to find your profile, see your stories, or message you.`}
          confirmText={profile?.isBlocked ? "Yes, Unblock" : "Yes, Block User"}
          type={profile?.isBlocked ? "success" : "danger"}
        />

        {/* Stories Grid */}
        <section className="space-y-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-2">Recent Stories</h3>
          {isRestricted ? (
             <div className="bg-card/30 rounded-3xl p-16 text-center border border-white/5 flex flex-col items-center gap-4 animate-fadeIn">
               <div className="p-5 bg-primary/10 rounded-full text-primary ring-8 ring-primary/5">
                 <Shield size={40} />
               </div>
               <div>
                 <h4 className="text-xl font-bold text-white">This Account is Private</h4>
                 <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-2">
                   You can only see their stories and send messages if they follow you back.
                 </p>
               </div>
             </div>
          ) : stories.length === 0 ? (
            <div className="bg-card/30 rounded-3xl p-12 text-center border border-white/5">
              <p className="text-muted-foreground font-medium">No stories available at the moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {stories.map((story, idx) => (
                <button
                  key={story._id}
                  onClick={() => router.push(`/stories/${profile._id}?index=${idx}&source=profile`)}
                  className="aspect-[9/16] bg-card rounded-2xl relative group overflow-hidden border border-white/10 shadow-lg"
                >
                  {story.media_type === "video" ? (
                    <video src={story.media_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <img src={story.media_url} alt="story" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <p className="text-white text-xs font-bold">View Story</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
