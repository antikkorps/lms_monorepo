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
