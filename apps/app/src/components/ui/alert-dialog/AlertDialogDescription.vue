<script setup lang="ts">
import type { AlertDialogDescriptionProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { AlertDialogDescription, useForwardProps } from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<AlertDialogDescriptionProps & { class?: HTMLAttributes["class"] }>()
const forwarded = useForwardProps(props)
</script>

<template>
  <AlertDialogDescription
    :class="cn('text-muted-foreground text-sm', props.class)"
    v-bind="forwarded"
  >
    <slot />
  </AlertDialogDescription>
</template>
