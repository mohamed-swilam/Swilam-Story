export const queryKeys = {
  user: ["user"] as const,
  chats: ["chats"] as const,
  messages: (chatId: string) => ["messages", chatId] as const,
  stories: ["stories"] as const,
  userStories: (userId: string) => ["stories", userId] as const,
  feed: ["feed"] as const,
  notifications: ["notifications"] as const,
  unreadCount: ["unreadCount"] as const,
  followers: (userId: string) => ["followers", userId] as const,
  following: (userId: string) => ["following", userId] as const,
  explore: ["explore"] as const,
  profile: (userId: string) => ["profile", userId] as const,
};
