"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API } from "@/lib/api";
import { Participant } from "@/types/messages";
import { X, UserPlus, UserCheck, ShieldAlert, ShieldCheck, Loader2, Info, Ban, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import ConfirmationModal from "@/components/ui/ConfirmationModal";

interface Props {
  user: Participant;
  currentUserId: string;
  onClose: () => void;
  conversationId: string;
}

interface FullProfile {
  _id: string;
  username: string;
  user_pic: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isBlocked: boolean;
}

export default function UserInfoPanel({ user, currentUserId, onClose, conversationId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isDeleteChatModalOpen, setIsDeleteChatModalOpen] = useState(false);

  useEffect(() => {
    API.getProfile(user._id)
      .then((data) => {
        setProfile(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user._id]);

  const handleFollowToggle = async () => {
    if (!profile) return;
    setActionLoading("follow");
    try {
      const data = await API.followUser(user._id);
      setProfile({
        ...profile,
        isFollowing: data.following,
        followersCount: data.followersCount
      });
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlockToggle = async () => {
    if (!profile) return;
    setActionLoading("block");
    try {
      if (profile.isBlocked) {
        await API.unblockUser(user._id);
        setProfile({ ...profile, isBlocked: false });
      } else {
        await API.blockUser(user._id);
        setProfile({ ...profile, isBlocked: true, isFollowing: false });
      }
      setIsBlockModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: () => API.deleteConversation(conversationId),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.chats, (old: any) => 
        old?.filter((c: any) => c._id !== conversationId)
      );
      router.push("/messages");
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-card h-full shadow-2xl flex flex-col animate-slideLeft border-l border-white/5">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 flex-shrink-0 bg-white/2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
              <Info size={18} />
            </div>
            <h2 className="font-bold text-lg text-white">Contact Info</h2>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-muted-foreground hover:text-white hover:bg-white/10 rounded-full transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : profile ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* User Profile */}
            <div className="flex flex-col items-center py-10 border-b border-white/5 bg-gradient-to-b from-white/2 to-transparent px-6">
              <div className="relative mb-6">
                <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-primary to-purple-600 shadow-2xl">
                  <img
                    src={profile.user_pic || "/user_profile.jpg"}
                    alt={profile.username}
                    className="w-full h-full rounded-full object-cover border-4 border-card"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-4 border-card rounded-full" />
              </div>
              <h3 className="font-bold text-2xl text-white tracking-tight text-center">{profile.username}</h3>
              <p className="text-primary font-medium mt-1">@{profile.username.toLowerCase()}</p>
              
              <button 
                onClick={() => router.push(`/profile/${profile._id}`)}
                className="mt-4 px-6 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-full border border-white/10 transition-all"
              >
                View Full Profile
              </button>
              
              {profile.bio && (
                <p className="text-sm text-muted-foreground mt-4 text-center leading-relaxed">
                  {profile.bio}
                </p>
              )}

              <div className="flex items-center justify-center gap-8 mt-6 w-full">
                <div className="text-center">
                  <p className="text-xl font-bold text-white">{profile.followersCount}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Followers</p>
                </div>
                <div className="w-px h-8 bg-white/10"></div>
                <div className="text-center">
                  <p className="text-xl font-bold text-white">{profile.followingCount}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Following</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 space-y-4">
              <h4 className="font-black text-[10px] text-muted-foreground uppercase tracking-[0.2em] mb-2">Actions</h4>
              
              <button
                onClick={handleFollowToggle}
                disabled={actionLoading === "follow" || profile.isBlocked}
                className={`w-full flex items-center justify-center gap-3 p-4 rounded-2xl transition-all font-bold group border ${
                  profile.isFollowing
                    ? "bg-secondary/10 text-white border-white/10 hover:bg-secondary/20"
                    : "bg-primary text-white border-primary shadow-lg shadow-primary/20 hover:shadow-primary/40"
                } disabled:opacity-40`}
              >
                {actionLoading === "follow" ? <Loader2 size={20} className="animate-spin" /> : profile.isFollowing ? <UserCheck size={20} /> : <UserPlus size={20} />}
                {profile.isFollowing ? "Following" : "Follow User"}
              </button>

              <button
                onClick={() => setIsBlockModalOpen(true)}
                disabled={actionLoading === "block"}
                className={`w-full flex items-center justify-center gap-3 p-4 rounded-2xl transition-all font-bold group border ${
                  profile.isBlocked
                    ? "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20"
                    : "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                }`}
              >
                {actionLoading === "block" ? <Loader2 size={20} className="animate-spin" /> : profile.isBlocked ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
                {profile.isBlocked ? "Unblock User" : "Block User"}
              </button>

              <button
                onClick={() => setIsDeleteChatModalOpen(true)}
                className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl transition-all font-bold group border bg-red-500/5 text-red-500 border-red-500/10 hover:bg-red-500/10"
              >
                <Trash2 size={20} />
                Delete Chat
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
             <p className="text-muted-foreground">Failed to load user info.</p>
          </div>
        )}

        <ConfirmationModal
          isOpen={isBlockModalOpen}
          onClose={() => setIsBlockModalOpen(false)}
          onConfirm={handleBlockToggle}
          isLoading={actionLoading === "block"}
          title={profile?.isBlocked ? "Unblock User?" : "Block User?"}
          message={profile?.isBlocked 
            ? `Are you sure you want to unblock ${profile?.username}? They will be able to message you and see your profile.` 
            : `Are you sure you want to block ${profile?.username}? They won't be able to find your profile, see your stories, or message you.`}
          confirmText={profile?.isBlocked ? "Yes, Unblock" : "Yes, Block User"}
          isDestructive={!profile?.isBlocked}
        />

        <ConfirmationModal
          isOpen={isDeleteChatModalOpen}
          onClose={() => setIsDeleteChatModalOpen(false)}
          onConfirm={() => deleteMutation.mutate()}
          isLoading={deleteMutation.isPending}
          title="Delete Conversation?"
          message="This will clear your entire chat history with this user. This action cannot be undone."
          confirmText="Yes, Delete Chat"
        />

        {/* Footer */}
        <div className="p-6 border-t border-white/5 bg-white/2">
           <p className="text-[10px] text-muted-foreground text-center font-bold uppercase tracking-widest">
             MowaChat Secure Encryption Active
           </p>
        </div>
      </div>
    </div>
  );
}
