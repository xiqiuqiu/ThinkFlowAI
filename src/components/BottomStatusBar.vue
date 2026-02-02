<script setup lang="ts">
/**
 * 底部状态栏
 * - 包含画布视图控制：自适应(Fit), 中心(Center), 小地图(Map)
 * - 样式控制：连线颜色(Color), 连线类型(Type), 背景网格(Grid)
 * - 位于屏幕左下角
 */
import { ref, onMounted, onUnmounted } from "vue";
import {
  Focus,
  Target,
  Map,
  GitGraph,
  Palette,
  Waypoints,
  Grid,
  LayoutDashboard,
} from "lucide-vue-next";
import { BackgroundVariant } from "@vue-flow/background";

const props = defineProps<{
  t: (key: string) => string;
  config: any;
  onFit: () => void;
  onCenterRoot: () => void;
  onResetLayout: () => void;
}>();

// Menu States
const isEdgeTypeMenuOpen = ref(false);
const isBackgroundMenuOpen = ref(false);

const edgeTypeOptions = [
  { value: "default", labelKey: "nav.edgeTypes.default" },
  { value: "straight", labelKey: "nav.edgeTypes.straight" },
  { value: "step", labelKey: "nav.edgeTypes.step" },
  { value: "smoothstep", labelKey: "nav.edgeTypes.smoothstep" },
];

const backgroundOptions = [
  { value: BackgroundVariant.Lines, labelKey: "nav.lines" },
  { value: BackgroundVariant.Dots, labelKey: "nav.dots" },
];

const closeMenus = () => {
  isEdgeTypeMenuOpen.value = false;
  isBackgroundMenuOpen.value = false;
};

const toggleEdgeTypeMenu = () => {
  isEdgeTypeMenuOpen.value = !isEdgeTypeMenuOpen.value;
  if (isEdgeTypeMenuOpen.value) isBackgroundMenuOpen.value = false;
};

const toggleBackgroundMenu = () => {
  isBackgroundMenuOpen.value = !isBackgroundMenuOpen.value;
  if (isBackgroundMenuOpen.value) isEdgeTypeMenuOpen.value = false;
};

const setEdgeType = (value: string) => {
  props.config.edgeType = value;
  closeMenus();
};

const setBackgroundVariant = (value: any) => {
  props.config.backgroundVariant = value;
  closeMenus();
};

const handleDocumentPointerDown = (e: Event) => {
  const target = e.target as HTMLElement | null;
  if (!target) return;
  // If clicking inside a menu toggle or menu content, ignore
  if (target.closest('[data-status-menu="true"]')) return;
  closeMenus();
};

onMounted(() => {
  document.addEventListener("pointerdown", handleDocumentPointerDown);
});

onUnmounted(() => {
  document.removeEventListener("pointerdown", handleDocumentPointerDown);
});
</script>

<template>
  <div
    class="absolute z-30 flex items-center gap-2 bottom-4 left-1/2 -translate-x-1/2 md:left-auto md:right-6 md:translate-x-0 transition-all duration-300 w-max max-w-[90vw] overflow-x-auto no-scrollbar"
  >
    <div class="glass rounded-xl shadow-glass p-1.5 flex items-center gap-1">
      <!-- 适配视图 -->
      <button
        @click="props.onFit"
        class="status-btn group text-blue-500 hover:bg-blue-50 border-blue-100"
        :title="props.t('nav.fit')"
      >
        <Focus class="w-4 h-4" />
      </button>

      <!-- 回到中心 -->
      <button
        @click="props.onCenterRoot"
        class="status-btn group text-orange-500 hover:bg-orange-50 border-orange-100"
        :title="props.t('nav.center')"
      >
        <Target class="w-4 h-4" />
      </button>

      <!-- 布局整理 -->
      <button
        @click="props.onResetLayout"
        class="status-btn group text-purple-500 hover:bg-purple-50 border-purple-100"
        :title="props.t('nav.layout')"
      >
        <LayoutDashboard class="w-4 h-4" />
      </button>

      <div class="w-px h-4 bg-slate-200 mx-0.5"></div>

      <!-- 连线颜色 -->
      <div
        class="relative group status-btn overflow-hidden cursor-pointer"
        :title="props.t('nav.edge')"
      >
        <Palette class="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
        <input
          type="color"
          v-model="props.config.edgeColor"
          class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      <!-- 连线类型 -->
      <div data-status-menu="true" class="relative">
        <button
          @click="toggleEdgeTypeMenu"
          class="status-btn group"
          :class="
            isEdgeTypeMenuOpen
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-400 hover:text-slate-600'
          "
          :title="props.t('nav.edge')"
        >
          <Waypoints class="w-4 h-4" />
        </button>
        <!-- Upward Menu (Right Aligned) -->
        <div
          v-if="isEdgeTypeMenuOpen"
          class="absolute right-0 bottom-full mb-2 min-w-[140px] bg-white border border-slate-200 rounded-lg shadow-xl p-1 z-50 overflow-hidden origin-bottom-right"
        >
          <button
            v-for="opt in edgeTypeOptions"
            :key="opt.value"
            class="w-full text-left px-3 py-2 text-[10px] font-bold uppercase transition-colors"
            :class="
              opt.value === props.config.edgeType
                ? 'bg-orange-50 text-orange-600'
                : 'text-slate-600 hover:bg-slate-50'
            "
            @click="setEdgeType(opt.value)"
          >
            {{ props.t(opt.labelKey) }}
          </button>
        </div>
      </div>

      <!-- 背景类型 -->
      <div data-status-menu="true" class="relative">
        <button
          @click="toggleBackgroundMenu"
          class="status-btn group"
          :class="
            isBackgroundMenuOpen
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-400 hover:text-slate-600'
          "
          :title="props.t('nav.lines')"
        >
          <Grid class="w-4 h-4" />
        </button>
        <!-- Upward Menu (Right Aligned) -->
        <div
          v-if="isBackgroundMenuOpen"
          class="absolute right-0 bottom-full mb-2 min-w-[120px] bg-white border border-slate-200 rounded-lg shadow-xl p-1 z-50 overflow-hidden origin-bottom-right"
        >
          <button
            v-for="opt in backgroundOptions"
            :key="String(opt.value)"
            class="w-full text-left px-3 py-2 text-[10px] font-bold uppercase transition-colors"
            :class="
              opt.value === props.config.backgroundVariant
                ? 'bg-orange-50 text-orange-600'
                : 'text-slate-600 hover:bg-slate-50'
            "
            @click="setBackgroundVariant(opt.value)"
          >
            {{ props.t(opt.labelKey) }}
          </button>
        </div>
      </div>

      <div class="w-px h-4 bg-slate-200 mx-0.5"></div>

      <!-- 小地图开关 -->
      <button
        @click="props.config.showMiniMap = !props.config.showMiniMap"
        class="status-btn group"
        :class="
          props.config.showMiniMap
            ? 'text-purple-500 bg-purple-50 border-purple-100'
            : 'text-slate-400 hover:text-slate-600 border-transparent'
        "
        :title="props.t('nav.map')"
      >
        <Map class="w-4 h-4" />
      </button>

      <!-- 联动拖拽 -->
      <button
        @click="
          props.config.hierarchicalDragging = !props.config.hierarchicalDragging
        "
        class="status-btn group"
        :class="
          props.config.hierarchicalDragging
            ? 'text-green-500 bg-green-50 border-green-100'
            : 'text-slate-400 hover:text-slate-600 border-transparent'
        "
        :title="props.t('nav.hierarchicalDragging')"
      >
        <GitGraph class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.glass {
  @apply bg-white/95 backdrop-blur-md border border-stone-200/60 shadow-sm;
}

.status-btn {
  @apply p-2 rounded-lg border border-transparent transition-all active:scale-90 hover:shadow-sm hover:bg-stone-100;
}
</style>
