<script setup lang="ts">
import { ref, computed } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { VisuallyHidden } from 'reka-ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Home,
  BookOpen,
  GraduationCap,
  Settings,
  LogOut,
  Menu,
  User,
  BarChart3,
  Trophy,
  LayoutDashboard,
  Users,
  Mail,
  CreditCard,
  PenTool,
  RefreshCcw,
  ShoppingBag,
  Receipt,
  Shield,
  Search,
} from 'lucide-vue-next';
import { Separator } from '@/components/ui/separator';
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue';
import DarkModeToggle from '@/components/common/DarkModeToggle.vue';
import { NotificationBell } from '@/components/notifications';
import CommandPalette from '@/components/search/CommandPalette.vue';

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();

const isMobileMenuOpen = ref(false);
const commandPaletteOpen = ref(false);

const navigationItems = computed(() => [
  { name: t('nav.main.dashboard'), href: '/dashboard', icon: Home },
  { name: t('nav.main.courses'), href: '/courses', icon: BookOpen },
  { name: t('nav.main.myLearning'), href: '/learning', icon: GraduationCap },
  { name: t('nav.main.analytics'), href: '/analytics', icon: BarChart3 },
  { name: t('nav.main.badges'), href: '/badges', icon: Trophy },
]);

const isSuperAdmin = computed(() => authStore.userRole === 'super_admin');

const adminItems = computed(() => {
  const items = [
    { href: '/admin', icon: LayoutDashboard, name: t('nav.admin.dashboard') },
    { href: '/admin/members', icon: Users, name: t('nav.admin.members') },
    { href: '/admin/invitations', icon: Mail, name: t('nav.admin.invitations') },
    { href: '/admin/seats', icon: CreditCard, name: t('nav.admin.seats') },
    { href: '/admin/invoices', icon: Receipt, name: t('nav.admin.invoices') },
    { href: '/admin/sso', icon: Shield, name: t('nav.admin.sso') },
  ];
  // Refunds only visible to super admin (B2C purchases)
  if (isSuperAdmin.value) {
    items.push({ href: '/admin/refunds', icon: RefreshCcw, name: t('nav.admin.refunds') });
  }
  return items;
});

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <!-- Desktop Sidebar -->
    <aside class="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-sidebar-border bg-sidebar lg:block">
      <div class="flex h-full flex-col">
        <!-- Logo with gradient accent -->
        <div class="flex h-16 items-center border-b border-sidebar-border px-6">
          <RouterLink to="/dashboard" class="group flex items-center gap-2 text-xl font-bold text-sidebar-foreground">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground transition-transform duration-200 group-hover:scale-110">
              <GraduationCap class="h-5 w-5" />
            </div>
            <span class="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">{{ t('nav.brand') }}</span>
          </RouterLink>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 space-y-1 px-3 py-4">
          <RouterLink
            v-for="item in navigationItems"
            :key="item.href"
            :to="item.href"
            v-slot="{ isActive }"
            custom
          >
            <a
              :href="item.href"
              :class="[
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary dark:bg-primary/20'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              ]"
              @click.prevent="router.push(item.href)"
            >
              <!-- Active indicator bar -->
              <div
                :class="[
                  'absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full transition-all duration-200',
                  isActive ? 'bg-primary' : 'bg-transparent group-hover:bg-sidebar-accent-foreground/20'
                ]"
              />
              <component
                :is="item.icon"
                :class="[
                  'h-5 w-5 transition-transform duration-200 group-hover:scale-110',
                  isActive ? 'text-primary' : ''
                ]"
              />
              <span>{{ item.name }}</span>
              <!-- Subtle glow on active -->
              <div
                v-if="isActive"
                class="absolute inset-0 -z-10 rounded-lg bg-primary/5 blur-sm"
              />
            </a>
          </RouterLink>

          <!-- Instructor Section (instructor and tenant_admin) -->
          <template v-if="authStore.hasAnyRole(['instructor', 'tenant_admin'])">
            <div class="my-4 px-3">
              <div class="h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />
            </div>
            <p class="mb-2 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <PenTool class="h-3 w-3" />
              {{ t('nav.instructor.title', 'Instructor') }}
            </p>
            <RouterLink
              to="/instructor"
              v-slot="{ isActive }"
              custom
            >
              <a
                href="/instructor"
                :class="[
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                ]"
                @click.prevent="router.push('/instructor')"
              >
                <div
                  :class="[
                    'absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full transition-all duration-200',
                    isActive ? 'bg-amber-500' : 'bg-transparent group-hover:bg-sidebar-accent-foreground/20'
                  ]"
                />
                <BookOpen
                  :class="[
                    'h-5 w-5 transition-transform duration-200 group-hover:scale-110',
                    isActive ? 'text-amber-500' : ''
                  ]"
                />
                <span>{{ t('nav.instructor.myCourses', 'My Courses') }}</span>
              </a>
            </RouterLink>
          </template>

          <!-- Admin Section (tenant_admin or super_admin) -->
          <template v-if="authStore.hasAnyRole(['tenant_admin', 'super_admin'])">
            <div class="my-4 px-3">
              <div class="h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />
            </div>
            <p class="mb-2 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Settings class="h-3 w-3" />
              {{ t('nav.admin.title') }}
            </p>
            <RouterLink
              v-for="adminItem in adminItems"
              :key="adminItem.href"
              :to="adminItem.href"
              v-slot="{ isActive }"
              custom
            >
              <a
                :href="adminItem.href"
                :class="[
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                ]"
                @click.prevent="router.push(adminItem.href)"
              >
                <div
                  :class="[
                    'absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full transition-all duration-200',
                    isActive ? 'bg-violet-500' : 'bg-transparent group-hover:bg-sidebar-accent-foreground/20'
                  ]"
                />
                <component
                  :is="adminItem.icon"
                  :class="[
                    'h-5 w-5 transition-transform duration-200 group-hover:scale-110',
                    isActive ? 'text-violet-500' : ''
                  ]"
                />
                <span>{{ adminItem.name }}</span>
              </a>
            </RouterLink>
          </template>
        </nav>

        <!-- User section at bottom with improved design -->
        <div class="border-t border-sidebar-border p-4">
          <RouterLink
            to="/profile"
            class="group flex items-center gap-3 rounded-lg p-2 transition-all duration-200 hover:bg-sidebar-accent"
          >
            <div class="relative">
              <UserAvatar
                :user-id="authStore.user?.id || ''"
                :first-name="authStore.user?.firstName"
                :last-name="authStore.user?.lastName"
                :avatar-url="authStore.user?.avatarUrl"
                size="sm"
                class="ring-2 ring-sidebar-border transition-all duration-200 group-hover:ring-primary/50"
              />
              <!-- Online indicator -->
              <div class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-sidebar bg-green-500" />
            </div>
            <div class="flex-1 overflow-hidden">
              <p class="truncate text-sm font-medium text-sidebar-foreground">
                {{ authStore.fullName }}
              </p>
              <p class="truncate text-xs text-muted-foreground">
                {{ authStore.user?.email }}
              </p>
            </div>
            <Settings class="h-4 w-4 text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          </RouterLink>
        </div>
      </div>
    </aside>

    <!-- Mobile header -->
    <header class="fixed left-0 right-0 top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background px-4 lg:hidden">
      <Sheet v-model:open="isMobileMenuOpen">
        <SheetTrigger as-child>
          <Button variant="ghost" size="icon" class="lg:hidden">
            <Menu class="h-6 w-6" />
            <span class="sr-only">{{ t('nav.accessibility.toggleMenu') }}</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" class="w-72 p-0">
          <VisuallyHidden>
            <SheetTitle>{{ t('nav.accessibility.mobileMenu') }}</SheetTitle>
            <SheetDescription>{{ t('nav.accessibility.mobileMenuDescription') }}</SheetDescription>
          </VisuallyHidden>
          <div class="flex h-full flex-col bg-sidebar">
            <!-- Logo with gradient accent -->
            <div class="flex h-16 items-center border-b border-sidebar-border px-6">
              <div class="flex items-center gap-2 text-xl font-bold">
                <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                  <GraduationCap class="h-5 w-5" />
                </div>
                <span>{{ t('nav.brand') }}</span>
              </div>
            </div>
            <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              <RouterLink
                v-for="item in navigationItems"
                :key="item.href"
                :to="item.href"
                v-slot="{ isActive }"
                custom
              >
                <a
                  :href="item.href"
                  :class="[
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary/10 text-primary dark:bg-primary/20'
                      : 'text-foreground/70 hover:bg-accent hover:text-foreground'
                  ]"
                  @click.prevent="router.push(item.href); isMobileMenuOpen = false"
                >
                  <div
                    :class="[
                      'absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full transition-all duration-200',
                      isActive ? 'bg-primary' : 'bg-transparent'
                    ]"
                  />
                  <component
                    :is="item.icon"
                    :class="['h-5 w-5', isActive ? 'text-primary' : '']"
                  />
                  <span>{{ item.name }}</span>
                </a>
              </RouterLink>

              <!-- Instructor Section (instructor and tenant_admin) -->
              <template v-if="authStore.hasAnyRole(['instructor', 'tenant_admin'])">
                <div class="my-4 px-3">
                  <div class="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                </div>
                <p class="mb-2 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <PenTool class="h-3 w-3" />
                  {{ t('nav.instructor.title', 'Instructor') }}
                </p>
                <RouterLink
                  to="/instructor"
                  v-slot="{ isActive }"
                  custom
                >
                  <a
                    href="/instructor"
                    :class="[
                      'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                        : 'text-foreground/70 hover:bg-accent hover:text-foreground'
                    ]"
                    @click.prevent="router.push('/instructor'); isMobileMenuOpen = false"
                  >
                    <div
                      :class="[
                        'absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full transition-all duration-200',
                        isActive ? 'bg-amber-500' : 'bg-transparent'
                      ]"
                    />
                    <BookOpen :class="['h-5 w-5', isActive ? 'text-amber-500' : '']" />
                    <span>{{ t('nav.instructor.myCourses', 'My Courses') }}</span>
                  </a>
                </RouterLink>
              </template>

              <!-- Admin Section (tenant_admin or super_admin) -->
              <template v-if="authStore.hasAnyRole(['tenant_admin', 'super_admin'])">
                <div class="my-4 px-3">
                  <div class="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                </div>
                <p class="mb-2 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Settings class="h-3 w-3" />
                  {{ t('nav.admin.title') }}
                </p>
                <RouterLink
                  v-for="adminItem in adminItems"
                  :key="adminItem.href"
                  :to="adminItem.href"
                  v-slot="{ isActive }"
                  custom
                >
                  <a
                    :href="adminItem.href"
                    :class="[
                      'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400'
                        : 'text-foreground/70 hover:bg-accent hover:text-foreground'
                    ]"
                    @click.prevent="router.push(adminItem.href); isMobileMenuOpen = false"
                  >
                    <div
                      :class="[
                        'absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full transition-all duration-200',
                        isActive ? 'bg-violet-500' : 'bg-transparent'
                      ]"
                    />
                    <component :is="adminItem.icon" :class="['h-5 w-5', isActive ? 'text-violet-500' : '']" />
                    <span>{{ adminItem.name }}</span>
                  </a>
                </RouterLink>
              </template>
            </nav>

            <!-- User section at bottom -->
            <div class="border-t border-sidebar-border p-4">
              <div
                class="flex items-center gap-3 rounded-lg p-2"
                @click="router.push('/profile'); isMobileMenuOpen = false"
              >
                <div class="relative">
                  <UserAvatar
                    :user-id="authStore.user?.id || ''"
                    :first-name="authStore.user?.firstName"
                    :last-name="authStore.user?.lastName"
                    :avatar-url="authStore.user?.avatarUrl"
                    size="sm"
                    class="ring-2 ring-sidebar-border"
                  />
                  <div class="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-sidebar bg-green-500" />
                </div>
                <div class="flex-1 overflow-hidden">
                  <p class="truncate text-sm font-medium">
                    {{ authStore.fullName }}
                  </p>
                  <p class="truncate text-xs text-muted-foreground">
                    {{ authStore.user?.email }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <RouterLink to="/dashboard" class="text-xl font-bold">
        {{ t('nav.brand') }}
      </RouterLink>

      <div class="flex-1" />

      <!-- Search button (mobile) -->
      <Button variant="ghost" size="icon" @click="commandPaletteOpen = true">
        <Search class="h-5 w-5" />
        <span class="sr-only">{{ t('search.title') }}</span>
      </Button>

      <!-- Language switcher (mobile) -->
      <LanguageSwitcher />

      <!-- Dark mode toggle (mobile) -->
      <DarkModeToggle />

      <!-- Mobile user menu -->
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="icon" class="rounded-full">
            <UserAvatar
              :user-id="authStore.user?.id || ''"
              :first-name="authStore.user?.firstName"
              :last-name="authStore.user?.lastName"
              :avatar-url="authStore.user?.avatarUrl"
              size="sm"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="w-56">
          <DropdownMenuLabel>
            <div class="flex flex-col space-y-1">
              <p class="text-sm font-medium">{{ authStore.fullName }}</p>
              <p class="text-xs text-muted-foreground">{{ authStore.user?.email }}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem as-child>
            <RouterLink to="/profile" class="flex w-full cursor-pointer items-center">
              <User class="mr-2 h-4 w-4" />
              {{ t('nav.user.profile') }}
            </RouterLink>
          </DropdownMenuItem>
          <DropdownMenuItem as-child>
            <RouterLink to="/purchases" class="flex w-full cursor-pointer items-center">
              <ShoppingBag class="mr-2 h-4 w-4" />
              {{ t('nav.user.purchases') }}
            </RouterLink>
          </DropdownMenuItem>
          <DropdownMenuItem as-child>
            <RouterLink to="/settings" class="flex w-full cursor-pointer items-center">
              <Settings class="mr-2 h-4 w-4" />
              {{ t('nav.user.settings') }}
            </RouterLink>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="handleLogout" class="cursor-pointer text-destructive focus:text-destructive">
            <LogOut class="mr-2 h-4 w-4" />
            {{ t('nav.user.logout') }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>

    <!-- Desktop header -->
    <header class="fixed left-64 right-0 top-0 z-30 hidden h-16 items-center justify-between border-b border-border bg-background px-6 lg:flex">
      <div class="flex-1">
        <Button variant="outline" size="sm" class="w-64 justify-start text-muted-foreground" @click="commandPaletteOpen = true">
          <Search class="mr-2 h-4 w-4" />
          {{ t('search.trigger') }}
          <kbd class="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span class="text-xs">&#8984;</span>K
          </kbd>
        </Button>
      </div>

      <div class="flex items-center gap-4">
        <!-- Language switcher -->
        <LanguageSwitcher />

        <!-- Dark mode toggle -->
        <DarkModeToggle />

        <!-- Notifications -->
        <NotificationBell />

        <!-- User dropdown -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" class="relative h-9 w-9 rounded-full">
              <UserAvatar
                :user-id="authStore.user?.id || ''"
                :first-name="authStore.user?.firstName"
                :last-name="authStore.user?.lastName"
                :avatar-url="authStore.user?.avatarUrl"
                size="sm"
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-56">
            <DropdownMenuLabel>
              <div class="flex flex-col space-y-1">
                <p class="text-sm font-medium">{{ authStore.fullName }}</p>
                <p class="text-xs text-muted-foreground">{{ authStore.user?.email }}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem as-child>
              <RouterLink to="/profile" class="flex w-full cursor-pointer items-center">
                <User class="mr-2 h-4 w-4" />
                {{ t('nav.user.profile') }}
              </RouterLink>
            </DropdownMenuItem>
            <DropdownMenuItem as-child>
              <RouterLink to="/purchases" class="flex w-full cursor-pointer items-center">
                <ShoppingBag class="mr-2 h-4 w-4" />
                {{ t('nav.user.purchases') }}
              </RouterLink>
            </DropdownMenuItem>
            <DropdownMenuItem as-child>
              <RouterLink to="/settings" class="flex w-full cursor-pointer items-center">
                <Settings class="mr-2 h-4 w-4" />
                {{ t('nav.user.settings') }}
              </RouterLink>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem @click="handleLogout" class="cursor-pointer text-destructive focus:text-destructive">
              <LogOut class="mr-2 h-4 w-4" />
              {{ t('nav.user.logout') }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>

    <!-- Main content -->
    <main class="min-h-screen pt-16 lg:pl-64">
      <div class="container mx-auto p-6">
        <slot />
      </div>
    </main>

    <!-- Command Palette -->
    <CommandPalette v-model:open="commandPaletteOpen" />
  </div>
</template>
