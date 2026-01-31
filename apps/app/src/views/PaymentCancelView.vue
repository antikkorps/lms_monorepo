<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-vue-next';

const { t } = useI18n();
const route = useRoute();

const courseSlug = computed(() => route.query.course as string | undefined);
</script>

<template>
  <div class="container max-w-md mx-auto py-16 px-4">
    <Card>
      <CardHeader class="text-center">
        <CardTitle class="text-2xl">{{ t('payment.cancelled.title') }}</CardTitle>
        <CardDescription>
          {{ t('payment.cancelled.description') }}
        </CardDescription>
      </CardHeader>
      <CardContent class="text-center space-y-6">
        <div class="flex justify-center">
          <div class="rounded-full bg-orange-100 p-3">
            <XCircle class="h-12 w-12 text-orange-600" />
          </div>
        </div>

        <Alert class="border-orange-500 bg-orange-50 text-orange-700 text-left">
          <XCircle class="h-4 w-4" />
          <AlertTitle>{{ t('payment.cancelled.notCharged') }}</AlertTitle>
          <AlertDescription>
            {{ t('payment.cancelled.noChargeMessage') }}
          </AlertDescription>
        </Alert>

        <p class="text-muted-foreground text-sm">
          {{ t('payment.cancelled.readyWhenYouAre') }}
        </p>

        <div class="space-y-2">
          <RouterLink v-if="courseSlug" :to="`/courses/${courseSlug}`" class="block">
            <Button class="w-full" size="lg">
              <RefreshCw class="mr-2 h-4 w-4" />
              {{ t('payment.cancelled.tryAgain') }}
            </Button>
          </RouterLink>
          <RouterLink to="/courses" class="block">
            <Button :variant="courseSlug ? 'outline' : 'default'" class="w-full" :size="courseSlug ? 'default' : 'lg'">
              <ArrowLeft class="mr-2 h-4 w-4" />
              {{ t('payment.cancelled.browseCourses') }}
            </Button>
          </RouterLink>
          <RouterLink to="/dashboard" class="block">
            <Button variant="ghost" class="w-full">
              {{ t('payment.cancelled.backToDashboard') }}
            </Button>
          </RouterLink>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
