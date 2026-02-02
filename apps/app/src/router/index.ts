import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
  },

  // Auth routes (guest only)
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
    meta: { layout: 'auth', guestOnly: true },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../views/RegisterView.vue'),
    meta: { layout: 'auth', guestOnly: true },
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('../views/ForgotPasswordView.vue'),
    meta: { layout: 'auth', guestOnly: true },
  },
  {
    path: '/reset-password',
    name: 'reset-password',
    component: () => import('../views/ResetPasswordView.vue'),
    meta: { layout: 'auth', guestOnly: true },
  },
  {
    path: '/verify-email',
    name: 'verify-email',
    component: () => import('../views/VerifyEmailView.vue'),
    meta: { layout: 'auth' },
  },

  // App routes (authenticated)
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/courses',
    name: 'courses',
    component: () => import('../views/CoursesView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/courses/:slug',
    name: 'course-detail',
    component: () => import('../views/CourseDetailView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/courses/:slug/learn/:lessonId',
    name: 'lesson',
    component: () => import('../views/LessonView.vue'),
    meta: { layout: 'minimal', requiresAuth: true },
  },
  {
    path: '/learning',
    name: 'my-learning',
    component: () => import('../views/MyLearningView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/badges',
    name: 'badges',
    component: () => import('../views/BadgesView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/analytics',
    name: 'analytics',
    component: () => import('../views/AnalyticsView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('../views/ProfileView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/notifications',
    name: 'notifications',
    component: () => import('../views/NotificationsView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/settings/notifications',
    name: 'notification-settings',
    component: () => import('../views/NotificationSettingsView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },

  // Payment routes
  {
    path: '/payment/success',
    name: 'payment-success',
    component: () => import('../views/PaymentSuccessView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/payment/cancel',
    name: 'payment-cancel',
    component: () => import('../views/PaymentCancelView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/purchases',
    name: 'purchases',
    component: () => import('../views/PurchaseHistoryView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },

  // Admin routes (tenant_admin only)
  {
    path: '/admin',
    name: 'admin-dashboard',
    component: () => import('../views/admin/AdminDashboardView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/admin/members',
    name: 'admin-members',
    component: () => import('../views/admin/TeamMembersView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/admin/invitations',
    name: 'admin-invitations',
    component: () => import('../views/admin/InvitationsView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/admin/refunds',
    name: 'admin-refunds',
    component: () => import('../views/admin/RefundRequestsView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/admin/seats',
    name: 'admin-seats',
    component: () => import('../views/admin/SeatManagementView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/admin/invoices',
    name: 'admin-invoices',
    component: () => import('../views/admin/InvoicesView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },

  // Instructor routes (instructors and admins)
  {
    path: '/instructor',
    name: 'instructor-courses',
    component: () => import('../views/admin/courses/CourseListView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/instructor/courses/new',
    name: 'instructor-course-create',
    component: () => import('../views/admin/courses/CourseEditorView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/instructor/courses/:id/edit',
    name: 'instructor-course-edit',
    component: () => import('../views/admin/courses/CourseEditorView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/instructor/courses/:id/build',
    name: 'instructor-course-build',
    component: () => import('../views/admin/courses/CourseBuilderView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },
  {
    path: '/instructor/lessons/:id',
    name: 'instructor-lesson-edit',
    component: () => import('../views/admin/lessons/LessonEditorView.vue'),
    meta: { layout: 'app', requiresAuth: true },
  },

  // Catch-all 404
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../views/NotFoundView.vue'),
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation guard for auth
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  // Initialize auth state if not done yet
  if (!authStore.isInitialized) {
    await authStore.initialize();
  }

  const isAuthenticated = authStore.isAuthenticated;

  // Protected route - redirect to login if not authenticated
  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } });
    return;
  }

  // Guest-only route - redirect to dashboard if authenticated
  if (to.meta.guestOnly && isAuthenticated) {
    next({ name: 'dashboard' });
    return;
  }

  next();
});
