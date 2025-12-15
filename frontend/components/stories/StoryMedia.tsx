import { Story } from "@/types/stories";
import StoryHeader from "./StoryHeader";

interface StoryMediaProps {
  story: Story;
  openViewers: () => void;
  formatDate: (date: string) => string;
}

export default function StoryMedia({ story, openViewers, formatDate }: StoryMediaProps) {
  return (
    <div className=" min-h-screen w-full justify-around items-center flex flex-col">

      <StoryHeader story={story} formatDate={formatDate} />

      <div className="flex-1 flex items-center justify-center w-full relative max-h-[80vh]">
        {story.media_type === "image" && (
          <img
            src={story.media_url}
            alt="story"
            className="max-h-[80vh] object-contain"
          />
        )}
        {story.media_type === "video" && (
          <video
            src={story.media_url}
            className="max-h-[80vh] object-contain"
            autoPlay
            muted
            playsInline
          />
        )}
      </div>

        <button
          onClick={story.viewers?.length > 0 ? openViewers : undefined}
          className="text-2xl text-white"
        >
          👁️{story.viewersCount}
        </button>

    </div>
  );
}
