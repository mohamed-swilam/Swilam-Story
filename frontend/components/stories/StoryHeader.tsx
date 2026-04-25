"use client";
import { useRouter } from "next/navigation";
import { Pause, Play, X } from "lucide-react";

interface StoryHeaderProps {
  story: Story;
  currentUserId?: string;
  formatDate: (date: string) => string;
  pauseStory: () => void;
  resumeStory: () => void;
  isPaused: boolean;
  onDeleteConfirmed: () => Promise<void>;
  onClose: () => void;
}
import { Story } from "@/types/stories";
import { useState, useEffect } from "react";
import ConfirmModal from "@/components/modals/ConfirmModal";

export default function StoryHeader({ 
  story, 
  currentUserId, 
  formatDate,
  pauseStory,
  resumeStory,
  isPaused,
  onDeleteConfirmed,
  onClose
}: StoryHeaderProps) {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [_, forceUpdate] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      forceUpdate(v => v + 1);
    }, 10000); // Live update every 10s
    return () => clearInterval(timer);
  }, []);

  const isMine = story.mine || (currentUserId && story.storyOwner._id === currentUserId);

  const handleDeleteClick = () => {
    pauseStory();
    setIsDeleteModalOpen(true);
  };

  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    resumeStory();
  };

  const handleConfirmDelete = async () => {
    setError("");
    setLoading(true);
    try {
      await onDeleteConfirmed();
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete story");
      resumeStory();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center gap-4 w-full px-2">
        <div className="flex gap-3 items-center">
          <button 
            onClick={() => router.push(`/profile/${story.storyOwner._id}`)}
            className="flex gap-3 items-center group transition-transform hover:scale-105 active:scale-95"
          >
            <img
              src={story.storyOwner.user_pic || "/user_profile.jpg"}
              alt={story.storyOwner.username}
              className="w-10 h-10 object-cover rounded-full border-2 border-white/20 group-hover:border-white transition-all shadow-lg"
            />
            <div className="flex flex-col items-start">
              <span className="text-white font-bold text-sm drop-shadow-md">
                {story.storyOwner.username}
              </span>
              <span className="text-white/60 text-[10px] uppercase tracking-wider font-medium">
                {formatDate(story.createdAt)}
              </span>
            </div>
          </button>

          {isMine && (
            <button
              onClick={handleDeleteClick}
              disabled={loading}
              className={`p-2 rounded-full text-white bg-red-500/10 hover:bg-red-500/40 transition-all hover:scale-110 active:scale-90 ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
              title="Delete Story"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              isPaused ? resumeStory() : pauseStory();
            }}
            className="p-2 text-white/70 hover:text-white transition-all hover:bg-white/10 rounded-full flex items-center justify-center hover:scale-110 active:scale-90"
          >
            {isPaused ? <Play size={20} fill="currentColor" /> : <Pause size={20} fill="currentColor" />}
          </button>

          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white transition-all hover:bg-white/10 rounded-full hover:scale-110 active:scale-90"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="Delete Story?"
        description="This story will be permanently deleted."
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={loading}
        type="danger"
      />
    </>
  );
}
