import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:3000", // غير حسب السيرفر
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

  getUserStories: async (userId: string) => {
    const res = await api.get(`/stories/${userId}`);
    return res.data;
  },

  newView: async (storyId: string) => {
    const res = await api.post(`/stories/${storyId}/view`);
    return res.data;
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

  authTest: async () => {
    const res = await api.post(`/user/auth`);
    return res.data;
  },
};

export default api;
