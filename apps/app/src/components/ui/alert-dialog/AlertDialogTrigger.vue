<script setup lang="ts">
import type { AlertDialogTriggerProps } from "reka-ui"
import { AlertDialogTrigger, useForwardProps } from "reka-ui"

const props = defineProps<AlertDialogTriggerProps>()
const forwarded = useForwardProps(props)
</script>

<template>
  <AlertDialogTrigger v-bind="forwarded">
    <slot />
  </AlertDialogTrigger>
</template>
