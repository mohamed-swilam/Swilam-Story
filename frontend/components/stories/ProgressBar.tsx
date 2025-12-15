import { Story} from "@/types/stories";

interface ProgressBarProps {
  stories: Story[];
  currentIndex: number;
  readyStories: boolean[];
}

export default function ProgressBar({
  stories,
  currentIndex,
  readyStories,
}: ProgressBarProps) {
  return (
    <div className="absolute top-4 left-0 right-0 flex gap-1 p-2">
      {stories.map((s, idx) => (
        <div
          key={s._id}
          className="flex-1 h-1 bg-gray-500 rounded overflow-hidden relative"
        >
          {idx < currentIndex && <div className="h-full bg-white w-full" />}
          {idx === currentIndex && readyStories[idx] && (
            <div
              key={currentIndex}
              className="h-full bg-white"
              style={{
                animation: `fill ${stories[currentIndex].duration}s linear forwards`,
              }}
            />
          )}
        </div>
      ))}
      <style>
        {`
            @keyframes fill {
              from { width: 0%; }
              to { width: 100%; }
            }
          `}
      </style>
    </div>
  );
}
