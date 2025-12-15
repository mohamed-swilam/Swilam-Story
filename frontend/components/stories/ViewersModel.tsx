import { useRouter } from "next/navigation";
import { Story } from "@/types/stories";

interface ViewersModalProps {
  story: Story;
  closeViewers: () => void;
  formatDate: (date: string) => string;
}

export default function ViewersModal({
  story,
  closeViewers,
  formatDate,
}: ViewersModalProps) {
  const router = useRouter();
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={closeViewers}
    >
      <div
        className="bg-white w-full max-w-md rounded-t-2xl p-4 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Viewers</h2>
          <button onClick={closeViewers} className="text-gray-500 text-xl">
            ✕
          </button>
        </div>

        <ul className="space-y-3 max-h-60 overflow-y-auto">
          {story.viewers.map((viewer, i) => (
            <li key={i} className="flex items-center gap-3 relative">
              <button
                onClick={() =>
                  router.push(`/stories/${viewer.storyViewer._id}`)
                }
                className="flex items-center gap-1"
              >
                <img
                  src={viewer.storyViewer.user_pic}
                  alt=""
                  className="w-8 h-8 object-cover rounded-full"
                />
                <span className="font-semibold">{viewer.storyViewer.username}</span>
              </button>
              <span className="text-black/60 absolute right-0 ">
                {formatDate(viewer.viewed_at)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
