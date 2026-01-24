<script setup lang="ts">
import type { CollapsibleContentProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { CollapsibleContent, useForwardProps } from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<CollapsibleContentProps & { class?: HTMLAttributes["class"] }>()
const forwarded = useForwardProps(props)
</script>

<template>
  <CollapsibleContent
    :class="cn('data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden', props.class)"
    v-bind="forwarded"
  >
    <slot />
  </CollapsibleContent>
</template>
