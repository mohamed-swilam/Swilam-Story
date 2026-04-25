import { Story} from "@/types/stories";

interface ProgressBarProps {
  stories: Story[];
  currentIndex: number;
  readyStories: boolean[];
  isPaused: boolean;
}

export default function ProgressBar({
  stories,
  currentIndex,
  readyStories,
  isPaused,
}: ProgressBarProps) {
  return (
    <div className="flex gap-1.5 w-full">
      {stories.map((s, idx) => (
        <div
          key={s._id}
          className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden relative"
        >
          {idx < currentIndex && <div className="h-full bg-white w-full" />}
          {idx === currentIndex && readyStories[idx] && (
            <div
              key={currentIndex}
              className="h-full bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]"
              style={{
                animation: `fill ${stories[currentIndex].duration}s linear forwards`,
                animationPlayState: isPaused ? "paused" : "running",
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
