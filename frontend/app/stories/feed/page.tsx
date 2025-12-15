"use client";

import { useEffect, useState } from "react";
import StoriesBar from "@/components/stories/StoriesBar";
import { API } from "@/lib/api";
import { useRouter } from "next/navigation";
import ProtectedPage from "@/components/ProtectedPage";
interface Feed {
  storyOwner: string;
  hasNewStory: boolean;
  username: string;
  user_pic: string;
}
interface User {
  username: string;
  id: string;
  user_pic: string;
}
export default function StoriesPage() {
  const router = useRouter();
  const [hasStory, setHasStory] = useState<boolean>(false);
  const [feed, setFeed] = useState<Feed[]>([]);
  const [user, setUser] = useState<User>({
    username: "",
    user_pic: "",
    id: "",
  });
  useEffect(() => {
    const fetchs = async () => {
      await API.authTest()
        .then((data) => setUser(data.user))
        .catch(console.error);

      await API.getFeed()
        .then((data) => setFeed(data))
        .catch(console.error);

      if (!user.id) return;

      await API.getUserStories(user.id).then((data) => {
        if (data.length > 0) {
          setHasStory(true);
        }
      });
    };
    fetchs();
  }, [user.id]);

  return (
    <ProtectedPage loadingBG="">
      <main className="min-h-screen bg-gray-100">
        <header className="bg-white border-b p-4 flex justify-between">
          <button
            className="flex items-center gap-1"
            onClick={() => {
              router.push(`/stories/${user.id}`);
            }}
          >
            <img
              src={user.user_pic || "/user_profile.jpg"}
              alt=""
              className={`size-14 rounded-full object-cover ${
                hasStory ? "border-4 border-red-500" : ""
              }`}
            />
            <h1 className="font-bold text-sm">{user.username}</h1>
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("token");
              location.href = "/login";
            }}
            className="text-sm text-red-500 font-bold"
          >
            Logout
          </button>
        </header>

        <StoriesBar feed={feed} />

        <p className="p-6 text-center text-gray-500">
          { "Select Story to View"}
        </p>
      </main>
    </ProtectedPage>
  );
}
