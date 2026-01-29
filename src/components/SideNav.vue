<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { LayoutDashboard, Search, X } from "lucide-vue-next";

const props = defineProps<{
  t: any;
  locale: string;
  config: any;
  onResetLayout: () => void;
  // Search Props
  searchQuery: string;
  onUpdateSearchQuery: (val: string) => void;
  searchResults: any[];
  onFocusNode: (id: string) => void;
}>();

// Search State
const isSearchOpen = ref(false);
const searchInputRef = ref<HTMLInputElement>();

// Search Logic
const toggleSearch = () => {
  isSearchOpen.value = !isSearchOpen.value;
  if (isSearchOpen.value) {
    // Focus input next tick
    setTimeout(() => {
      searchInputRef.value?.focus();
    }, 100);
  } else {
    props.onUpdateSearchQuery("");
  }
};
</script>

<template>
  <div
    class="fixed left-4 top-1/2 -translate-y-1/2 z-30 hidden md:flex flex-col gap-3"
  >
    <div
      class="glass rounded-2xl shadow-glass p-2 flex flex-col gap-2 relative"
    >
      <!-- 搜索按钮 (带浮动输入框) -->
      <div class="relative">
        <button
          @click="toggleSearch"
          class="side-btn group"
          :class="
            isSearchOpen
              ? 'bg-blue-50 text-blue-500 border-blue-100'
              : 'text-slate-400 hover:text-blue-500 hover:bg-blue-50/50'
          "
        >
          <Search v-if="!isSearchOpen" class="w-5 h-5" />
          <X v-else class="w-5 h-5" />
          <span
            v-if="!isSearchOpen"
            class="custom-tooltip custom-tooltip-right"
            >{{ t("nav.searchPlaceholder") }}</span
          >
        </button>

        <!-- 浮动搜索框 -->
        <Transition
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 -translate-x-4 scale-95"
          enter-to-class="opacity-100 translate-x-0 scale-100"
          leave-active-class="transition-all duration-200 ease-in"
          leave-from-class="opacity-100 translate-x-0 scale-100"
          leave-to-class="opacity-0 -translate-x-4 scale-95"
        >
          <div
            v-if="isSearchOpen"
            class="absolute left-full ml-3 top-0 h-10 w-64 bg-white border border-slate-200 rounded-xl shadow-xl flex items-center px-3 z-[60]"
          >
            <Search class="w-4 h-4 text-slate-400 mr-2 flex-shrink-0" />
            <input
              ref="searchInputRef"
              type="text"
              :value="props.searchQuery"
              @input="
                (e) =>
                  props.onUpdateSearchQuery(
                    (e.target as HTMLInputElement).value,
                  )
              "
              :placeholder="props.t('nav.searchPlaceholder')"
              class="w-full h-full bg-transparent border-none outline-none text-xs font-bold text-slate-700 placeholder:text-slate-300"
            />

            <!-- 搜索结果下拉 (内嵌在浮动框下方) -->
            <div
              v-if="props.searchQuery && props.searchResults.length > 0"
              class="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl p-2 max-h-60 overflow-y-auto"
            >
              <button
                v-for="node in props.searchResults"
                :key="node.id"
                @click="
                  () => {
                    props.onFocusNode(node.id);
                    props.onUpdateSearchQuery('');
                    // Optional: Keep search open or close it? Let's close it for now or keep it open for multi-search?
                    // User request implies just search. Let's keep it open but maybe clear query if needed.
                    // Actually, usually focusing means we found it.
                  }
                "
                class="w-full text-left px-3 py-2 hover:bg-slate-50 rounded-lg transition-colors group"
              >
                <div
                  class="font-bold text-slate-700 text-xs truncate group-hover:text-blue-600"
                >
                  {{ node.data.label }}
                </div>
                <!-- <div class="text-[10px] text-slate-400 truncate">
                  {{ node.data.description }}
                </div> -->
              </button>
            </div>
          </div>
        </Transition>
      </div>

      <div class="h-px bg-slate-100 mx-2 my-1"></div>

      <!-- 布局 -->
      <button
        @click="props.onResetLayout"
        class="side-btn group text-purple-500 hover:bg-purple-50 border-purple-100"
      >
        <LayoutDashboard class="w-5 h-5" />
        <span class="custom-tooltip custom-tooltip-right">{{
          props.t("nav.layout")
        }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.side-btn {
  @apply w-10 h-10 flex items-center justify-center rounded-xl border border-transparent transition-all active:scale-90 relative;
}
.side-btn:hover {
  @apply border-slate-200 shadow-sm;
}
</style>
