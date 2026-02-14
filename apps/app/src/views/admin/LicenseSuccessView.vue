<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, ArrowRight, KeyRound } from 'lucide-vue-next';

const { t } = useI18n();
const router = useRouter();
</script>

<template>
  <div class="mx-auto flex max-w-lg items-center justify-center py-16">
    <Card class="w-full">
      <CardContent class="space-y-6 p-8 text-center">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle class="h-10 w-10 text-green-600 dark:text-green-400" />
        </div>

        <div>
          <h1 class="text-2xl font-bold">{{ t('licenses.success.title') }}</h1>
          <p class="mt-2 text-muted-foreground">{{ t('licenses.success.description') }}</p>
        </div>

        <div class="flex flex-col gap-3">
          <Button @click="router.push('/admin/licenses')" class="w-full">
            <KeyRound class="mr-2 h-4 w-4" />
            {{ t('licenses.success.backToLicenses') }}
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
