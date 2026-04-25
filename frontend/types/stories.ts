export interface Owner {
  _id: string;
  username: string;
  user_pic: string;
}

export interface Viewer {
  username: string;
  _id: string;
  user_pic: string;
}

export interface Viewers {
  storyViewer: Viewer;
  viewed_at: string;
  reaction?: string | null;
}

export interface Story {
  _id: string;
  storyOwner: Owner;
  media_url?: string;
  media_type: "image" | "video" | "text" | "voice";
  duration: number;
  public_id?: string;
  content?: string;
  bg_color?: string;
  waveformData?: number[];
  viewers: Viewers[];
  isViewed: boolean;
  createdAt: string;
  updatedAt: string;
  viewersCount: number
  mine: boolean
}
