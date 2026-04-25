import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { API } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Conversation, Participant } from "@/types/messages";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { Trash2, LogOut, UserMinus, UserPlus, Shield, X, Palette, Type, Image as ImageIcon, RotateCcw, Upload, Check, Loader2 } from "lucide-react";
import ConfirmationModal from "@/components/ui/ConfirmationModal";

interface Props {
  conversation: Conversation;
  currentUserId: string;
  onClose: () => void;
  onUpdateConversation: (updated: Conversation) => void;
}

export default function GroupInfoPanel({
  conversation,
  currentUserId,
  onClose,
  onUpdateConversation,
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [dmContacts, setDmContacts] = useState<Participant[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isDeleteChatModalOpen, setIsDeleteChatModalOpen] = useState(false);
  const [participantToRemove, setParticipantToRemove] = useState<string | null>(null);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  const COLORS = ["#a855f7", "#3b82f6", "#10b981", "#ef4444", "#f59e0b", "#ec4899", "#06b6d4", "#ffffff"];

  const currentChatSettings = currentUser?.chatSettings?.find(
    (s: any) => s.conversationId?.toString() === conversation._id
  );

  const isAdmin = conversation.groupAdmin === currentUserId;
  const participants = conversation.participants || [];

  useEffect(() => {
    if (isAdmin && isAdding) {
      API.getConversations().then((convs) => {
        const contacts = convs
          .filter((c: Conversation) => !c.isGroup && c.participant)
          .map((c: Conversation) => c.participant!);
        
        const eligible = contacts.filter(
          (c: Participant) => !participants.some((p) => p._id === c._id)
        );
        setDmContacts(eligible);
      });
    }
  }, [isAdmin, isAdding, participants]);

  const handleAddParticipant = async (userId: string) => {
    setLoadingAction(`add-${userId}`);
    try {
      const updated = await API.addParticipant(conversation._id, userId);
      onUpdateConversation({ ...conversation, participants: updated.participants });
      setIsAdding(false);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to add participant.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRemoveParticipant = async () => {
    if (!participantToRemove) return;
    setLoadingAction(`remove-${participantToRemove}`);
    try {
      const updated = await API.removeParticipant(conversation._id, participantToRemove);
      onUpdateConversation({ ...conversation, participants: updated.participants });
      setParticipantToRemove(null);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to remove participant.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleLeaveGroup = async () => {
    try {
      await API.leaveGroup(conversation._id);
      router.push("/messages");
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to leave group.");
    }
  };

  const handleUpdateChatSettings = async (data: any) => {
    setIsUpdatingSettings(true);
    
    // Optimistic Update for Real-time feel
    if (!data.file) {
      queryClient.setQueryData(queryKeys.user, (old: any) => {
        if (!old) return old;
        
        const newChatSettings = old.chatSettings ? JSON.parse(JSON.stringify(old.chatSettings)) : [];
        const idx = newChatSettings.findIndex((s: any) => s.conversationId?.toString() === conversation._id);
        
        if (data.reset) {
          const filtered = newChatSettings.filter((s: any) => s.conversationId?.toString() !== conversation._id);
          return { ...old, chatSettings: filtered };
        }

        const settingsData = { conversationId: conversation._id, ...data };
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
        formData.append("conversationId", conversation._id);
        formData.append("chatWallpaper", data.file);
        const res = await API.updateChatSettings(formData);
        // After upload, update cache with the actual URL from server
        queryClient.setQueryData(queryKeys.user, (old: any) => ({
          ...old,
          chatSettings: res.chatSettings
        }));
      } else {
        const res = await API.updateChatSettings({ conversationId: conversation._id, ...data });
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
    mutationFn: () => API.deleteConversation(conversation._id),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.chats, (old: any) => 
        old?.filter((c: any) => c._id !== conversation._id)
      );
      router.push("/messages");
      handleClose();
    }
  });

  return (
    <div className={`fixed inset-0 z-[100] flex justify-end bg-background/60 backdrop-blur-sm duration-300 ${isClosing ? 'animate-out fade-out' : 'animate-in fade-in'}`}>
      <div className="absolute inset-0" onClick={handleClose} />

      <div className={`relative w-full max-w-sm bg-card h-full shadow-2xl flex flex-col border-l border-border duration-300 ease-out fill-mode-forwards ${isClosing ? 'animate-out slide-out-to-right-full' : 'animate-in slide-in-from-right-full'}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0 bg-muted/20">
          <h2 className="font-bold text-lg text-foreground">Group Info</h2>
          <button 
            onClick={handleClose} 
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-foreground/10 rounded-full transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex flex-col items-center py-10 border-b border-border bg-gradient-to-b from-muted/20 to-transparent">
            <div className="relative mb-4">
              <img
                src={conversation.groupPhoto || "/user_profile.jpg"}
                alt={conversation.groupName}
                className="w-28 h-28 rounded-3xl object-cover shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] border-2 border-border"
              />
              <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground p-2 rounded-xl shadow-lg">
                <Shield size={18} />
              </div>
            </div>
            <h3 className="font-bold text-2xl text-foreground tracking-tight px-6 text-center">{conversation.groupName}</h3>
            <p className="text-sm text-muted-foreground mt-2 font-medium bg-foreground/5 px-3 py-1 rounded-full">{participants.length} Participants</p>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-black text-[10px] text-muted-foreground uppercase tracking-[0.2em]">Participants</h4>
              {isAdmin && !isAdding && (
                <button
                  onClick={() => setIsAdding(true)}
                  className="text-xs font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-lg"
                >
                  <UserPlus size={14} />
                  Add
                </button>
              )}
            </div>

            {isAdding && (
              <div className="mb-6 p-4 bg-muted/20 rounded-2xl border border-border animate-slideUp">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Select contact</span>
                  <button onClick={() => setIsAdding(false)} className="text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors">CANCEL</button>
                </div>
                {dmContacts.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center italic">No eligible contacts found.</p>
                ) : (
                  <ul className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {dmContacts.map((contact) => (
                      <li key={contact._id} className="flex items-center justify-between bg-card p-2.5 rounded-xl border border-border hover:border-primary/30 transition-all group">
                        <div className="flex items-center gap-3">
                          <img src={contact.user_pic || "/user_profile.jpg"} alt="" className="w-8 h-8 rounded-full border border-border" />
                          <span className="text-sm font-bold text-foreground truncate">{contact.username}</span>
                        </div>
                        <button
                          onClick={() => handleAddParticipant(contact._id)}
                          disabled={loadingAction === `add-${contact._id}`}
                          className="text-[10px] font-black bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/80 transition-all disabled:opacity-50 uppercase shadow-lg shadow-primary/20"
                        >
                          {loadingAction === `add-${contact._id}` ? "..." : "Add"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <ul className="space-y-5">
              {participants.map((p) => (
                <li key={p._id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img
                        src={p.user_pic || "/user_profile.jpg"}
                        alt={p.username}
                        className="w-11 h-11 rounded-full object-cover border border-border"
                      />
                      {p._id === conversation.groupAdmin && (
                        <div className="absolute -top-1 -right-1 bg-yellow-500 text-white p-1 rounded-md shadow-lg" title="Admin">
                          <Shield size={10} fill="currentColor" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground flex items-center gap-2">
                        {p.username} {p._id === currentUserId && <span className="text-[10px] text-primary">(You)</span>}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-semibold  tracking-tight">
                        {p._id === conversation.groupAdmin ? "Admin" : "Member"}
                      </p>
                    </div>
                  </div>

                  {isAdmin && p._id !== currentUserId && (
                    <button
                      onClick={() => setParticipantToRemove(p._id)}
                      disabled={loadingAction === `remove-${p._id}`}
                      className="text-muted-foreground hover:text-red-500 p-2 disabled:opacity-50 transition-colors bg-foreground/5 hover:bg-red-500/10 rounded-xl"
                      title="Remove participant"
                    >
                      {loadingAction === `remove-${p._id}` ? (
                        <span className="block w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <UserMinus size={18} />
                      )}
                    </button>
                  )}
                </li>
              ))}
            </ul>
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
        </div>

        <div className="p-6 border-t border-border bg-muted/20 space-y-3">
          <button
            onClick={() => setIsDeleteChatModalOpen(true)}
            className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl transition-all font-bold group border bg-red-500/5 text-red-500 border-red-500/10 hover:bg-red-500/10"
          >
            <Trash2 size={20} />
            Delete Group Chat
          </button>
          
          <button
            onClick={() => setIsLeaveModalOpen(true)}
            className="w-full py-4 text-red-500 font-black text-sm tracking-widest bg-red-500/5 hover:bg-red-500/20 rounded-2xl transition-all border border-red-500/10 hover:border-red-500/30 shadow-lg shadow-red-500/5 flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            Leave Group
          </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isDeleteChatModalOpen}
        onClose={() => setIsDeleteChatModalOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        isLoading={deleteMutation.isPending}
        title="Delete Group History?"
        message="This will clear your personal history for this group chat. You will still be a member of the group."
        confirmText="Yes, Delete History"
      />

      <ConfirmationModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onConfirm={handleLeaveGroup}
        title="Leave Group?"
        message="Are you sure you want to leave this group? You won't be able to see future messages."
        confirmText="Leave"
      />

      <ConfirmationModal
        isOpen={!!participantToRemove}
        onClose={() => setParticipantToRemove(null)}
        onConfirm={handleRemoveParticipant}
        title="Remove Participant?"
        message="Are you sure you want to remove this user from the group?"
        confirmText="Remove"
      />
    </div>
  );
}
