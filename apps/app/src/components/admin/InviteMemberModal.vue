<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Role } from '@shared/types';
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from 'reka-ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { X, UserPlus, Loader2 } from 'lucide-vue-next';

interface Props {
  open: boolean;
  isSubmitting?: boolean;
}

interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
}

const props = withDefaults(defineProps<Props>(), {
  isSubmitting: false,
});

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
  (e: 'submit', data: FormData): void;
}>();

const form = ref<FormData>({
  email: '',
  firstName: '',
  lastName: '',
  role: 'learner',
});

const errors = ref<Partial<Record<keyof FormData, string>>>({});

// Validation
const isEmailValid = computed(() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(form.value.email);
});

const isFormValid = computed(() => {
  return (
    form.value.email.trim() !== '' &&
    isEmailValid.value &&
    form.value.firstName.trim() !== '' &&
    form.value.lastName.trim() !== ''
  );
});

// Reset form when modal opens/closes
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      form.value = {
        email: '',
        firstName: '',
        lastName: '',
        role: 'learner',
      };
      errors.value = {};
    }
  },
);

function validateForm(): boolean {
  errors.value = {};

  if (!form.value.email.trim()) {
    errors.value.email = 'Email is required';
  } else if (!isEmailValid.value) {
    errors.value.email = 'Invalid email address';
  }

  if (!form.value.firstName.trim()) {
    errors.value.firstName = 'First name is required';
  }

  if (!form.value.lastName.trim()) {
    errors.value.lastName = 'Last name is required';
  }

  return Object.keys(errors.value).length === 0;
}

function handleSubmit() {
  if (!validateForm()) return;
  emit('submit', { ...form.value });
}

function handleOpenChange(value: boolean) {
  emit('update:open', value);
}

function handleClose() {
  emit('update:open', false);
}
</script>

<template>
  <DialogRoot :open="open" @update:open="handleOpenChange">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
      />
      <DialogContent
        class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-6 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
      >
        <!-- Close button -->
        <DialogClose
          class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X class="h-4 w-4" />
          <span class="sr-only">Close</span>
        </DialogClose>

        <!-- Header -->
        <div class="flex items-center gap-3 mb-6">
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <UserPlus class="h-5 w-5 text-primary" />
          </div>
          <div>
            <DialogTitle class="text-lg font-semibold">Invite Team Member</DialogTitle>
            <DialogDescription class="text-sm text-muted-foreground">
              Send an invitation to join your organization
            </DialogDescription>
          </div>
        </div>

        <!-- Form -->
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Email -->
          <div class="space-y-2">
            <Label for="email">Email address</Label>
            <Input
              id="email"
              v-model="form.email"
              type="email"
              placeholder="colleague@company.com"
              :class="{ 'border-destructive': errors.email }"
            />
            <p v-if="errors.email" class="text-xs text-destructive">{{ errors.email }}</p>
          </div>

          <!-- Name fields -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="firstName">First name</Label>
              <Input
                id="firstName"
                v-model="form.firstName"
                placeholder="John"
                :class="{ 'border-destructive': errors.firstName }"
              />
              <p v-if="errors.firstName" class="text-xs text-destructive">
                {{ errors.firstName }}
              </p>
            </div>
            <div class="space-y-2">
              <Label for="lastName">Last name</Label>
              <Input
                id="lastName"
                v-model="form.lastName"
                placeholder="Doe"
                :class="{ 'border-destructive': errors.lastName }"
              />
              <p v-if="errors.lastName" class="text-xs text-destructive">
                {{ errors.lastName }}
              </p>
            </div>
          </div>

          <!-- Role -->
          <div class="space-y-2">
            <Label for="role">Role</Label>
            <Select id="role" v-model="form.role" class="w-full">
              <option value="learner">Learner</option>
              <option value="instructor">Instructor</option>
              <option value="manager">Manager</option>
              <option value="tenant_admin">Administrator</option>
            </Select>
            <p class="text-xs text-muted-foreground">
              <template v-if="form.role === 'learner'">
                Can access courses and track their learning progress
              </template>
              <template v-else-if="form.role === 'instructor'">
                Can create and manage course content
              </template>
              <template v-else-if="form.role === 'manager'">
                Can view team progress and invite learners
              </template>
              <template v-else-if="form.role === 'tenant_admin'">
                Full administrative access to the organization
              </template>
            </p>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" @click="handleClose" :disabled="isSubmitting">
              Cancel
            </Button>
            <Button type="submit" :disabled="!isFormValid || isSubmitting">
              <Loader2 v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
              <UserPlus v-else class="mr-2 h-4 w-4" />
              Send Invitation
            </Button>
          </div>
        </form>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
