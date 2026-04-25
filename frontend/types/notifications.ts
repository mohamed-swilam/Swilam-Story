export type NotificationType = "follow" | "story_view" | "story_reply" | "story_reaction";

export interface Notification {
  _id: string;
  sender: { _id: string; username: string; user_pic: string };
  type: NotificationType;
  read: boolean;
  storyId?: string;
  conversationId?: string;
  messagePreview?: string;
  reaction?: string;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  hasMore: boolean;
  page: number;
}
