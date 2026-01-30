<script setup lang="ts">
/**
 * 自定义节点：WindowNode
 * - 展示标题、摘要、图片与状态
 * - 使用 activePath 对非路径节点做弱化处理，突出当前上下文
 */

// 组件状态
import { ref } from "vue";

// VueFlow：连接点
import { Handle, Position, useVueFlow } from "@vue-flow/core";

// 图标：节点 UI
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  RefreshCw,
  Shield,
  Sparkles,
  Trash2,
} from "lucide-vue-next";

/**
 * props：
 * - id/data/selected：VueFlow 提供的节点数据
 * - t/config：全局翻译与样式配置
 * - activeNodeId/activePath：用于路径高亮与节点弱化
 * - flowNodes/updateNode/deepDive/generateNodeImage/expandIdea：由 App/useThinkFlow 传入的能力
 */
const props = defineProps<{
  id: string;
  data: any;
  selected: boolean;
  t: any;
  config: any;
  activeNodeId: string | null;
  activePath: { nodeIds: Set<string>; edgeIds: Set<string> };
  flowNodes: any[];
  updateNode: (id: string, payload: any) => void;
  generateNodeImage: (id: string, prompt: string) => void;
  expandIdea: (param?: any, customInput?: string) => void;
  toggleSubtreeCollapse: (id: string) => void;
  isSubtreeCollapsed: (id: string) => boolean;
  deleteNode: (id: string) => void;
}>();

/**
 * preview：请求 App 打开图片预览弹窗
 */
const emit = defineEmits<{
  (e: "preview", url: string): void;
}>();

/**
 * 节点宽度与拖拽逻辑
 */
const MIN_WIDTH = 220;
const MAX_WIDTH = 400;
const nodeWidth = ref(props.data.nodeWidth || 300);
const isResizing = ref(false);

const startResize = (e: MouseEvent) => {
  e.stopPropagation();
  e.preventDefault();
  isResizing.value = true;
  const startX = e.clientX;
  const startWidth = nodeWidth.value;
  const zoom = viewport.value.zoom || 1;

  const onMouseMove = (moveEvt: MouseEvent) => {
    const delta = (moveEvt.clientX - startX) / zoom;
    nodeWidth.value = Math.min(
      MAX_WIDTH,
      Math.max(MIN_WIDTH, startWidth + delta),
    );
  };

  const onMouseUp = () => {
    isResizing.value = false;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    // 持久化宽度
    props.updateNode(props.id, {
      data: { ...props.data, nodeWidth: nodeWidth.value },
    });
  };

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
};

const { viewport } = useVueFlow();

/**
 * 从 flowNodes 中找到节点当前位置，用于扩展时定位新节点生成的参考坐标
 */

const getNodePosition = (id: string) =>
  props.flowNodes.find((n) => n.id === id)?.position;
</script>

<template>
  <div
    class="window-node group transition-all duration-500"
    :class="{
      'opacity-40 grayscale-[0.4] blur-[0.5px] scale-[0.98] pointer-events-none':
        props.activeNodeId && !props.activePath.nodeIds.has(props.id),
      'opacity-100 grayscale-0 blur-0 scale-105 z-50 ring-2 ring-offset-4':
        props.activePath.nodeIds.has(props.id),
      resizing: isResizing,
    }"
    :style="{
      width: nodeWidth + 'px',
      borderColor: props.activePath.nodeIds.has(props.id)
        ? props.config.edgeColor
        : props.config.edgeColor + '40',
      boxShadow:
        props.activeNodeId === props.id
          ? `0 20px 50px -12px ${props.config.edgeColor}40`
          : '',
      '--tw-ring-color': props.selected
        ? props.config.edgeColor + '40'
        : 'transparent',
    }"
  >
    <Handle
      type="target"
      :position="Position.Left"
      class="!bg-transparent !border-none"
    />
    <Handle
      type="source"
      :position="Position.Right"
      class="!bg-transparent !border-none"
    />

    <!-- 拖拽手柄 -->
    <div class="resize-handle nodrag" @mousedown="startResize">
      <GripVertical class="w-3 h-3 text-slate-300" :stroke-width="1.5" />
    </div>

    <div
      class="window-header"
      :style="{
        backgroundColor: props.activePath.nodeIds.has(props.id)
          ? props.config.edgeColor + '08'
          : 'transparent',
      }"
    >
      <!-- 极简状态指示 -->
      <div class="flex items-center gap-2">
        <span
          class="window-title"
          :style="{
            color: props.activePath.nodeIds.has(props.id)
              ? props.config.edgeColor
              : '',
          }"
        >
          {{
            props.data.type === "root" || props.id.startsWith("root")
              ? props.t("node.mainTitle")
              : props.t("node.moduleTitle")
          }}
        </span>
      </div>
      <div class="flex items-center gap-1">
        <button
          v-if="props.data.childrenCount > 0"
          type="button"
          class="flex items-center gap-1 px-1.5 py-1 rounded-md text-[9px] font-black tracking-widest uppercase transition-colors"
          :class="
            props.isSubtreeCollapsed(props.id)
              ? 'text-orange-600 bg-orange-50'
              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
          "
          @click.stop="props.toggleSubtreeCollapse(props.id)"
        >
          <component
            :is="
              props.isSubtreeCollapsed(props.id) ? ChevronRight : ChevronDown
            "
            class="w-3 h-3"
            :stroke-width="1.5"
          />
          <span
            v-if="
              props.isSubtreeCollapsed(props.id) &&
              props.data.hiddenDescendantCount
            "
            class="text-[9px] font-black"
            >{{ props.data.hiddenDescendantCount }}</span
          >
        </button>
        <button
          v-if="props.data.type !== 'root' && !props.id.startsWith('root')"
          type="button"
          class="flex items-center gap-1 px-1.5 py-1 rounded-md text-[9px] font-black tracking-widest uppercase transition-colors text-rose-400 hover:bg-rose-50 hover:text-rose-600"
          :title="props.t('node.delete')"
          @click.stop="props.deleteNode(props.id)"
        >
          <Trash2 class="w-3 h-3" :stroke-width="1.5" />
        </button>
      </div>
    </div>

    <div
      v-if="props.data.isExpanding"
      class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[4px] rounded-2xl transition-all duration-300"
    >
      <div class="relative">
        <div
          class="absolute inset-0 blur-2xl opacity-30 animate-pulse scale-150"
          :style="{ backgroundColor: props.config.edgeColor }"
        ></div>
        <Sparkles
          class="w-10 h-10 text-slate-900 animate-ai-glow mb-3 relative z-10"
          :style="{ color: props.config.edgeColor }"
          :stroke-width="1.5"
        />
      </div>
      <span
        class="text-[10px] font-black tracking-widest uppercase text-slate-600 animate-pulse"
        >{{ props.t("common.expanding") }}</span
      >
    </div>

    <div class="window-content">
      <div
        v-if="props.data.imageUrl || props.data.isImageLoading"
        class="mb-3 rounded-lg overflow-hidden bg-slate-50 border border-slate-100 h-16 flex items-center justify-center relative cursor-pointer"
        @click.stop="
          props.data.imageUrl ? emit('preview', props.data.imageUrl) : null
        "
      >
        <img
          v-if="props.data.imageUrl"
          :src="props.data.imageUrl"
          class="w-full h-full object-cover"
        />
        <div
          v-if="props.data.isImageLoading"
          class="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-md cursor-default"
        >
          <Sparkles
            class="w-6 h-6 text-orange-500 animate-ai-glow mb-2"
            :stroke-width="1.5"
          />
          <span
            class="text-[8px] font-bold text-slate-400 uppercase tracking-widest animate-pulse"
            >{{ props.t("common.generating") }}</span
          >
        </div>
      </div>

      <div class="flex items-start gap-2 mb-2">
        <span
          class="font-bold shrink-0 mt-0.5"
          :style="{ color: props.config.edgeColor }"
          >></span
        >
        <h3
          class="font-black text-slate-900 tracking-tight cursor-pointer hover:text-orange-600 transition-colors"
          :class="props.data.isTitleExpanded ? 'whitespace-normal' : 'truncate'"
          @click.stop="
            props.updateNode(props.id, {
              data: {
                ...props.data,
                isTitleExpanded: !props.data.isTitleExpanded,
              },
            })
          "
        >
          {{ props.data.label }}
        </h3>
      </div>

      <p
        class="text-[10px] text-slate-500 leading-relaxed font-medium line-clamp-2"
      >
        {{ props.data.description }}
      </p>

      <div
        v-if="props.data.error"
        class="mt-3 p-2.5 bg-red-50 border border-red-100 rounded-lg animate-in fade-in slide-in-from-top-1 duration-300"
      >
        <div class="flex items-start gap-2">
          <Shield
            class="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5"
            :stroke-width="1.5"
          />
          <div class="flex-grow space-y-1">
            <p class="text-[10px] font-black text-red-600 leading-tight">
              {{ props.t("common.error.title") }}
            </p>
            <p class="text-[9px] text-red-500 leading-relaxed">
              {{ props.data.error }}
            </p>
          </div>
          <button
            @click.stop="
              props.data.imageUrl === null &&
              props.data.isImageLoading === false
                ? props.generateNodeImage(props.id, props.data.label)
                : props.expandIdea({
                    id: props.id,
                    data: props.data,
                    position: getNodePosition(props.id),
                  })
            "
            class="p-1 hover:bg-red-100 rounded transition-colors"
          >
            <RefreshCw class="w-3 h-3 text-red-600" :stroke-width="1.5" />
          </button>
        </div>
      </div>

      <div class="pt-3 mt-3 border-t border-slate-50">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-1.5 shrink-0">
            <div
              class="w-1.5 h-1.5 rounded-full animate-pulse"
              :style="{
                backgroundColor: props.data.isExpanding
                  ? props.config.edgeColor
                  : '#34d399',
              }"
            ></div>
            <span
              class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter"
              >{{
                props.data.isExpanding
                  ? props.t("common.expanding")
                  : props.t("common.active")
              }}</span
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes ai-glow {
  0%,
  100% {
    transform: scale(1) rotate(0deg);
    filter: drop-shadow(0 0 5px currentColor);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.1) rotate(10deg);
    filter: drop-shadow(0 0 15px currentColor);
    opacity: 1;
  }
}

.animate-ai-glow {
  animation: ai-glow 2.5s ease-in-out infinite;
}

.window-node {
  @apply relative rounded-xl overflow-hidden;
  background: #ffffff;
  border: 1px solid var(--border-card, rgba(0, 0, 0, 0.06));
  box-shadow: var(
    --shadow-card,
    0 1px 3px rgba(0, 0, 0, 0.05),
    0 1px 2px rgba(0, 0, 0, 0.03)
  );
  min-width: 220px;
  max-width: 400px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.window-node:hover {
  box-shadow: var(
    --shadow-card-hover,
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 2px 4px rgba(0, 0, 0, 0.04)
  );
  border-color: rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.window-node.resizing {
  transition: none;
}

.resize-handle {
  @apply absolute right-0 top-1/2 -translate-y-1/2 w-4 h-12 flex items-center justify-center cursor-ew-resize opacity-0 transition-opacity;
}

.window-node:hover .resize-handle {
  @apply opacity-100;
}

.window-header {
  @apply flex items-center justify-between px-3 py-2 border-b border-stone-100;
}

.window-title {
  @apply text-[9px] font-black tracking-widest uppercase text-slate-400 select-none;
}

.window-content {
  @apply p-4;
}

.action-btn {
  @apply flex items-center gap-1 px-1.5 py-1 rounded-md text-[9px] font-black tracking-widest uppercase transition-all duration-300;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 3px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-slate-200 rounded-full;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  @apply bg-slate-300;
}
</style>
