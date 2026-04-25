export interface UserProfile {
  _id: string;
  username: string;
  user_pic: string;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isBlocked: boolean;
  amIBlocked: boolean;
  isPrivate: boolean;
  followsMe: boolean;
}

export interface FollowUser {
  _id: string;
  username: string;
  user_pic: string;
}
