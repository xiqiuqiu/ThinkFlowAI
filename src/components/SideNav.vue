<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";
import { BackgroundVariant } from "@vue-flow/background";
import {
  GitGraph,
  Map,
  Palette,
  Waypoints,
  Grid,
  Focus,
  LayoutDashboard,
  Target,
  StickyNote,
} from "lucide-vue-next";

const props = defineProps<{
  t: any;
  locale: string;
  config: any;
  onFit: () => void;
  onResetLayout: () => void;
  onCenterRoot: () => void;
  onAddStickyNote: () => void;
}>();

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
  if (target.closest('[data-side-menu="true"]')) return;
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
    class="fixed left-4 top-1/2 -translate-y-1/2 z-30 hidden md:flex flex-col gap-3"
  >
    <div class="glass rounded-2xl shadow-glass p-2 flex flex-col gap-2">
      <!-- 适配 -->
      <button
        @click="props.onFit"
        class="side-btn group text-blue-500 hover:bg-blue-50 border-blue-100"
      >
        <Focus class="w-5 h-5" />
        <span class="custom-tooltip custom-tooltip-right">{{
          props.t("nav.fit")
        }}</span>
      </button>

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

      <!-- 起点 -->
      <button
        @click="props.onCenterRoot"
        class="side-btn group text-orange-500 hover:bg-orange-50 border-orange-100"
      >
        <Target class="w-5 h-5" />
        <span class="custom-tooltip custom-tooltip-right">{{
          props.t("nav.center")
        }}</span>
      </button>

      <div class="h-px bg-slate-100 mx-2 my-1"></div>

      <!-- 添加便签 (Hidden as per user request) -->
      <!-- <button @click="props.onAddStickyNote" class="side-btn group text-yellow-500 hover:bg-yellow-50 border-yellow-100">
                <StickyNote class="w-5 h-5" />
                <span class="custom-tooltip custom-tooltip-right">{{ props.t('sticky.add') }}</span>
            </button>

            <div class="h-px bg-slate-100 mx-2 my-1"></div> -->

      <!-- 联动拖拽 -->
      <button
        @click="
          props.config.hierarchicalDragging = !props.config.hierarchicalDragging
        "
        class="side-btn group"
        :class="
          props.config.hierarchicalDragging
            ? 'text-orange-500 bg-orange-50 border-orange-100'
            : 'text-slate-400 hover:text-slate-600'
        "
      >
        <GitGraph class="w-5 h-5" />
        <span class="custom-tooltip custom-tooltip-right">{{
          props.t("nav.hierarchicalDragging")
        }}</span>
      </button>

      <!-- 小地图 -->
      <button
        @click="props.config.showMiniMap = !props.config.showMiniMap"
        class="side-btn group"
        :class="
          props.config.showMiniMap
            ? 'text-blue-500 bg-blue-50 border-blue-100'
            : 'text-slate-400 hover:text-slate-600'
        "
      >
        <Map class="w-5 h-5" />
        <span class="custom-tooltip custom-tooltip-right">{{
          props.t("nav.map")
        }}</span>
      </button>

      <div class="h-px bg-slate-100 mx-2 my-1"></div>

      <!-- 连线颜色 -->
      <div
        class="relative group p-2 flex flex-col items-center gap-1 bg-slate-50 rounded-xl border border-slate-100"
      >
        <Palette class="w-4 h-4 text-slate-400" />
        <input
          type="color"
          v-model="props.config.edgeColor"
          class="w-5 h-5 rounded-md cursor-pointer bg-transparent border-none"
        />
        <span class="text-[8px] font-black text-slate-400 uppercase">{{
          props.t("nav.edge")
        }}</span>
        <span class="custom-tooltip custom-tooltip-right">{{
          props.t("nav.edge")
        }}</span>
      </div>

      <!-- 连线类型 -->
      <div data-side-menu="true" class="relative">
        <button
          @click="toggleEdgeTypeMenu"
          class="side-btn group"
          :class="
            isEdgeTypeMenuOpen
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-400'
          "
        >
          <Waypoints class="w-5 h-5" />
          <span class="custom-tooltip custom-tooltip-right">{{
            props.t("nav.edge")
          }}</span>
        </button>
        <div
          v-if="isEdgeTypeMenuOpen"
          class="absolute left-full ml-3 top-0 bg-white border border-slate-200 rounded-xl shadow-2xl p-1.5 min-w-[120px] z-50 transition-all"
        >
          <button
            v-for="opt in edgeTypeOptions"
            :key="opt.value"
            class="w-full text-left px-3 py-2 rounded-lg text-[10px] font-black tracking-widest uppercase transition-colors"
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
      <div data-side-menu="true" class="relative">
        <button
          @click="toggleBackgroundMenu"
          class="side-btn group"
          :class="
            isBackgroundMenuOpen
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-400'
          "
        >
          <Grid class="w-5 h-5" />
          <span class="custom-tooltip custom-tooltip-right">{{
            props.t("nav.lines")
          }}</span>
        </button>
        <div
          v-if="isBackgroundMenuOpen"
          class="absolute left-full ml-3 top-0 bg-white border border-slate-200 rounded-xl shadow-2xl p-1.5 min-w-[100px] z-50 transition-all"
        >
          <button
            v-for="opt in backgroundOptions"
            :key="String(opt.value)"
            class="w-full text-left px-3 py-2 rounded-lg text-[10px] font-black tracking-widest uppercase transition-colors"
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
