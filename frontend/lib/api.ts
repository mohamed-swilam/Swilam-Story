import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers["Authorization"] = token;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export const API = {
  login: async (data: { username: string; password: string }) => {
    const res = await api.post("/user/login", data);
    return res.data.token;
  },

  register: async (formData: FormData) => {
    const res = await api.post("/user/register", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  getFeed: async () => {
    const res = await api.get("/stories/feed");
    return res.data;
  },

  getExploreUsers: async (page = 1, search = "") => {
    const res = await api.get(`/user/explore?page=${page}&search=${search}`);
    return res.data;
  },

  getExploreStories: async () => {
    const res = await api.get("/stories/explore");
    return res.data;
  },

  getUserStories: async (userId: string) => {
    const res = await api.get(`/stories/${userId}`);
    return res.data;
  },

  newView: async (storyId: string) => {
    const res = await api.post(`/stories/${storyId}/view`);
    return res.data;
  },

  checkStoryExists: async (storyId: string) => {
    const res = await api.get(`/stories/${storyId}/exists`);
    return res.data as { exists: boolean };
  },

  uploadStory: async (formData: FormData) => {
    const res = await api.post("/stories/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  deleteStory: async (storyId: string) => {
    const res = await api.delete(`/stories/delete/${storyId}`);
    return res.data;
  },

  addReaction: async (storyId: string, emoji: string): Promise<{ success: boolean; reaction: string | null }> => {
    const res = await api.post(`/stories/${storyId}/react`, { emoji });
    return res.data;
  },

  authTest: async () => {
    const res = await api.post(`/user/auth`);
    return res.data;
  },

  // ── DM / Conversations ───────────────────────────────────────────────────

  getConversations: async () => {
    const res = await api.get("/api/conversations");
    return res.data;
  },
  getConversation: async (id: string) => {
    const res = await api.get(`/api/conversations/${id}`);
    return res.data;
  },

  getUnreadMessagesCount: async () => {
    const res = await api.get("/api/conversations/unread-count");
    return res.data as { totalUnread: number };
  },

  getMessages: async (conversationId: string, page = 1, search = "") => {
    const res = await api.get(
      `/api/conversations/${conversationId}/messages?page=${page}&search=${search}`
    );
    return res.data;
  },

  createOrGetConversation: async (participantId: string) => {
    const res = await api.post("/api/conversations", { participantId });
    return res.data;
  },
  
  deleteConversation: async (conversationId: string) => {
    const res = await api.delete(`/api/conversations/${conversationId}`);
    return res.data;
  },

  deleteMessage: async (messageId: string, forEveryone: boolean = false) => {
    const res = await api.delete(`/api/conversations/messages/${messageId}`, { data: { forEveryone } });
    return res.data;
  },
  toggleReaction: async (messageId: string, emoji: string) => {
    const res = await api.post(`/api/conversations/messages/${messageId}/react`, { emoji });
    return res.data;
  },

  getOnlineStatus: async (ids: string[]) => {
    const res = await api.get(
      `/api/users/online-status?ids=${ids.join(",")}`
    );
    return res.data as Record<string, boolean>;
  },

  // ── Groups ───────────────────────────────────────────────────────────────
  createGroup: async (formData: FormData) => {
    const res = await api.post("/api/groups", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  addParticipant: async (groupId: string, userId: string) => {
    const res = await api.post(`/api/groups/${groupId}/participants`, { userId });
    return res.data;
  },

  removeParticipant: async (groupId: string, userId: string) => {
    const res = await api.delete(`/api/groups/${groupId}/participants/${userId}`);
    return res.data;
  },

  leaveGroup: async (groupId: string) => {
    const res = await api.post(`/api/groups/${groupId}/leave`);
    return res.data;
  },

  // ── Follow System ────────────────────────────────────────────────────────
  followUser: async (userId: string) => {
    const res = await api.post(`/user/${userId}/follow`);
    return res.data;
  },
  getProfile: async (userId: string) => {
    const res = await api.get(`/user/${userId}/profile`);
    return res.data;
  },
  getFollowers: async (userId: string, page = 1) => {
    const res = await api.get(`/user/${userId}/followers?page=${page}`);
    return res.data;
  },
  getFollowing: async (userId: string, page = 1) => {
    const res = await api.get(`/user/${userId}/following?page=${page}`);
    return res.data;
  },
  updateProfile: async (formData: FormData) => {
    const res = await api.patch("/user/update-profile", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
  updateSettings: async (data: any) => {
    const res = await api.patch("/user/update-settings", data);
    return res.data;
  },
  updateChatSettings: async (data: any) => {
    const isFormData = data instanceof FormData;
    const res = await api.patch("/user/update-chat-settings", data, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
    });
    return res.data;
  },
  blockUser: async (targetUserId: string) => {
    const res = await api.post(`/user/block/${targetUserId}`);
    return res.data;
  },
  unblockUser: async (targetUserId: string) => {
    const res = await api.post(`/user/unblock/${targetUserId}`);
    return res.data;
  },
  getBlockedUsers: async () => {
    const res = await api.get("/user/blocked");
    return res.data;
  },
  uploadFile: async (formData: FormData) => {
    const res = await api.post("/api/conversations/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  uploadVoiceMessage: async (formData: FormData) => {
    const res = await api.post("/api/conversations/voice", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data as { url: string; publicId: string; duration: number };
  },
  // ── Notifications ────────────────────────────────────────────────────────
  getNotifications: async (page = 1) => {
    const res = await api.get(`/api/notifications?page=${page}`);
    return res.data;
  },
  markAllRead: async (types?: string[]) => {
    const res = await api.patch("/api/notifications/read-all", { types });
    return res.data;
  },
  markOneRead: async (notificationId: string) => {
    const res = await api.patch(`/api/notifications/${notificationId}/read`);
    return res.data;
  },
  deleteNotification: async (notificationId: string) => {
    const res = await api.delete(`/api/notifications/${notificationId}`);
    return res.data;
  },
};

export default api;

