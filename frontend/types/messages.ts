export interface Participant {
  _id: string;
  username: string;
  user_pic: string;
  isPrivate?: boolean;
  followsMe?: boolean;
  isBlocked?: boolean;
  amIBlocked?: boolean;
}

export interface LastMessage {
  _id: string;
  content: string;
  type?: "text" | "image" | "file" | "voice";
  sender: {
    _id: string;
    username: string;
    user_pic: string;
  } | string;
  createdAt: string;
  readBy: string[];
}

export interface Conversation {
  _id: string;
  participant?: Participant; // Optional for groups
  participants?: Participant[]; // Added for group info
  isGroup?: boolean;
  groupName?: string;
  groupPhoto?: string;
  groupAdmin?: string;
  lastMessage: LastMessage | null;
  unreadCount: number;
  updatedAt: string;
  isTyping?: boolean;
  typingUsername?: string;
}

export interface MessageSender {
  _id: string;
  username: string;
  user_pic: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  sender: MessageSender;
  content: string;
  type: "text" | "image" | "video" | "file" | "voice";
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  voiceMessage?: {
    url: string;
    duration: number;
    publicId: string;
    waveformData: number[];
  };
  storyReply?: {
    storyId: string;
    mediaUrl?: string;
    mediaType: "image" | "video" | "text" | "voice";
    storyOwnerId: string;
    content?: string;
    bg_color?: string;
  };
  replyTo?: {
    messageId: string;
    content: string;
    senderUsername: string;
  };
  reactions?: {
    userId: string;
    emoji: string;
  }[];
  readBy: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MessagesPage {
  messages: Message[];
  page: number;
  totalPages: number;
  hasMore: boolean;
}
