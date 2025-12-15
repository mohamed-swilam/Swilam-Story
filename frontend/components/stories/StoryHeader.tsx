"use client";
import { useRouter } from "next/navigation";

interface StoryHeaderProps {
  story: Story;
  formatDate: (date: string) => string;
}
import { Story } from "@/types/stories";
import { useState } from "react";
import { API } from "@/lib/api";

export default function StoryHeader({ story, formatDate }: StoryHeaderProps) {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleDelete = async () => {
    setError("");
    setLoading(true);
    try {
      await API.deleteStory(story._id);
      router.push(`/stories/feed`);
    } catch (err: any) {
      setError(err.response.data.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex justify-between items-center gap-1 w-full mt-10 px-5">
      <div className="flex gap-2 items-center">
        <img
          src={story.storyOwner.user_pic}
          alt=""
          className="w-8 h-8 object-cover rounded-full"
        />
        <span className="text-white font-bold">
          {story.storyOwner.username}
        </span>
        <span className="text-white/70">{formatDate(story.createdAt)}</span>

        {!story.mine && (
          <button
            onClick={handleDelete}
            disabled={loading}
            className={`px-4 py-2 rounded bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors duration-200 ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        )}
      </div>

      <button
        onClick={() => router.push("/stories/feed")}
        className=" text-white text-xl font-bold"
      >
        ✕
      </button>
    </div>
  );
}
