import { useRouter } from "next/navigation";
import { Story, Viewers } from "@/types/stories";
import { API } from "@/lib/api";
import { useState, useEffect } from "react";
import { useSocket } from "@/hooks/useSocket";

interface ViewersModalProps {
  currentStoryId: string;
  initialViewers: Viewers[];
  closeViewers: () => void;
  formatDate: (date: string) => string;
}

function ViewerItem({
  viewer,
  formatDate,
  handleDM,
  loadingId,
}: {
  viewer: Viewers;
  formatDate: (date: string) => string;
  handleDM: (id: string) => void;
  loadingId: string | null;
}) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(true);
  const [isFollowActionLoading, setIsFollowActionLoading] = useState(false);

  useEffect(() => {
    API.getProfile(viewer.storyViewer._id)
      .then((data) => {
        setIsFollowing(data.isFollowing);
      })
      .catch(console.error)
      .finally(() => setFollowLoading(false));
  }, [viewer.storyViewer._id]);

  const toggleFollow = async () => {
    setIsFollowActionLoading(true);
    const prev = isFollowing;
    setIsFollowing(!prev); // Optimistic
    try {
      const data = await API.followUser(viewer.storyViewer._id);
      setIsFollowing(data.following);
    } catch (err) {
      setIsFollowing(prev); // Revert
    } finally {
      setIsFollowActionLoading(false);
    }
  };

  return (
    <li className="flex items-center gap-3 p-2 rounded-xl hover:bg-foreground/5 transition-colors">
      <button
        onClick={() => router.push(`/profile/${viewer.storyViewer._id}`)}
        className="flex items-center gap-3 flex-1 min-w-0 text-left group"
      >
        <img
          src={viewer.storyViewer.user_pic || "/user_profile.jpg"}
          alt=""
          className="w-10 h-10 object-cover rounded-full flex-shrink-0 border-2 border-border group-hover:border-primary transition-colors shadow-md"
        />
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-foreground text-sm truncate">
            {viewer.storyViewer.username}
          </span>
          <span className="text-muted-foreground text-[10px] uppercase font-semibold">
            {formatDate(viewer.viewed_at)}
          </span>
        </div>
      </button>

      {/* Reaction badge */}
      {viewer.reaction && (
        <span
          className="text-base px-1.5 py-0.5 rounded-xl flex-shrink-0 bg-foreground/10"
        >
          {viewer.reaction}
        </span>
      )}

      <div className="flex items-center gap-2">
        {!followLoading && (
          <button
            onClick={toggleFollow}
            disabled={isFollowActionLoading}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all disabled:opacity-50 ${
              isFollowing 
                ? "bg-foreground/10 text-foreground hover:bg-foreground/20" 
                : "bg-primary text-primary-foreground hover:bg-primary/80 shadow-[0_0_10px_rgba(var(--primary-rgb),0.4)]"
            }`}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
        )}

        <button
          onClick={() => handleDM(viewer.storyViewer._id)}
          disabled={loadingId === viewer.storyViewer._id}
          title="Send message"
          className="flex-shrink-0 w-9 h-9 rounded-full bg-foreground/5 text-foreground flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-50 border border-border"
        >
          {loadingId === viewer.storyViewer._id ? (
            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          )}
        </button>
      </div>
    </li>
  );
}

interface NewViewerPayload {
  storyId: string;
  viewer: {
    userId: string;
    username: string;
    user_pic: string;
    viewed_at: string;
  };
}

interface StoryReactionPayload {
  storyId: string;
  viewer: {
    userId: string;
    username: string;
    user_pic: string;
    reaction: string | null;
  };
}

export default function ViewersModal({
  currentStoryId,
  initialViewers,
  closeViewers,
  formatDate,
}: ViewersModalProps) {
  const router = useRouter();
  const socket = useSocket();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [viewers, setViewers] = useState<Viewers[]>(initialViewers);
  const [_, forceUpdate] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      forceUpdate(v => v + 1);
    }, 10000); // Update every 10s for snappier UI
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setViewers(initialViewers);
  }, [initialViewers]);

  useEffect(() => {
    if (!socket || !currentStoryId) return;

    const handleNewViewer = ({ storyId, viewer }: NewViewerPayload) => {
      if (storyId.toString() !== currentStoryId.toString()) return;

      setViewers(prev => {
        const exists = prev.find(
          v => v.storyViewer._id.toString() === viewer.userId.toString()
        );
        if (exists) return prev;

        return [...prev, {
          storyViewer: {
            _id: viewer.userId,
            username: viewer.username,
            user_pic: viewer.user_pic
          },
          viewed_at: viewer.viewed_at,
          reaction: null
        }];
      });
    };

    const handleStoryReaction = ({ storyId, viewer }: StoryReactionPayload) => {
      if (storyId.toString() !== currentStoryId.toString()) return;

      setViewers(prev => {
        const exists = prev.find(
          v => v.storyViewer._id.toString() === viewer.userId.toString()
        );

        if (exists) {
          return prev.map(v =>
            v.storyViewer._id.toString() === viewer.userId.toString()
              ? { ...v, reaction: viewer.reaction }
              : v
          );
        } else if (viewer.reaction) {
          return [...prev, {
            storyViewer: {
              _id: viewer.userId,
              username: viewer.username,
              user_pic: viewer.user_pic
            },
            viewed_at: new Date().toISOString(),
            reaction: viewer.reaction
          }];
        }
        return prev;
      });
    };

    socket.on("new_viewer", handleNewViewer);
    socket.on("story_reaction", handleStoryReaction);

    return () => {
      socket.off("new_viewer", handleNewViewer);
      socket.off("story_reaction", handleStoryReaction);
    };
  }, [socket, currentStoryId]);

  const handleDM = async (viewerId: string) => {
    setLoadingId(viewerId);
    try {
      const conv = await API.createOrGetConversation(viewerId);
      router.push(`/messages/${conv._id}`);
    } catch (err) {
      console.error("DM error:", err);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div
      className="absolute inset-0 z-[100] flex items-end justify-center bg-background/60 backdrop-blur-sm"
      onClick={closeViewers}
    >
      <div
        className="bg-card w-full max-w-md rounded-t-3xl p-6 animate-page-in shadow-2xl border-t border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground">Viewers</h2>
            <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-bold rounded-full">
              {viewers.length}
            </span>
          </div>
          <button 
            onClick={closeViewers} 
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-foreground/10 rounded-full transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {viewers.length === 0 ? (
            <li className="text-center py-10 text-muted-foreground italic">
              No viewers yet
            </li>
          ) : (
            viewers.map((viewer, i) => (
              <div key={viewer.storyViewer._id} className={`stagger-item stagger-delay-${Math.min(i + 1, 5)}`}>
                <ViewerItem 
                  viewer={viewer} 
                  formatDate={formatDate} 
                  handleDM={handleDM} 
                  loadingId={loadingId} 
                />
              </div>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}


