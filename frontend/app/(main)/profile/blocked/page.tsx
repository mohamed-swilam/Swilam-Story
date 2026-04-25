"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, UserMinus, ShieldAlert, Loader2, Ban } from "lucide-react";
import { API } from "@/lib/api";
import ConfirmModal from "@/components/modals/ConfirmModal";

export default function BlockedUsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unblocking, setUnblocking] = useState(false);

  const fetchBlocked = async () => {
    try {
      const data = await API.getBlockedUsers();
      setBlockedUsers(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBlocked();
  }, []);

  const handleUnblock = async () => {
    if (!selectedUser) return;
    setUnblocking(true);
    try {
      await API.unblockUser(selectedUser._id);
      setBlockedUsers(prev => prev.filter(u => u._id !== selectedUser._id));
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setUnblocking(false);
    }
  };

  const openModal = (user: any) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;

  return (
    <div className="h-full overflow-y-auto bg-background/50 backdrop-blur-sm">
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8 pb-32">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-white/5 rounded-full text-muted-foreground hover:text-white transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-white">Blocked Users</h1>
        </div>

        {blockedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="p-6 bg-white/5 rounded-full text-muted-foreground">
              <ShieldAlert size={48} />
            </div>
            <div>
              <p className="text-lg font-bold text-white">No Blocked Users</p>
              <p className="text-sm text-muted-foreground">You haven't blocked anyone yet.</p>
            </div>
          </div>
        ) : (
          <div className="bg-card/50 rounded-3xl border border-white/5 divide-y divide-white/5 overflow-hidden backdrop-blur-md">
            {blockedUsers.map((user) => (
              <div key={user._id} className="flex items-center justify-between p-4 group">
                <div className="flex items-center gap-4">
                  <img src={user.user_pic || "/user_profile.jpg"} alt={user.username} className="w-12 h-12 rounded-full object-cover border border-white/10" />
                  <div>
                    <p className="font-bold text-white">{user.username}</p>
                    <p className="text-xs text-muted-foreground">Blocked</p>
                  </div>
                </div>
                <button 
                  onClick={() => openModal(user)}
                  className="px-4 py-2 bg-secondary text-white text-xs font-bold rounded-xl hover:bg-primary transition-all shadow-lg"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}

        <ConfirmModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleUnblock}
          isLoading={unblocking}
          title="Unblock User?"
          description={`Are you sure you want to unblock ${selectedUser?.username}? They will be able to message you and find your profile again.`}
          confirmText="Yes, Unblock"
          type="success"
        />
      </main>
    </div>
  );
}
