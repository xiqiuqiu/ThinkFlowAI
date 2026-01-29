<script setup lang="ts">
/**
 * 顶部导航栏
 * - 左侧：项目选择器
 * - 右侧：用户头像（点击展开菜单：导出、重置、演示、摘要、设置、注销）
 */
import { ref, onMounted, onUnmounted } from "vue";
import {
  LogOut,
  User,
  ChevronDown,
  Download,
  FileCode,
  Sparkles,
  Trash2,
  Play,
  Settings,
  Globe,
  LogIn,
} from "lucide-vue-next";
import ProjectSelector from "./ProjectSelector.vue";

const props = defineProps<{
  t: any;
  locale: string;
  config: any;
  isPresenting: boolean;
  onTogglePresentation: () => void;
  onGenerateSummary: () => void;
  onExportMarkdown: () => void;
  onExportHTML: () => void;
  onStartNewSession: () => void;
  // Auth
  isAuthenticated: boolean;
  user: { email?: string } | null;
  onShowAuthModal: () => void;
  onSignOut: () => void;
}>();

const emit = defineEmits<{
  (e: "toggle-locale"): void;
}>();

const isUserMenuOpen = ref(false);

const toggleUserMenu = () => {
  isUserMenuOpen.value = !isUserMenuOpen.value;
};

const closeUserMenu = () => {
  isUserMenuOpen.value = false;
};

const handleDocumentClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest(".user-menu-container")) {
    closeUserMenu();
  }
};

onMounted(() => {
  document.addEventListener("click", handleDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener("click", handleDocumentClick);
});

// Helper to close menu after action
const action = (fn: () => void) => {
  fn();
  closeUserMenu();
};
</script>

<template>
  <nav
    class="flex-none fixed top-0 left-0 right-0 z-40 px-4 py-3 flex items-center justify-between pointer-events-none"
  >
    <!-- 左侧：项目选择器 (Pointer events enabled) -->
    <div class="pointer-events-auto flex items-center gap-4">
      <!-- Logo (Optional, minimalist) -->
      <div class="flex items-center gap-2">
        <div
          class="w-3 h-3 bg-gradient-to-br from-primary to-primary-dark rounded-sm rotate-45"
        ></div>
        <span
          class="font-heading font-bold text-slate-700 tracking-tighter text-lg hidden md:block"
          >OmniMind</span
        >
      </div>

      <div class="h-6 w-px bg-slate-200 hidden md:block"></div>

      <ProjectSelector :t="props.t" />
    </div>

    <!-- 右侧：用户菜单 (Pointer events enabled) -->
    <div class="pointer-events-auto user-menu-container relative">
      <button
        v-if="!props.isAuthenticated"
        @click="props.onShowAuthModal"
        class="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full shadow-lg hover:scale-105 transition-all text-xs font-bold uppercase tracking-wider"
      >
        <LogIn class="w-3.5 h-3.5" />
        {{ props.t("auth.login") }}
      </button>

      <div v-else class="relative">
        <button
          @click="toggleUserMenu"
          class="flex items-center gap-2 bg-white/90 backdrop-blur-md rounded-full pl-1 pr-3 py-1 shadow-glass border border-white/50 hover:bg-white transition-all group"
        >
          <div
            class="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center text-white font-bold text-xs shadow-sm"
          >
            {{ props.user?.email?.charAt(0).toUpperCase() || "U" }}
          </div>
          <span
            class="text-xs font-bold text-slate-700 max-w-[100px] truncate hidden sm:block"
          >
            {{ props.user?.email?.split("@")[0] }}
          </span>
          <ChevronDown
            class="w-3.5 h-3.5 text-slate-400 transition-transform duration-300"
            :class="{ 'rotate-180': isUserMenuOpen }"
          />
        </button>

        <!-- Dropdown Menu -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="transform -translate-y-2 opacity-0 scale-95"
          enter-to-class="transform translate-y-0 opacity-100 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="transform translate-y-0 opacity-100 scale-100"
          leave-to-class="transform -translate-y-2 opacity-0 scale-95"
        >
          <div
            v-if="isUserMenuOpen"
            class="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden py-1 z-50 origin-top-right"
          >
            <!-- Header Info (Mobile only or extra info) -->
            <div class="px-4 py-3 border-b border-slate-50 sm:hidden">
              <p class="text-xs font-bold text-slate-900 truncate">
                {{ props.user?.email }}
              </p>
            </div>

            <!-- Actions -->
            <div class="py-1">
              <button
                @click="action(props.onGenerateSummary)"
                class="w-full text-left px-4 py-2 text-xs font-medium text-slate-600 hover:bg-orange-50 hover:text-orange-600 flex items-center gap-2 transition-colors"
                :disabled="!props.isAuthenticated"
              >
                <Sparkles class="w-3.5 h-3.5" />
                {{ props.t("nav.summary") }}
              </button>

              <button
                @click="action(props.onTogglePresentation)"
                class="w-full text-left px-4 py-2 text-xs font-medium text-slate-600 hover:bg-green-50 hover:text-green-600 flex items-center gap-2 transition-colors"
              >
                <Play class="w-3.5 h-3.5" />
                {{ props.t("nav.presentation") }}
              </button>
            </div>

            <div class="h-px bg-slate-50 my-1"></div>

            <div class="py-1">
              <button
                @click="action(props.onExportMarkdown)"
                class="w-full text-left px-4 py-2 text-xs font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2 transition-colors"
              >
                <Download class="w-3.5 h-3.5" />
                {{ props.t("nav.exportMd") }}
              </button>
              <button
                @click="action(props.onExportHTML)"
                class="w-full text-left px-4 py-2 text-xs font-medium text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 flex items-center gap-2 transition-colors"
              >
                <FileCode class="w-3.5 h-3.5" />
                {{ props.t("nav.exportHtml") }}
              </button>
            </div>

            <div class="h-px bg-slate-50 my-1"></div>

            <div class="py-1">
              <button
                @click="action(props.onStartNewSession)"
                class="w-full text-left px-4 py-2 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition-colors"
              >
                <Trash2 class="w-3.5 h-3.5" />
                {{ props.t("nav.reset") }}
              </button>
            </div>

            <div class="h-px bg-slate-50 my-1"></div>

            <div class="py-1">
              <button
                @click="action(() => emit('toggle-locale'))"
                class="w-full text-left px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2 transition-colors"
              >
                <Globe class="w-3.5 h-3.5" />
                {{ props.locale === "zh" ? "English" : "中文" }}
              </button>
              <!-- Settings Placeholder -->
              <!-- <button
                class="w-full text-left px-4 py-2 text-xs font-medium text-slate-400 hover:bg-slate-50 flex items-center gap-2 cursor-not-allowed"
              >
                <Settings class="w-3.5 h-3.5" />
                {{ props.t("common.settings") }}
              </button> -->
              <button
                @click="action(props.onSignOut)"
                class="w-full text-left px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 flex items-center gap-2 transition-colors"
              >
                <LogOut class="w-3.5 h-3.5" />
                {{ props.t("auth.logout") }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.shadow-glass {
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
}
</style>
