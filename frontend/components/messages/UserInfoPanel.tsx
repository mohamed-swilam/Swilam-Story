import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { API } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Participant } from "@/types/messages";
import { X, UserPlus, UserCheck, ShieldAlert, ShieldCheck, Loader2, Info, Ban, Trash2, Palette, Type, Image as ImageIcon, RotateCcw, Upload, Check } from "lucide-react";
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
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isDeleteChatModalOpen, setIsDeleteChatModalOpen] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  const COLORS = ["#a855f7", "#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#ec4899", "#06b6d4", "#ffffff"];

  const currentChatSettings = currentUser?.chatSettings?.find(
    (s: any) => s.conversationId?.toString() === conversationId
  );

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

  const [wallpaperUrl, setWallpaperUrl] = useState("");

  const handleUpdateChatSettings = async (data: any) => {
    setIsUpdatingSettings(true);
    
    // Optimistic Update for Real-time feel
    if (!data.file) {
      queryClient.setQueryData(queryKeys.user, (old: any) => {
        if (!old) return old;
        
        const newChatSettings = old.chatSettings ? JSON.parse(JSON.stringify(old.chatSettings)) : [];
        const idx = newChatSettings.findIndex((s: any) => s.conversationId?.toString() === conversationId);
        
        if (data.reset) {
          const filtered = newChatSettings.filter((s: any) => s.conversationId?.toString() !== conversationId);
          return { ...old, chatSettings: filtered };
        }

        const settingsData = { conversationId, ...data };
        if (idx > -1) {
          newChatSettings[idx] = { ...newChatSettings[idx], ...settingsData };
        } else {
          newChatSettings.push(settingsData);
        }
        
        // Return a completely new object for the user to force re-render
        return { ...old, chatSettings: newChatSettings };
      });
    }

    try {
      if (data.file) {
        const formData = new FormData();
        formData.append("conversationId", conversationId);
        formData.append("chatWallpaper", data.file);
        const res = await API.updateChatSettings(formData);
        // After upload, update cache with the actual URL from server
        queryClient.setQueryData(queryKeys.user, (old: any) => ({
          ...old,
          chatSettings: res.chatSettings
        }));
      } else {
        const res = await API.updateChatSettings({ conversationId, ...data });
        // Update cache with the response for non-file updates too
        queryClient.setQueryData(queryKeys.user, (old: any) => ({
          ...old,
          chatSettings: res.chatSettings
        }));
      }
    } catch (err) {
      console.error(err);
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpdateChatSettings({ file });
    }
  };

  const deleteMutation = useMutation({
    mutationFn: () => API.deleteConversation(conversationId),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.chats, (old: any) => 
        old?.filter((c: any) => c._id !== conversationId)
      );
      router.push("/messages");
      handleClose();
    }
  });

  return (
    <div className={`fixed inset-0 z-[100] flex justify-end bg-background/60 backdrop-blur-sm duration-300 ${isClosing ? 'animate-out fade-out' : 'animate-in fade-in'}`}>
      <div className="absolute inset-0" onClick={handleClose} />

      <div className={`relative w-full max-w-sm bg-card h-full shadow-2xl flex flex-col border-l border-border duration-300 ease-out fill-mode-forwards ${isClosing ? 'animate-out slide-out-to-right-full' : 'animate-in slide-in-from-right-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0 bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
              <Info size={18} />
            </div>
            <h2 className="font-bold text-lg text-foreground">Contact Info</h2>
          </div>
          <button 
            onClick={handleClose} 
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-foreground/10 rounded-full transition-all"
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
            <div className="flex flex-col items-center py-10 border-b border-border bg-gradient-to-b from-muted/20 to-transparent px-6">
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
              <h3 className="font-bold text-2xl text-foreground tracking-tight text-center">{profile.username}</h3>
              <p className="text-primary font-medium mt-1">@{profile.username.toLowerCase()}</p>
              
              <button 
                onClick={() => router.push(`/profile/${profile._id}`)}
                className="mt-4 px-6 py-2 bg-foreground/5 hover:bg-foreground/10 text-foreground text-xs font-bold rounded-full border border-border transition-all"
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
                  <p className="text-xl font-bold text-foreground">{profile.followersCount}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Followers</p>
                </div>
                <div className="w-px h-8 bg-border"></div>
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">{profile.followingCount}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Following</p>
                </div>
              </div>
            </div>

            {/* Chat Customization */}
            <div className="p-6 border-b border-border space-y-6">
              <h4 className="font-black text-[10px] text-muted-foreground uppercase tracking-[0.2em]">Chat Customization</h4>
              
              {/* Accent Color */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground/70">
                  <Palette size={14} />
                  <span>Accent Color</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(color => {
                    const isActive = (currentChatSettings?.accentColor || currentUser?.settings?.accentColor) === color;
                    return (
                      <button
                        key={color}
                        onClick={() => handleUpdateChatSettings({ accentColor: color })}
                        className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center overflow-hidden ${isActive ? 'border-primary scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-110'}`}
                        style={{ backgroundColor: color }}
                      >
                        {isActive && <Check size={14} className={color === "#ffffff" ? "text-black" : "text-white"} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chat Wallpaper */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground/70">
                  <ImageIcon size={14} />
                  <span>Chat Wallpaper</span>
                </div>
                
                <div className="flex flex-col gap-3">
                  {/* Link Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={wallpaperUrl}
                      onChange={(e) => setWallpaperUrl(e.target.value)}
                      placeholder="Paste image URL..."
                      className="flex-1 bg-foreground/5 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50"
                    />
                    <button
                      onClick={() => handleUpdateChatSettings({ chatWallpaper: wallpaperUrl })}
                      disabled={!wallpaperUrl || isUpdatingSettings}
                      className="px-4 py-2 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>

                  {/* File Upload Button */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUpdatingSettings}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-foreground/5 hover:bg-foreground/10 border border-border rounded-xl text-xs font-bold text-foreground transition-all"
                    >
                      {isUpdatingSettings ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      Upload from Device
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*"
                      className="hidden"
                    />

                    {currentChatSettings?.chatWallpaper && (
                      <button
                        onClick={() => handleUpdateChatSettings({ chatWallpaper: "" })}
                        className="p-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all"
                        title="Remove Wallpaper"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Reset to Global */}
              <button
                onClick={() => handleUpdateChatSettings({ reset: true })}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-500/5 text-red-500 text-[10px] font-black uppercase tracking-widest border border-red-500/10 hover:bg-red-500/10 transition-all"
              >
                <RotateCcw size={14} />
                Reset to Global Settings
              </button>
            </div>

            {/* Actions */}
            <div className="p-6 space-y-4">
              <h4 className="font-black text-[10px] text-muted-foreground uppercase tracking-[0.2em] mb-2">Actions</h4>
              
              <button
                onClick={handleFollowToggle}
                disabled={actionLoading === "follow" || profile.isBlocked}
                className={`w-full flex items-center justify-center gap-3 p-4 rounded-2xl transition-all font-bold group border ${
                  profile.isFollowing
                    ? "bg-secondary/10 text-foreground border-border hover:bg-secondary/20"
                    : "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 hover:shadow-primary/40"
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
        <div className="p-6 border-t border-border bg-muted/20">
           <p className="text-[10px] text-muted-foreground text-center font-bold uppercase tracking-widest">
             MowaChat Secure Encryption Active
           </p>
        </div>
      </div>
    </div>
  );
}
