<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useLicenses, type PricingPreview } from '@/composables/useLicenses';
import { useApi } from '@/composables/useApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { ArrowLeft, KeyRound, Users, Infinity, Loader2 } from 'lucide-vue-next';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const api = useApi();
const { previewPricing, createCheckout, formatAmount } = useLicenses();

const courses = ref<Array<{ id: string; title: string; price: number; currency: string }>>([]);
const selectedCourseId = ref((route.query.courseId as string) || '');
const licenseType = ref<'unlimited' | 'seats'>('seats');
const seats = ref(10);
const pricing = ref<PricingPreview | null>(null);
const pricingLoading = ref(false);
const checkoutLoading = ref(false);
const error = ref<string | null>(null);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const selectedCourse = computed(() => courses.value.find((c) => c.id === selectedCourseId.value));

async function loadCourses() {
  try {
    const result = await api.get<{ courses: Array<{ id: string; title: string; price: number; currency: string; status: string; isFree: boolean }> }>('/courses', { limit: 100, status: 'published' });
    courses.value = result.courses.filter((c) => !c.isFree);
  } catch {
    // non-critical
  }
}

async function loadPricing() {
  if (!selectedCourseId.value) return;
  pricingLoading.value = true;
  try {
    const params: { courseId: string; licenseType: string; seats?: number } = {
      courseId: selectedCourseId.value,
      licenseType: licenseType.value,
    };
    if (licenseType.value === 'seats') params.seats = seats.value;
    pricing.value = await previewPricing(params);
  } catch {
    pricing.value = null;
  } finally {
    pricingLoading.value = false;
  }
}

function debouncedLoadPricing() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadPricing, 300);
}

async function handleCheckout() {
  if (!selectedCourseId.value) return;
  checkoutLoading.value = true;
  error.value = null;
  try {
    const data: { courseId: string; licenseType: 'unlimited' | 'seats'; seats?: number } = {
      courseId: selectedCourseId.value,
      licenseType: licenseType.value,
    };
    if (licenseType.value === 'seats') data.seats = seats.value;
    const result = await createCheckout(data);
    if (result.url) {
      window.location.href = result.url;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : t('licenses.errors.checkoutFailed');
  } finally {
    checkoutLoading.value = false;
  }
}

watch([selectedCourseId, licenseType], () => {
  if (selectedCourseId.value) debouncedLoadPricing();
});

watch(seats, () => {
  if (licenseType.value === 'seats' && selectedCourseId.value) debouncedLoadPricing();
});

onMounted(async () => {
  await loadCourses();
  if (selectedCourseId.value) loadPricing();
});
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <!-- Back button -->
    <Button variant="ghost" size="sm" @click="router.push('/admin/licenses')">
      <ArrowLeft class="mr-2 h-4 w-4" />
      {{ t('licenses.title') }}
    </Button>

    <div>
      <h1 class="text-2xl font-bold tracking-tight">{{ t('licenses.checkout.title') }}</h1>
    </div>

    <!-- Course Selection -->
    <Card>
      <CardHeader>
        <CardTitle>{{ t('licenses.checkout.selectCourse') }}</CardTitle>
      </CardHeader>
      <CardContent>
        <Select v-model="selectedCourseId" :placeholder="t('licenses.checkout.selectCourse')">
          <option value="" disabled>{{ t('licenses.checkout.selectCourse') }}</option>
          <option v-for="course in courses" :key="course.id" :value="course.id">
            {{ course.title }} - {{ formatAmount(course.price, course.currency) }}
          </option>
        </Select>
      </CardContent>
    </Card>

    <!-- License Type -->
    <Card v-if="selectedCourseId">
      <CardHeader>
        <CardTitle>{{ t('licenses.checkout.licenseType') }}</CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-4 sm:grid-cols-2">
          <button
            :class="[
              'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors',
              licenseType === 'seats'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50',
            ]"
            @click="licenseType = 'seats'"
          >
            <Users class="h-8 w-8" />
            <span class="font-medium">{{ t('licenses.type.seats') }}</span>
            <span class="text-sm text-muted-foreground">{{ t('licenses.checkout.seatsDescription') }}</span>
          </button>
          <button
            :class="[
              'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors',
              licenseType === 'unlimited'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50',
            ]"
            @click="licenseType = 'unlimited'"
          >
            <Infinity class="h-8 w-8" />
            <span class="font-medium">{{ t('licenses.type.unlimited') }}</span>
            <span class="text-sm text-muted-foreground">{{ t('licenses.checkout.unlimitedDescription') }}</span>
          </button>
        </div>

        <!-- Seats input -->
        <div v-if="licenseType === 'seats'" class="space-y-2">
          <Label>{{ t('licenses.checkout.numberOfSeats') }}</Label>
          <Input v-model.number="seats" type="number" :min="1" :max="1000" />
        </div>
      </CardContent>
    </Card>

    <!-- Volume Discounts -->
    <Card v-if="pricing && pricing.tiers.length > 0 && licenseType === 'seats'">
      <CardHeader>
        <CardTitle>{{ t('licenses.checkout.discountTiers') }}</CardTitle>
      </CardHeader>
      <CardContent>
        <div class="space-y-2">
          <div
            v-for="tier in pricing.tiers"
            :key="tier.minSeats"
            :class="[
              'flex items-center justify-between rounded-lg border p-3 text-sm',
              seats >= tier.minSeats ? 'border-primary bg-primary/5' : 'border-border',
            ]"
          >
            <span>{{ t('licenses.checkout.tierDescription', { minSeats: tier.minSeats, discountPercent: tier.discountPercent }) }}</span>
            <Badge v-if="seats >= tier.minSeats" variant="default">Active</Badge>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Pricing Summary -->
    <Card v-if="pricing">
      <CardHeader>
        <CardTitle>{{ t('licenses.checkout.pricing') }}</CardTitle>
      </CardHeader>
      <CardContent>
        <div v-if="pricingLoading" class="flex items-center justify-center py-4">
          <Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
        <div v-else class="space-y-3">
          <div class="flex justify-between text-sm">
            <span class="text-muted-foreground">{{ t('licenses.checkout.pricePerSeat') }}</span>
            <span>{{ formatAmount(pricing.coursePrice, pricing.currency) }}</span>
          </div>
          <div v-if="pricing.discountPercent > 0" class="flex justify-between text-sm">
            <span class="text-muted-foreground">{{ t('licenses.checkout.discount') }}</span>
            <span class="text-green-600 dark:text-green-400">-{{ pricing.discountPercent }}%</span>
          </div>
          <div v-if="pricing.savings > 0" class="flex justify-between text-sm">
            <span class="text-muted-foreground">{{ t('licenses.checkout.savings') }}</span>
            <span class="text-green-600 dark:text-green-400">{{ formatAmount(pricing.savings, pricing.currency) }}</span>
          </div>
          <div class="border-t pt-3">
            <div class="flex justify-between text-lg font-bold">
              <span>{{ t('licenses.checkout.total') }}</span>
              <span>{{ formatAmount(pricing.totalPrice, pricing.currency) }}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Error -->
    <div v-if="error" class="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
      {{ error }}
    </div>

    <!-- Checkout Button -->
    <Button
      v-if="selectedCourseId && pricing"
      class="w-full"
      size="lg"
      @click="handleCheckout"
      :disabled="checkoutLoading || pricingLoading"
    >
      <Loader2 v-if="checkoutLoading" class="mr-2 h-4 w-4 animate-spin" />
      <KeyRound v-else class="mr-2 h-4 w-4" />
      {{ checkoutLoading ? t('licenses.checkout.redirectingToStripe') : t('licenses.checkout.proceedToCheckout') }}
    </Button>
  </div>
</template>
