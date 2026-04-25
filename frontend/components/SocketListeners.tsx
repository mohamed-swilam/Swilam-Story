"use client";

import { useEffect } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";

import { useQuery } from "@tanstack/react-query";
import { API } from "@/lib/api";

export default function SocketListeners() {
  const socket = useSocket();
  const queryClient = useQueryClient();
  const { sendNotification } = useBrowserNotifications();

  // Get current user settings for real-time filtering
  const { data: userData } = useQuery({
    queryKey: queryKeys.user,
    queryFn: () => API.authTest().then(res => res.user),
    staleTime: Infinity, // Keep in cache
  });

  useEffect(() => {
    if (!socket) return;

    const onProfileUpdate = (data: { userId: string; username: string; user_pic: string; bio: string }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(data.userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed });
      queryClient.invalidateQueries({ queryKey: ["explore-stories"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.userStories(data.userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chats });
      queryClient.invalidateQueries({ queryKey: [queryKeys.explore] });
      queryClient.invalidateQueries({ queryKey: queryKeys.user });
    };

    const onNewNotification = (notif: any) => {
      const prefs = userData?.notificationSettings || {};
      
      // Check server-side settings before showing browser pop-up
      if (notif.type === "follow"         && prefs.follows        === false) return;
      if (notif.type === "story_view"     && prefs.storyViews     === false) return;
      if (notif.type === "story_reply"    && prefs.storyReplies   === false) return;
      if (notif.type === "story_reaction" && prefs.storyReactions === false) return;

      sendNotification(`Swichat: ${notif.sender.username}`, {
        body: notif.type === "follow" ? "Started following you" : 
              notif.type === "story_view" ? "Viewed your story" :
              notif.type === "story_reply" ? `Replied: ${notif.messagePreview}` :
              notif.type === "story_reaction" ? `Reacted: ${notif.reaction}` : "New notification",
        icon: notif.sender.user_pic || "/logo.png"
      });
    };

    const onMessageReceived = (message: any) => {
      const prefs = userData?.notificationSettings || {};
      
      // Check if message notifications are enabled
      if (prefs.messages === false) return;

      sendNotification(`Message from ${message.sender.username}`, {
        body: message.type === "text" ? message.content : `Sent a ${message.type}`,
        icon: message.sender.user_pic || "/logo.png"
      });
    };

    // When someone views our story, invalidate that story owner's cache
    // so the viewer count is up-to-date the next time the owner opens their stories.
    const onNewViewer = (data: { storyId: string; viewer: any }) => {
      if (!userData) return;
      const myId = userData._id || userData.id;
      // Only update our own stories cache (the backend emits new_viewer to the story owner)
      queryClient.invalidateQueries({ queryKey: queryKeys.userStories(myId) });
    };

    socket.on("profile_update", onProfileUpdate);
    socket.on("new_notification", onNewNotification);
    socket.on("message_received", onMessageReceived);
    socket.on("new_viewer", onNewViewer);

    return () => {
      socket.off("profile_update", onProfileUpdate);
      socket.off("new_notification", onNewNotification);
      socket.off("message_received", onMessageReceived);
      socket.off("new_viewer", onNewViewer);
    };
  }, [socket, queryClient, sendNotification, userData]);

  return null;
}
