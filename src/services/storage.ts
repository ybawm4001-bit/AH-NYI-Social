import { 
  User, 
  Post, 
  Comment, 
  NotificationItem, 
  ChatMessage, 
  ReportItem, 
  SystemSettings, 
  FirebaseManualConfig 
} from '../types';
import { 
  initialUsers, 
  initialPosts, 
  initialNotifications, 
  initialMessages, 
  initialSystemSettings,
  OWNER_EMAIL 
} from './initialData';

const DB_NAME = 'AH_NYI_INDEXED_DB_V3';
const DB_VERSION = 1;

class AhNyiStorageService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<IDBDatabase>;

  constructor() {
    this.initPromise = this.openDB();
    this.initPromise.then(async () => {
      await this.seedIfEmpty();
    }).catch((err) => {
      console.warn('IndexedDB initial connection notice:', err);
    });
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB not supported'));
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const stores = ['posts', 'media', 'users', 'comments', 'notifications', 'messages', 'reports', 'settings'];
        stores.forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const keyPath = storeName === 'settings' ? 'key' : 'id';
            db.createObjectStore(storeName, { keyPath });
          }
        });
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        reject(request.error);
      };

      request.onblocked = () => {
        console.warn('IndexedDB version upgrade blocked.');
      };
    });
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;
    return await this.initPromise;
  }

  private async seedIfEmpty() {
    try {
      const existingPosts = await this.getAllFromStore<Post>('posts');
      if (!existingPosts || existingPosts.length === 0) {
        for (const p of initialPosts) {
          await this.putToStore('posts', p);
        }
        for (const u of initialUsers) {
          await this.putToStore('users', u);
        }
        for (const n of initialNotifications) {
          await this.putToStore('notifications', n);
        }
        for (const m of initialMessages) {
          await this.putToStore('messages', m);
        }
        await this.putToStore('settings', { key: 'system', value: initialSystemSettings });
      }
    } catch (e) {
      console.warn('Seed initialization error:', e);
    }
  }

  // --- IndexedDB Core Operations with oncomplete guarantee ---
  private async getAllFromStore<T>(storeName: string): Promise<T[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve(this.getLocalMetadataFallback(storeName));
      });
    } catch {
      return this.getLocalMetadataFallback(storeName);
    }
  }

  private async putToStore<T extends { id?: string; key?: string }>(storeName: string, item: T): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } catch (err) {
      console.warn(`IndexedDB put error on ${storeName}:`, err);
    }

    // Mirror safe lightweight metadata to localStorage (strip heavy base64 to prevent QuotaExceededError!)
    this.syncSafeLocalMetadata(storeName, item);
  }

  private async deleteFromStore(storeName: string, id: string): Promise<void> {
    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn(`IndexedDB delete error on ${storeName}:`, err);
    }

    // Delete from safe metadata cache
    try {
      const raw = localStorage.getItem(`ahnyi_meta_${storeName}`);
      if (raw) {
        const items = JSON.parse(raw);
        const filtered = items.filter((x: any) => x.id !== id && x.key !== id);
        localStorage.setItem(`ahnyi_meta_${storeName}`, JSON.stringify(filtered));
      }
    } catch {}
  }

  // Store lightweight metadata in localStorage without multi-megabyte base64 payloads
  private syncSafeLocalMetadata<T extends { id?: string; key?: string }>(storeName: string, item: T) {
    try {
      let safeItem: any = { ...item };
      // If item has a massive base64 mediaUrl, keep mediaThumbnail or truncate dataURL in localStorage index
      if (safeItem.mediaUrl && typeof safeItem.mediaUrl === 'string' && safeItem.mediaUrl.startsWith('data:')) {
        safeItem.hasOfflineData = true;
        // Keep first 100 chars in localStorage as placeholder while full data lives in IndexedDB
        safeItem._mediaUrlSample = safeItem.mediaUrl.substring(0, 50);
      }

      const raw = localStorage.getItem(`ahnyi_meta_${storeName}`);
      const current = raw ? JSON.parse(raw) : [];
      const id = safeItem.id || safeItem.key;
      const index = current.findIndex((x: any) => (x.id || x.key) === id);
      if (index >= 0) {
        current[index] = safeItem;
      } else {
        current.unshift(safeItem);
      }
      localStorage.setItem(`ahnyi_meta_${storeName}`, JSON.stringify(current));
    } catch (e) {
      // LocalStorage quota safety catch
    }
  }

  private getLocalMetadataFallback<T>(storeName: string): T[] {
    try {
      const raw = localStorage.getItem(`ahnyi_meta_${storeName}`);
      if (raw) return JSON.parse(raw);
      if (storeName === 'posts') return initialPosts as unknown as T[];
      if (storeName === 'users') return initialUsers as unknown as T[];
      if (storeName === 'notifications') return initialNotifications as unknown as T[];
      if (storeName === 'messages') return initialMessages as unknown as T[];
    } catch {}
    return [];
  }

  // --- POSTS (Guaranteed Permanent Persistence) ---
  async getPosts(): Promise<Post[]> {
    try {
      const posts = await this.getAllFromStore<Post>('posts');
      if (posts && posts.length > 0) {
        return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    } catch (e) {
      console.warn('getPosts error:', e);
    }
    const fallback = this.getLocalMetadataFallback<Post>('posts');
    if (fallback && fallback.length > 0) return fallback;
    return initialPosts;
  }

  async createPost(post: Post): Promise<void> {
    const author = await this.getUserById(post.authorId);
    if (author && author.status === 'suspended') {
      throw new Error('သင်၏ အကောင့်အား ပလက်ဖောင်းမှ ပိတ်သိမ်း (Ban) ထားသောကြောင့် Post တင်၍ မရနိုင်ပါ။');
    }

    // Save full post object with media directly to IndexedDB
    await this.putToStore('posts', post);

    // If author is NOT the owner, send automatic alert to the Owner
    if (author && author.email.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
      await this.addNotification({
        id: `notif_owner_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        recipientId: 'user_owner_001',
        senderId: post.authorId,
        senderName: post.authorName,
        senderAvatar: post.authorAvatar,
        type: 'system',
        messageMy: `[Owner သီးသန့် အသိပေးချက်] ${post.authorName} မှ ${post.type === 'video' ? 'ဗီဒီယို' : 'Post'} အသစ်တစ်ခု တင်လိုက်ပါပြီ: "${(post.caption || '').slice(0, 45)}..." (စစ်ဆေး/ဖျက်နိုင်ပါသည်)`,
        messageEn: `[Owner Alert] ${post.authorName} uploaded a new ${post.type}: "${(post.caption || '').slice(0, 45)}..."`,
        targetId: post.id,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }
  }

  async deletePost(postId: string): Promise<void> {
    await this.deleteFromStore('posts', postId);
  }

  async updatePost(postId: string, changes: Partial<Post>): Promise<Post | null> {
    const posts = await this.getPosts();
    const existing = posts.find(p => p.id === postId);
    if (!existing) return null;
    const updated = { ...existing, ...changes };
    await this.putToStore('posts', updated);
    return updated;
  }

  async toggleLikePost(postId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
    const posts = await this.getPosts();
    const post = posts.find(p => p.id === postId);
    if (!post) return { liked: false, likesCount: 0 };

    const liked = post.likes.includes(userId);
    let newLikes: string[];
    if (liked) {
      newLikes = post.likes.filter(id => id !== userId);
    } else {
      newLikes = [...post.likes, userId];
    }
    const updatedPost: Post = {
      ...post,
      likes: newLikes,
      likesCount: newLikes.length
    };
    await this.putToStore('posts', updatedPost);
    return { liked: !liked, likesCount: newLikes.length };
  }

  // --- COMMENTS ---
  async getComments(postId: string): Promise<Comment[]> {
    const comments = await this.getAllFromStore<Comment>('comments');
    return comments
      .filter(c => c.postId === postId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async addComment(comment: Comment): Promise<void> {
    const author = await this.getUserById(comment.authorId);
    if (author && author.status === 'suspended') {
      throw new Error('သင်၏ အကောင့်အား ပိတ်သိမ်း (Ban) ထားသောကြောင့် မှတ်ချက်ရေးသား၍ မရနိုင်ပါ။');
    }

    await this.putToStore('comments', comment);
    const posts = await this.getPosts();
    const post = posts.find(p => p.id === comment.postId);
    if (post) {
      post.commentsCount = (post.commentsCount || 0) + 1;
      await this.putToStore('posts', post);
    }
  }

  async deleteComment(commentId: string, postId: string): Promise<void> {
    await this.deleteFromStore('comments', commentId);
    const posts = await this.getPosts();
    const post = posts.find(p => p.id === postId);
    if (post) {
      post.commentsCount = Math.max(0, (post.commentsCount || 1) - 1);
      await this.putToStore('posts', post);
    }
  }

  async toggleLikeComment(commentId: string, userId: string): Promise<{ liked: boolean; likesCount: number }> {
    const comments = await this.getAllFromStore<Comment>('comments');
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return { liked: false, likesCount: 0 };

    const liked = (comment.likes || []).includes(userId);
    let newLikes: string[];
    if (liked) {
      newLikes = (comment.likes || []).filter(id => id !== userId);
    } else {
      newLikes = [...(comment.likes || []), userId];
    }
    comment.likes = newLikes;
    comment.likesCount = newLikes.length;
    await this.putToStore('comments', comment);
    return { liked: !liked, likesCount: newLikes.length };
  }

  // --- MUTUAL FOLLOW SYSTEM ---
  getFollowingList(userId: string): string[] {
    try {
      const raw = localStorage.getItem(`ahnyi_following_${userId}`);
      if (raw) return JSON.parse(raw);
    } catch {}
    return userId === 'user_owner_001' ? ['user_creator_002', 'user_creator_003'] : ['user_owner_001'];
  }

  isFollowing(followerId: string, targetUserId: string): boolean {
    if (!followerId || !targetUserId || followerId === targetUserId) return false;
    const following = this.getFollowingList(followerId);
    return following.includes(targetUserId);
  }

  async toggleFollowUser(followerId: string, targetUserId: string): Promise<{ isFollowing: boolean; targetFollowersCount: number }> {
    if (!followerId || !targetUserId || followerId === targetUserId) {
      const target = await this.getUserById(targetUserId);
      return { isFollowing: false, targetFollowersCount: target?.followersCount || 0 };
    }

    const following = this.getFollowingList(followerId);
    const alreadyFollowing = following.includes(targetUserId);
    let nextFollowing: string[];
    let isNowFollowing: boolean;

    if (alreadyFollowing) {
      nextFollowing = following.filter(id => id !== targetUserId);
      isNowFollowing = false;
    } else {
      nextFollowing = [...following, targetUserId];
      isNowFollowing = true;
    }

    localStorage.setItem(`ahnyi_following_${followerId}`, JSON.stringify(nextFollowing));

    // Update target user followersCount
    const targetUser = await this.getUserById(targetUserId);
    let newFollowersCount = targetUser ? (targetUser.followersCount || 0) : 0;
    if (targetUser) {
      newFollowersCount = isNowFollowing ? newFollowersCount + 1 : Math.max(0, newFollowersCount - 1);
      targetUser.followersCount = newFollowersCount;
      await this.saveUser(targetUser);
    }

    // Update follower user followingCount
    const followerUser = await this.getUserById(followerId);
    if (followerUser) {
      const currentFollowingCount = followerUser.followingCount || 0;
      followerUser.followingCount = isNowFollowing ? currentFollowingCount + 1 : Math.max(0, currentFollowingCount - 1);
      await this.saveUser(followerUser);
    }

    // Send notification if newly followed
    if (isNowFollowing && followerUser) {
      await this.addNotification({
        id: `notif_follow_${Date.now()}`,
        recipientId: targetUserId,
        senderId: followerId,
        senderName: followerUser.name,
        senderAvatar: followerUser.avatar,
        type: 'follow',
        messageMy: `${followerUser.name} မှ သင့်အား စတင် Follow ပြုလုပ်လိုက်ပါသည်။`,
        messageEn: `${followerUser.name} started following you.`,
        targetId: followerId,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    return { isFollowing: isNowFollowing, targetFollowersCount: newFollowersCount };
  }

  // --- USERS ---
  async getUsers(): Promise<User[]> {
    const users = await this.getAllFromStore<User>('users');
    if (!users || users.length === 0) return initialUsers;
    return users;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const users = await this.getUsers();
    return users.find(u => u.id === id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const users = await this.getUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  async saveUser(user: User): Promise<void> {
    if (user.email.toLowerCase() === OWNER_EMAIL.toLowerCase()) {
      user.role = 'owner';
      user.isVerified = true;
    } else if (user.role === 'owner') {
      user.role = 'admin';
    }
    await this.putToStore('users', user);
  }

  async updateUser(id: string, changes: Partial<User>): Promise<User | null> {
    const users = await this.getUsers();
    const existing = users.find(u => u.id === id);
    if (!existing) return null;
    const updated = { ...existing, ...changes };
    await this.saveUser(updated);
    return updated;
  }

  // --- SEARCH HISTORY ---
  getRecentSearches(): string[] {
    try {
      const raw = localStorage.getItem('ahnyi_recent_searches');
      return raw ? JSON.parse(raw) : ['#AhNyi', '#MyanmarCreators', 'Bagan', 'Aung Thu'];
    } catch {
      return ['#AhNyi', '#MyanmarCreators', 'Bagan'];
    }
  }

  addRecentSearch(query: string): string[] {
    const q = query.trim();
    if (!q) return this.getRecentSearches();
    try {
      let list = this.getRecentSearches().filter(s => s.toLowerCase() !== q.toLowerCase());
      list.unshift(q);
      list = list.slice(0, 10);
      localStorage.setItem('ahnyi_recent_searches', JSON.stringify(list));
      return list;
    } catch {
      return [q];
    }
  }

  removeRecentSearch(query: string): string[] {
    try {
      const list = this.getRecentSearches().filter(s => s !== query);
      localStorage.setItem('ahnyi_recent_searches', JSON.stringify(list));
      return list;
    } catch {
      return [];
    }
  }

  clearRecentSearches(): void {
    localStorage.removeItem('ahnyi_recent_searches');
  }

  // --- NOTIFICATIONS ---
  async getNotifications(recipientId: string): Promise<NotificationItem[]> {
    const all = await this.getAllFromStore<NotificationItem>('notifications');
    return all
      .filter(n => n.recipientId === recipientId || n.recipientId === 'all')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async addNotification(notif: NotificationItem): Promise<void> {
    await this.putToStore('notifications', notif);
  }

  async markNotificationAsRead(id: string): Promise<void> {
    const all = await this.getAllFromStore<NotificationItem>('notifications');
    const target = all.find(n => n.id === id);
    if (target) {
      target.isRead = true;
      await this.putToStore('notifications', target);
    }
  }

  async markAllNotificationsAsRead(recipientId: string): Promise<void> {
    const all = await this.getAllFromStore<NotificationItem>('notifications');
    for (const n of all) {
      if (n.recipientId === recipientId || n.recipientId === 'all') {
        n.isRead = true;
        await this.putToStore('notifications', n);
      }
    }
  }

  // --- CHAT MESSAGES ---
  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const all = await this.getAllFromStore<ChatMessage>('messages');
    return all
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async sendMessage(msg: ChatMessage): Promise<void> {
    await this.putToStore('messages', msg);
  }

  // --- REPORTS ---
  async getReports(): Promise<ReportItem[]> {
    return await this.getAllFromStore<ReportItem>('reports');
  }

  async addReport(report: ReportItem): Promise<void> {
    await this.putToStore('reports', report);
  }

  async updateReport(reportId: string, status: 'resolved' | 'dismissed'): Promise<void> {
    const all = await this.getReports();
    const target = all.find(r => r.id === reportId);
    if (target) {
      target.status = status;
      await this.putToStore('reports', target);
    }
  }

  // --- SYSTEM SETTINGS ---
  async getSystemSettings(): Promise<SystemSettings> {
    try {
      const items = await this.getAllFromStore<{ key: string; value: SystemSettings }>('settings');
      const found = items.find(i => i.key === 'system');
      if (found) return found.value;
    } catch {}
    return initialSystemSettings;
  }

  async saveSystemSettings(settings: SystemSettings): Promise<void> {
    await this.putToStore('settings', { key: 'system', value: settings });
  }

  // --- FIREBASE MANUAL CONFIG ---
  getFirebaseConfig(): FirebaseManualConfig {
    try {
      const raw = localStorage.getItem('ahnyi_firebase_config');
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: '',
      measurementId: '',
      isConfigured: false
    };
  }

  saveFirebaseConfig(config: FirebaseManualConfig) {
    localStorage.setItem('ahnyi_firebase_config', JSON.stringify(config));
  }

  // --- CURRENT USER SESSION ---
  getCurrentUserId(): string {
    return localStorage.getItem('ahnyi_current_user_id') || 'user_owner_001';
  }

  setCurrentUserId(userId: string) {
    localStorage.setItem('ahnyi_current_user_id', userId);
  }

  // --- BACKUP & RESTORE ---
  async exportBackup(): Promise<string> {
    const posts = await this.getPosts();
    const users = await this.getUsers();
    const comments = await this.getAllFromStore<Comment>('comments');
    const notifications = await this.getAllFromStore<NotificationItem>('notifications');
    const messages = await this.getAllFromStore<ChatMessage>('messages');
    const settings = await this.getSystemSettings();

    const data = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      appName: 'AH NYI',
      posts,
      users,
      comments,
      notifications,
      messages,
      settings
    };
    return JSON.stringify(data, null, 2);
  }

  async restoreBackup(jsonStr: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonStr);
      if (!data || !Array.isArray(data.posts)) return false;
      for (const p of data.posts) await this.putToStore('posts', p);
      if (Array.isArray(data.users)) {
        for (const u of data.users) await this.putToStore('users', u);
      }
      return true;
    } catch {
      return false;
    }
  }
}

export const storage = new AhNyiStorageService();
