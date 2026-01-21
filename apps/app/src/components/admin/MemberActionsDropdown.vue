<script setup lang="ts">
import type { TenantMember } from '@shared/types';
import type { Role } from '@shared/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  User,
  UserCog,
  Ban,
  UserCheck,
  Trash2,
  Shield,
  GraduationCap,
  BookOpen,
  Users,
} from 'lucide-vue-next';

interface Props {
  member: TenantMember;
  disabled?: boolean;
}

interface Emits {
  (e: 'view', member: TenantMember): void;
  (e: 'change-role', member: TenantMember, role: Role): void;
  (e: 'suspend', member: TenantMember): void;
  (e: 'reactivate', member: TenantMember): void;
  (e: 'remove', member: TenantMember): void;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
});

const emit = defineEmits<Emits>();

const availableRoles: { role: Role; label: string; icon: typeof Shield }[] = [
  { role: 'learner', label: 'Learner', icon: GraduationCap },
  { role: 'instructor', label: 'Instructor', icon: BookOpen },
  { role: 'manager', label: 'Manager', icon: Users },
  { role: 'tenant_admin', label: 'Admin', icon: Shield },
];

function handleView() {
  emit('view', props.member);
}

function handleChangeRole(role: Role) {
  emit('change-role', props.member, role);
}

function handleSuspend() {
  emit('suspend', props.member);
}

function handleReactivate() {
  emit('reactivate', props.member);
}

function handleRemove() {
  emit('remove', props.member);
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <Button variant="ghost" size="icon" :disabled="disabled">
        <MoreHorizontal class="h-4 w-4" />
        <span class="sr-only">Open menu</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" class="w-48">
      <DropdownMenuLabel>Actions</DropdownMenuLabel>
      <DropdownMenuSeparator />

      <!-- View -->
      <DropdownMenuItem @click="handleView" class="cursor-pointer">
        <User class="mr-2 h-4 w-4" />
        View Profile
      </DropdownMenuItem>

      <!-- Change Role -->
      <DropdownMenuSub>
        <DropdownMenuSubTrigger class="cursor-pointer">
          <UserCog class="mr-2 h-4 w-4" />
          Change Role
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          <DropdownMenuItem
            v-for="roleOption in availableRoles"
            :key="roleOption.role"
            @click="handleChangeRole(roleOption.role)"
            class="cursor-pointer"
            :class="{ 'bg-accent': member.role === roleOption.role }"
          >
            <component :is="roleOption.icon" class="mr-2 h-4 w-4" />
            {{ roleOption.label }}
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>

      <DropdownMenuSeparator />

      <!-- Suspend / Reactivate -->
      <DropdownMenuItem
        v-if="member.status !== 'suspended'"
        @click="handleSuspend"
        class="cursor-pointer text-yellow-600 focus:text-yellow-600"
      >
        <Ban class="mr-2 h-4 w-4" />
        Suspend
      </DropdownMenuItem>
      <DropdownMenuItem
        v-else
        @click="handleReactivate"
        class="cursor-pointer text-green-600 focus:text-green-600"
      >
        <UserCheck class="mr-2 h-4 w-4" />
        Reactivate
      </DropdownMenuItem>

      <!-- Remove -->
      <DropdownMenuItem
        @click="handleRemove"
        class="cursor-pointer text-destructive focus:text-destructive"
      >
        <Trash2 class="mr-2 h-4 w-4" />
        Remove
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
