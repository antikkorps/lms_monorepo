<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { usePayments } from '@/composables/usePayments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, BookOpen } from 'lucide-vue-next';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { verifyPurchase, error } = usePayments();

const status = ref<'verifying' | 'success' | 'error'>('verifying');
const courseInfo = ref<{ id: string; title: string; slug: string } | null>(null);

onMounted(async () => {
  const sessionId = route.query.session_id as string;

  if (!sessionId) {
    status.value = 'error';
    error.value = t('payment.invalidSession');
    return;
  }

  const result = await verifyPurchase(sessionId);

  if (result && result.status === 'completed') {
    status.value = 'success';
    courseInfo.value = result.course;
  } else if (result && result.status === 'pending') {
    // Payment is still processing
    status.value = 'verifying';
    // Poll for completion (max 30 seconds)
    let attempts = 0;
    const maxAttempts = 10;
    const pollInterval = setInterval(async () => {
      attempts++;
      const pollResult = await verifyPurchase(sessionId);
      if (pollResult && pollResult.status === 'completed') {
        clearInterval(pollInterval);
        status.value = 'success';
        courseInfo.value = pollResult.course;
      } else if (attempts >= maxAttempts) {
        clearInterval(pollInterval);
        // Still pending after 30s, show success anyway (webhook will update)
        status.value = 'success';
        courseInfo.value = result.course;
      }
    }, 3000);
  } else {
    status.value = 'error';
  }
});

function goToCourse() {
  if (courseInfo.value) {
    router.push(`/courses/${courseInfo.value.slug}`);
  }
}
</script>

<template>
  <div class="container max-w-md mx-auto py-16 px-4">
    <Card>
      <CardHeader class="text-center">
        <CardTitle class="text-2xl">{{ t('payment.success.title') }}</CardTitle>
        <CardDescription v-if="status === 'success'">
          {{ t('payment.success.description') }}
        </CardDescription>
      </CardHeader>
      <CardContent class="text-center">
        <!-- Verifying -->
        <div v-if="status === 'verifying'" class="space-y-4">
          <Loader2 class="h-12 w-12 mx-auto animate-spin text-primary" />
          <p class="text-muted-foreground">{{ t('payment.verifying') }}</p>
        </div>

        <!-- Success -->
        <div v-else-if="status === 'success'" class="space-y-6">
          <div class="flex justify-center">
            <div class="rounded-full bg-green-100 p-3">
              <CheckCircle class="h-12 w-12 text-green-600" />
            </div>
          </div>

          <Alert class="border-green-500 bg-green-50 text-green-700 text-left">
            <CheckCircle class="h-4 w-4" />
            <AlertTitle>{{ t('payment.success.confirmed') }}</AlertTitle>
            <AlertDescription>
              {{ t('payment.success.accessGranted') }}
            </AlertDescription>
          </Alert>

          <div v-if="courseInfo" class="p-4 rounded-lg border bg-muted/50">
            <p class="text-sm text-muted-foreground mb-1">{{ t('payment.success.purchasedCourse') }}</p>
            <p class="font-medium">{{ courseInfo.title }}</p>
          </div>

          <div class="space-y-2">
            <Button @click="goToCourse" class="w-full" size="lg">
              <BookOpen class="mr-2 h-4 w-4" />
              {{ t('payment.success.startLearning') }}
            </Button>
            <RouterLink to="/dashboard" class="block">
              <Button variant="ghost" class="w-full">
                {{ t('payment.success.backToDashboard') }}
              </Button>
            </RouterLink>
          </div>
        </div>

        <!-- Error -->
        <div v-else class="space-y-4">
          <div class="flex justify-center">
            <div class="rounded-full bg-red-100 p-3">
              <XCircle class="h-12 w-12 text-red-600" />
            </div>
          </div>

          <Alert variant="destructive">
            <XCircle class="h-4 w-4" />
            <AlertTitle>{{ t('payment.error.title') }}</AlertTitle>
            <AlertDescription>
              {{ error || t('payment.error.verificationFailed') }}
            </AlertDescription>
          </Alert>

          <div class="space-y-2">
            <RouterLink to="/courses">
              <Button variant="outline" class="w-full">
                {{ t('payment.error.browseCourses') }}
              </Button>
            </RouterLink>
            <p class="text-sm text-muted-foreground">
              {{ t('payment.error.contactSupport') }}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
