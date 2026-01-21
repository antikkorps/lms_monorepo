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
