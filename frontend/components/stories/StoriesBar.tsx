import { useRouter } from "next/navigation";

interface Feed {
  storyOwner: string;
  hasNewStory: boolean;
  username: string;
  user_pic: string;
}

interface Props {
  feed: Feed[];
}

export default function StoriesBar({ feed }: Props) {
  const router = useRouter();
  return (
    <div className="bg-white p-4 flex gap-4 overflow-x-auto border-b min-h-[10vh] items-center justify-start">
      <button
        onClick={() => router.push("/stories/upload")}
        className="w-16 h-16 rounded-full border-4 border-gray-300 flex items-center justify-center font-bold text-xl"
      >
        +
      </button>
      {feed.map((f) => (
        <button
          key={f.storyOwner}
          onClick={() => router.push(`/stories/${f.storyOwner}`)}
          className={`w-16 h-16 rounded-full border-4 flex-col items-center justify-center 
            ${f.hasNewStory ? "border-red-500" : "border-gray-300"}
          `}
        >
          <img
            src={f.user_pic}
            alt={f.username}
            className="w-full h-full rounded-full object-cover"
          />
          <p className="font-semibold">{f.username}</p>
        </button>
      ))}
    </div>
  );
}
