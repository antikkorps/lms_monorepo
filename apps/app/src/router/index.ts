import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { AppLayout, AuthLayout } from '../layouts';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
  },

  // Auth routes with AuthLayout
  {
    path: '/auth',
    component: AuthLayout,
    meta: { guestOnly: true },
    children: [
      {
        path: '/login',
        name: 'login',
        component: () => import('../views/LoginView.vue'),
      },
      {
        path: '/register',
        name: 'register',
        component: () => import('../views/RegisterView.vue'),
      },
      {
        path: '/forgot-password',
        name: 'forgot-password',
        component: () => import('../views/ForgotPasswordView.vue'),
      },
      {
        path: '/reset-password',
        name: 'reset-password',
        component: () => import('../views/ResetPasswordView.vue'),
      },
      {
        path: '/verify-email',
        name: 'verify-email',
        component: () => import('../views/VerifyEmailView.vue'),
        meta: { guestOnly: false }, // Allow authenticated users to verify
      },
    ],
  },

  // App routes with AppLayout (authenticated)
  {
    path: '/app',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '/dashboard',
        name: 'dashboard',
        component: () => import('../views/DashboardView.vue'),
      },
      // Future routes: courses, profile, settings, etc.
    ],
  },

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

  // Check if any matched route requires auth (check all parent routes too)
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  // Check if route is guest-only (respects child overrides)
  const guestOnly = to.matched.some((record) => record.meta.guestOnly) && to.meta.guestOnly !== false;

  // Protected route - redirect to login if not authenticated
  if (requiresAuth && !isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } });
    return;
  }

  // Guest-only route - redirect to dashboard if authenticated
  if (guestOnly && isAuthenticated) {
    next({ name: 'dashboard' });
    return;
  }

  next();
});
