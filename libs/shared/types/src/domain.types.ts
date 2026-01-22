// Domain types - Business entities

// User domain
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatarUrl: string | null;
  role: import('./auth.types.js').Role;
  status: UserStatus;
  tenantId: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

// Tenant domain
export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  status: TenantStatus;
  seatsPurchased: number;
  seatsUsed: number;
  seatsAvailable: number;
  subscriptionStatus: SubscriptionStatus;
}

export type TenantStatus = 'active' | 'trial' | 'suspended' | 'cancelled';
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing';
export type IsolationStrategy = 'SHARED' | 'ISOLATED';

// Course domain
export interface CourseListItem {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnailUrl: string | null;
  instructorName: string;
  price: number;
  duration: number;
  chaptersCount: number;
  lessonsCount: number;
  progress?: number; // User progress percentage (0-100)
}

export interface CourseDetail extends CourseListItem {
  chapters: ChapterWithLessons[];
}

export interface ChapterWithLessons {
  id: string;
  title: string;
  description: string | null;
  position: number;
  lessons: LessonItem[];
}

export interface LessonItem {
  id: string;
  title: string;
  type: LessonType;
  duration: number;
  position: number;
  isFree: boolean;
  isCompleted?: boolean;
  isAccessible?: boolean;
}

export type LessonType = 'video' | 'quiz' | 'document' | 'assignment';
export type CourseStatus = 'draft' | 'published' | 'archived';
export type SupportedLocale = 'en' | 'fr';

// Lesson content for specific locale
export interface LessonContent {
  id: string;
  lessonId: string;
  lang: SupportedLocale;
  title: string | null;
  videoUrl: string | null;
  videoId: string | null;
  transcript: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Localized lesson with content resolved for a specific locale
export interface LocalizedLesson {
  id: string;
  title: string;
  type: LessonType;
  videoUrl: string | null;
  videoId: string | null;
  duration: number;
  position: number;
  isFree: boolean;
  transcript: string | null;
  description: string | null;
  isCompleted?: boolean;
  isAccessible?: boolean;
}

// Progress tracking
export interface UserProgress {
  courseId: string;
  userId: string;
  completedLessons: string[];
  totalLessons: number;
  progressPercentage: number;
  lastAccessedAt: Date;
  completedAt: Date | null;
}

export interface QuizResult {
  lessonId: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  attemptNumber: number;
  completedAt: Date;
}

// Badge domain
export interface Badge {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  earnedAt: Date;
  courseId?: string;
}

// Dashboard stats
export interface LearnerDashboardStats {
  enrolledCourses: number;
  completedCourses: number;
  inProgressCourses: number;
  totalBadges: number;
  totalLearningTime: number; // in minutes
}

export interface TenantDashboardStats {
  totalUsers: number;
  activeUsers: number;
  seatsUsed: number;
  seatsPurchased: number;
  averageProgress: number;
  completionRate: number;
  pendingInvitations: number;
}

export interface TenantMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  avatarUrl: string | null;
  role: import('./auth.types.js').Role;
  status: UserStatus;
  lastLoginAt: Date | null;
  createdAt: Date;
}

// Invitation domain
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface Invitation {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: import('./auth.types.js').Role;
  status: InvitationStatus;
  tenantId: string;
  tenantName?: string;
  groupIds: string[];
  invitedBy?: {
    id: string;
    fullName: string;
  };
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}

export interface CreateInvitationInput {
  email: string;
  firstName: string;
  lastName: string;
  role?: import('./auth.types.js').Role;
  groupIds?: string[];
}

// Seat management domain
export interface SeatOverview {
  seatsPurchased: number;
  seatsUsed: number;
  seatsAvailable: number;
  pendingInvitations: number;
  usagePercentage: number;
}

export interface SeatAllocation {
  role: import('./auth.types.js').Role;
  count: number;
  percentage: number;
}

export interface SeatUsageHistory {
  date: string;
  used: number;
  purchased: number;
}

export interface SeatPlan {
  id: string;
  name: string;
  seats: number;
  pricePerSeat: number;
  features: string[];
  isCurrent: boolean;
  isRecommended?: boolean;
}

// Discussion domain
export type ReportReason = 'spam' | 'inappropriate' | 'harassment' | 'off_topic' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed';
export type DiscussionVisibility = 'tenant_only' | 'public_pool';

export interface DiscussionUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface Discussion {
  id: string;
  lessonId: string;
  content: string;
  replyCount: number;
  createdAt: Date;
  updatedAt: Date;
  user: DiscussionUser | null;
  isOwner: boolean;
}

export interface DiscussionReply {
  id: string;
  discussionId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  user: DiscussionUser | null;
  isOwner: boolean;
}

export interface CreateDiscussionInput {
  lessonId: string;
  content: string;
}

export interface CreateReplyInput {
  content: string;
}

export interface ReportInput {
  reason: ReportReason;
  description?: string;
}

// Note domain
export interface Note {
  id: string;
  lessonId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NoteWithLesson extends Note {
  lesson: {
    id: string;
    title: string;
    type: LessonType;
    chapter: {
      id: string;
      title: string;
      course: {
        id: string;
        title: string;
        slug: string;
      } | null;
    } | null;
  } | null;
}

export interface UpsertNoteInput {
  content: string;
}
