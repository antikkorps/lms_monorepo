<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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
  Bell,
} from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();

const isMobileMenuOpen = ref(false);

const userInitials = computed(() => {
  if (!authStore.user) return '?';
  const first = authStore.user.firstName?.charAt(0) || '';
  const last = authStore.user.lastName?.charAt(0) || '';
  return (first + last).toUpperCase() || '?';
});

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Courses', href: '/courses', icon: BookOpen },
  { name: 'My Learning', href: '/learning', icon: GraduationCap },
];

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
        <!-- Logo -->
        <div class="flex h-16 items-center border-b border-sidebar-border px-6">
          <RouterLink to="/dashboard" class="text-xl font-bold text-sidebar-foreground">
            LMS Platform
          </RouterLink>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 space-y-1 px-3 py-4">
          <RouterLink
            v-for="item in navigationItems"
            :key="item.name"
            :to="item.href"
            class="flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            active-class="bg-sidebar-accent text-sidebar-accent-foreground"
          >
            <component :is="item.icon" class="h-5 w-5" />
            {{ item.name }}
          </RouterLink>
        </nav>

        <!-- User section at bottom -->
        <div class="border-t border-sidebar-border p-4">
          <div class="flex items-center gap-3">
            <Avatar class="h-9 w-9">
              <AvatarImage :src="authStore.user?.avatarUrl" :alt="authStore.fullName" />
              <AvatarFallback>{{ userInitials }}</AvatarFallback>
            </Avatar>
            <div class="flex-1 overflow-hidden">
              <p class="truncate text-sm font-medium text-sidebar-foreground">
                {{ authStore.fullName }}
              </p>
              <p class="truncate text-xs text-muted-foreground">
                {{ authStore.user?.email }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <!-- Mobile header -->
    <header class="fixed left-0 right-0 top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background px-4 lg:hidden">
      <Sheet v-model:open="isMobileMenuOpen">
        <SheetTrigger as-child>
          <Button variant="ghost" size="icon" class="lg:hidden">
            <Menu class="h-6 w-6" />
            <span class="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" class="w-64 p-0">
          <div class="flex h-full flex-col">
            <div class="flex h-16 items-center border-b px-6">
              <span class="text-xl font-bold">LMS Platform</span>
            </div>
            <nav class="flex-1 space-y-1 px-3 py-4">
              <RouterLink
                v-for="item in navigationItems"
                :key="item.name"
                :to="item.href"
                class="flex items-center gap-3 rounded-lg px-3 py-2 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                active-class="bg-accent text-accent-foreground"
                @click="isMobileMenuOpen = false"
              >
                <component :is="item.icon" class="h-5 w-5" />
                {{ item.name }}
              </RouterLink>
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      <RouterLink to="/dashboard" class="text-xl font-bold">
        LMS Platform
      </RouterLink>

      <div class="flex-1" />

      <!-- Mobile user menu -->
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="icon" class="rounded-full">
            <Avatar class="h-8 w-8">
              <AvatarImage :src="authStore.user?.avatarUrl" :alt="authStore.fullName" />
              <AvatarFallback>{{ userInitials }}</AvatarFallback>
            </Avatar>
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
            <RouterLink to="/settings" class="flex w-full cursor-pointer items-center">
              <Settings class="mr-2 h-4 w-4" />
              Settings
            </RouterLink>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem @click="handleLogout" class="cursor-pointer text-destructive focus:text-destructive">
            <LogOut class="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>

    <!-- Desktop header -->
    <header class="fixed left-64 right-0 top-0 z-30 hidden h-16 items-center justify-between border-b border-border bg-background px-6 lg:flex">
      <div class="flex-1">
        <!-- Breadcrumb or title could go here -->
      </div>

      <div class="flex items-center gap-4">
        <!-- Notifications -->
        <Button variant="ghost" size="icon">
          <Bell class="h-5 w-5" />
          <span class="sr-only">Notifications</span>
        </Button>

        <!-- User dropdown -->
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="ghost" class="relative h-9 w-9 rounded-full">
              <Avatar class="h-9 w-9">
                <AvatarImage :src="authStore.user?.avatarUrl" :alt="authStore.fullName" />
                <AvatarFallback>{{ userInitials }}</AvatarFallback>
              </Avatar>
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
                Profile
              </RouterLink>
            </DropdownMenuItem>
            <DropdownMenuItem as-child>
              <RouterLink to="/settings" class="flex w-full cursor-pointer items-center">
                <Settings class="mr-2 h-4 w-4" />
                Settings
              </RouterLink>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem @click="handleLogout" class="cursor-pointer text-destructive focus:text-destructive">
              <LogOut class="mr-2 h-4 w-4" />
              Logout
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
  </div>
</template>
