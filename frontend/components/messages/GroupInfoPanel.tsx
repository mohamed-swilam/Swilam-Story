import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API } from "@/lib/api";
import { Conversation, Participant } from "@/types/messages";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { Trash2, LogOut, UserMinus, UserPlus, Shield, X } from "lucide-react";
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
  const [dmContacts, setDmContacts] = useState<Participant[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isDeleteChatModalOpen, setIsDeleteChatModalOpen] = useState(false);
  const [participantToRemove, setParticipantToRemove] = useState<string | null>(null);

  const isAdmin = conversation.groupAdmin === currentUserId;
  const participants = conversation.participants || [];

  useEffect(() => {
    if (isAdmin && isAdding) {
      API.getConversations().then((convs) => {
        const contacts = convs
          .filter((c: Conversation) => !c.isGroup && c.participant)
          .map((c: Conversation) => c.participant!);
        
        const eligible = contacts.filter(
          (c) => !participants.some((p) => p._id === c._id)
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

  const deleteMutation = useMutation({
    mutationFn: () => API.deleteConversation(conversation._id),
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.chats, (old: any) => 
        old?.filter((c: any) => c._id !== conversation._id)
      );
      router.push("/messages");
      onClose();
    }
  });

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-card h-full shadow-2xl flex flex-col animate-slideLeft border-l border-white/5">
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 flex-shrink-0 bg-white/2">
          <h2 className="font-bold text-lg text-white">Group Info</h2>
          <button 
            onClick={onClose} 
            className="p-2 text-muted-foreground hover:text-white hover:bg-white/10 rounded-full transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="flex flex-col items-center py-10 border-b border-white/5 bg-gradient-to-b from-white/2 to-transparent">
            <div className="relative mb-4">
              <img
                src={conversation.groupPhoto || "/user_profile.jpg"}
                alt={conversation.groupName}
                className="w-28 h-28 rounded-3xl object-cover shadow-[0_0_20px_rgba(168,85,247,0.3)] border-2 border-white/10"
              />
              <div className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-xl shadow-lg">
                <Shield size={18} />
              </div>
            </div>
            <h3 className="font-bold text-2xl text-white tracking-tight px-6 text-center">{conversation.groupName}</h3>
            <p className="text-sm text-muted-foreground mt-2 font-medium bg-white/5 px-3 py-1 rounded-full">{participants.length} Participants</p>
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
              <div className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/5 animate-slideUp">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Select contact</span>
                  <button onClick={() => setIsAdding(false)} className="text-[10px] font-bold text-white/40 hover:text-white transition-colors">CANCEL</button>
                </div>
                {dmContacts.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center italic">No eligible contacts found.</p>
                ) : (
                  <ul className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {dmContacts.map((contact) => (
                      <li key={contact._id} className="flex items-center justify-between bg-white/5 p-2.5 rounded-xl border border-white/5 hover:border-primary/30 transition-all group">
                        <div className="flex items-center gap-3">
                          <img src={contact.user_pic || "/user_profile.jpg"} alt="" className="w-8 h-8 rounded-full border border-white/10" />
                          <span className="text-sm font-bold text-white truncate">{contact.username}</span>
                        </div>
                        <button
                          onClick={() => handleAddParticipant(contact._id)}
                          disabled={loadingAction === `add-${contact._id}`}
                          className="text-[10px] font-black bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/80 transition-all disabled:opacity-50 uppercase shadow-lg shadow-primary/20"
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
                        className="w-11 h-11 rounded-full object-cover border border-white/10"
                      />
                      {p._id === conversation.groupAdmin && (
                        <div className="absolute -top-1 -right-1 bg-yellow-500 text-white p-1 rounded-md shadow-lg" title="Admin">
                          <Shield size={10} fill="currentColor" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white flex items-center gap-2">
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
                      className="text-muted-foreground hover:text-red-500 p-2 disabled:opacity-50 transition-colors bg-white/5 hover:bg-red-500/10 rounded-xl"
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
        </div>

        <div className="p-6 border-t border-white/5 bg-white/2 space-y-3">
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
