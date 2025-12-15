import { useEffect, useState, useRef } from "react";
import { API } from "@/lib/api";
import { Story} from "@/types/stories";

interface UseStoriesProps {
  userId: string;
}

export function useStories({ userId }: UseStoriesProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [readyStories, setReadyStories] = useState<boolean[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userId) return;
    const fetchStories = async () => {
      try {
        const data = await API.getUserStories(userId);
        setStories(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchStories();
  }, [userId]);

  useEffect(() => {
    const loadAll = async () => {
      const readyArr = await Promise.all(
        stories.map(
          (story) =>
            new Promise<boolean>((resolve) => {
              if (story.media_type === "image") {
                const img = new Image();
                img.src = story.media_url;
                img.onload = () => resolve(true);
                img.onerror = () => resolve(false);
              } else {
                const video = document.createElement("video");
                video.src = story.media_url;
                video.onloadeddata = () => resolve(true);
                video.onerror = () => resolve(false);
              }
            })
        )
      );
      setReadyStories(readyArr);
    };
    if (stories.length) loadAll();
  }, [stories]);

  useEffect(() => {
    if (!stories.length || !readyStories[currentIndex]) return;
    const currentStory = stories[currentIndex];
    API.newView(currentStory._id).catch(console.error);

    timerRef.current = setTimeout(() => {
      setCurrentIndex((prev) =>
        prev + 1 < stories.length ? prev + 1 : 0
      );
    }, currentStory.duration * 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, stories, readyStories]);


  const nextStory = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCurrentIndex((prev) => (prev + 1 < stories.length ? prev + 1 : prev));
  };
  const prevStory = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCurrentIndex((prev) => (prev - 1 >= 0 ? prev - 1 : prev));
  };


  return {
    stories,
    readyStories,
    currentIndex,
    setCurrentIndex,
    nextStory,
    prevStory,
  };
}
