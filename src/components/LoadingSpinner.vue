<script setup lang="ts">
/**
 * LoadingSpinner.vue
 *
 * An Apple-style activity indicator (ticking blades).
 * Features:
 * - 12 blades arranged in a circle
 * - Smooth fade animation (opacity)
 * - Tailwind-based sizing and coloring
 */

withDefaults(
  defineProps<{
    size?: "sm" | "md" | "lg" | "xl";
    color?: string;
  }>(),
  {
    size: "md",
    color: "bg-slate-500", // Default to a neutral slate color
  },
);

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-8 h-8",
  lg: "w-12 h-12",
  xl: "w-16 h-16",
};
</script>

<template>
  <div class="relative inline-block" :class="sizeClasses[size]">
    <div
      v-for="i in 12"
      :key="i"
      class="absolute left-1/2 top-0 w-[8%] h-[28%] -ml-[4%] rounded-full origin-[50%_178.57%] animate-ios-spinner"
      :class="color"
      :style="{
        transform: `rotate(${(i - 1) * 30}deg)`,
        animationDelay: `-${1.2 - (i - 1) * 0.1}s`,
      }"
    ></div>
  </div>
</template>

<style scoped>
@keyframes ios-spinner {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0.15;
  }
}

.animate-ios-spinner {
  animation: ios-spinner 1.2s linear infinite;
}
</style>
