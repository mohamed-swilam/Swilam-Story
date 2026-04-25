import { useState } from "react";
import { useRouter } from "next/navigation";
import { API } from "@/lib/api";
import { Conversation, Participant } from "@/types/messages";

interface Props {
  onClose: () => void;
  conversations: Conversation[];
}

export default function CreateGroupModal({ onClose, conversations }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState("");
  const [groupPhoto, setGroupPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter conversations to only DMs to show as follow contacts
  const dmContacts = conversations
    .filter((c) => !c.isGroup && c.participant)
    .map((c) => c.participant!);

  const toggleUser = (id: string) => {
    const newSet = new Set(selectedUserIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedUserIds(newSet);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setGroupPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!groupName.trim() || selectedUserIds.size === 0) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("groupName", groupName.trim());
      formData.append("participants", JSON.stringify(Array.from(selectedUserIds)));
      
      if (groupPhoto) {
        formData.append("groupPhoto", groupPhoto);
      }

      const newGroup = await API.createGroup(formData);
      onClose();
      router.push(`/messages/${newGroup._id}`);
    } catch (err: any) {
      console.error("Failed to create group:", err);
      const message = err.response?.data?.message || "Failed to create group. Check if you have DMs with all members.";
      alert(message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-card w-full sm:max-w-md h-[85vh] sm:h-auto sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl flex flex-col animate-slideUp sm:animate-none border border-white/5 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 flex-shrink-0 bg-white/2">
          <button 
            onClick={step === 2 ? () => setStep(1) : onClose} 
            className="text-muted-foreground hover:text-white transition-colors text-sm font-medium"
          >
            {step === 2 ? "← Back" : "Cancel"}
          </button>
          <h2 className="font-bold text-lg text-white">New Group</h2>
          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              disabled={selectedUserIds.size < 2}
              className="text-primary font-bold disabled:opacity-30 hover:scale-105 transition-all text-sm uppercase tracking-wider"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!groupName.trim() || isSubmitting}
              className="text-primary font-bold disabled:opacity-30 flex items-center gap-2 hover:scale-105 transition-all text-sm uppercase tracking-wider"
            >
              {isSubmitting && <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
              Create
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground font-medium">
                  Select participants
                </p>
                <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded-full">
                  {selectedUserIds.size} / 2 min
                </span>
              </div>
              
              {dmContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                  <div className="p-4 bg-white/5 rounded-full text-muted-foreground">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-muted-foreground">No contacts available.<br/>Start a DM to add members.</p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {dmContacts.map((user) => (
                    <li key={user._id}>
                      <label className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl cursor-pointer transition-all group">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.has(user._id)}
                            onChange={() => toggleUser(user._id)}
                            className="hidden"
                          />
                          <div className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${
                            selectedUserIds.has(user._id) 
                              ? "bg-primary border-primary shadow-[0_0_10px_rgba(168,85,247,0.4)]" 
                              : "border-white/10 group-hover:border-white/30"
                          }`}>
                            {selectedUserIds.has(user._id) && (
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <img
                          src={user.user_pic || "/user_profile.jpg"}
                          alt={user.username}
                          className="w-11 h-11 rounded-full object-cover border border-white/5"
                        />
                        <span className="font-bold text-white text-sm flex-1">{user.username}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-8 py-4">
              {/* Photo Picker */}
              <label className="relative cursor-pointer group">
                <div className="w-32 h-32 rounded-3xl bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden transition-all group-hover:border-primary/50 group-hover:bg-primary/5">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Add Photo</span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                {photoPreview && (
                  <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-bold uppercase tracking-wider">Change</span>
                  </div>
                )}
              </label>

              {/* Group Name Input */}
              <div className="w-full space-y-3">
                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1">
                  Group Name
                </label>
                <div className="relative group/input">
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Enter group name..."
                    className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:text-white/20 font-medium"
                    autoFocus
                  />
                </div>
                <p className="text-[10px] text-muted-foreground italic px-1">
                  Give your group a catchy name and a nice photo.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
