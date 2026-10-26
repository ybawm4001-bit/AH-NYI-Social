export type Language = 'my' | 'en';

export type UserRole = 'owner' | 'admin' | 'creator' | 'user';

export interface User {
  id: string;
  name: string;
  handle: string;
  email: string;
  avatar: string;
  coverImage?: string;
  bio: string;
  role: UserRole;
  isVerified: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  createdAt: string;
  status: 'active' | 'suspended';
  phone?: string;
  website?: string;
  location?: string;
  balanceMmk?: number;
}

export type PostType = 'video' | 'photo' | 'text';

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  authorVerified: boolean;
  authorRole: UserRole;
  type: PostType;
  mediaUrl?: string;
  mediaThumbnail?: string;
  mediaDuration?: number; // in seconds
  caption: string;
  hashtags: string[];
  likes: string[]; // array of userIds
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  isSponsored?: boolean;
  sponsorName?: string;
  createdAt: string;
  privacy: 'public' | 'followers' | 'private';
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorVerified: boolean;
  content: string;
  createdAt: string;
  likesCount: number;
  likes: string[];
  parentId?: string;
  replyToAuthorName?: string;
  replyToAuthorId?: string;
}

export interface NotificationItem {
  id: string;
  recipientId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  type: 'like' | 'comment' | 'follow' | 'system';
  messageMy: string;
  messageEn: string;
  targetId?: string;
  isRead: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  text: string;
  mediaUrl?: string;
  mediaType?: 'photo' | 'video';
  createdAt: string;
  isRead: boolean;
}

export interface ReportItem {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: 'post' | 'user' | 'comment';
  targetId: string;
  targetPreview?: string;
  reason: string;
  details?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface FirebaseManualConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  isConfigured: boolean;
}

export interface SystemSettings {
  appName: string;
  allowRegistrations: boolean;
  maintenanceMode: boolean;
  adsEnabled: boolean;
  creatorRewardsEnabled: boolean;
  minPayoutMmk: number;
  announcementMy: string;
  announcementEn: string;
  cpmRateMmk: number;
}
